import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { calculateNetProfit } from "@src/lib/finance";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { searchParams } = new URL(request.url);
   const tab = searchParams.get("tab")?.toLowerCase() || "summary";
   const startDateStr = searchParams.get("startDate");
   const endDateStr = searchParams.get("endDate");

   // RPT-03 fix: row lists are paginated via ?page=&limit= instead of
   // a silent hard cap. Defaults preserve the historical page size
   // (100 rows) so existing screens are unchanged; totals/counts in
   // every tab are computed from the COMPLETE filtered dataset.
   const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
   const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "100", 10) || 100, 1),
      1000,
   );
   const skip = (page - 1) * limit;

   const dateFilter: any = {};
   if (startDateStr) dateFilter.gte = new Date(startDateStr);
   if (endDateStr) {
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
   }
   const hasDate = Boolean(startDateStr || endDateStr);

   try {
      // 1. SALES REPORT
      if (tab === "sales") {
         const whereOrder: any = { isDeleted: false };
         if (hasDate) whereOrder.createdAt = dateFilter;

         // RPT-01 fix: totalOrders is a real COUNT over the complete
         // filtered dataset (previously orders.length of a take:100
         // fetch), and the 7-day trend is computed from a dedicated
         // query over the last 7 days — not from the paginated rows.
         const sevenDaysAgo = new Date();
         sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
         sevenDaysAgo.setHours(0, 0, 0, 0);
         const trendWhere: any = { ...whereOrder };
         trendWhere.createdAt = {
            ...(hasDate ? dateFilter : {}),
            gte:
               hasDate && dateFilter.gte && dateFilter.gte > sevenDaysAgo
                  ? dateFilter.gte
                  : sevenDaysAgo,
         };

         const [orders, totalOrders, totalRevenueAgg, completedCount, returnedCount, trendOrders] = await Promise.all([
            prisma.order.findMany({
               where: whereOrder,
               include: { customer: true, items: true },
               orderBy: { createdAt: "desc" },
               skip,
               take: limit,
            }),
            prisma.order.count({ where: whereOrder }),
            prisma.order.aggregate({
               where: { ...whereOrder, status: { in: ["COMPLETED", "DELIVERED"] } },
               _sum: { total: true },
            }),
            prisma.order.count({
               where: { ...whereOrder, status: { in: ["COMPLETED", "DELIVERED"] } },
            }),
            prisma.order.count({
               where: { ...whereOrder, status: { in: ["CANCELLED", "FAILED"] } },
            }),
            prisma.order.findMany({
               where: trendWhere,
               select: { total: true, createdAt: true },
            }),
         ]);

         const totalRevenue = Number(totalRevenueAgg._sum.total || 0);

         // Generate 7-day revenue trend from the full trend population
         const now = new Date();
         const trendDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now);
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split("T")[0];
         });
         const trendData = trendDays.map((day) => {
            const dayOrders = trendOrders.filter((o) => o.createdAt.toISOString().startsWith(day));
            const sum = dayOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
            return sum;
         });

         return NextResponse.json({
            totalOrders,
            totalRevenue,
            completedCount,
            returnedCount,
            trendData,
            page,
            limit,
            orders: orders.map((o) => ({
               id: o.orderId || o.customId || o.id,
               customer: {
                  name: o.customer?.name || "Walk-in Customer",
                  email: o.customer?.email || "",
                  phone: o.customer?.phone || "",
               },
               createdAt: o.createdAt,
               amount: Number(o.total),
               payment: o.paymentMethod || "Cash",
               status: o.status,
            })),
         });
      }

      // 2. COURIER REPORT
      if (tab === "courier") {
         const whereOrder: any = { isDeleted: false };
         if (hasDate) whereOrder.createdAt = dateFilter;

         const [orders, sourceDistribution] = await Promise.all([
            prisma.order.findMany({
               where: whereOrder,
               select: {
                  id: true,
                  orderId: true,
                  customId: true,
                  createdAt: true,
                  courierSubmittedAt: true,
                  subtotal: true,
                  deliveryCharge: true,
                  courierCharge: true,
                  courier: true,
                  total: true,
                  orderSource: true,
               },
               orderBy: { createdAt: "desc" },
               skip,
               take: limit,
            }),
            prisma.order.groupBy({
               by: ["courier"],
               where: whereOrder,
               _count: { id: true },
            }),
         ]);

         const rows = orders.map((o) => {
            const sub = Number(o.subtotal || 0);
            const shipping = Number(o.deliveryCharge || 0);
            const total = Number(o.total || 0);
            // Handle zero courier charge correctly: a 0 Tk courier charge is valid and must never be replaced by shipping
            const courierCharge = o.courierCharge !== null && o.courierCharge !== undefined ? Number(o.courierCharge) : 0;
            const courierPayToYou = total - courierCharge;

            return {
               id: o.orderId || o.customId || o.id,
               courier_submitted_at: o.courierSubmittedAt
                  ? o.courierSubmittedAt.toLocaleString()
                  : o.createdAt.toLocaleString(),
               total_price: sub,
               shipping_charge: shipping,
               total_amount: total,
               courier_charge: courierCharge,
               courier_pay_to_you: courierPayToYou,
               source: o.courier || o.orderSource || "Direct",
            };
         });

         return NextResponse.json({
            rows,
            distribution: sourceDistribution.map((s) => ({
               label: s.courier || "Direct",
               value: s._count.id,
            })),
         });
      }

      // 3. CUSTOMER REPORT
      if (tab === "customers" || tab === "customer") {
         const customers = await prisma.customer.findMany({
            include: {
               orders: {
                  select: { status: true, createdAt: true },
                  orderBy: { createdAt: "desc" },
               },
               _count: { select: { orders: true } },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
         });

         // Headline counts describe ALL customers, not just this page.
         const [totalCustomersAll, orderGroups] = await Promise.all([
            prisma.customer.count(),
            prisma.order.groupBy({
               by: ["customerId"],
               where: { isDeleted: false, customerId: { not: null } },
               _count: { id: true },
            }),
         ]);
         const activeCustomersAll = orderGroups.length;
         const returningCustomersAll = orderGroups.filter(
            (g) => g._count.id > 1,
         ).length;

         const rows = customers.map((c, idx) => {
            const totalOrders = c.orders.length;
            const completedOrders = c.orders.filter(
               (o) => o.status === "COMPLETED" || o.status === "DELIVERED",
            ).length;
            const failedOrders = c.orders.filter(
               (o) => o.status === "CANCELLED" || o.status === "FAILED",
            ).length;
            const lastOrderAt = c.orders[0]?.createdAt
               ? new Date(c.orders[0].createdAt).toLocaleDateString()
               : "-";

            return {
               id: c.customId || `CUS_${idx + 1}`,
               customerName: c.name,
               phone: c.phone || "-",
               email: c.email || "-",
               totalOrders,
               completedOrders,
               failedOrders,
               address: c.address || "N/A",
               lastOrderAt,
            };
         });

         return NextResponse.json({
            totalCustomers: totalCustomersAll,
            activeCustomers: activeCustomersAll,
            returningCustomers: returningCustomersAll,
            page,
            limit,
            rows,
         });
      }

      // 4. PURCHASES REPORT
      if (tab === "purchases") {
         const wherePurchase: any = { isDeleted: false };
         if (hasDate) wherePurchase.createdAt = dateFilter;

         const [purchases, totalAgg, totalCountAll] = await Promise.all([
            prisma.purchase.findMany({
               where: wherePurchase,
               include: { supplier: true },
               orderBy: { createdAt: "desc" },
               skip,
               take: limit,
            }),
            prisma.purchase.aggregate({
               where: wherePurchase,
               _sum: { total: true },
            }),
            prisma.purchase.count({ where: wherePurchase }),
         ]);

         return NextResponse.json({
            totalAmount: Number(totalAgg._sum.total || 0),
            totalCount: totalCountAll,
            page,
            limit,
            rows: purchases.map((p) => ({
               id: p.customId || p.invoice || p.id,
               supplier: p.supplier?.name || "Direct Supplier",
               date: p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : "-",
               totalAmount: `৳ ${Number(p.total).toLocaleString()}`,
               status: Number(p.due) === 0 ? "Completed" : "Pending",
            })),
         });
      }

      // 5. EMPLOYEES REPORT
      if (tab === "employees") {
         const users = await prisma.user.findMany({
            include: {
               role: true,
               ordersHandled: {
                  where: { isDeleted: false },
                  select: { status: true, total: true },
               },
            },
         });

         const ranks = users
            .map((u, idx) => {
               const ordersHandled = u.ordersHandled.length;
               const completedSales = u.ordersHandled.filter(
                  (o: any) => o.status === "COMPLETED" || o.status === "DELIVERED",
               ).length;
               const cancelledCount = u.ordersHandled.filter(
                  (o: any) => o.status === "CANCELLED" || o.status === "FAILED",
               ).length;
               const revenue = u.ordersHandled
                  .filter((o: any) => o.status === "COMPLETED" || o.status === "DELIVERED")
                  .reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

               return {
                  id: u.customId || `EP_${idx + 1}`,
                  name: u.name || "Employee",
                  email: u.email,
                  role: u.role?.name || "Staff",
                  // RPT-02 fix: "calls" was fabricated
                  // (ordersHandled * 3 + completedSales * 2) — no call
                  // data exists anywhere in the system. Report null
                  // (unavailable) instead of invented statistics.
                  calls: null,
                  conforms: completedSales,
                  cancels: cancelledCount,
                  revenue,
                  rawPoints: completedSales * 100 + revenue,
               };
            })
            .sort((a, b) => b.rawPoints - a.rawPoints);

         const rankedRows = ranks.map((r, i) => ({
            ...r,
            rank: `Top ${i + 1}`,
         }));

         return NextResponse.json({
            rows: rankedRows,
         });
      }

      // 6. PRODUCTS REPORT
      if (tab === "products") {
         const [allProducts, lowStockProducts, topSold, stockAgg, outOfStockAll] = await Promise.all([
            prisma.product.findMany({
               where: { isDeleted: false },
               select: { id: true, customId: true, productName: true, quantity: true, regularPrice: true, lowStockAlert: true },
               orderBy: { quantity: "asc" },
               skip,
               take: limit,
            }),
            prisma.product.findMany({
               where: { isDeleted: false, quantity: { lte: 10 } },
               select: { id: true, customId: true, productName: true, quantity: true, lowStockAlert: true },
               take: 50,
            }),
            prisma.orderItem.groupBy({
               by: ["name"],
               _sum: { quantity: true, subtotal: true },
               orderBy: { _sum: { quantity: "desc" } },
               take: 5,
            }),
            // Headline figures cover the complete catalogue, not the page.
            prisma.product.aggregate({
               where: { isDeleted: false },
               _sum: { quantity: true },
            }),
            prisma.product.count({
               where: { isDeleted: false, quantity: 0 },
            }),
         ]);

         const totalInStock = Number(stockAgg._sum.quantity || 0);
         const outOfStockCount = outOfStockAll;
         const lowStockCount = lowStockProducts.length;

         return NextResponse.json({
            totalInStock,
            outOfStockCount,
            lowStockCount,
            lowStockRows: lowStockProducts.map((p) => ({
               id: p.customId || p.id,
               name: p.productName,
               stock: p.quantity,
               lowStockAlert: p.lowStockAlert || 10,
               status: p.quantity === 0 ? "Out of stock" : "Low stock",
            })),
            availabilityRows: allProducts.map((p) => ({
               id: p.customId || p.id,
               name: p.productName,
               stock: p.quantity,
               price: Number(p.regularPrice),
               status: p.quantity === 0 ? "Out of stock" : p.quantity <= (p.lowStockAlert || 10) ? "Low stock" : "In stock",
            })),
            topProducts: topSold.map((t) => ({
               name: t.name,
               sold: t._sum.quantity || 0,
               revenue: Number(t._sum.subtotal || 0),
            })),
         });
      }

      // 7. EXPENSES REPORT
      if (tab === "expenses") {
         const whereExpense: any = { isDeleted: false };
         if (hasDate) whereExpense.createdAt = dateFilter;

         const [expenses, totalAgg, byType] = await Promise.all([
            prisma.expense.findMany({
               where: whereExpense,
               orderBy: { createdAt: "desc" },
               skip,
               take: limit,
            }),
            prisma.expense.aggregate({
               where: whereExpense,
               _sum: { amount: true },
            }),
            prisma.expense.groupBy({
               by: ["type"],
               where: whereExpense,
               _sum: { amount: true },
            }),
         ]);

         return NextResponse.json({
            totalAmount: Number(totalAgg._sum.amount || 0),
            byType: byType.map((b) => ({
               type: b.type,
               amount: Number(b._sum.amount || 0),
            })),
            rows: expenses.map((e) => ({
               id: e.customId || e.id,
               type: e.type,
               date: e.createdAt ? new Date(e.createdAt).toISOString().split("T")[0] : "-",
               amount: Number(e.amount),
               note: e.note || "",
            })),
         });
      }

      // 8. SUMMARY (DEFAULT)
      const [
         totalRevenueAgg,
         totalExpensesAgg,
         totalPurchasesAgg,
         totalOrders,
         totalCustomers,
         totalProducts,
         ordersByStatus,
         topProducts,
         courierOrders,
      ] = await Promise.all([
         prisma.order.aggregate({
            where: { isDeleted: false, status: { in: ["COMPLETED", "DELIVERED"] } },
            _sum: { total: true },
         }),
         prisma.expense.aggregate({
            where: { isDeleted: false },
            _sum: { amount: true },
         }),
         prisma.purchase.aggregate({
            where: { isDeleted: false },
            _sum: { total: true },
         }),
         prisma.order.count({ where: { isDeleted: false } }),
         prisma.customer.count(),
         prisma.product.count({ where: { isDeleted: false } }),
         prisma.order.groupBy({
            by: ["status"],
            where: { isDeleted: false },
            _count: { id: true },
         }),
         prisma.orderItem.groupBy({
            by: ["name"],
            _sum: { quantity: true, subtotal: true },
            orderBy: { _sum: { quantity: "desc" } },
            take: 5,
         }),
         prisma.order.groupBy({
            by: ["orderSource"],
            where: { isDeleted: false },
            _count: { id: true },
         }),
      ]);

      const totalRevenue = Number(totalRevenueAgg._sum.total || 0);
      const totalExpenses = Number(totalExpensesAgg._sum.amount || 0);
      const totalPurchases = Number(totalPurchasesAgg._sum.total || 0);
      // DB/API-07 fix: single shared profit definition (see lib/finance).
      const netProfit = calculateNetProfit(totalRevenue, totalExpenses, totalPurchases);

      return NextResponse.json({
         totalRevenue,
         totalExpenses,
         totalPurchases,
         netProfit,
         totalOrders,
         totalCustomers,
         totalProducts,
         ordersByStatus: ordersByStatus.map((s) => ({ status: s.status, count: s._count.id })),
         topProducts: topProducts.map((p) => ({
            name: p.name,
            quantity: p._sum.quantity || 0,
            revenue: Number(p._sum.subtotal || 0),
         })),
         courierOrders: courierOrders.map((c) => ({
            source: c.orderSource || "Direct / Walk-in",
            count: c._count.id,
         })),
      });
   } catch {
      return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
   }
}
