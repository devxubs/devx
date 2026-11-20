import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   loadStockSettings,
   applyStockDifference,
   deductStockForItems,
   restoreStockForItems,
   orderHoldsStock,
   findVariantlessVariableLine,
   InsufficientStockError,
   InvalidVariantError,
} from "@src/lib/stock";
import {
   findOrderWithTxId,
   duplicateTxIdMessage,
   DuplicateTxIdError,
} from "@src/lib/payments";
import {
   normalizeOrderStatus,
   type OrderStatusValue,
} from "@src/lib/orderStatus";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
   buildChanges,
} from "@src/lib/audit";

const PAYMENT_STATUS_VALUES = ["UNVERIFIED", "VERIFIED", "MISMATCHED"];

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   try {
      const order = await prisma.order.findFirst({
         where: {
            OR: [{ id }, { orderCode: id }, { customId: id }, { orderId: id }, { invoiceNo: id }],
         },
         include: {
            customer: true,
            employee: {
               select: {
                  id: true,
                  name: true,
                  email: true,
                  phoneNumber: true,
                  customId: true,
                  role: { select: { name: true } },
               },
            },
            items: {
                  include: {
                     product: true,
                     variant: {
                        select: { id: true, variantName: true, sku: true, barcode: true, attributes: true, quantity: true },
                     },
                  },
               },
         },
      });

      if (!order) {
         return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      return NextResponse.json(order);
   } catch {
      return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
   }
}

export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ["orders", "order", "order_update"]);
   if (gate instanceof NextResponse) return gate;
   const session = gate.session;

   const { id } = await params;

   try {
      const body = await request.json();

      const existingOrder = await prisma.order.findFirst({
         where: {
            OR: [{ id }, { orderCode: id }, { customId: id }, { orderId: id }, { invoiceNo: id }],
         },
         include: { items: {
                  include: {
                     product: true,
                     variant: {
                        select: { id: true, variantName: true, sku: true, barcode: true, attributes: true, quantity: true },
                     },
                  },
               } },
      });

      if (!existingOrder) {
         return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Phase B1 (P1-4): normalise the status at the API boundary,
      // BEFORE any comparison or write. The Publish flow sends Title
      // Case ("Out for Delivery", "Cancelled"); the old handler wrote
      // body.status raw, so those edits stored a non-enum string and
      // the CANCELLED stock-release/audit comparisons below never
      // matched. Every downstream use reads `normalizedStatus`, never
      // body.status. Unknown statuses are a 400, never a 500.
      let normalizedStatus: OrderStatusValue | undefined;
      if (body.status !== undefined) {
         const normalized = normalizeOrderStatus(body.status);
         if (!normalized) {
            return NextResponse.json(
               {
                  error: "Validation error",
                  message: `status must be one of the known order statuses (e.g. PENDING, OUT_FOR_DELIVERY, DELIVERED).`,
               },
               { status: 400 },
            );
         }
         normalizedStatus = normalized;
      }

      const existingTags =
         typeof existingOrder.orderTags === "object" &&
         existingOrder.orderTags !== null
            ? (existingOrder.orderTags as Record<string, any>)
            : typeof existingOrder.orderTags === "string"
              ? (() => {
                   try {
                      return JSON.parse(existingOrder.orderTags);
                   } catch {
                      return {};
                   }
                })()
              : {};

      // Fetch actual authenticated user details to ensure accurate audit actor info
      let authUser: any = null;
      if (session.id) {
         authUser = await prisma.user.findUnique({
            where: { id: session.id },
            include: { role: true },
         });
      }

      const rawCode = authUser?.customId || "";
      const permanentEmpCode = rawCode
         ? rawCode.startsWith("EP_")
            ? rawCode
            : `EP_${rawCode.replace(/\D/g, "") || "1"}`
         : "EP_1";

      const auditActor = {
         id: authUser?.id || session.id,
         name: authUser?.name || session.name || "Staff Member",
         role: authUser?.role?.name || session.role || "Staff",
         employeeCode: permanentEmpCode,
         email: authUser?.email || session.email,
      };

      const newAuditEvents: any[] = [];
      const nowIso = new Date().toISOString();

      // 1. Audit Note Updates (Courier, Customer, Packing, Employee) with Before & After diff
      const noteDefs = [
         {
            title: "Courier Note",
            key: "courierNote",
            newVal: body.courierNote,
            oldVal: existingTags.courierNote,
         },
         {
            title: "Customer Note",
            key: "customerNote",
            newVal: body.customerNote,
            oldVal: existingTags.customerNote ?? existingOrder.orderNote,
         },
         {
            title: "Packing Note",
            key: "packingNote",
            newVal: body.packingNote,
            oldVal: existingTags.packingNote,
         },
         {
            title: "Employee Note",
            key: "employeeNote",
            newVal: body.employeeNote,
            oldVal: existingTags.employeeNote,
         },
      ];

      for (const def of noteDefs) {
         if (def.newVal !== undefined) {
            const cleanNew = String(def.newVal || "").trim();
            const cleanOld = String(def.oldVal || "").trim();
            if (cleanNew !== cleanOld) {
               const isCreated = !cleanOld && Boolean(cleanNew);
               const actionName = `${def.title} ${isCreated ? "Created" : "Updated"}`;
               const details = cleanNew ? `"${cleanNew}"` : "Note cleared";

               newAuditEvents.push({
                  id: `act-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  action: actionName,
                  category: "note",
                  actor: auditActor,
                  details,
                  diff: {
                     field: def.title,
                     previous: cleanOld || null,
                     new: cleanNew || null,
                  },
                  timestamp: nowIso,
                  icon: "solar:notes-bold",
                  badgeLabel: def.title,
                  isImportant: def.title === "Employee Note",
               });
            }
         }
      }

      // 2. Audit Status Changes (compared on the NORMALISED status,
      // so a Title-Case "Cancelled" from Publish takes the same
      // cancellation branch as a canonical CANCELLED from QuickEdit).
      if (normalizedStatus !== undefined && normalizedStatus !== existingOrder.status) {
         if (normalizedStatus === "CANCELLED") {
            const reason = body.cancellationReason || "Cancelled by user or staff";
            newAuditEvents.push({
               id: `act-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
               action: "Order Cancelled",
               category: "order",
               actor: auditActor,
               details: `Order cancelled. Reason: ${reason}`,
               diff: {
                  field: "status",
                  previous: existingOrder.status,
                  new: "CANCELLED",
               },
               timestamp: nowIso,
               icon: "solar:close-circle-bold",
               badgeLabel: "Cancelled",
               isImportant: true,
            });
         } else {
            newAuditEvents.push({
               id: `act-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
               action: `Status Changed to ${normalizedStatus}`,
               category: "workflow",
               actor: auditActor,
               details: `Status transitioned from ${existingOrder.status} to ${normalizedStatus}`,
               diff: {
                  field: "status",
                  previous: existingOrder.status,
                  new: normalizedStatus,
               },
               timestamp: nowIso,
               icon: "solar:refresh-bold",
               badgeLabel: normalizedStatus,
               isImportant: normalizedStatus === "DELIVERED" || normalizedStatus === "COMPLETED",
            });
         }
      }

      // 3. Audit Payment Changes
      if (
         body.advancePayment !== undefined &&
         Number(body.advancePayment) !== Number(existingOrder.advancePayment || 0)
      ) {
         const oldAdv = Number(existingOrder.advancePayment || 0);
         const newAdv = Number(body.advancePayment);
         newAuditEvents.push({
            id: `act-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            action: "Payment Updated",
            category: "payment",
            actor: auditActor,
            details: `Advance payment changed from ৳${oldAdv.toLocaleString()} to ৳${newAdv.toLocaleString()}`,
            diff: {
               field: "advancePayment",
               previous: `৳${oldAdv.toLocaleString()}`,
               new: `৳${newAdv.toLocaleString()}`,
            },
            timestamp: nowIso,
            icon: "solar:card-2-bold",
            badgeLabel: "Payment",
            isImportant: true,
         });
      }

      if (
         body.paymentMethod !== undefined &&
         body.paymentMethod !== existingOrder.paymentMethod
      ) {
         newAuditEvents.push({
            id: `act-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            action: "Payment Method Changed",
            category: "payment",
            actor: auditActor,
            details: `Payment method changed from "${existingOrder.paymentMethod || "None"}" to "${body.paymentMethod}"`,
            diff: {
               field: "paymentMethod",
               previous: existingOrder.paymentMethod || "None",
               new: body.paymentMethod,
            },
            timestamp: nowIso,
            icon: "solar:card-send-bold",
            badgeLabel: body.paymentMethod,
            isImportant: false,
         });
      }

      // 4. Audit Courier Changes
      const existingTrackingId = (existingOrder as any).courierTrackingId || existingOrder.referenceId;
      if (
         (body.courier !== undefined && body.courier !== existingOrder.courier) ||
         (body.courierTrackingId !== undefined &&
            body.courierTrackingId !== existingTrackingId)
      ) {
         const oldCourierStr = `${existingOrder.courier || "None"}${
            existingTrackingId ? ` (${existingTrackingId})` : ""
         }`;
         const newCourierStr = `${body.courier || existingOrder.courier || "None"}${
            body.courierTrackingId || existingTrackingId
               ? ` (${body.courierTrackingId || existingTrackingId})`
               : ""
         }`;

         newAuditEvents.push({
            id: `act-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            action: "Courier Info Updated",
            category: "courier",
            actor: auditActor,
            details: `Courier updated: ${newCourierStr}`,
            diff: {
               field: "courier",
               previous: oldCourierStr,
               new: newCourierStr,
            },
            timestamp: nowIso,
            icon: "solar:delivery-bold",
            badgeLabel: body.courier || existingOrder.courier || "Courier",
            isImportant: true,
         });
      }

      // 5. Phase 3B (3.6): payment reconciliation fields — TxID,
      // sender number, and the verification status. The duplicate
      // check excludes this order itself, so re-saving an unchanged
      // TxID never collides with its own record. The verification
      // status is only ever set explicitly here (staff action in
      // Order Details / the reconciliation report) — nothing in the
      // system auto-marks a payment VERIFIED.
      // The fields are read at the top level (Quick Edit, Order
      // Details) or inside the pricing object (Order Create's edit
      // mode submits the same payload shape as its create mode).
      const rawTxId =
         body.paymentTxId !== undefined ? body.paymentTxId : body.pricing?.paymentTxId;
      const rawSender =
         body.paymentSenderNumber !== undefined
            ? body.paymentSenderNumber
            : body.pricing?.paymentSenderNumber;
      let paymentTxIdUpdate: string | null | undefined;
      if (rawTxId !== undefined) {
         paymentTxIdUpdate = String(rawTxId || "").trim() || null;
         if (paymentTxIdUpdate) {
            const clash = await findOrderWithTxId(
               paymentTxIdUpdate,
               existingOrder.id,
            );
            if (clash) {
               return NextResponse.json(
                  {
                     error: "Duplicate transaction ID",
                     message: duplicateTxIdMessage(paymentTxIdUpdate, clash),
                  },
                  { status: 409 },
               );
            }
         }
      }
      const paymentSenderUpdate: string | null | undefined =
         rawSender !== undefined
            ? String(rawSender || "").trim() || null
            : undefined;
      let paymentStatusUpdate: string | undefined;
      if (body.paymentStatus !== undefined) {
         const candidate = String(body.paymentStatus).toUpperCase();
         if (!PAYMENT_STATUS_VALUES.includes(candidate)) {
            return NextResponse.json(
               {
                  error: "Validation error",
                  message: `paymentStatus must be one of ${PAYMENT_STATUS_VALUES.join(", ")}.`,
               },
               { status: 400 },
            );
         }
         paymentStatusUpdate = candidate;
         if (candidate !== existingOrder.paymentStatus) {
            newAuditEvents.push({
               id: `act-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
               action: `Payment ${candidate === "VERIFIED" ? "Verified" : candidate === "MISMATCHED" ? "Flagged Mismatched" : "Marked Unverified"}`,
               category: "payment",
               actor: auditActor,
               details: `Payment verification changed from ${existingOrder.paymentStatus} to ${candidate}${existingOrder.paymentTxId ? ` (TxID ${existingOrder.paymentTxId})` : ""}`,
               diff: {
                  field: "paymentStatus",
                  previous: existingOrder.paymentStatus,
                  new: candidate,
               },
               timestamp: nowIso,
               icon: "solar:shield-check-bold",
               badgeLabel: "Payment Verification",
               isImportant: true,
            });
         }
      }

      // 6. Phase 4 (D3): courier booking identifiers — manual entry
      // only (no live provider integration). The three fields join
      // the update whitelist below; whenever any of them is saved
      // through this edit flow, courierLastSyncAt is stamped to now
      // (it records when the courier details were last updated —
      // the UI captions it "Courier updated").
      const courierTextUpdate = (value: unknown) =>
         value !== undefined ? String(value || "").trim() || null : undefined;
      const courierConsignmentUpdate = courierTextUpdate(
         body.courierConsignmentId,
      );
      const courierTrackingUpdate = courierTextUpdate(body.courierTrackingCode);
      const courierProviderStatusUpdate = courierTextUpdate(
         body.courierProviderStatus,
      );
      const courierStamp =
         body.courierConsignmentId !== undefined ||
         body.courierTrackingCode !== undefined ||
         body.courierProviderStatus !== undefined
            ? new Date()
            : undefined;

      // Phase 4 (D1): one AuditLog row per order update, written
      // inside whichever transaction path performs the update (the
      // legacy orderTags auditHistory above is unchanged).
      const statusChanged =
         normalizedStatus !== undefined && normalizedStatus !== existingOrder.status;
      const writeOrderAudit = async (tx: any, updatedOrder: any) => {
         // Follow-up round: the diff also covers paymentMethod,
         // courier, deliveryCharge and discount (previously a PUT
         // changing only one of those wrote an audit row whose diff
         // was empty), and a genuinely no-op PUT — empty diff —
         // writes no UPDATE audit row at all.
         const changes = buildChanges(existingOrder, updatedOrder, [
            "status",
            "paymentStatus",
            "paymentTxId",
            "paymentMethod",
            "courier",
            "deliveryCharge",
            "discount",
            "total",
            "dueAmount",
            "advancePayment",
            "courierConsignmentId",
            "courierTrackingCode",
            "courierProviderStatus",
         ]);
         if (!changes) return;
         await logAudit(tx, {
            actor: { id: auditActor.id, label: auditActor.name },
            action: statusChanged ? "STATUS_CHANGE" : "UPDATE",
            entityType: "ORDER",
            entityId: existingOrder.id,
            entityCustomId:
               existingOrder.orderId || existingOrder.customId || existingOrder.id,
            summary: statusChanged
               ? `Order ${existingOrder.orderId || existingOrder.customId} status changed from ${existingOrder.status} to ${normalizedStatus}`
               : `Order ${existingOrder.orderId || existingOrder.customId} updated`,
            changes,
            ...requestAuditContext(request),
         });
      };

      // Compile updated tags
      const existingAuditHistory = Array.isArray(existingTags.auditHistory)
         ? existingTags.auditHistory
         : [];

      let updatedOrderTags: any = {
         ...existingTags,
         ...(body.courierNote !== undefined
            ? { courierNote: String(body.courierNote || "").trim() }
            : {}),
         ...(body.customerNote !== undefined
            ? { customerNote: String(body.customerNote || "").trim() }
            : {}),
         ...(body.packingNote !== undefined
            ? { packingNote: String(body.packingNote || "").trim() }
            : {}),
         ...(body.employeeNote !== undefined
            ? { employeeNote: String(body.employeeNote || "").trim() }
            : {}),
         auditHistory: [...newAuditEvents, ...existingAuditHistory],
      };

      if (Array.isArray(body.notes)) {
         updatedOrderTags.notes = body.notes.map((n: any) => ({
            id: n.id,
            type: n.type || "general",
            title: n.title || "Order Note",
            content: String(n.content || "").trim(),
            author: n.author || auditActor.name || "Staff",
            createdAt: n.createdAt || nowIso,
         }));

         const existingNoteIds = new Set(
            Array.isArray(existingTags.notes)
               ? existingTags.notes.map((n: any) => n.id)
               : [],
         );
         for (const n of body.notes) {
            if (
               (n.isNew || !existingNoteIds.has(n.id)) &&
               !String(n.id).startsWith("audit-") &&
               !String(n.id).startsWith("tag-") &&
               !String(n.id).startsWith("order-note-field")
            ) {
               newAuditEvents.push({
                  id: `act-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  action: `${n.title || "Order Note"} Added`,
                  category: "note",
                  actor: auditActor,
                  details: `"${n.content}"`,
                  diff: {
                     field: n.title || "Order Note",
                     previous: null,
                     new: n.content,
                  },
                  timestamp: nowIso,
                  icon: "solar:notes-bold",
                  badgeLabel: n.title || "Note",
                  isImportant: n.type === "employee",
               });
            }
         }
         updatedOrderTags.auditHistory = [
            ...newAuditEvents,
            ...existingAuditHistory,
         ];
      }

      if (body.orderTags !== undefined && typeof body.orderTags === "object") {
         updatedOrderTags = {
            ...updatedOrderTags,
            ...body.orderTags,
            auditHistory: [...newAuditEvents, ...existingAuditHistory],
         };
      }

      const updatedOrderNote =
         body.customerNote !== undefined
            ? body.customerNote
            : body.orderNote !== undefined
              ? body.orderNote
              : undefined;

      const rawItems = Array.isArray(body.items)
         ? body.items
         : Array.isArray(body.products)
           ? body.products
           : null;

      if (rawItems !== null) {
         if (!Array.isArray(rawItems) || rawItems.length === 0) {
            return NextResponse.json(
               {
                  error: "Validation error",
                  message: "An order must contain at least one product item.",
               },
               { status: 400 },
            );
         }

         const existingItemsMap = new Map(
            existingOrder.items.map((it) => [it.id, it]),
         );

         // Step 1: Pre-resolve each item's candidate productId and validate format
         const resolvedItems: Array<{
            orderItemId?: string;
            candidateProductId: string | null;
            variantId: string | null;
            name: string;
            code: string | null;
            quantity: number;
            price: number;
            subtotal: number;
         }> = [];

         for (const it of rawItems) {
            const qty = Math.max(1, Number(it.quantity) || 1);
            const pr = Math.max(0, Number(it.price) || 0);
            // ORD-03 fix: the old expression `Number(it.subtotal) != null`
            // is true even when subtotal is missing (Number(undefined)
            // is NaN, and NaN != null), letting NaN flow into totals.
            // Subtotals are always recomputed server-side from the
            // validated quantity × price — client-sent subtotals are
            // never trusted (fix instruction #10).
            const sub = qty * pr;
            const name = String(it.name || it.title || "Product Item").trim();
            const code = it.code || it.sku || null;

            // Determine if this corresponds to an existing OrderItem on this order
            const orderItemId =
               it.orderItemId && existingItemsMap.has(it.orderItemId)
                  ? it.orderItemId
                  : it.id && existingItemsMap.has(it.id)
                    ? it.id
                    : undefined;

            const existingItem = orderItemId
               ? existingItemsMap.get(orderItemId)
               : undefined;

            let candidateId: string | null = null;
            if (it.productId) {
               candidateId = String(it.productId).trim();
            } else if (!orderItemId && it.id) {
               // When adding a new item, it.id might be a Product ID
               candidateId = String(it.id).trim();
            } else if (existingItem && existingItem.productId) {
               // Preserve existing item's productId if not provided
               candidateId = existingItem.productId;
            }

            // Guard against legacy frontend bug where OrderItem ID was sent as productId:
            if (candidateId && existingItemsMap.has(candidateId)) {
               const matched = existingItemsMap.get(candidateId);
               candidateId = matched?.productId || null;
            }

            // INV-02: an explicitly-sent variantId wins (null clears
            // the variant); when the field is absent on a line that
            // maps to an existing item, the stored variant is kept.
            let variantId: string | null = null;
            if ((it as any).variantId !== undefined) {
               variantId = (it as any).variantId
                  ? String((it as any).variantId).trim()
                  : null;
            } else if (existingItem) {
               variantId = existingItem.variantId ?? null;
            }

            resolvedItems.push({
               orderItemId,
               candidateProductId: candidateId || null,
               variantId,
               name,
               code,
               quantity: qty,
               price: pr,
               subtotal: sub,
            });
         }

         // Step 2: Validate all candidateProductIds against database
         const candidateIds = Array.from(
            new Set(
               resolvedItems
                  .map((it) => it.candidateProductId)
                  .filter((id): id is string => Boolean(id)),
            ),
         );

         const foundProductsMap = new Map<string, any>();

         if (candidateIds.length > 0) {
            const foundProducts = await prisma.product.findMany({
               where: {
                  OR: [
                     { id: { in: candidateIds } },
                     { customId: { in: candidateIds } },
                     { productCode: { in: candidateIds } },
                     { productSku: { in: candidateIds } },
                  ],
               },
            });

            for (const prod of foundProducts) {
               foundProductsMap.set(prod.id, prod);
               if (prod.customId) foundProductsMap.set(prod.customId, prod);
               if (prod.productCode)
                  foundProductsMap.set(prod.productCode, prod);
               if (prod.productSku) foundProductsMap.set(prod.productSku, prod);
            }

            // Verify every candidateId exists
            for (const candidateId of candidateIds) {
               if (!foundProductsMap.has(candidateId)) {
                  return NextResponse.json(
                     {
                        error: "Invalid product",
                        message: `Product with ID '${candidateId}' was not found in the database.`,
                        invalidProductId: candidateId,
                     },
                     { status: 400 },
                  );
               }
            }
         }

         // Step 3: Normalize items with authoritative Product.id and check isDeleted
         const finalItemsData: Array<{
            orderItemId?: string;
            productId: string | null;
            variantId: string | null;
            name: string;
            code: string | null;
            quantity: number;
            price: number;
            subtotal: number;
         }> = [];

         for (const it of resolvedItems) {
            let authoritativeProductId: string | null = null;
            if (
               it.candidateProductId &&
               foundProductsMap.has(it.candidateProductId)
            ) {
               const prod = foundProductsMap.get(it.candidateProductId);
               authoritativeProductId = prod.id;

               // If adding a NEW item that is marked deleted/archived, block it:
               if (prod.isDeleted && !it.orderItemId) {
                  return NextResponse.json(
                     {
                        error: "Product unavailable",
                        message: `Product '${prod.productName}' is archived/deleted and cannot be added to an order.`,
                        productId: prod.id,
                     },
                     { status: 400 },
                  );
               }
            }

            finalItemsData.push({
               orderItemId: it.orderItemId,
               productId: authoritativeProductId,
               variantId: it.variantId,
               name: it.name,
               code: it.code,
               quantity: it.quantity,
               price: it.price,
               subtotal: it.subtotal,
            });
         }

         // Step 3b (INV-02): validate variant references against the
         // authoritative product ids. A variant must exist and belong
         // to the line's product. The isDeleted check applies only
         // when the line is new or its variant actually changed — an
         // unrelated edit must not fail because a variant on an old
         // line was archived after the sale.
         const requestedVariantIds = Array.from(
            new Set(
               finalItemsData
                  .map((it) => it.variantId)
                  .filter((v): v is string => Boolean(v)),
            ),
         );
         if (requestedVariantIds.length > 0) {
            const foundVariants = await prisma.productVariant.findMany({
               where: { id: { in: requestedVariantIds } },
               select: { id: true, productId: true, variantName: true, isDeleted: true },
            });
            const variantById = new Map(foundVariants.map((v) => [v.id, v]));
            for (const it of finalItemsData) {
               if (!it.variantId) continue;
               const variant = variantById.get(it.variantId);
               const existingItem = it.orderItemId
                  ? existingItemsMap.get(it.orderItemId)
                  : undefined;
               const variantChanged =
                  !existingItem || (existingItem.variantId ?? null) !== it.variantId;
               if (!variant || variant.productId !== it.productId) {
                  return NextResponse.json(
                     {
                        error: "Invalid variant",
                        message: `Variant '${it.variantId}' does not belong to product '${it.name}'.`,
                     },
                     { status: 400 },
                  );
               }
               if (variantChanged && variant.isDeleted) {
                  return NextResponse.json(
                     {
                        error: "Variant unavailable",
                        message: `Variant '${variant.variantName}' is archived/deleted and cannot be added to an order.`,
                     },
                     { status: 400 },
                  );
               }
            }
         }

         // Step 3c (QA fix B1): reject any final line that names a
         // variable product without a variant. A variant-less line
         // nets against the product pool only and silently breaks
         // the Product.quantity = Σ variant quantities invariant.
         // This also heals pre-fix orders on their next item edit:
         // the message names the product that needs a variant picked.
         const variantless = await findVariantlessVariableLine(
            prisma,
            finalItemsData.map((it) => ({
               productId: it.productId,
               variantId: it.variantId,
            })),
         );
         if (variantless) {
            return NextResponse.json(
               {
                  error: "Variant required",
                  message: `Product '${variantless.productName}' has variants — select a variant for this line before saving.`,
               },
               { status: 400 },
            );
         }

         // Step 4: Calculate net stock difference per product.
         // ORD-02 fix: the difference is computed between the stock
         // the order EFFECTIVELY held before and after this update.
         // An order only holds stock while it is neither CANCELLED,
         // FAILED (terminal, Phase B1 P1-1) nor deleted — so
         // transitioning into CANCELLED/FAILED releases the full item
         // quantities, and leaving a terminal status re-deducts them,
         // instead of stock leaking on every status change. Both
         // sides go through orderHoldsStock so the predicate can
         // never drift between the before/after computations.
         const wasHoldingStock = orderHoldsStock(existingOrder);
         const nextStatus =
            normalizedStatus !== undefined
               ? normalizedStatus
               : existingOrder.status;
         const willHoldStock = orderHoldsStock({
            status: nextStatus,
            isDeleted: existingOrder.isDeleted,
         });

         // INV-02: differences are netted per product + variant —
         // moving a line from variant A to variant B of the same
         // product must restore A and deduct B, not net to zero.
         const stockDiffMap = new Map<
            string,
            { productId: string; variantId: string | null; diff: number }
         >();
         const addStockDiff = (
            productId: string,
            variantId: string | null,
            delta: number,
         ) => {
            const key = `${productId}::${variantId ?? ""}`;
            const current = stockDiffMap.get(key);
            if (current) current.diff += delta;
            else stockDiffMap.set(key, { productId, variantId, diff: delta });
         };

         if (wasHoldingStock) {
            for (const existingIt of existingOrder.items) {
               if (existingIt.productId) {
                  addStockDiff(
                     existingIt.productId,
                     existingIt.variantId ?? null,
                     -existingIt.quantity,
                  );
               }
            }
         }

         if (willHoldStock) {
            for (const newIt of finalItemsData) {
               if (newIt.productId) {
                  addStockDiff(newIt.productId, newIt.variantId, newIt.quantity);
               }
            }
         }

         // Step 5: Identify items to create, update, and delete
         const incomingOrderItemIds = new Set(
            finalItemsData
               .map((it) => it.orderItemId)
               .filter((id): id is string => Boolean(id)),
         );

         const itemsToDelete = existingOrder.items.filter(
            (it) => !incomingOrderItemIds.has(it.id),
         );

         const itemsToCreate = finalItemsData.filter((it) => !it.orderItemId);

         const itemsToUpdate = finalItemsData.filter((it) => {
            if (!it.orderItemId) return false;
            const existing = existingItemsMap.get(it.orderItemId);
            if (!existing) return false;
            const isUnchanged =
               existing.name === it.name &&
               (existing.code || null) === (it.code || null) &&
               existing.quantity === it.quantity &&
               Number(existing.price) === it.price &&
               Number(existing.subtotal) === it.subtotal &&
               existing.productId === it.productId &&
               (existing.variantId ?? null) === (it.variantId ?? null);
            return !isUnchanged;
         });

         const calculatedSubtotal = finalItemsData.reduce(
            (sum: number, it) => sum + it.subtotal,
            0,
         );
         // Validate monetary inputs: non-finite client values fall back
         // to the stored values instead of poisoning totals with NaN.
         const safeMoney = (value: any, fallback: number) => {
            const n = Number(value);
            return Number.isFinite(n) ? Math.max(0, n) : fallback;
         };
         const delivery = safeMoney(
            body.deliveryCharge !== undefined
               ? body.deliveryCharge
               : existingOrder.deliveryCharge,
            Number(existingOrder.deliveryCharge || 0),
         );
         const discount = safeMoney(
            body.discount !== undefined
               ? body.discount
               : existingOrder.discount,
            Number(existingOrder.discount || 0),
         );
         const advance = safeMoney(
            body.advancePayment !== undefined
               ? body.advancePayment
               : existingOrder.advancePayment,
            Number(existingOrder.advancePayment || 0),
         );
         const calculatedTotal = Math.max(
            0,
            calculatedSubtotal + delivery - discount,
         );
         const calculatedDue = Math.max(0, calculatedTotal - advance);

         // Add audit event for Items Editing if items changed
         if (
            itemsToDelete.length > 0 ||
            itemsToCreate.length > 0 ||
            itemsToUpdate.length > 0
         ) {
            newAuditEvents.push({
               id: `act-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
               action: "Order Items Edited",
               category: "order",
               actor: auditActor,
               details: `Updated ${finalItemsData.length} order items (Subtotal: ৳${calculatedSubtotal.toLocaleString()}, Grand Total: ৳${calculatedTotal.toLocaleString()})`,
               diff: {
                  field: "items",
                  previous: `${existingOrder.items?.length || 0} items (৳${Number(existingOrder.total || 0).toLocaleString()})`,
                  new: `${finalItemsData.length} items (৳${calculatedTotal.toLocaleString()})`,
                  itemsSummary: `${finalItemsData.length} items`,
               },
               timestamp: nowIso,
               icon: "solar:box-minimalistic-bold",
               badgeLabel: "Items Edit",
               isImportant: true,
            });

            updatedOrderTags.auditHistory = [
               ...newAuditEvents,
               ...existingAuditHistory,
            ];
         }

         const updated = await prisma.$transaction(async (tx) => {
            // QA fix (S1, partial): re-run the duplicate-TxID check
            // inside the transaction (see the create path for the
            // rationale — the race narrows, it does not vanish).
            if (paymentTxIdUpdate) {
               const clash = await findOrderWithTxId(
                  paymentTxIdUpdate,
                  existingOrder.id,
                  tx,
               );
               if (clash) throw new DuplicateTxIdError(paymentTxIdUpdate, clash);
            }

            // 1. Delete removed order items
            for (const it of itemsToDelete) {
               await tx.orderItem.delete({ where: { id: it.id } });
            }

            // 2. Update changed order items
            for (const it of itemsToUpdate) {
               await tx.orderItem.update({
                  where: { id: it.orderItemId },
                  data: {
                     name: it.name,
                     code: it.code,
                     quantity: it.quantity,
                     price: it.price,
                     subtotal: it.subtotal,
                     productId: it.productId,
                     variantId: it.variantId,
                  },
               });
            }

            // 3. Create newly added order items
            for (const it of itemsToCreate) {
               await tx.orderItem.create({
                  data: {
                     orderId: existingOrder.id,
                     name: it.name,
                     code: it.code,
                     quantity: it.quantity,
                     price: it.price,
                     subtotal: it.subtotal,
                     productId: it.productId,
                     variantId: it.variantId,
                  },
               });
            }

            // 4. Update inventory and record stock movements via the
            // shared stock engine: positive differences are validated
            // against available stock (ORD-01), warehouse stock is
            // mirrored (INV-01), and movements match the net change.
            const stockSettings = await loadStockSettings(tx);
            for (const { productId, variantId, diff } of stockDiffMap.values()) {
               if (diff === 0) continue;
               await applyStockDifference(tx, productId, diff, {
                  settings: stockSettings,
                  orderId: existingOrder.id,
                  variantId,
                  increaseNote: (qty) =>
                     `Order ${existingOrder.orderId || existingOrder.orderCode} items updated (+${qty} ordered)`,
                  decreaseNote: (qty) =>
                     `Order ${existingOrder.orderId || existingOrder.orderCode} items reduced/returned (-${qty})`,
               });
            }

            // 4b. Update customer info if provided
            if (body.customer && existingOrder.customerId) {
               await tx.customer.update({
                  where: { id: existingOrder.customerId },
                  data: {
                     name:
                        body.customer.name !== undefined
                           ? String(body.customer.name).trim()
                           : undefined,
                     phone:
                        body.customer.phone !== undefined
                           ? String(body.customer.phone).trim()
                           : undefined,
                     address:
                        body.customer.address !== undefined
                           ? String(body.customer.address).trim()
                           : undefined,
                     email:
                        body.customer.email !== undefined
                           ? String(body.customer.email).trim()
                           : undefined,
                  },
               });
            }

            // 5. Update Order record
            const updatedOrder = await tx.order.update({
               where: { id: existingOrder.id },
               data: {
                  subtotal: calculatedSubtotal,
                  deliveryCharge:
                     body.deliveryCharge !== undefined ? delivery : undefined,
                  discount:
                     body.discount !== undefined ? discount : undefined,
                  total: calculatedTotal,
                  dueAmount: calculatedDue,
                  status: normalizedStatus,
                  orderNote: updatedOrderNote,
                  orderTags: updatedOrderTags,
                  orderSource:
                     body.orderSource !== undefined
                        ? body.orderSource
                        : undefined,
                  paymentMethod:
                     body.paymentMethod !== undefined
                        ? body.paymentMethod
                        : undefined,
                  paymentTxId: paymentTxIdUpdate,
                  paymentSenderNumber: paymentSenderUpdate,
                  paymentStatus: paymentStatusUpdate as any,
                  courier:
                     body.courier !== undefined ? body.courier : undefined,
                  courierStatus:
                     body.courierStatus !== undefined
                        ? body.courierStatus
                        : undefined,
                  courierConsignmentId: courierConsignmentUpdate,
                  courierTrackingCode: courierTrackingUpdate,
                  courierProviderStatus: courierProviderStatusUpdate,
                  courierLastSyncAt: courierStamp,
                  advancePayment:
                     body.advancePayment !== undefined ? advance : undefined,
                  cancellationReason:
                     body.cancellationReason !== undefined
                        ? body.cancellationReason
                        : undefined,
                  deliveredAt: body.deliveredAt
                     ? new Date(body.deliveredAt)
                     : undefined,
               },
               include: {
                  customer: true,
                  employee: {
                     select: {
                        id: true,
                        name: true,
                        email: true,
                        phoneNumber: true,
                        customId: true,
                        role: { select: { name: true } },
                     },
                  },
                  items: {
                  include: {
                     product: true,
                     variant: {
                        select: { id: true, variantName: true, sku: true, barcode: true, attributes: true, quantity: true },
                     },
                  },
               },
               },
            });

            await writeOrderAudit(tx, updatedOrder);

            return updatedOrder;
         });

         return NextResponse.json(updated);
      }

      // Non-item update path.
      // ORD-04 fix: financial totals are ALWAYS recomputed server-side
      // from the stored subtotal and the effective delivery charge /
      // discount / advance payment. A client-sent dueAmount (or total)
      // is never trusted — previously it was stored verbatim and could
      // desynchronise totals from dues.
      // ORD-02 fix: a status transition into CANCELLED (or FAILED —
      // terminal, Phase B1 P1-1) releases the order's stock; a
      // transition out of a terminal status re-deducts it
      // (validated). Both happen in the same transaction as the update.
      const effectiveDelivery =
         body.deliveryCharge !== undefined
            ? Math.max(0, Number(body.deliveryCharge) || 0)
            : Number(existingOrder.deliveryCharge || 0);
      const effectiveDiscount =
         body.discount !== undefined
            ? Math.max(0, Number(body.discount) || 0)
            : Number(existingOrder.discount || 0);
      const effectiveAdvance =
         body.advancePayment !== undefined
            ? Math.max(0, Number(body.advancePayment) || 0)
            : Number(existingOrder.advancePayment || 0);
      const recomputedTotal = Math.max(
         0,
         Number(existingOrder.subtotal || 0) + effectiveDelivery - effectiveDiscount,
      );
      const recomputedDue = Math.max(0, recomputedTotal - effectiveAdvance);

      const nextStatus =
         normalizedStatus !== undefined
            ? normalizedStatus
            : existingOrder.status;
      const wasHoldingStock = orderHoldsStock(existingOrder);
      const willHoldStock = orderHoldsStock({
         status: nextStatus,
         isDeleted: existingOrder.isDeleted,
      });

      const updated = await prisma.$transaction(async (tx) => {
         // QA fix (S1, partial): in-transaction duplicate-TxID
         // re-check, same as the items path above.
         if (paymentTxIdUpdate) {
            const clash = await findOrderWithTxId(
               paymentTxIdUpdate,
               existingOrder.id,
               tx,
            );
            if (clash) throw new DuplicateTxIdError(paymentTxIdUpdate, clash);
         }

         if (body.customer && existingOrder.customerId) {
            await tx.customer.update({
               where: { id: existingOrder.customerId },
               data: {
                  name:
                     body.customer.name !== undefined
                        ? String(body.customer.name).trim()
                        : undefined,
                  phone:
                     body.customer.phone !== undefined
                        ? String(body.customer.phone).trim()
                        : undefined,
                  address:
                     body.customer.address !== undefined
                        ? String(body.customer.address).trim()
                        : undefined,
                  email:
                     body.customer.email !== undefined
                        ? String(body.customer.email).trim()
                        : undefined,
               },
            });
         }

         const itemLines = existingOrder.items
            .filter((it) => it.productId)
            .map((it) => ({
               productId: it.productId as string,
               quantity: it.quantity,
               variantId: it.variantId,
            }));

         if (wasHoldingStock && !willHoldStock) {
            await restoreStockForItems(tx, itemLines, {
               orderId: existingOrder.id,
               note: `Order ${existingOrder.orderId || existingOrder.orderCode} ${nextStatus === "FAILED" ? "failed" : "cancelled"} — stock restored`,
            });
         } else if (!wasHoldingStock && willHoldStock) {
            const stockSettings = await loadStockSettings(tx);
            await deductStockForItems(tx, itemLines, {
               settings: stockSettings,
               orderId: existingOrder.id,
               note: `Order ${existingOrder.orderId || existingOrder.orderCode} reactivated — stock deducted`,
            });
         }

         const updatedOrder = await tx.order.update({
            where: { id: existingOrder.id },
            data: {
               status: normalizedStatus,
               orderNote: updatedOrderNote,
               orderTags: updatedOrderTags,
               orderSource:
                  body.orderSource !== undefined ? body.orderSource : undefined,
               paymentMethod:
                  body.paymentMethod !== undefined
                     ? body.paymentMethod
                     : undefined,
               paymentTxId: paymentTxIdUpdate,
               paymentSenderNumber: paymentSenderUpdate,
               paymentStatus: paymentStatusUpdate as any,
               courier: body.courier !== undefined ? body.courier : undefined,
               courierStatus:
                  body.courierStatus !== undefined
                     ? body.courierStatus
                     : undefined,
               courierConsignmentId: courierConsignmentUpdate,
               courierTrackingCode: courierTrackingUpdate,
               courierProviderStatus: courierProviderStatusUpdate,
               courierLastSyncAt: courierStamp,
               deliveryCharge:
                  body.deliveryCharge !== undefined ? effectiveDelivery : undefined,
               discount:
                  body.discount !== undefined ? effectiveDiscount : undefined,
               advancePayment:
                  body.advancePayment !== undefined ? effectiveAdvance : undefined,
               total: recomputedTotal,
               dueAmount: recomputedDue,
               cancellationReason:
                  body.cancellationReason !== undefined
                     ? body.cancellationReason
                     : undefined,
               deliveredAt: body.deliveredAt
                  ? new Date(body.deliveredAt)
                  : undefined,
            },
            include: {
               customer: true,
               employee: {
                  select: {
                     id: true,
                     name: true,
                     email: true,
                     phoneNumber: true,
                     customId: true,
                     role: { select: { name: true } },
                  },
               },
               items: {
                  include: {
                     product: true,
                     variant: {
                        select: { id: true, variantName: true, sku: true, barcode: true, attributes: true, quantity: true },
                     },
                  },
               },
            },
         });

         await writeOrderAudit(tx, updatedOrder);

         return updatedOrder;
      });

      return NextResponse.json(updated);
   } catch (err: any) {
      console.error("PUT /api/orders/[id] error:", err);
      if (err instanceof InsufficientStockError) {
         return NextResponse.json(
            { error: "Insufficient stock", message: err.message },
            { status: 400 },
         );
      }
      if (err instanceof InvalidVariantError) {
         return NextResponse.json(
            { error: "Invalid variant", message: err.message },
            { status: 400 },
         );
      }
      if (err instanceof DuplicateTxIdError) {
         return NextResponse.json(
            { error: "Duplicate transaction ID", message: err.message },
            { status: 409 },
         );
      }
      // ORD-06 fix: do not leak raw internal error messages to clients.
      return NextResponse.json(
         { error: "Failed to update order" },
         { status: 500 },
      );
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ["orders", "order", "order_delete"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      // ORD-02 fix: soft-deleting an order releases the stock it was
      // holding, exactly once — the transaction checks the order's
      // current state first, so a repeated delete (or deleting an
      // already-cancelled order, whose stock was released at cancel
      // time) never restores stock twice.
      const order = await prisma.$transaction(async (tx) => {
         const existing = await tx.order.findUnique({
            where: { id },
            include: { items: true },
         });

         if (!existing) {
            throw new Error("Order not found");
         }

         if (!existing.isDeleted) {
            // Follow-up round: the audit summary must reflect
            // whether stock was actually restored — a CANCELLED
            // order holds no stock (released at cancel time), so
            // claiming "stock restored" for it was wrong. Phase B1
            // (P1-1): FAILED is terminal exactly like CANCELLED, so
            // the summary names the actual status instead of
            // hard-coding "cancelled".
            const stockRestored = orderHoldsStock(existing);
            if (stockRestored) {
               await restoreStockForItems(
                  tx,
                  existing.items
                     .filter((it) => it.productId)
                     .map((it) => ({
                        productId: it.productId as string,
                        quantity: it.quantity,
                        variantId: it.variantId,
                     })),
                  {
                     orderId: existing.id,
                     note: `Order ${existing.orderId || existing.orderCode} deleted — stock restored`,
                  },
               );
            }

            const deleted = await tx.order.update({
               where: { id },
               data: { isDeleted: true, deletedAt: new Date() },
            });

            // Phase 4 (D1): audit in the same transaction.
            await logAudit(tx, {
               actor: auditActorFromContext(gate),
               action: "DELETE",
               entityType: "ORDER",
               entityId: existing.id,
               entityCustomId: existing.orderId || existing.customId,
               summary: stockRestored
                  ? `Order ${existing.orderId || existing.customId} moved to bin — stock restored`
                  : `Order ${existing.orderId || existing.customId} moved to bin — no stock restored (order was ${existing.status})`,
               ...requestAuditContext(request),
            });

            return deleted;
         }

         return existing;
      });

      return NextResponse.json({ message: "Order moved to bin", order });
   } catch {
      return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
   }
}
