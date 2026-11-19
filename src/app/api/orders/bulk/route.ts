import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   loadStockSettings,
   deductStockForItems,
   restoreStockForItems,
   orderHoldsStock,
   InsufficientStockError,
   InvalidVariantError,
} from "@src/lib/stock";

// Bulk order actions (Phase 3B, roadmap 3.5).
//
// Each order is processed independently, in its own transaction,
// through the SAME stock semantics as the single-order PUT
// (src/app/api/orders/[id]): a transition into CANCELLED releases
// the order's stock, a transition out of CANCELLED re-deducts it
// (validated), totals are recomputed server-side, and an audit event
// is appended to the order's history. A failure on one order is
// reported in that order's result and never rolls back the others.

const ORDER_STATUSES = [
   "PENDING",
   "CONFIRMED",
   "PROCESSING",
   "SHIPPED",
   "OUT_FOR_DELIVERY",
   "DELIVERED",
   "COMPLETED",
   "HOLD",
   "CANCELLED",
   "FAILED",
];

const MAX_BULK_ORDERS = 200;

interface BulkResult {
   id: string;
   orderId: string;
   ok: boolean;
   error?: string;
   note?: string;
}

export async function POST(request: NextRequest) {
   const gate = await requirePermission(request, ["orders", "order", "order_update"]);
   if (gate instanceof NextResponse) return gate;
   const session = gate.session;

   try {
      const body = await request.json();
      const action = body.action;
      const orderIds: string[] = Array.isArray(body.orderIds)
         ? body.orderIds.map((v: any) => String(v)).filter(Boolean)
         : [];

      if (action !== "status" && action !== "courier") {
         return NextResponse.json(
            { error: "Validation error", message: 'action must be "status" or "courier".' },
            { status: 400 },
         );
      }
      if (orderIds.length === 0) {
         return NextResponse.json(
            { error: "Validation error", message: "Select at least one order." },
            { status: 400 },
         );
      }
      if (orderIds.length > MAX_BULK_ORDERS) {
         return NextResponse.json(
            {
               error: "Validation error",
               message: `Bulk actions are limited to ${MAX_BULK_ORDERS} orders at a time.`,
            },
            { status: 400 },
         );
      }

      let nextStatus: string | undefined;
      if (action === "status") {
         nextStatus = String(body.status || "").toUpperCase();
         if (!ORDER_STATUSES.includes(nextStatus)) {
            return NextResponse.json(
               {
                  error: "Validation error",
                  message: `status must be one of ${ORDER_STATUSES.join(", ")}.`,
               },
               { status: 400 },
            );
         }
      }
      const courierName =
         action === "courier" ? String(body.courier || "").trim() : "";
      if (action === "courier" && !courierName) {
         return NextResponse.json(
            { error: "Validation error", message: "A courier name is required." },
            { status: 400 },
         );
      }
      const courierStatus =
         action === "courier" && body.courierStatus
            ? String(body.courierStatus).trim()
            : undefined;

      // Audit actor, resolved once (same shape as the single-order PUT).
      const authUser = session.id
         ? await prisma.user.findUnique({
              where: { id: session.id },
              include: { role: true },
           })
         : null;
      const rawCode = authUser?.customId || "";
      const auditActor = {
         id: authUser?.id || session.id,
         name: authUser?.name || session.name || "Staff Member",
         role: authUser?.role?.name || gate.roleName || session.role || "Staff",
         employeeCode: rawCode
            ? rawCode.startsWith("EP_")
               ? rawCode
               : `EP_${rawCode.replace(/\D/g, "") || "1"}`
            : "EP_1",
         email: authUser?.email || session.email,
      };
      const nowIso = new Date().toISOString();

      const results: BulkResult[] = [];

      for (const orderId of orderIds) {
         const label = orderId;
         try {
            const outcome = await prisma.$transaction(async (tx) => {
               const order = await tx.order.findUnique({
                  where: { id: orderId },
                  include: { items: true },
               });
               if (!order || order.isDeleted) {
                  return { ok: false, error: "Order not found (or deleted)" };
               }
               const displayId = order.orderId || order.orderCode || order.customId || order.id;

               const existingTags =
                  typeof order.orderTags === "object" && order.orderTags !== null
                     ? (order.orderTags as Record<string, any>)
                     : {};
               const existingHistory = Array.isArray(existingTags.auditHistory)
                  ? existingTags.auditHistory
                  : [];

               if (action === "status") {
                  const target = nextStatus as string;
                  if (order.status === target) {
                     return { ok: true, displayId, note: "Already in this status" };
                  }
                  const wasHoldingStock = orderHoldsStock(order);
                  const willHoldStock = target !== "CANCELLED";
                  const itemLines = order.items
                     .filter((it) => it.productId)
                     .map((it) => ({
                        productId: it.productId as string,
                        quantity: it.quantity,
                        variantId: it.variantId,
                     }));

                  if (wasHoldingStock && !willHoldStock) {
                     await restoreStockForItems(tx, itemLines, {
                        orderId: order.id,
                        note: `Order ${displayId} cancelled (bulk) — stock restored`,
                     });
                  } else if (!wasHoldingStock && willHoldStock) {
                     const stockSettings = await loadStockSettings(tx);
                     await deductStockForItems(tx, itemLines, {
                        settings: stockSettings,
                        orderId: order.id,
                        note: `Order ${displayId} reactivated (bulk) — stock deducted`,
                     });
                  }

                  // Same server-side recomputation as the single PUT.
                  const total = Math.max(
                     0,
                     Number(order.subtotal || 0) +
                        Number(order.deliveryCharge || 0) -
                        Number(order.discount || 0),
                  );
                  const due = Math.max(0, total - Number(order.advancePayment || 0));

                  const auditEvent = {
                     id: `act-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                     action: `Status Changed to ${target} (Bulk)`,
                     category: "workflow",
                     actor: auditActor,
                     details: `Bulk status transition from ${order.status} to ${target}`,
                     diff: { field: "status", previous: order.status, new: target },
                     timestamp: nowIso,
                     icon: "solar:refresh-bold",
                     badgeLabel: target,
                     isImportant: target === "DELIVERED" || target === "COMPLETED",
                  };

                  await tx.order.update({
                     where: { id: order.id },
                     data: {
                        status: target as any,
                        total,
                        dueAmount: due,
                        orderTags: {
                           ...existingTags,
                           auditHistory: [auditEvent, ...existingHistory],
                        },
                     },
                  });
                  return { ok: true, displayId };
               }

               // action === "courier"
               const auditEvent = {
                  id: `act-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  action: "Courier Assigned (Bulk)",
                  category: "courier",
                  actor: auditActor,
                  details: `Courier set to ${courierName}${courierStatus ? ` (${courierStatus})` : ""} via bulk action`,
                  diff: {
                     field: "courier",
                     previous: order.courier || "None",
                     new: courierName,
                  },
                  timestamp: nowIso,
                  icon: "solar:delivery-bold",
                  badgeLabel: courierName,
                  isImportant: true,
               };
               await tx.order.update({
                  where: { id: order.id },
                  data: {
                     courier: courierName,
                     courierStatus: courierStatus !== undefined ? courierStatus : undefined,
                     // Marking "In Courier" in bulk means the parcels
                     // were handed over — stamp the submission time
                     // if it was never recorded.
                     courierSubmittedAt:
                        courierStatus === "In Courier" && !order.courierSubmittedAt
                           ? new Date()
                           : undefined,
                     orderTags: {
                        ...existingTags,
                        auditHistory: [auditEvent, ...existingHistory],
                     },
                  },
               });
               return { ok: true, displayId };
            });

            results.push({
               id: orderId,
               orderId: outcome.displayId || label,
               ok: outcome.ok,
               ...(outcome.error ? { error: outcome.error } : {}),
               ...((outcome as any).note ? { note: (outcome as any).note } : {}),
            });
         } catch (err: any) {
            results.push({
               id: orderId,
               orderId: label,
               ok: false,
               error:
                  err instanceof InsufficientStockError ||
                  err instanceof InvalidVariantError
                     ? err.message
                     : "Update failed",
            });
         }
      }

      const succeeded = results.filter((r) => r.ok).length;
      return NextResponse.json({
         results,
         succeeded,
         failed: results.length - succeeded,
      });
   } catch {
      return NextResponse.json({ error: "Bulk action failed" }, { status: 500 });
   }
}
