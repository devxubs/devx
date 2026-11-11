import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   loadStockSettings,
   applyStockDifference,
   deductStockForItems,
   restoreStockForItems,
   orderHoldsStock,
   InsufficientStockError,
} from "@src/lib/stock";

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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
            items: { include: { product: true } },
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
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { id } = await params;

   try {
      const body = await request.json();

      const existingOrder = await prisma.order.findFirst({
         where: {
            OR: [{ id }, { orderCode: id }, { customId: id }, { orderId: id }, { invoiceNo: id }],
         },
         include: { items: { include: { product: true } } },
      });

      if (!existingOrder) {
         return NextResponse.json({ error: "Order not found" }, { status: 404 });
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

      // 2. Audit Status Changes
      if (body.status !== undefined && body.status !== existingOrder.status) {
         if (body.status === "CANCELLED") {
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
               action: `Status Changed to ${body.status}`,
               category: "workflow",
               actor: auditActor,
               details: `Status transitioned from ${existingOrder.status} to ${body.status}`,
               diff: {
                  field: "status",
                  previous: existingOrder.status,
                  new: body.status,
               },
               timestamp: nowIso,
               icon: "solar:refresh-bold",
               badgeLabel: body.status,
               isImportant: body.status === "DELIVERED" || body.status === "COMPLETED",
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

            resolvedItems.push({
               orderItemId,
               candidateProductId: candidateId || null,
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
               name: it.name,
               code: it.code,
               quantity: it.quantity,
               price: it.price,
               subtotal: it.subtotal,
            });
         }

         // Step 4: Calculate net stock difference per product.
         // ORD-02 fix: the difference is computed between the stock
         // the order EFFECTIVELY held before and after this update.
         // An order only holds stock while it is neither CANCELLED nor
         // deleted — so transitioning into CANCELLED releases the full
         // item quantities, and un-cancelling re-deducts them, instead
         // of stock leaking on every status change.
         const wasHoldingStock = orderHoldsStock(existingOrder);
         const nextStatus =
            body.status !== undefined ? body.status : existingOrder.status;
         const willHoldStock = nextStatus !== "CANCELLED";

         const stockDiffMap = new Map<string, number>();

         if (wasHoldingStock) {
            for (const existingIt of existingOrder.items) {
               if (existingIt.productId) {
                  stockDiffMap.set(
                     existingIt.productId,
                     (stockDiffMap.get(existingIt.productId) || 0) -
                        existingIt.quantity,
                  );
               }
            }
         }

         if (willHoldStock) {
            for (const newIt of finalItemsData) {
               if (newIt.productId) {
                  stockDiffMap.set(
                     newIt.productId,
                     (stockDiffMap.get(newIt.productId) || 0) + newIt.quantity,
                  );
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
               existing.productId === it.productId;
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
                  },
               });
            }

            // 4. Update inventory and record stock movements via the
            // shared stock engine: positive differences are validated
            // against available stock (ORD-01), warehouse stock is
            // mirrored (INV-01), and movements match the net change.
            const stockSettings = await loadStockSettings(tx);
            for (const [productId, diff] of stockDiffMap.entries()) {
               if (diff === 0) continue;
               await applyStockDifference(tx, productId, diff, {
                  settings: stockSettings,
                  orderId: existingOrder.id,
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
                  status: body.status !== undefined ? body.status : undefined,
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
                  courier:
                     body.courier !== undefined ? body.courier : undefined,
                  courierStatus:
                     body.courierStatus !== undefined
                        ? body.courierStatus
                        : undefined,
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
                  items: { include: { product: true } },
               },
            });

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
      // ORD-02 fix: a status transition into CANCELLED releases the
      // order's stock; a transition out of CANCELLED re-deducts it
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
         body.status !== undefined ? body.status : existingOrder.status;
      const wasHoldingStock = orderHoldsStock(existingOrder);
      const willHoldStock = nextStatus !== "CANCELLED";

      const updated = await prisma.$transaction(async (tx) => {
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
            }));

         if (wasHoldingStock && !willHoldStock) {
            await restoreStockForItems(tx, itemLines, {
               orderId: existingOrder.id,
               note: `Order ${existingOrder.orderId || existingOrder.orderCode} cancelled — stock restored`,
            });
         } else if (!wasHoldingStock && willHoldStock) {
            const stockSettings = await loadStockSettings(tx);
            await deductStockForItems(tx, itemLines, {
               settings: stockSettings,
               orderId: existingOrder.id,
               note: `Order ${existingOrder.orderId || existingOrder.orderCode} reactivated — stock deducted`,
            });
         }

         return tx.order.update({
            where: { id: existingOrder.id },
            data: {
               status: body.status !== undefined ? body.status : undefined,
               orderNote: updatedOrderNote,
               orderTags: updatedOrderTags,
               orderSource:
                  body.orderSource !== undefined ? body.orderSource : undefined,
               paymentMethod:
                  body.paymentMethod !== undefined
                     ? body.paymentMethod
                     : undefined,
               courier: body.courier !== undefined ? body.courier : undefined,
               courierStatus:
                  body.courierStatus !== undefined
                     ? body.courierStatus
                     : undefined,
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
               items: { include: { product: true } },
            },
         });
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
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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
            if (orderHoldsStock(existing)) {
               await restoreStockForItems(
                  tx,
                  existing.items
                     .filter((it) => it.productId)
                     .map((it) => ({
                        productId: it.productId as string,
                        quantity: it.quantity,
                     })),
                  {
                     orderId: existing.id,
                     note: `Order ${existing.orderId || existing.orderCode} deleted — stock restored`,
                  },
               );
            }

            return tx.order.update({
               where: { id },
               data: { isDeleted: true },
            });
         }

         return existing;
      });

      return NextResponse.json({ message: "Order moved to bin", order });
   } catch {
      return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
   }
}
