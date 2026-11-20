import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { calculateNetProfit } from "@src/lib/finance";
import { standingCreditOf } from "@src/lib/purchaseReturns";
import {
   VALID_ORDER_WHERE,
   INVALID_ORDER_STATUSES,
} from "@src/lib/orderStatus";

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

         // The labelled days are the same window the trend queries
         // below use: the 7 days ending at trendEnd.
         const trendDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(trendEnd);
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split("T")[0];
         });

         // Follow-up round: the trend is computed with one DB
         // aggregate per day bucket instead of loading every order
         // in the window and bucketing in JS (the pattern the
         // Dashboard fix already uses). Bucket boundaries are UTC
         // days, matching the previous `toISOString().startsWith(day)`
         // bucketing exactly, and each bucket is intersected with
         // the trend window so a selected past range still clips
         // the first/last day the same way.
         const trendPromise = Promise.all(
            trendDays.map(async (day) => {
               const dayStart = new Date(`${day}T00:00:00.000Z`);
               const dayEnd = new Date(`${day}T23:59:59.999Z`);
               const gte =
                  trendWhere.createdAt.gte > dayStart
                     ? trendWhere.createdAt.gte
                     : dayStart;
               const lte =
                  trendWhere.createdAt.lte < dayEnd
                     ? trendWhere.createdAt.lte
                     : dayEnd;
               if (gte > lte) return 0;
               const agg = await prisma.order.aggregate({
                  where: { ...trendWhere, createdAt: { gte, lte } },
                  _sum: { total: true },
               });
               return Number(agg._sum.total || 0);
            }),
         );

         const [orders, totalOrders, totalRevenueAgg, completedCount, cancelledFailedCount, trendData] = await Promise.all([
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
            trendPromise,
         ]);

         const totalRevenue = Number(totalRevenueAgg._sum.total || 0);

         return NextResponse.json({
            totalOrders,
            totalRevenue,
            completedCount,
            // Phase B1 (P1-2): this count is CANCELLED + FAILED orders
            // — there is no RETURNED order status and no sales-return
            // flow yet, so the honest name is `cancelledFailedCount`.
            // `returnedCount` is kept as a deprecated alias with the
            // same value so existing consumers keep working.
            cancelledFailedCount,
            returnedCount: cancelledFailedCount,
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

         const DISPATCHED_STATUSES = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"];

         // Phase 3B (3.4) definitions, unchanged — but computed with
         // database groupBy aggregates over the COMPLETE filtered
         // dataset (follow-up round; previously every matching order
         // row was loaded and bucketed in JS):
         //  - dispatched: handed to the courier — courierSubmittedAt
         //    is set, or the order has reached a post-dispatch
         //    status (SHIPPED / OUT_FOR_DELIVERY / DELIVERED /
         //    COMPLETED);
         //  - delivered: status DELIVERED or COMPLETED;
         //  - returned: courierStatus "Returned", or a CANCELLED
         //    order that had already been dispatched (for a CANCELLED
         //    order "dispatched" reduces to courierSubmittedAt set,
         //    and the two returned branches are made disjoint so no
         //    order is counted twice);
         //  - COD collected: order totals of delivered orders (the
         //    amount the courier collects on delivery);
         //  - COD pending: outstanding dueAmount of orders still
         //    in flight (not delivered/cancelled/failed).
         const [orders, sourceDistribution, totalsG, dispatchedG, deliveredG, returnedAG, returnedBG, codPendingG, cardTotalsAgg, cardTotalsCount] = await Promise.all([
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
            prisma.order.groupBy({
               by: ["courier"],
               where: whereOrder,
               _count: { id: true },
               _sum: { courierCharge: true },
            }),
            prisma.order.groupBy({
               by: ["courier"],
               where: {
                  ...whereOrder,
                  OR: [
                     { courierSubmittedAt: { not: null } },
                     { status: { in: DISPATCHED_STATUSES } },
                  ],
               },
               _count: { id: true },
            }),
            prisma.order.groupBy({
               by: ["courier"],
               where: { ...whereOrder, status: { in: ["DELIVERED", "COMPLETED"] } },
               _count: { id: true },
               _sum: { total: true },
            }),
            prisma.order.groupBy({
               by: ["courier"],
               where: { ...whereOrder, courierStatus: "Returned" },
               _count: { id: true },
            }),
            prisma.order.groupBy({
               by: ["courier"],
               where: {
                  ...whereOrder,
                  status: "CANCELLED",
                  courierSubmittedAt: { not: null },
                  OR: [{ courierStatus: null }, { courierStatus: { not: "Returned" } }],
               },
               _count: { id: true },
            }),
            prisma.order.groupBy({
               by: ["courier"],
               where: {
                  ...whereOrder,
                  status: { notIn: ["DELIVERED", "COMPLETED", "CANCELLED", "FAILED"] },
               },
               _sum: { dueAmount: true },
            }),
            // P2-7: card totals over the COMPLETE filtered dataset,
            // computed server-side so the Courier tab no longer
            // downloads every row through the export loader just to
            // sum three numbers. Definitions match the per-row
            // figures the tab used to sum: count = all rows;
            // fees = Σ courierCharge (null counts as 0, which is
            // how Prisma's _sum treats nulls); payout = Σ (total −
            // courierCharge) = Σ total − Σ courierCharge.
            prisma.order.aggregate({
               where: whereOrder,
               _sum: { total: true, courierCharge: true },
            }),
            prisma.order.count({ where: whereOrder }),
         ]);

         const statsMap = new Map<string, any>();
         const statsFor = (courierRaw: string | null) => {
            const key = courierRaw || "Unassigned";
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
            return statsMap.get(key);
         };
         for (const g of totalsG as any[]) {
            const s = statsFor(g.courier);
            s.orders += Number(g._count?.id || 0);
            s.courierCharges += Number(g._sum?.courierCharge || 0);
         }
         for (const g of dispatchedG as any[]) {
            statsFor(g.courier).dispatched += Number(g._count?.id || 0);
         }
         for (const g of deliveredG as any[]) {
            const s = statsFor(g.courier);
            s.delivered += Number(g._count?.id || 0);
            s.codCollected += Number(g._sum?.total || 0);
         }
         for (const g of returnedAG as any[]) {
            statsFor(g.courier).returned += Number(g._count?.id || 0);
         }
         for (const g of returnedBG as any[]) {
            statsFor(g.courier).returned += Number(g._count?.id || 0);
         }
         for (const g of codPendingG as any[]) {
            statsFor(g.courier).codPending += Number(g._sum?.dueAmount || 0);
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
               // Only a real submission timestamp is shown. The
               // previous fallback printed the order's creation date
               // as if it were the courier submission date, which made
               // never-submitted orders look submitted.
               courier_submitted_at: o.courierSubmittedAt
                  ? o.courierSubmittedAt.toLocaleString()
                  : "—",
               total_price: sub,
               shipping_charge: shipping,
               total_amount: total,
               courier_charge: courierCharge,
               courier_pay_to_you: courierPayToYou,
               source: o.courier || o.orderSource || "Direct",
            };
         });

         const cardFees = Number(cardTotalsAgg._sum.courierCharge || 0);
         return NextResponse.json({
            rows,
            courierStats,
            // P2-7 (additive): server-computed card totals — see the
            // aggregate above. Older consumers ignore this field.
            cardTotals: {
               count: cardTotalsCount,
               payout: Number(cardTotalsAgg._sum.total || 0) - cardFees,
               fees: cardFees,
            },
            distribution: sourceDistribution.map((s) => ({
               label: s.courier || "Direct",
               value: s._count.id,
            })),
         });
      }

      // 3. CUSTOMER REPORT
      if (tab === "customers" || tab === "customer") {
         // Date behaviour: the customer LIST and the Total Customers
         // headline are current-state (every customer on record) and
         // are never date-filtered. Every order-derived figure — the
         // per-row Total/Completed/Failed counts, Last Order At, and
         // the Active/Repeat headline counts — counts only orders
         // placed inside the selected range when one is given.
         const orderRangeWhere = hasDate ? { createdAt: dateFilter } : {};
         // Phase B1 (P1-2): soft-deleted customers appear nowhere —
         // the list and the headline count both filter isDeleted,
         // exactly like every other customer surface.
         const customers = await prisma.customer.findMany({
            where: { isDeleted: false },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
         });

         // Per-row order figures are aggregated in the database for
         // just this page's customers. The previous nested include
         // loaded every matching order row for up to `limit`
         // customers merely to count statuses and find the latest
         // date. Row counts exclude soft-deleted orders, matching
         // the headline groupBy below.
         const pageCustomerIds = customers.map((c) => c.id);
         // Headline counts describe ALL customers, not just this page.
         const [totalCustomersAll, orderGroups, pageOrderStats] =
            await Promise.all([
               prisma.customer.count({ where: { isDeleted: false } }),
               // Headline Active/Repeat counts use the canonical
               // valid-order rule (P1-2): only VALID orders make a
               // customer active or returning — the old groupBy
               // counted CANCELLED/FAILED orders too.
               prisma.order.groupBy({
                  by: ["customerId"],
                  where: {
                     isDeleted: false,
                     status: { notIn: [...INVALID_ORDER_STATUSES] },
                     customerId: { not: null },
                     ...orderRangeWhere,
                  },
                  _count: { id: true },
               }),
               pageCustomerIds.length
                  ? prisma.order.groupBy({
                       by: ["customerId", "status"],
                       where: {
                          isDeleted: false,
                          customerId: { in: pageCustomerIds },
                          ...orderRangeWhere,
                       },
                       _count: { id: true },
                       _max: { createdAt: true },
                    })
                  : Promise.resolve([]),
            ]);
         const statsByCustomer = new Map<
            string,
            {
               totalOrders: number;
               completedOrders: number;
               failedOrders: number;
               lastOrderAt: Date | null;
            }
         >();
         for (const group of pageOrderStats as any[]) {
            if (!group.customerId) continue;
            const stats = statsByCustomer.get(group.customerId) || {
               totalOrders: 0,
               completedOrders: 0,
               failedOrders: 0,
               lastOrderAt: null,
            };
            const count = Number(group._count?.id || 0);
            // Per-row Total Orders and Last Order At are canonical
            // (P1-2): they count VALID orders only, matching the
            // Customers list. Completed/Failed stay as their own
            // breakdown columns over all statuses.
            const isValidGroup = !(
               INVALID_ORDER_STATUSES as readonly string[]
            ).includes(group.status);
            if (isValidGroup) stats.totalOrders += count;
            if (group.status === "COMPLETED" || group.status === "DELIVERED") {
               stats.completedOrders += count;
            }
            if (group.status === "CANCELLED" || group.status === "FAILED") {
               stats.failedOrders += count;
            }
            const groupLast = group._max?.createdAt
               ? new Date(group._max.createdAt)
               : null;
            if (
               isValidGroup &&
               groupLast &&
               (!stats.lastOrderAt || groupLast > stats.lastOrderAt)
            ) {
               stats.lastOrderAt = groupLast;
            }
            statsByCustomer.set(group.customerId, stats);
         }
         const activeCustomersAll = orderGroups.length;
         const returningCustomersAll = orderGroups.filter(
            (g) => g._count.id > 1,
         ).length;

         const rows = customers.map((c) => {
            const stats = statsByCustomer.get(c.id) || {
               totalOrders: 0,
               completedOrders: 0,
               failedOrders: 0,
               lastOrderAt: null,
            };
            const { totalOrders, completedOrders, failedOrders } = stats;
            const lastOrderAt = stats.lastOrderAt
               ? stats.lastOrderAt.toLocaleDateString()
               : "-";

            return {
               // Row identity is the real primary key (the detail modal
               // resolves it via /api/customers/[id]); the display ID is
               // the record's own customId. The previous fallback
               // fabricated `CUS_${idx + 1}` from the row index, which
               // could collide with another customer's real customId and
               // open the wrong record.
               id: c.id,
               customId: c.customId || null,
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
         // Date behaviour: the employee list is current-state (all
         // staff on record). Every figure derived from handled orders
         // — completed sales, cancels, revenue, ranking — counts only
         // orders handled inside the selected range when one is given.
         const users = await prisma.user.findMany({
            include: { role: true },
         });

         // Aggregate handled orders in the database instead of
         // loading every handled order for every employee merely to
         // count statuses and sum completed revenue.
         const handledOrderStats = await prisma.order.groupBy({
            by: ["employeeId", "status"],
            where: {
               isDeleted: false,
               employeeId: { not: null },
               ...(hasDate ? { createdAt: dateFilter } : {}),
            },
            _count: { id: true },
            _sum: { total: true },
         });
         const handledByEmployee = new Map<
            string,
            {
               ordersHandled: number;
               completedSales: number;
               cancelledCount: number;
               revenue: number;
            }
         >();
         for (const group of handledOrderStats as any[]) {
            if (!group.employeeId) continue;
            const stats = handledByEmployee.get(group.employeeId) || {
               ordersHandled: 0,
               completedSales: 0,
               cancelledCount: 0,
               revenue: 0,
            };
            const count = Number(group._count?.id || 0);
            stats.ordersHandled += count;
            if (group.status === "COMPLETED" || group.status === "DELIVERED") {
               stats.completedSales += count;
               stats.revenue += Number(group._sum?.total || 0);
            }
            if (group.status === "CANCELLED" || group.status === "FAILED") {
               stats.cancelledCount += count;
            }
            handledByEmployee.set(group.employeeId, stats);
         }

         const ranks = users
            .map((u) => {
               const handled = handledByEmployee.get(u.id) || {
                  ordersHandled: 0,
                  completedSales: 0,
                  cancelledCount: 0,
                  revenue: 0,
               };
               const completedSales = handled.completedSales;
               const cancelledCount = handled.cancelledCount;
               const revenue = handled.revenue;

               return {
                  // Real primary key as row identity (detail modal
                  // resolves it via /api/users/[id]); previously a
                  // fabricated `EP_${idx + 1}` was used when customId
                  // was null, which could open the wrong employee.
                  id: u.id,
                  customId: u.customId || null,
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

         // Follow-up round: the ranked list is paginated like every
         // other tab's rows (ranking is computed over the complete
         // set BEFORE slicing, so rank labels stay global). The
         // previous response embedded the full employee set in every
         // paged response, which made the chunked export loader
         // re-download and re-append the whole set per page.
         // P2-7: the tab's headline cards are now served as
         // aggregates over the complete ranked set (additive
         // `summary`), so the DISPLAY path reads a single page +
         // these totals instead of assembling the full set through
         // the export loader; the loader remains for export only.
         // The sums are over the same ranked rows the tab used to
         // reduce client-side — identical figures.
         return NextResponse.json({
            rows: rankedRows.slice(skip, skip + limit),
            page,
            limit,
            total: rankedRows.length,
            summary: {
               totalEmployees: rankedRows.length,
               totalCompletedSales: rankedRows.reduce(
                  (s, r) => s + Number(r.conforms || 0),
                  0,
               ),
               totalRevenue: rankedRows.reduce(
                  (s, r) => s + Number(r.revenue || 0),
                  0,
               ),
            },
         });
      }

      // 6. PRODUCTS REPORT
      if (tab === "products") {
         const [allProducts, lowStockPageRows, lowStockTotalRows, topSold, stockAgg, outOfStockAll, totalProductsAll, lowExclusiveTotalRows] = await Promise.all([
            prisma.product.findMany({
               where: { isDeleted: false },
               select: { id: true, customId: true, productName: true, quantity: true, regularPrice: true, lowStockAlert: true },
               orderBy: { quantity: "asc" },
               skip,
               take: limit,
            }),
            // THE low-stock definition — the same rule the Dashboard,
            // the Stock workspace and the Product list use:
            // quantity <= the product's OWN lowStockAlert threshold
            // (schema default 10), with a stored 0 treated as the
            // default exactly like the JS `lowStockAlert || 10`
            // fallback used elsewhere. Follow-up round: the filter
            // now runs in the DATABASE and the list is paginated —
            // Prisma cannot compare two columns in a where clause,
            // so the comparison is expressed as raw SQL (the count
            // uses the identical predicate). Previously the whole
            // catalogue's stock levels were loaded and filtered in
            // JS, and the full low-stock set was embedded in every
            // paged response.
            prisma.$queryRaw<any[]>`
               SELECT id, customId, productName, quantity, lowStockAlert
               FROM Product
               WHERE isDeleted = 0
                 AND quantity <= COALESCE(NULLIF(lowStockAlert, 0), 10)
               ORDER BY quantity ASC
               LIMIT ${limit} OFFSET ${skip}
            `,
            prisma.$queryRaw<any[]>`
               SELECT COUNT(*) AS total
               FROM Product
               WHERE isDeleted = 0
                 AND quantity <= COALESCE(NULLIF(lowStockAlert, 0), 10)
            `,
            prisma.orderItem.groupBy({
               by: ["name"],
               // Top sellers are order-derived, so they honour the
               // selected date range (on the parent order) and exclude
               // soft-deleted orders — previously this groupBy had no
               // filter at all and counted deleted orders' items.
               where: {
                  order: {
                     isDeleted: false,
                     ...(hasDate ? { createdAt: dateFilter } : {}),
                  },
               },
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
            // P2-7: availability distribution counts over the
            // COMPLETE catalogue, computed server-side so the
            // Products tab no longer downloads every availability
            // row through the export loader just to count statuses.
            // The three statuses partition the catalogue exactly as
            // the per-row status below does: quantity = 0 → "Out of
            // stock"; 0 < quantity <= (lowStockAlert || 10) → "Low
            // stock"; otherwise "In stock". The low count therefore
            // uses the same raw-SQL predicate as the low-stock list
            // plus quantity > 0 (out-of-stock rows also satisfy the
            // bare predicate and are counted in their own segment).
            prisma.product.count({ where: { isDeleted: false } }),
            prisma.$queryRaw<any[]>`
               SELECT COUNT(*) AS total
               FROM Product
               WHERE isDeleted = 0
                 AND quantity > 0
                 AND quantity <= COALESCE(NULLIF(lowStockAlert, 0), 10)
            `,
         ]);

         const lowStockList = lowStockPageRows || [];
         // MySQL COUNT(*) comes back as BigInt via the raw query.
         const lowStockCount = Number(lowStockTotalRows?.[0]?.total ?? 0);

         const totalInStock = Number(stockAgg._sum.quantity || 0);
         const outOfStockCount = outOfStockAll;

         const lowExclusiveCount = Number(lowExclusiveTotalRows?.[0]?.total ?? 0);
         return NextResponse.json({
            totalInStock,
            outOfStockCount,
            lowStockCount,
            // P2-7 (additive): complete-catalogue distribution
            // counts for the tab's chart — in + low + out = total,
            // by the partition argued above.
            availabilityCounts: {
               inStock: totalProductsAll - lowExclusiveCount - outOfStockAll,
               low: lowExclusiveCount,
               out: outOfStockAll,
               total: totalProductsAll,
            },
            page,
            limit,
            lowStockRows: lowStockList.map((p) => ({
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
            soldItemGroups,
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
            // period, aggregated per product in the database
            // (follow-up round — previously every sold item row was
            // loaded). The cost price is looked up once per distinct
            // product below; the per-row math is unchanged.
            prisma.orderItem.groupBy({
               by: ["productId"],
               where: {
                  order: {
                     ...whereOrderPeriod,
                     status: { in: ["COMPLETED", "DELIVERED"] },
                  },
               },
               _sum: { quantity: true },
               _count: { id: true },
            }),
            // Receivables are a CURRENT-state figure (all outstanding
            // dues, not just this period's), grouped per customer.
            // Phase B1 (P1-2): the canonical valid-order rule applies
            // — the old filter counted dues from CANCELLED/FAILED
            // orders, so Finance disagreed with the Customers list
            // and the Dashboard about the same customer's due.
            prisma.order.groupBy({
               by: ["customerId"],
               where: { ...VALID_ORDER_WHERE, dueAmount: { gt: 0 } },
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
         // they are excluded and counted so the UI can say so. The
         // groupBy above preserves the exact figures: quantity sums
         // per product × that product's cost, and the excluded count
         // is the number of item ROWS in the uncostable groups.
         const soldProductIds = soldItemGroups
            .map((g) => g.productId)
            .filter((id): id is string => Boolean(id));
         const soldProducts = soldProductIds.length
            ? await prisma.product.findMany({
                 where: { id: { in: soldProductIds } },
                 select: { id: true, costPrice: true },
              })
            : [];
         const costByProductId = new Map(
            soldProducts.map((p) => [p.id, p.costPrice]),
         );
         let estimatedCogs = 0;
         let cogsExcludedItems = 0;
         for (const group of soldItemGroups as any[]) {
            const cost = group.productId
               ? costByProductId.get(group.productId)
               : undefined;
            if (cost === null || cost === undefined) {
               cogsExcludedItems += Number(group._count?.id || 0);
            } else {
               estimatedCogs += Number(group._sum?.quantity || 0) * Number(cost);
            }
         }

         // Receivables detail: customer names + oldest open order.
         const receivableCustomerIds = receivableGroups
            .map((g) => g.customerId)
            .filter((id): id is string => Boolean(id));
         const [receivableCustomers, oldestDueGroups] = await Promise.all([
            receivableCustomerIds.length
               ? prisma.customer.findMany({
                    where: { id: { in: receivableCustomerIds } },
                    select: { id: true, customId: true, name: true, phone: true },
                 })
               : Promise.resolve([]),
            // Oldest open order per customer via a database _min
            // aggregate (follow-up round — previously every open
            // order for these customers was loaded just to find the
            // earliest date per customer).
            receivableCustomerIds.length
               ? prisma.order.groupBy({
                    by: ["customerId"],
                    where: {
                       ...VALID_ORDER_WHERE,
                       dueAmount: { gt: 0 },
                       customerId: { in: receivableCustomerIds },
                    },
                    _min: { createdAt: true },
                 })
               : Promise.resolve([]),
         ]);
         const customerById = new Map(receivableCustomers.map((c) => [c.id, c]));
         const oldestByCustomer = new Map<string, Date>();
         for (const g of oldestDueGroups as any[]) {
            if (g.customerId && g._min?.createdAt) {
               oldestByCustomer.set(g.customerId, new Date(g._min.createdAt));
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
         // stand as credit) and minus standing purchase-return
         // credit (Phase 4, D2: the credit term's second documented
         // source — the one outstanding definition, extended).
         // Oldest open purchase first.
         const [dueGroups, creditGroups, returnGroups] = await Promise.all([
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
            prisma.purchaseReturn.groupBy({
               by: ["supplierId"],
               where: { isDeleted: false },
               _sum: { totalAmount: true, creditConsumed: true },
            }),
         ]);
         const creditBySupplier = new Map(
            creditGroups.map((g) => [g.supplierId, Number(g._sum.amount || 0)]),
         );
         const returnCreditBySupplier = new Map(
            returnGroups
               .filter((g) => g.supplierId)
               .map((g) => [
                  g.supplierId as string,
                  standingCreditOf(
                     Number(g._sum.totalAmount || 0),
                     Number(g._sum.creditConsumed || 0),
                  ),
               ]),
         );
         const payableSupplierIds = Array.from(
            new Set([
               ...dueGroups.map((g) => g.supplierId).filter(Boolean),
               ...creditGroups.map((g) => g.supplierId),
               ...returnGroups.map((g) => g.supplierId).filter(Boolean),
            ]),
         ) as string[];
         const [payableSuppliers, oldestDuePurchaseGroups] = await Promise.all([
            payableSupplierIds.length
               ? prisma.supplier.findMany({
                    where: { id: { in: payableSupplierIds } },
                    select: { id: true, customId: true, name: true, phone: true },
                 })
               : Promise.resolve([]),
            // Oldest open purchase per supplier via a database _min
            // aggregate (same follow-up conversion as receivables).
            payableSupplierIds.length
               ? prisma.purchase.groupBy({
                    by: ["supplierId"],
                    where: {
                       isDeleted: false,
                       due: { gt: 0 },
                       supplierId: { in: payableSupplierIds },
                    },
                    _min: { createdAt: true },
                 })
               : Promise.resolve([]),
         ]);
         const supplierById = new Map(payableSuppliers.map((s) => [s.id, s]));
         const oldestPurchaseBySupplier = new Map<string, Date>();
         for (const g of oldestDuePurchaseGroups as any[]) {
            if (g.supplierId && g._min?.createdAt) {
               oldestPurchaseBySupplier.set(
                  g.supplierId,
                  new Date(g._min.createdAt),
               );
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
               const returnCredit = returnCreditBySupplier.get(supplierId) || 0;
               return {
                  supplierId,
                  supplierCustomId: s?.customId || null,
                  supplier: s?.name || "Unknown supplier",
                  phone: s?.phone || "",
                  purchasesWithDue: dueInfo.purchases,
                  totalDue: dueInfo.due,
                  credit,
                  returnCredit,
                  netPayable: Math.max(0, dueInfo.due - credit - returnCredit),
                  oldestDueAt:
                     oldestPurchaseBySupplier.get(supplierId)?.toISOString() ?? null,
               };
            })
            .filter((p) => p.totalDue > 0 || p.credit > 0 || p.returnCredit > 0)
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
      // Date behaviour: revenue, expenses, purchases, order count,
      // orders-by-status, top products and orders-by-source are
      // period flows and honour the selected range when one is given.
      // Total Customers and Total Products are current-state counts
      // (records on file right now) and are never date-filtered — the
      // Summary UI captions them as such.
      const summaryOrderWhere: any = { isDeleted: false };
      if (hasDate) summaryOrderWhere.createdAt = dateFilter;
      const summaryFlowWhere: any = { isDeleted: false };
      if (hasDate) summaryFlowWhere.createdAt = dateFilter;
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
            where: { ...summaryOrderWhere, status: { in: ["COMPLETED", "DELIVERED"] } },
            _sum: { total: true },
         }),
         prisma.expense.aggregate({
            where: summaryFlowWhere,
            _sum: { amount: true },
         }),
         prisma.purchase.aggregate({
            where: summaryFlowWhere,
            _sum: { total: true },
         }),
         prisma.order.count({ where: summaryOrderWhere }),
         prisma.customer.count(),
         prisma.product.count({ where: { isDeleted: false } }),
         prisma.order.groupBy({
            by: ["status"],
            where: summaryOrderWhere,
            _count: { id: true },
         }),
         prisma.orderItem.groupBy({
            by: ["name"],
            where: {
               order: {
                  isDeleted: false,
                  ...(hasDate ? { createdAt: dateFilter } : {}),
               },
            },
            _sum: { quantity: true, subtotal: true },
            orderBy: { _sum: { quantity: "desc" } },
            take: 5,
         }),
         prisma.order.groupBy({
            by: ["orderSource"],
            where: summaryOrderWhere,
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
