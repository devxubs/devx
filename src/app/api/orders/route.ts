import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { calculateOrderTotals } from "@src/lib/utils";
import { generateNextEntityId } from "@src/lib/idGenerator";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { searchParams } = new URL(request.url);
   const isExportAll = searchParams.get("all") === "true" || searchParams.get("export") === "true";
   const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
   const limit = isExportAll ? 10000 : Math.min(parseInt(searchParams.get("limit") || "20"), 100);
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

   const skip = isExportAll ? 0 : (page - 1) * limit;

   const where: any = {
      isDeleted: false,
   };

   if (search) {
      where.OR = [
         { orderId: { contains: search } },
         { customId: { contains: search } },
         { invoiceNo: { contains: search } },
         { customer: { name: { contains: search } } },
         { customer: { phone: { contains: search } } },
      ];
   }

   // 1. Status with Exclude support
   if (status && status !== "All") {
      const statuses = status.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
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
   if (employee && employee !== "All") {
      where.OR = [
         ...(where.OR || []),
         { employeeId: employee },
         { employee: { name: { contains: employee } } },
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

   // 17. Customer Type
   if (customerType && (customerType === "New" || customerType === "Regular")) {
      const customersWithManyOrders = await prisma.order.groupBy({
         by: ["customerId"],
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
            include: {
               customer: true,
               employee: { select: { id: true, name: true, email: true, phoneNumber: true } },
               items: { include: { product: true } },
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
         orders,
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
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const body = await request.json();
      const { customer, products, pricing, orderNote, orderSource, status } = body;

      if (!Array.isArray(products) || products.length === 0) {
         return NextResponse.json(
            { error: "At least one product is required for an order" },
            { status: 400 },
         );
      }

      // Compute authoritative server-side totals
      const totals = calculateOrderTotals(
         products.map((p: any) => ({
            price: Number(p.price) || 0,
            quantity: Number(p.quantity) || 1,
         })),
         Number(pricing?.deliveryCharge) || 0,
         Number(pricing?.discount) || 0,
         Number(pricing?.advancePayment) || 0,
      );

      // Execute order creation + inventory deduction in an atomic transaction
      const order = await prisma.$transaction(async (tx) => {
         let customerId: string | null = null;
         if (customer?.name) {
            if (customer.id) {
               customerId = customer.id;
            } else {
               const { customId: cusId } = await generateNextEntityId("CUSTOMER", tx);
               const newCustomer = await tx.customer.create({
                  data: {
                     customId: cusId,
                     name: customer.name,
                     email: customer.email || null,
                     phone: customer.phone || null,
                     address: customer.address || null,
                  },
               });
               customerId = newCustomer.id;
            }
         }

         const { customId, seq } = await generateNextEntityId("ORDER", tx);
         const orderId = customId;
         const invoiceNo = `INV_${seq}`;

         const createdOrder = await tx.order.create({
            data: {
               customId,
               orderId,
               invoiceNo,
               status: (status?.toUpperCase() || "PENDING") as any,
               orderNote: orderNote || null,
               orderSource: orderSource || null,
               paymentMethod: pricing?.paymentMethod || "Cash on Delivery",
               subtotal: totals.subtotal,
               deliveryCharge: totals.deliveryCharge,
               discount: totals.discount,
               total: totals.total,
               advancePayment: totals.advancePayment,
               dueAmount: totals.dueAmount,
               customerId,
               employeeId: session.id,
               items: {
                  create: products.map((p: any) => ({
                     productId: p.id || null,
                     name: p.name || p.productName,
                     code: p.code || null,
                     quantity: Number(p.quantity) || 1,
                     price: Number(p.price) || 0,
                     subtotal: (Number(p.price) || 0) * (Number(p.quantity) || 1),
                  })),
               },
            },
            include: {
               items: true,
               customer: true,
            },
         });

         // Decrement inventory and record stock movements
         for (const item of products) {
            if (item.id) {
               await tx.product.update({
                  where: { id: item.id },
                  data: {
                     quantity: { decrement: Number(item.quantity) || 1 },
                  },
               });

               await tx.stockMovement.create({
                  data: {
                     productId: item.id,
                     type: "SALE",
                     quantity: -(Number(item.quantity) || 1),
                     orderId: createdOrder.id,
                     note: `POS Order ${orderId}`,
                  },
               });
            }
         }

         return createdOrder;
      });

      return NextResponse.json(order, { status: 201 });
   } catch {
      return NextResponse.json(
         { error: "Failed to create order" },
         { status: 500 },
      );
   }
}
