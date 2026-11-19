import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { calculateNetProfit } from "@src/lib/finance";

export async function GET(request: NextRequest) {
   const gate = await requirePermission(request, ["reports", "report", "report_view", "report_view_report"]);
   if (gate instanceof NextResponse) return gate;

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
         // The 7-day window ENDS at the selected range's end when the
         // range lies in the past (previously the window was always
         // the last 7 days ending today, so a past range produced an
         // impossible gte > lte filter and an all-zero trend, and the
         // day labels below never matched the queried window).
         const nowForTrend = new Date();
         const trendEnd =
            hasDate && dateFilter.lte && dateFilter.lte < nowForTrend
               ? dateFilter.lte
               : nowForTrend;
         const sevenDaysAgo = new Date(trendEnd);
         sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
         sevenDaysAgo.setHours(0, 0, 0, 0);
         const trendWhere: any = { ...whereOrder };
         trendWhere.createdAt = {
            gte:
               hasDate && dateFilter.gte && dateFilter.gte > sevenDaysAgo
                  ? dateFilter.gte
                  : sevenDaysAgo,
            lte: trendEnd,
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

         // Generate 7-day revenue trend from the full trend population.
         // The labelled days are the same window the query above used:
         // the 7 days ending at trendEnd.
         const trendDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(trendEnd);
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

         const [orders, sourceDistribution, statsOrders] = await Promise.all([
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
            // Phase 3B (3.4): per-courier performance aggregates over
            // the COMPLETE filtered dataset (light select, same
            // pattern as the sales trend query). Definitions:
            //  - dispatched: handed to the courier — courierSubmittedAt
            //    is set, or the order has reached a post-dispatch
            //    status (SHIPPED / OUT_FOR_DELIVERY / DELIVERED /
            //    COMPLETED);
            //  - delivered: status DELIVERED or COMPLETED;
            //  - returned: courierStatus "Returned", or a CANCELLED
            //    order that had already been dispatched;
            //  - COD collected: order totals of delivered orders (the
            //    amount the courier collects on delivery);
            //  - COD pending: outstanding dueAmount of orders still
            //    in flight (not delivered/cancelled/failed).
            prisma.order.findMany({
               where: whereOrder,
               select: {
                  courier: true,
                  courierStatus: true,
                  status: true,
                  courierSubmittedAt: true,
                  total: true,
                  dueAmount: true,
                  courierCharge: true,
               },
            }),
         ]);

         const DISPATCHED_STATUSES = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"];
         const statsMap = new Map<string, any>();
         for (const o of statsOrders) {
            const key = o.courier || "Unassigned";
            if (!statsMap.has(key)) {
               statsMap.set(key, {
                  courier: key,
                  orders: 0,
                  dispatched: 0,
                  delivered: 0,
                  returned: 0,
                  codCollected: 0,
                  codPending: 0,
                  courierCharges: 0,
               });
            }
            const s = statsMap.get(key);
            const dispatched =
               Boolean(o.courierSubmittedAt) || DISPATCHED_STATUSES.includes(o.status);
            const delivered = o.status === "DELIVERED" || o.status === "COMPLETED";
            s.orders += 1;
            if (dispatched) s.dispatched += 1;
            if (delivered) {
               s.delivered += 1;
               s.codCollected += Number(o.total || 0);
            }
            if (
               o.courierStatus === "Returned" ||
               (o.status === "CANCELLED" && dispatched)
            ) {
               s.returned += 1;
            }
            if (
               !delivered &&
               o.status !== "CANCELLED" &&
               o.status !== "FAILED"
            ) {
               s.codPending += Number(o.dueAmount || 0);
            }
            s.courierCharges += Number(o.courierCharge || 0);
         }
         const courierStats = Array.from(statsMap.values())
            .map((s) => ({
               ...s,
               deliveredPct:
                  s.dispatched > 0
                     ? Math.round((s.delivered / s.dispatched) * 1000) / 10
                     : 0,
               returnedPct:
                  s.dispatched > 0
                     ? Math.round((s.returned / s.dispatched) * 1000) / 10
                     : 0,
            }))
            .sort((a, b) => b.orders - a.orders);

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
            courierStats,
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
                  // Row counts must exclude soft-deleted orders, the
                  // same filter the headline groupBy below already
                  // uses — otherwise a customer's Total/Completed/
                  // Failed counts disagree with Active/Returning.
                  where: { isDeleted: false },
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
               // Phase 2 (2.12): numeric amount — the client formats it
               // with the settings-aware currency formatter. This used
               // to be a preformatted "৳ …" string baked in server-side.
               totalAmount: Number(p.total),
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
         const [allProducts, lowStockProducts, topSold, stockAgg, outOfStockAll, lowStockCountAll] = await Promise.all([
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
            // The low-stock ROW list below is display-capped (take: 50),
            // so the headline count needs its own COUNT over the same
            // filter — lowStockProducts.length silently capped the
            // reported count at 50.
            prisma.product.count({
               where: { isDeleted: false, quantity: { lte: 10 } },
            }),
         ]);

         const totalInStock = Number(stockAgg._sum.quantity || 0);
         const outOfStockCount = outOfStockAll;
         const lowStockCount = lowStockCountAll;

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

      // 7B. PAYMENT RECONCILIATION (Phase 3B, roadmap 3.6)
      if (tab === "payments") {
         // Default period is today when the caller passes no dates —
         // reconciliation is a daily routine. Explicit start/end
         // dates widen the window (the UI passes one day by default).
         const period: any = hasDate
            ? { ...dateFilter }
            : (() => {
                 const start = new Date();
                 start.setHours(0, 0, 0, 0);
                 const end = new Date();
                 end.setHours(23, 59, 59, 999);
                 return { gte: start, lte: end };
              })();
         const whereOrder: any = { isDeleted: false, createdAt: period };
         const txidQuery = searchParams.get("txid")?.trim() || "";

         const [methodGroups, verificationGroups, unverifiedOrders, txidMatches] =
            await Promise.all([
               prisma.order.groupBy({
                  by: ["paymentMethod"],
                  where: whereOrder,
                  _count: { id: true },
                  _sum: { advancePayment: true, dueAmount: true, total: true },
               }),
               prisma.order.groupBy({
                  by: ["paymentMethod", "paymentStatus"],
                  where: whereOrder,
                  _count: { id: true },
               }),
               prisma.order.findMany({
                  where: { ...whereOrder, paymentStatus: { not: "VERIFIED" } },
                  select: {
                     id: true,
                     orderId: true,
                     customId: true,
                     createdAt: true,
                     paymentMethod: true,
                     paymentTxId: true,
                     paymentSenderNumber: true,
                     paymentStatus: true,
                     advancePayment: true,
                     dueAmount: true,
                     total: true,
                     customer: { select: { name: true, phone: true } },
                  },
                  orderBy: { createdAt: "desc" },
                  skip,
                  take: limit,
               }),
               txidQuery
                  ? prisma.order.findMany({
                       where: {
                          isDeleted: false,
                          paymentTxId: { contains: txidQuery },
                       },
                       select: {
                          id: true,
                          orderId: true,
                          customId: true,
                          createdAt: true,
                          paymentMethod: true,
                          paymentTxId: true,
                          paymentSenderNumber: true,
                          paymentStatus: true,
                          advancePayment: true,
                          dueAmount: true,
                          total: true,
                          customer: { select: { name: true, phone: true } },
                       },
                       orderBy: { createdAt: "desc" },
                       take: 20,
                    })
                  : Promise.resolve(null),
            ]);

         const verificationByMethod = new Map<string, Record<string, number>>();
         for (const g of verificationGroups) {
            const key = g.paymentMethod || "Not specified";
            if (!verificationByMethod.has(key)) {
               verificationByMethod.set(key, { VERIFIED: 0, UNVERIFIED: 0, MISMATCHED: 0 });
            }
            verificationByMethod.get(key)![g.paymentStatus] = g._count.id;
         }

         const methods = methodGroups
            .map((g) => {
               const label = g.paymentMethod || "Not specified";
               const v = verificationByMethod.get(label) || {
                  VERIFIED: 0,
                  UNVERIFIED: 0,
                  MISMATCHED: 0,
               };
               return {
                  method: label,
                  orders: g._count.id,
                  advanceCollected: Number(g._sum.advancePayment || 0),
                  dueExpected: Number(g._sum.dueAmount || 0),
                  totalAmount: Number(g._sum.total || 0),
                  verified: v.VERIFIED,
                  unverified: v.UNVERIFIED,
                  mismatched: v.MISMATCHED,
               };
            })
            .sort((a, b) => b.orders - a.orders);

         const totals = methods.reduce(
            (acc, m) => ({
               orders: acc.orders + m.orders,
               advanceCollected: acc.advanceCollected + m.advanceCollected,
               dueExpected: acc.dueExpected + m.dueExpected,
               verified: acc.verified + m.verified,
               unverified: acc.unverified + m.unverified,
               mismatched: acc.mismatched + m.mismatched,
            }),
            {
               orders: 0,
               advanceCollected: 0,
               dueExpected: 0,
               verified: 0,
               unverified: 0,
               mismatched: 0,
            },
         );

         const mapPaymentRow = (o: any) => ({
            id: o.id,
            orderId: o.orderId || o.customId || o.id,
            createdAt: o.createdAt,
            customer: o.customer?.name || "Walk-in Customer",
            customerPhone: o.customer?.phone || "",
            method: o.paymentMethod || "Not specified",
            txId: o.paymentTxId || "",
            senderNumber: o.paymentSenderNumber || "",
            paymentStatus: o.paymentStatus,
            advance: Number(o.advancePayment || 0),
            due: Number(o.dueAmount || 0),
            total: Number(o.total || 0),
         });

         return NextResponse.json({
            periodStart: period.gte ? new Date(period.gte).toISOString() : null,
            periodEnd: period.lte ? new Date(period.lte).toISOString() : null,
            methods,
            totals,
            page,
            limit,
            unverifiedRows: unverifiedOrders.map(mapPaymentRow),
            ...(txidMatches ? { txidMatches: txidMatches.map(mapPaymentRow) } : {}),
         });
      }

      // 7C. FINANCE — P&L + WORKLISTS (Phase 3B, roadmap 3.8)
      if (tab === "finance") {
         const whereOrderPeriod: any = { isDeleted: false };
         if (hasDate) whereOrderPeriod.createdAt = dateFilter;
         const whereExpense: any = { isDeleted: false };
         if (hasDate) whereExpense.createdAt = dateFilter;
         const wherePurchase: any = { isDeleted: false };
         if (hasDate) wherePurchase.createdAt = dateFilter;

         const [
            revenueAgg,
            expenseAgg,
            expensesByType,
            purchaseAgg,
            soldItems,
            receivableGroups,
            paymentMethodGroups,
         ] = await Promise.all([
            prisma.order.aggregate({
               where: { ...whereOrderPeriod, status: { in: ["COMPLETED", "DELIVERED"] } },
               _sum: { total: true },
            }),
            prisma.expense.aggregate({
               where: whereExpense,
               _sum: { amount: true },
            }),
            prisma.expense.groupBy({
               by: ["type"],
               where: whereExpense,
               _sum: { amount: true },
               orderBy: { _sum: { amount: "desc" } },
            }),
            prisma.purchase.aggregate({
               where: wherePurchase,
               _sum: { total: true },
            }),
            // Estimated COGS inputs: items on revenue orders in the
            // period, with their product's current cost price.
            prisma.orderItem.findMany({
               where: {
                  order: {
                     ...whereOrderPeriod,
                     status: { in: ["COMPLETED", "DELIVERED"] },
                  },
               },
               select: {
                  quantity: true,
                  product: { select: { costPrice: true } },
               },
            }),
            // Receivables are a CURRENT-state figure (all outstanding
            // dues, not just this period's), grouped per customer.
            prisma.order.groupBy({
               by: ["customerId"],
               where: { isDeleted: false, dueAmount: { gt: 0 } },
               _sum: { dueAmount: true },
               _count: { id: true },
               orderBy: { _sum: { dueAmount: "desc" } },
               take: 200,
            }),
            prisma.order.groupBy({
               by: ["paymentMethod"],
               where: whereOrderPeriod,
               _count: { id: true },
               _sum: { advancePayment: true, dueAmount: true },
            }),
         ]);

         const revenue = Number(revenueAgg._sum.total || 0);
         const expensesTotal = Number(expenseAgg._sum.amount || 0);
         const purchasesTotal = Number(purchaseAgg._sum.total || 0);
         // DB/API-07: the one shared profit definition (lib/finance) —
         // revenue − expenses − purchases. It is NOT gross profit and
         // NOT COGS-based; the UI labels it exactly as this formula.
         const netProfit = calculateNetProfit(revenue, expensesTotal, purchasesTotal);

         // Estimated COGS at CURRENT cost prices. Items whose product
         // is gone or has no cost price recorded cannot be costed —
         // they are excluded and counted so the UI can say so.
         let estimatedCogs = 0;
         let cogsExcludedItems = 0;
         for (const item of soldItems) {
            const cost = item.product?.costPrice;
            if (cost === null || cost === undefined) {
               cogsExcludedItems += 1;
            } else {
               estimatedCogs += item.quantity * Number(cost);
            }
         }

         // Receivables detail: customer names + oldest open order.
         const receivableCustomerIds = receivableGroups
            .map((g) => g.customerId)
            .filter((id): id is string => Boolean(id));
         const [receivableCustomers, oldestDueOrders] = await Promise.all([
            receivableCustomerIds.length
               ? prisma.customer.findMany({
                    where: { id: { in: receivableCustomerIds } },
                    select: { id: true, customId: true, name: true, phone: true },
                 })
               : Promise.resolve([]),
            receivableCustomerIds.length
               ? prisma.order.findMany({
                    where: {
                       isDeleted: false,
                       dueAmount: { gt: 0 },
                       customerId: { in: receivableCustomerIds },
                    },
                    select: { customerId: true, createdAt: true },
                    orderBy: { createdAt: "asc" },
                 })
               : Promise.resolve([]),
         ]);
         const customerById = new Map(receivableCustomers.map((c) => [c.id, c]));
         const oldestByCustomer = new Map<string, Date>();
         for (const o of oldestDueOrders) {
            if (o.customerId && !oldestByCustomer.has(o.customerId)) {
               oldestByCustomer.set(o.customerId, o.createdAt);
            }
         }
         const receivables = receivableGroups.map((g) => {
            const c = g.customerId ? customerById.get(g.customerId) : undefined;
            return {
               customerId: g.customerId,
               customerCustomId: c?.customId || null,
               customer: c?.name || "Walk-in / Unknown",
               phone: c?.phone || "",
               orders: g._count.id,
               due: Number(g._sum.dueAmount || 0),
               oldestDueAt: g.customerId
                  ? (oldestByCustomer.get(g.customerId)?.toISOString() ?? null)
                  : null,
            };
         });
         const receivablesTotal = receivables.reduce((s, r) => s + r.due, 0);

         // Payables (current state): per supplier — Σ purchase due,
         // minus unallocated supplier-payment credit (Phase 3B §3 of
         // the schema plan: allocated payments already reduced the
         // purchase due when recorded, so only unallocated payments
         // stand as credit). Oldest open purchase first.
         const [dueGroups, creditGroups] = await Promise.all([
            prisma.purchase.groupBy({
               by: ["supplierId"],
               where: { isDeleted: false, due: { gt: 0 } },
               _sum: { due: true, total: true, paid: true },
               _count: { id: true },
            }),
            prisma.supplierPayment.groupBy({
               by: ["supplierId"],
               where: { isDeleted: false, purchaseId: null },
               _sum: { amount: true },
            }),
         ]);
         const creditBySupplier = new Map(
            creditGroups.map((g) => [g.supplierId, Number(g._sum.amount || 0)]),
         );
         const payableSupplierIds = Array.from(
            new Set([
               ...dueGroups.map((g) => g.supplierId).filter(Boolean),
               ...creditGroups.map((g) => g.supplierId),
            ]),
         ) as string[];
         const [payableSuppliers, oldestDuePurchases] = await Promise.all([
            payableSupplierIds.length
               ? prisma.supplier.findMany({
                    where: { id: { in: payableSupplierIds } },
                    select: { id: true, customId: true, name: true, phone: true },
                 })
               : Promise.resolve([]),
            payableSupplierIds.length
               ? prisma.purchase.findMany({
                    where: {
                       isDeleted: false,
                       due: { gt: 0 },
                       supplierId: { in: payableSupplierIds },
                    },
                    select: { supplierId: true, createdAt: true },
                    orderBy: { createdAt: "asc" },
                 })
               : Promise.resolve([]),
         ]);
         const supplierById = new Map(payableSuppliers.map((s) => [s.id, s]));
         const oldestPurchaseBySupplier = new Map<string, Date>();
         for (const p of oldestDuePurchases) {
            if (p.supplierId && !oldestPurchaseBySupplier.has(p.supplierId)) {
               oldestPurchaseBySupplier.set(p.supplierId, p.createdAt);
            }
         }
         const dueBySupplier = new Map(
            dueGroups
               .filter((g) => g.supplierId)
               .map((g) => [
                  g.supplierId as string,
                  {
                     due: Number(g._sum.due || 0),
                     purchases: g._count.id,
                  },
               ]),
         );
         const payables = payableSupplierIds
            .map((supplierId) => {
               const s = supplierById.get(supplierId);
               const dueInfo = dueBySupplier.get(supplierId) || { due: 0, purchases: 0 };
               const credit = creditBySupplier.get(supplierId) || 0;
               return {
                  supplierId,
                  supplierCustomId: s?.customId || null,
                  supplier: s?.name || "Unknown supplier",
                  phone: s?.phone || "",
                  purchasesWithDue: dueInfo.purchases,
                  totalDue: dueInfo.due,
                  credit,
                  netPayable: Math.max(0, dueInfo.due - credit),
                  oldestDueAt:
                     oldestPurchaseBySupplier.get(supplierId)?.toISOString() ?? null,
               };
            })
            .filter((p) => p.totalDue > 0 || p.credit > 0)
            .sort((a, b) => {
               const at = a.oldestDueAt ? new Date(a.oldestDueAt).getTime() : Infinity;
               const bt = b.oldestDueAt ? new Date(b.oldestDueAt).getTime() : Infinity;
               return at - bt;
            });
         const payablesTotal = payables.reduce((s, p) => s + p.netPayable, 0);

         return NextResponse.json({
            revenue,
            expensesTotal,
            expensesByType: expensesByType.map((b) => ({
               type: b.type,
               amount: Number(b._sum.amount || 0),
            })),
            purchasesTotal,
            netProfit,
            estimatedCogs,
            cogsExcludedItems,
            paymentMethods: paymentMethodGroups
               .map((g) => ({
                  method: g.paymentMethod || "Not specified",
                  orders: g._count.id,
                  advanceCollected: Number(g._sum.advancePayment || 0),
                  dueExpected: Number(g._sum.dueAmount || 0),
               }))
               .sort((a, b) => b.orders - a.orders),
            receivables: {
               total: receivablesTotal,
               customers: receivables.length,
               rows: receivables,
            },
            payables: {
               total: payablesTotal,
               suppliers: payables.length,
               rows: payables,
            },
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
