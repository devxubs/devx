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
import { logAudit, requestAuditContext } from "@src/lib/audit";
import {
   normalizeOrderStatus,
   ORDER_STATUSES,
} from "@src/lib/orderStatus";
import { resolveSubmittedCourierStatus } from "@src/lib/courierSubmission";

// Bulk order actions (Phase 3B, roadmap 3.5).
//
// Each order is processed independently, in its own transaction,
// through the SAME stock semantics as the single-order PUT
// (src/app/api/orders/[id]): a transition into CANCELLED (or FAILED
// — terminal, Phase B1 P1-1) releases the order's stock, a
// transition out of a terminal status re-deducts it (validated),
// totals are recomputed server-side, and an audit event is appended
// to the order's history. A failure on one order is reported in that
// order's result and never rolls back the others.

const MAX_BULK_ORDERS = 200;

interface BulkResult {
   id: string;
   orderId: string;
   ok: boolean;
   error?: string;
   note?: string;
}

export async function POST(request: NextRequest) {
   // O7: the permission gate is action-dependent — "delete" must
   // pass the SAME gate as the single-order DELETE
   // (order_delete), while status/courier keep the update gate.
   // Peek at the action on a clone so the body below is still
   // parsed exactly once from the original request.
   const peekedAction = await request
      .clone()
      .json()
      .then((b: any) => b?.action)
      .catch(() => undefined);
   const gate = await requirePermission(
      request,
      peekedAction === "delete"
         ? ["orders", "order", "order_delete"]
         : ["orders", "order", "order_update"],
   );
   if (gate instanceof NextResponse) return gate;
   const session = gate.session;

   try {
      const body = await request.json();
      const action = body.action;
      // Follow-up round: duplicate IDs are dropped up front — the
      // same order listed twice would otherwise be processed twice
      // and write duplicate audit rows (and a duplicate result).
      const orderIds: string[] = Array.isArray(body.orderIds)
         ? Array.from(
              new Set(body.orderIds.map((v: any) => String(v)).filter(Boolean)),
           )
         : [];

      if (action !== "status" && action !== "courier" && action !== "delete") {
         return NextResponse.json(
            { error: "Validation error", message: 'action must be "status", "courier" or "delete".' },
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
         // Phase B1 (P1-4): the shared normaliser, so Title-Case /
         // spaced forms ("Out for Delivery") are accepted exactly as
         // in the single-order routes; unknown → 400, never 500.
         const normalized = normalizeOrderStatus(body.status);
         if (!normalized) {
            return NextResponse.json(
               {
                  error: "Validation error",
                  message: `status must be one of ${ORDER_STATUSES.join(", ")}.`,
               },
               { status: 400 },
            );
         }
         nextStatus = normalized;
      }
      const courierName =
         action === "courier" ? String(body.courier || "").trim() : "";
      if (action === "courier" && !courierName) {
         return NextResponse.json(
            { error: "Validation error", message: "A courier name is required." },
            { status: 400 },
         );
      }
      // O4: the applied courier status resolves as — an explicitly
      // provided status (validated against the supported list; an
      // explicit empty string means "keep current"), else the
      // configured Default Courier Status from the settings
      // singleton's customConfig, else no status (the exact pre-O4
      // behaviour when the setting is unset). A settings read
      // failure must not fail the bulk action: it falls back to
      // "no default".
      let courierStatus: string | undefined;
      if (action === "courier") {
         const provided = Object.prototype.hasOwnProperty.call(
            body,
            "courierStatus",
         );
         let settingsConfig: unknown = null;
         if (!provided) {
            const settingRow = await prisma.storeSetting
               .findUnique({
                  where: { id: "default" },
                  select: { customConfig: true },
               })
               .catch(() => null);
            settingsConfig = settingRow?.customConfig ?? null;
         }
         const resolved = resolveSubmittedCourierStatus({
            provided,
            value: body.courierStatus,
            customConfig: settingsConfig,
         });
         if (!resolved.ok) {
            return NextResponse.json(
               { error: "Validation error", message: resolved.message },
               { status: 400 },
            );
         }
         courierStatus = resolved.courierStatus;
      }

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
      const auditCtx = requestAuditContext(request);
      const auditActorRef = { id: auditActor.id, label: auditActor.name };

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
                  const willHoldStock = orderHoldsStock({
                     status: target,
                     isDeleted: order.isDeleted,
                  });
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
                        note: `Order ${displayId} ${target === "FAILED" ? "failed" : "cancelled"} (bulk) — stock restored`,
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

                  // Phase 4 (D1): audit in the same transaction.
                  await logAudit(tx, {
                     actor: auditActorRef,
                     action: "STATUS_CHANGE",
                     entityType: "ORDER",
                     entityId: order.id,
                     entityCustomId: displayId,
                     summary: `Order ${displayId} status changed from ${order.status} to ${target} (bulk)`,
                     changes: {
                        status: { from: order.status, to: target },
                     },
                     ...auditCtx,
                  });
                  return { ok: true, displayId };
               }

               if (action === "delete") {
                  // O7: mirror the single-order DELETE exactly —
                  // soft-delete to the Bin (never permanent), stock
                  // released exactly once via orderHoldsStock (an
                  // already-deleted order is rejected above by the
                  // shared `!order || order.isDeleted` guard, and a
                  // CANCELLED/FAILED order restores nothing), and a
                  // DELETE AuditLog row in the same transaction.
                  // The single DELETE appends no orderTags history
                  // event, so neither does this.
                  const stockRestored = orderHoldsStock(order);
                  if (stockRestored) {
                     await restoreStockForItems(
                        tx,
                        order.items
                           .filter((it) => it.productId)
                           .map((it) => ({
                              productId: it.productId as string,
                              quantity: it.quantity,
                              variantId: it.variantId,
                           })),
                        {
                           orderId: order.id,
                           note: `Order ${displayId} deleted (bulk) — stock restored`,
                        },
                     );
                  }
                  await tx.order.update({
                     where: { id: order.id },
                     data: { isDeleted: true, deletedAt: new Date() },
                  });
                  await logAudit(tx, {
                     actor: auditActorRef,
                     action: "DELETE",
                     entityType: "ORDER",
                     entityId: order.id,
                     entityCustomId: displayId,
                     summary: stockRestored
                        ? `Order ${displayId} moved to bin (bulk) — stock restored`
                        : `Order ${displayId} moved to bin (bulk) — no stock restored (order was ${order.status})`,
                     ...auditCtx,
                  });
                  return { ok: true, displayId, note: "Moved to bin" };
               }

               // action === "courier"
               // P2-13 (audit C-14): compare before/after FIRST, like
               // the single-order flow — re-assigning the courier an
               // order already has is a no-op and must write neither
               // an AuditLog row nor a legacy history event (the
               // previous code wrote both unconditionally, so
               // re-assigning the same courier to 50 orders produced
               // 50 false change records). The duplicate-ID dedupe
               // above is unchanged.
               const courierChanges: Record<
                  string,
                  { from: string | null; to: string | null }
               > = {};
               if ((order.courier || null) !== courierName) {
                  courierChanges.courier = {
                     from: order.courier || null,
                     to: courierName,
                  };
               }
               if (
                  courierStatus !== undefined &&
                  (order.courierStatus || null) !== courierStatus
               ) {
                  courierChanges.courierStatus = {
                     from: order.courierStatus || null,
                     to: courierStatus,
                  };
               }
               // Marking "In Courier" in bulk means the parcels were
               // handed over — stamp the submission time if it was
               // never recorded. The stamp is bookkeeping, not a
               // courier change: on its own it still applies, but
               // (mirroring the single-order PUT, whose audit diff
               // does not cover courierSubmittedAt) it writes no
               // audit row and no history event.
               const stampSubmittedAt =
                  courierStatus === "In Courier" && !order.courierSubmittedAt
                     ? new Date()
                     : undefined;
               if (Object.keys(courierChanges).length === 0) {
                  if (stampSubmittedAt) {
                     await tx.order.update({
                        where: { id: order.id },
                        data: { courierSubmittedAt: stampSubmittedAt },
                     });
                  }
                  return {
                     ok: true,
                     displayId,
                     note: "Courier already set",
                  };
               }

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
                     courierSubmittedAt: stampSubmittedAt,
                     orderTags: {
                        ...existingTags,
                        auditHistory: [auditEvent, ...existingHistory],
                     },
                  },
               });

               // Phase 4 (D1): audit in the same transaction — only
               // reached on a real courier change, with the exact
               // fields that changed (the follow-up round's diff
               // fix, now gated by the no-op skip above).
               await logAudit(tx, {
                  actor: auditActorRef,
                  action: "UPDATE",
                  entityType: "ORDER",
                  entityId: order.id,
                  entityCustomId: displayId,
                  summary: `Order ${displayId} courier set to ${courierName} (bulk)`,
                  changes: courierChanges,
                  ...auditCtx,
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
