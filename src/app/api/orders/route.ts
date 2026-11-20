import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { parsePagination } from "@src/lib/pagination";
import {
   calculateOrderTotals,
   clampNonNegativeMoney,
   normalizeOrderLineInput,
   overpaidAmountOf,
} from "@src/lib/utils";
import { generateNextEntityId } from "@src/lib/idGenerator";
import {
   loadStockSettings,
   deductStockForItems,
   orderHoldsStock,
   findVariantlessVariableLine,
   InsufficientStockError,
   InvalidVariantError,
} from "@src/lib/stock";
import {
   normalizeOrderStatus,
   VALID_ORDER_WHERE,
   type OrderStatusValue,
} from "@src/lib/orderStatus";
import {
   findOrderWithTxId,
   duplicateTxIdMessage,
   DuplicateTxIdError,
   orderTxIdMethodError,
} from "@src/lib/payments";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { searchParams } = new URL(request.url);
   // Follow-up round: the ?all=true / ?export=true escape hatch
   // (one unbounded 10,000-row response for any active session) is
   // removed — no client used it; exports page through this list
   // via fetchAllPages. The route now always paginates normally.
   const { page, limit } = parsePagination(searchParams, 20);
   const search = searchParams.get("search")?.trim() || "";
   const status = searchParams.get("status") || undefined;
   const excludeStatus = searchParams.get("excludeStatus") === "true";
   const orderSource = searchParams.get("orderSource") || undefined;
   const excludeOrderSource = searchParams.get("excludeOrderSource") === "true";
   const district = searchParams.get("district")?.trim() || undefined;
   const excludeDistrict = searchParams.get("excludeDistrict") === "true";
   const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
   const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
   const startDate = searchParams.get("startDate") || undefined;
   const endDate = searchParams.get("endDate") || undefined;
   const customerType = searchParams.get("customerType")?.trim() || undefined;

   // Extended filter fields from reference UI
   const courier = searchParams.get("courier")?.trim() || undefined;
   const excludeCourier = searchParams.get("excludeCourier") === "true";
   const courierStatus = searchParams.get("courierStatus")?.trim() || undefined;
   const excludeCourierStatus = searchParams.get("excludeCourierStatus") === "true";
   const printStatus = searchParams.get("printStatus")?.trim() || undefined;
   const orderType = searchParams.get("orderType")?.trim() || undefined;
   const employee = searchParams.get("employee")?.trim() || undefined;
   const product = searchParams.get("product")?.trim() || undefined;
   const excludeProduct = searchParams.get("excludeProduct") === "true";
   const category = searchParams.get("category")?.trim() || undefined;
   const excludeCategory = searchParams.get("excludeCategory") === "true";
   const note = searchParams.get("note")?.trim() || undefined;
   const utmSource = searchParams.get("utmSource")?.trim() || undefined;
   const excludeUtmSource = searchParams.get("excludeUtmSource") === "true";
   const referenceId = searchParams.get("referenceId")?.trim() || undefined;
   const pathaoCity = searchParams.get("pathaoCity")?.trim() || undefined;
   const pathaoZone = searchParams.get("pathaoZone")?.trim() || undefined;
   const cancellationReason = searchParams.get("cancelReason")?.trim() || undefined;
   const bdMobileNumber = searchParams.get("bdMobileNumber")?.trim() || undefined;
   const paymentStatus = searchParams.get("paymentStatus")?.trim() || undefined;
   const deliveryCharge = searchParams.get("deliveryCharge")?.trim() || undefined;
   const discountAmount = searchParams.get("discountAmount") ? Number(searchParams.get("discountAmount")) : undefined;
   const discountOp = searchParams.get("discountOp")?.trim() || "Greater";
   const orderTag = searchParams.get("orderTag")?.trim() || undefined;
   const customerTag = searchParams.get("customerTag")?.trim() || undefined;
   const duplicateOrders = searchParams.get("duplicateOrders") === "true";
   const hasEmployee = searchParams.get("hasEmployee") === "true";
   const hasCampaign = searchParams.get("hasCampaign") === "true";
   const sortBy = searchParams.get("sortBy")?.trim() || "createdAt";
   const sortOrder = searchParams.get("sortOrder")?.toLowerCase() === "asc" ? "asc" : "desc";

   const skip = (page - 1) * limit;

   const where: any = {
      isDeleted: false,
   };

   if (search) {
      where.OR = [
         { orderCode: { contains: search } },
         { orderId: { contains: search } },
         { customId: { contains: search } },
         { invoiceNo: { contains: search } },
         { customer: { name: { contains: search } } },
         { customer: { phone: { contains: search } } },
      ];
   }

   // 1. Status with Exclude support. Phase B1 (P1-4): each token is
   // normalised through the shared normaliser, so the Title-Case
   // values the order filters send ("Out for Delivery") match the
   // stored enum (OUT_FOR_DELIVERY) instead of the invalid
   // "OUT FOR DELIVERY" the old plain upper-casing produced. A token
   // that does not normalise keeps its upper-cased form, preserving
   // the previous behaviour for anything else.
   if (status && status !== "All") {
      const statuses = status
         .split(",")
         .map((s) => normalizeOrderStatus(s) ?? s.trim().toUpperCase())
         .filter(Boolean);
      if (excludeStatus) {
         where.status = { notIn: statuses };
      } else {
         if (statuses.length === 1) {
            where.status = statuses[0];
         } else if (statuses.length > 1) {
            where.status = { in: statuses };
         }
      }
   }

   // 2. Order Source with Exclude support
   if (orderSource && orderSource !== "All") {
      const sources = orderSource.split(",").map((s) => s.trim()).filter(Boolean);
      if (excludeOrderSource) {
         where.orderSource = { notIn: sources };
      } else {
         if (sources.length === 1) {
            where.orderSource = sources[0];
         } else if (sources.length > 1) {
            where.orderSource = { in: sources };
         }
      }
   }

   // 3. District with Exclude support
   if (district && district !== "All") {
      if (excludeDistrict) {
         where.customer = { ...where.customer, address: { not: { contains: district } } };
      } else {
         where.customer = { ...where.customer, address: { contains: district } };
      }
   }

   // 4. Courier & Courier Status with Exclude
   if (courier && courier !== "All") {
      where.courier = excludeCourier ? { not: courier } : courier;
   }
   if (courierStatus && courierStatus !== "All") {
      where.courierStatus = excludeCourierStatus ? { not: courierStatus } : courierStatus;
   }

   // 5. Print Status & Order Type
   if (printStatus && printStatus !== "All") {
      where.printStatus = printStatus;
   }
   if (orderType && orderType !== "All") {
      where.orderType = orderType;
   }

   // 6. Employee filter
   // ORD-05 fix: this used to append into the same top-level OR array
   // as the text search, turning "search AND employee" into
   // "search OR employee". Keep each filter dimension in its own
   // AND-ed OR group so filters always combine restrictively.
   if (employee && employee !== "All") {
      where.AND = [
         ...(where.AND || []),
         {
            OR: [
               { employeeId: employee },
               { employee: { name: { contains: employee } } },
            ],
         },
      ];
   }

   // 7. Product selection with Exclude
   if (product && product !== "All") {
      if (excludeProduct) {
         where.items = { none: { name: { contains: product } } };
      } else {
         where.items = { some: { name: { contains: product } } };
      }
   }

   // 8. Category selection with Exclude
   if (category && category !== "All") {
      if (excludeCategory) {
         where.items = { none: { product: { category: { name: { contains: category } } } } };
      } else {
         where.items = { some: { product: { category: { name: { contains: category } } } } };
      }
   }

   // 9. Note filter
   if (note && note !== "All" && note !== "All Time") {
      if (note === "Has Note") {
         where.orderNote = { not: null };
      } else if (note === "No Note") {
         where.orderNote = null;
      } else {
         where.orderNote = { contains: note };
      }
   }

   // 10. UTM Source with Exclude
   if (utmSource && utmSource !== "All" && utmSource !== "Any") {
      where.utmSource = excludeUtmSource ? { not: { contains: utmSource } } : { contains: utmSource };
   }

   // 11. Reference ID
   if (referenceId) {
      where.referenceId = { contains: referenceId };
   }

   // 12. Pathao City / Zone
   if (pathaoCity) {
      where.pathaoCity = { contains: pathaoCity };
   }
   if (pathaoZone) {
      where.pathaoZone = { contains: pathaoZone };
   }

   // 13. Cancellation Reason
   if (cancellationReason && cancellationReason !== "All") {
      where.cancellationReason = { contains: cancellationReason };
   }

   // 14. BD Mobile condition
   if (bdMobileNumber && (bdMobileNumber === "Valid BD" || bdMobileNumber === "11 Digits")) {
      where.customer = { ...where.customer, phone: { startsWith: "01" } };
   }

   // 15. Price Range
   if (minPrice != null || maxPrice != null) {
      where.total = {};
      if (minPrice != null) where.total.gte = minPrice;
      if (maxPrice != null) where.total.lte = maxPrice;
   }

   // 16. Date Range
   if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
         const end = new Date(endDate);
         end.setHours(23, 59, 59, 999);
         where.createdAt.lte = end;
      }
   }

   // 17. Customer Type. Phase B1 (P1-2): "many orders" uses the ONE
   // canonical valid-order definition (lib/orderStatus) — the old
   // groupBy counted ALL orders including soft-deleted, CANCELLED
   // and FAILED ones, unlike the Customers page's New/Returning rule
   // (New ≤1 / Returning >1 VALID orders).
   if (customerType && (customerType === "New" || customerType === "Regular")) {
      const customersWithManyOrders = await prisma.order.groupBy({
         by: ["customerId"],
         where: { ...VALID_ORDER_WHERE },
         _count: { id: true },
         having: { id: { _count: { gt: 1 } } },
      });
      const regularCustomerIds = customersWithManyOrders
         .map((c) => c.customerId)
         .filter((id): id is string => Boolean(id));

      if (customerType === "New") {
         where.customerId = { notIn: regularCustomerIds };
      } else {
         where.customerId = { in: regularCustomerIds };
      }
   }

   // 18. Payment Status
   if (paymentStatus && paymentStatus !== "All") {
      if (paymentStatus === "Paid") {
         where.dueAmount = { lte: 0 };
      } else if (paymentStatus === "Unpaid") {
         where.advancePayment = { lte: 0 };
      } else if (paymentStatus === "Partial") {
         where.AND = [
            ...(where.AND || []),
            { advancePayment: { gt: 0 } },
            { dueAmount: { gt: 0 } },
         ];
      }
   }

   // 19. Delivery Charge
   if (deliveryCharge && deliveryCharge !== "All") {
      if (deliveryCharge === "Free" || deliveryCharge === "0") {
         where.deliveryCharge = { lte: 0 };
      } else if (!isNaN(Number(deliveryCharge))) {
         where.deliveryCharge = Number(deliveryCharge);
      }
   }

   // 20. Discount
   if (discountAmount != null && !isNaN(discountAmount)) {
      if (discountOp.includes("Less")) {
         where.discount = { lte: discountAmount };
      } else if (discountOp === "Equal") {
         where.discount = discountAmount;
      } else {
         where.discount = { gte: discountAmount };
      }
   }

   // 21. Order Tags & Customer Tags
   if (orderTag && orderTag !== "All") {
      where.orderTags = { not: null };
   }
   if (customerTag && customerTag !== "All") {
      where.customerTags = { not: null };
   }

   // 22. Duplicate Orders
   if (duplicateOrders) {
      const multiCustomers = await prisma.order.groupBy({
         by: ["customerId"],
         _count: { id: true },
         having: { id: { _count: { gt: 1 } } },
      });
      const multiIds = multiCustomers.map((c) => c.customerId).filter(Boolean);
      where.customerId = { in: multiIds };
   }

   // 23. Has Employee / Has Campaign
   if (hasEmployee) {
      where.employeeId = { not: null };
   }
   if (hasCampaign) {
      where.referenceId = { not: null };
   }

   const allowedSortFields = ["createdAt", "total", "orderId", "status", "deliveryCharge", "discount"];
   const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
   const orderClause = { [validSortBy]: sortOrder };

   try {
      const [orders, total, aggregates, statusGroup] = await Promise.all([
         prisma.order.findMany({
            where,
            skip,
            take: limit,
            // P4-1 (audit §F.7/O-01): select only the fields the list
            // UI actually renders. Every Order scalar is kept (the
            // table, Quick Edit, bulk modals and the print flow read
            // assorted order fields), but the relations are narrowed:
            // the old `customer: true` / `product: true` includes
            // shipped the full customer row and the full product row
            // (incl. the Text `content`, specifications and every
            // price column) for every line of every order on the page.
            // The consumers read exactly: customer id/name/email/
            // phone/address; item id/productId/variantId/name/code/
            // quantity/price/subtotal; product id/productCode/
            // productName/images/isDeleted; the variant select below
            // is unchanged from the previous include.
            select: {
               id: true,
               customId: true,
               orderCode: true,
               orderId: true,
               invoiceNo: true,
               status: true,
               orderNote: true,
               orderSource: true,
               paymentMethod: true,
               subtotal: true,
               deliveryCharge: true,
               discount: true,
               total: true,
               advancePayment: true,
               dueAmount: true,
               paymentTxId: true,
               paymentSenderNumber: true,
               paymentStatus: true,
               cancellationReason: true,
               deliveredAt: true,
               isDeleted: true,
               deletedAt: true,
               courier: true,
               courierStatus: true,
               courierCharge: true,
               courierSubmittedAt: true,
               printStatus: true,
               printedAt: true,
               orderType: true,
               orderTags: true,
               customerTags: true,
               utmSource: true,
               referenceId: true,
               pathaoCity: true,
               pathaoZone: true,
               courierConsignmentId: true,
               courierTrackingCode: true,
               courierProviderStatus: true,
               courierLastSyncAt: true,
               customerId: true,
               employeeId: true,
               createdAt: true,
               updatedAt: true,
               customer: {
                  select: { id: true, customId: true, name: true, email: true, phone: true, address: true },
               },
               employee: { select: { id: true, name: true, email: true, phoneNumber: true, customId: true } },
               items: {
                  select: {
                     id: true,
                     productId: true,
                     variantId: true,
                     name: true,
                     code: true,
                     quantity: true,
                     price: true,
                     subtotal: true,
                     product: {
                        select: { id: true, productCode: true, productName: true, images: true, isDeleted: true },
                     },
                     variant: {
                        select: { id: true, variantName: true, sku: true, barcode: true, attributes: true, quantity: true },
                     },
                  },
               },
            },
            orderBy: orderClause,
         }),
         prisma.order.count({ where }),
         prisma.order.aggregate({
            where,
            _sum: {
               subtotal: true,
               discount: true,
               deliveryCharge: true,
               total: true,
               advancePayment: true,
               dueAmount: true,
            },
         }),
         prisma.order.groupBy({
            by: ["status"],
            where: { isDeleted: false },
            _count: { id: true },
         }),
      ]);

      const productTotal = Number(aggregates._sum.subtotal || 0);
      const discount = Number(aggregates._sum.discount || 0);
      const afterDiscount = Math.max(0, productTotal - discount);
      const totalShipping = Number(aggregates._sum.deliveryCharge || 0);
      const grandTotal = Number(aggregates._sum.total || 0);
      const paid = Number(aggregates._sum.advancePayment || 0);
      const due = Number(aggregates._sum.dueAmount || 0);

      const statusCounts: Record<string, number> = {};
      statusGroup.forEach((g) => {
         statusCounts[g.status] = g._count.id;
      });

      return NextResponse.json({
         // C4-3 (audit C-13 / P2-12): additive computed field — the
         // advance excess over the total, previously recorded
         // nowhere (due simply floored at 0). Totals/due math is
         // unchanged; this only makes the customer credit visible.
         orders: orders.map((o) => ({
            ...o,
            overpaidAmount: overpaidAmountOf(o),
         })),
         total,
         page,
         limit,
         summary: {
            productTotal,
            discount,
            afterDiscount,
            totalShipping,
            grandTotal,
            paid,
            due,
            returnDamage: 0,
            returnDiscount: 0,
         },
         ordersByStatus: statusCounts,
      });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch orders" },
         { status: 500 },
      );
   }
}

export async function POST(request: NextRequest) {
   const gate = await requirePermission(request, ["orders", "order", "order_create"]);
   if (gate instanceof NextResponse) return gate;
   const session = gate.session;

   try {
      const body = await request.json();
      const { customer, products, pricing, orderNote, orderSource, status } = body;

      // Phase B1 (P1-4): normalise the status at the API boundary.
      // The Publish flow sends Title Case ("Out for Delivery"); the
      // old code only upper-cased it, storing the invalid
      // "OUT FOR DELIVERY" instead of the OUT_FOR_DELIVERY enum.
      // Unknown statuses are a 400, never a 500.
      let normalizedStatus: OrderStatusValue = "PENDING";
      if (status !== undefined && status !== null && status !== "") {
         const normalized = normalizeOrderStatus(status);
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

      if (!Array.isArray(products) || products.length === 0) {
         return NextResponse.json(
            { error: "At least one product is required for an order" },
            { status: 400 },
         );
      }

      // INV-02: validate variant references before writing anything —
      // every variantId must name a live variant of the line's own
      // product, otherwise the sale could never move the right stock.
      const requestedVariantIds = Array.from(
         new Set(
            products
               .map((p: any) => p.variantId)
               .filter((v: any): v is string => Boolean(v)),
         ),
      );
      if (requestedVariantIds.length > 0) {
         const foundVariants = await prisma.productVariant.findMany({
            where: { id: { in: requestedVariantIds } },
            select: { id: true, productId: true, variantName: true, isDeleted: true },
         });
         const variantById = new Map(foundVariants.map((v) => [v.id, v]));
         for (const p of products) {
            if (!p.variantId) continue;
            const variant = variantById.get(p.variantId);
            if (!variant || variant.isDeleted || variant.productId !== p.id) {
               return NextResponse.json(
                  {
                     error: "Invalid variant",
                     message: `Variant '${p.variantId}' does not belong to product '${p.name || p.productName || p.id || "unknown"}'.`,
                  },
                  { status: 400 },
               );
            }
         }
      }

      // QA fix (B1): the mirror image of the check above — a line
      // naming a variable product but NO variant would be deducted
      // from the product pool only, silently breaking the
      // Product.quantity = Σ variant quantities invariant. Reject it;
      // the caller must pick the variant being sold.
      const variantless = await findVariantlessVariableLine(
         prisma,
         products.map((p: any) => ({
            productId: p.id || null,
            variantId: p.variantId || null,
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

      // Phase 2 (2.5): notes + courier are accepted in the create
      // request and stored inside the same transaction. Previously the
      // client had to follow a successful POST with a separate PUT to
      // persist the four order notes (Courier / Customer / Packing /
      // Employee — kept as separate orderTags keys, exactly as the PUT
      // handler merges them) and the courier, and a failed PUT silently
      // lost them. The explicit note fields win over any same-named key
      // inside a caller-supplied orderTags object, mirroring PUT.
      const initialTags: Record<string, any> = {
         ...(body.orderTags && typeof body.orderTags === "object"
            ? body.orderTags
            : {}),
      };
      if (body.courierNote !== undefined)
         initialTags.courierNote = String(body.courierNote || "").trim();
      if (body.customerNote !== undefined)
         initialTags.customerNote = String(body.customerNote || "").trim();
      if (body.packingNote !== undefined)
         initialTags.packingNote = String(body.packingNote || "").trim();
      if (body.employeeNote !== undefined)
         initialTags.employeeNote = String(body.employeeNote || "").trim();

      // Phase 3B (3.6): payment reconciliation fields. The TxID and
      // sender number ride in the pricing payload (top-level fields
      // are also accepted). A non-empty TxID must not already belong
      // to another non-deleted order — app-level 409 per schema plan
      // §2 (no DB unique constraint, so the error can name the other
      // order instead of surfacing as a raw database failure).
      const paymentTxId = String(
         pricing?.paymentTxId ?? body.paymentTxId ?? "",
      ).trim();
      const paymentSenderNumber = String(
         pricing?.paymentSenderNumber ?? body.paymentSenderNumber ?? "",
      ).trim();
      // C4-2 (audit P2-11): a TxID is only meaningful with a mobile
      // payment method — reject the pairing with 400 instead of
      // storing an unreconcilable reference (neither POST nor PUT
      // checked this before; POST now enforces the stricter rule).
      const effectivePaymentMethod =
         pricing?.paymentMethod || "Cash on Delivery";
      const txMethodError = orderTxIdMethodError(
         effectivePaymentMethod,
         paymentTxId,
      );
      if (txMethodError) {
         return NextResponse.json(
            { error: "Validation error", message: txMethodError },
            { status: 400 },
         );
      }
      if (paymentTxId) {
         const clash = await findOrderWithTxId(paymentTxId);
         if (clash) {
            return NextResponse.json(
               {
                  error: "Duplicate transaction ID",
                  message: duplicateTxIdMessage(paymentTxId, clash),
               },
               { status: 409 },
            );
         }
      }

      // C4-2 (audit C-12 / P2-11): POST validation parity with PUT.
      // Line quantity/price are normalised with EXACTLY the PUT
      // handler's clamps (quantity max(1, …), price max(0, …)) and
      // the pricing money fields are clamped non-negative the way
      // PUT's safeMoney does — previously a negative quantity stored
      // a negative line (an inventory-invisible discount: the stock
      // engine floors line quantities to 0), a negative discount
      // acted as a surcharge, and a negative advance inflated the
      // due. Advance is NOT capped at the total: PUT doesn't cap it
      // either (due floors at 0), and the excess is now surfaced as
      // overpaidAmount (C4-3) instead of being silently dropped.
      const normalizedProducts = products.map((p: any) => {
         const { quantity, price } = normalizeOrderLineInput(p);
         return { ...p, quantity, price };
      });

      // Compute authoritative server-side totals
      const totals = calculateOrderTotals(
         normalizedProducts.map((p: any) => ({
            price: p.price,
            quantity: p.quantity,
         })),
         clampNonNegativeMoney(pricing?.deliveryCharge),
         clampNonNegativeMoney(pricing?.discount),
         clampNonNegativeMoney(pricing?.advancePayment),
      );

      // Execute order creation + inventory deduction in an atomic transaction
      const order = await prisma.$transaction(async (tx) => {
         // QA fix (S1, partial): re-run the duplicate-TxID check
         // inside the transaction, narrowing the window in which two
         // concurrent creates could both pass the pre-check above.
         // The schema plan deliberately rejected a DB unique
         // constraint, so a narrow race remains by design — a
         // duplicate that does slip through stays visible in the
         // Payments reconciliation tab.
         if (paymentTxId) {
            const clash = await findOrderWithTxId(paymentTxId, undefined, tx);
            if (clash) throw new DuplicateTxIdError(paymentTxId, clash);
         }

         let customerId: string | null = null;
         if (customer?.name) {
            if (customer.id) {
               customerId = customer.id;
            } else {
               // CUS-01 fix: reuse an existing customer with the same
               // phone number instead of minting a duplicate record on
               // every order.
               const normalizedPhone = customer.phone
                  ? String(customer.phone).replace(/[\s-]/g, "")
                  : null;
               const existingByPhone = normalizedPhone
                  ? await tx.customer.findFirst({
                       where: { phone: normalizedPhone, isDeleted: false },
                    })
                  : null;

               if (existingByPhone) {
                  customerId = existingByPhone.id;
               } else {
                  const { customId: cusId } = await generateNextEntityId("CUSTOMER", tx);
                  const newCustomer = await tx.customer.create({
                     data: {
                        customId: cusId,
                        name: customer.name,
                        email: customer.email || null,
                        phone: normalizedPhone,
                        address: customer.address || null,
                     },
                  });
                  customerId = newCustomer.id;
               }
            }
         }

         const { customId, orderCode, seq } = await generateNextEntityId("ORDER", tx);
         const orderId = orderCode || customId;
         const invoiceNo = `INV_${seq}`;

         const createdOrder = await tx.order.create({
            data: {
               customId: orderId,
               orderCode: orderId,
               orderId,
               invoiceNo,
               status: normalizedStatus as any,
               orderNote: orderNote || null,
               orderSource: orderSource || null,
               courier: body.courier ? String(body.courier) : null,
               orderTags:
                  Object.keys(initialTags).length > 0 ? initialTags : undefined,
               paymentMethod: effectivePaymentMethod,
               paymentTxId: paymentTxId || null,
               paymentSenderNumber: paymentSenderNumber || null,
               subtotal: totals.subtotal,
               deliveryCharge: totals.deliveryCharge,
               discount: totals.discount,
               total: totals.total,
               advancePayment: totals.advancePayment,
               dueAmount: totals.dueAmount,
               customerId,
               employeeId: session.id,
               items: {
                  create: normalizedProducts.map((p: any) => ({
                     productId: p.id || null,
                     variantId: p.variantId || null,
                     name: p.name || p.productName,
                     code: p.code || null,
                     quantity: p.quantity,
                     price: p.price,
                     subtotal: p.price * p.quantity,
                  })),
               },
            },
            include: {
               items: true,
               customer: true,
            },
         });

         // Decrement inventory and record stock movements.
         // ORD-01/SET-01 fix: availability is validated inside this
         // transaction via the shared stock engine, honouring
         // StoreSetting.enableStockValidation and per-product
         // allowNegativeStock; warehouse stock is mirrored (INV-01).
         // An order created directly in a terminal status (CANCELLED
         // or FAILED — Phase B1, P1-1) never holds stock, so no
         // deduction happens for it.
         if (orderHoldsStock({ status: normalizedStatus, isDeleted: false })) {
            const stockSettings = await loadStockSettings(tx);
            await deductStockForItems(
               tx,
               createdOrder.items
                  .filter((it) => it.productId)
                  .map((it) => ({
                     productId: it.productId as string,
                     quantity: it.quantity,
                     variantId: it.variantId,
                  })),
               {
                  settings: stockSettings,
                  orderId: createdOrder.id,
                  note: `POS Order ${orderId}`,
               },
            );
         }

         // Phase 4 (D1): audit in the same transaction.
         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "CREATE",
            entityType: "ORDER",
            entityId: createdOrder.id,
            entityCustomId: orderId,
            summary: `Order ${orderId} created — total ৳${totals.total.toFixed(2)}, due ৳${totals.dueAmount.toFixed(2)}`,
            ...requestAuditContext(request),
         });

         return createdOrder;
      });

      return NextResponse.json(
         { ...order, overpaidAmount: overpaidAmountOf(order) },
         { status: 201 },
      );
   } catch (err) {
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
      return NextResponse.json(
         { error: "Failed to create order" },
         { status: 500 },
      );
   }
}
