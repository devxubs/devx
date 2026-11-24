import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireActiveSession } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { calculateNetProfit } from "@src/lib/finance";
import { lowStockSqlCondition } from "@src/lib/lowStock";
import { bucketIndexSql, applyBucketTotals } from "@src/lib/dashboardSeries";

// Dashboard API (Phase 3B, roadmap 3.9 / PERF-02).
//
// All period figures are bounded by the requested range
// (`startDate`/`endDate`; a legacy `year` param still maps to that
// calendar year; default = last 30 days) and come from Prisma
// count/aggregate queries. The chart series is built from one
// grouped query per model over the time buckets (daily buckets up
// to 62 days, monthly beyond) — QA fix (B4) + P2-6: no code path
// loads the range's order/expense rows into memory to build the
// series, and no per-bucket aggregate fan-out remains. Current-state
// figures (low stock, pending orders, total customer due, recent
// orders, category stock distribution) describe "now" and are
// intentionally not range-bounded. The response shape is unchanged
// apart from the added `kpis`, `seriesLabels` and `range` fields.

function startOfDay(d: Date) {
   const x = new Date(d);
   x.setHours(0, 0, 0, 0);
   return x;
}
function endOfDay(d: Date) {
   const x = new Date(d);
   x.setHours(23, 59, 59, 999);
   return x;
}

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { searchParams } = new URL(request.url);
   const now = new Date();
   let rangeStart = startOfDay(new Date(now.getTime() - 29 * 86400000));
   let rangeEnd = endOfDay(now);
   const sd = searchParams.get("startDate");
   const ed = searchParams.get("endDate");
   const yearParam = searchParams.get("year");
   if (sd || ed) {
      if (sd) {
         const d = new Date(sd);
         if (!Number.isNaN(d.getTime())) rangeStart = startOfDay(d);
      }
      if (ed) {
         const d = new Date(ed);
         if (!Number.isNaN(d.getTime())) rangeEnd = endOfDay(d);
      }
   } else if (yearParam) {
      const y = parseInt(yearParam, 10);
      if (!Number.isNaN(y)) {
         rangeStart = new Date(y, 0, 1);
         rangeEnd = new Date(y, 11, 31, 23, 59, 59, 999);
      }
   }
   if (rangeEnd < rangeStart) rangeEnd = endOfDay(rangeStart);
   const rangeWhere = { gte: rangeStart, lte: rangeEnd };
   const daySpan =
      Math.round(
         (startOfDay(rangeEnd).getTime() - startOfDay(rangeStart).getTime()) /
            86400000,
      ) + 1;
   const bucketMode = daySpan <= 62 ? "day" : "month";
   const todayStart = startOfDay(now);
   const todayEnd = endOfDay(now);

   // Series bucket boundaries (QA fix B4). Labels match the previous
   // in-memory bucketing exactly; the first/last buckets are clamped
   // to the requested range so aggregates never count rows outside
   // it (the old row pass was range-bounded the same way).
   type SeriesBucket = {
      label: string;
      start: Date;
      end: Date;
      income: number;
      expenses: number;
   };
   const bucketDefs: SeriesBucket[] = [];
   if (bucketMode === "day") {
      const cursor = startOfDay(rangeStart);
      while (cursor <= rangeEnd) {
         const start = new Date(cursor);
         bucketDefs.push({
            label: cursor.toLocaleDateString("en-US", {
               month: "short",
               day: "numeric",
            }),
            start: start < rangeStart ? new Date(rangeStart) : start,
            end: endOfDay(cursor),
            income: 0,
            expenses: 0,
         });
         cursor.setDate(cursor.getDate() + 1);
      }
   } else {
      const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      while (cursor <= rangeEnd) {
         const monthStart = new Date(cursor);
         const monthEnd = endOfDay(
            new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0),
         );
         bucketDefs.push({
            label: cursor.toLocaleDateString("en-US", {
               month: "short",
               year: "numeric",
            }),
            start: monthStart < rangeStart ? new Date(rangeStart) : monthStart,
            end: monthEnd > rangeEnd ? new Date(rangeEnd) : monthEnd,
            income: 0,
            expenses: 0,
         });
         cursor.setMonth(cursor.getMonth() + 1);
      }
   }

   try {
      const [
         totalOrders,
         completedOrders,
         cancelledOrders,
         holdOrders,
         revenueSum,
         expenseSum,
         purchaseSum,
         refundSum,
         payoutSum,
         lowStockIdRows,
         recentOrders,
         allEmployees,
         categoryDistribution,
         pendingOrders,
         todaysOrders,
         customerDueAgg,
      ] = await Promise.all([
         prisma.order.count({
            where: { isDeleted: false, createdAt: rangeWhere },
         }),
         prisma.order.count({
            where: { status: "COMPLETED", isDeleted: false, createdAt: rangeWhere },
         }),
         prisma.order.count({
            where: { status: "CANCELLED", isDeleted: false, createdAt: rangeWhere },
         }),
         prisma.order.count({
            where: { status: "HOLD", isDeleted: false, createdAt: rangeWhere },
         }),
         prisma.order.aggregate({
            where: {
               isDeleted: false,
               status: { in: ["COMPLETED", "DELIVERED"] },
               createdAt: rangeWhere,
            },
            _sum: { total: true },
         }),
         prisma.expense.aggregate({
            where: { isDeleted: false, createdAt: rangeWhere },
            _sum: { amount: true },
         }),
         prisma.purchase.aggregate({
            where: { isDeleted: false, createdAt: rangeWhere },
            _sum: { total: true },
         }),
         prisma.order.aggregate({
            where: { isDeleted: false, status: "CANCELLED", createdAt: rangeWhere },
            _sum: { total: true },
         }),
         prisma.billingTransaction.aggregate({
            where: { status: "COMPLETED", createdAt: rangeWhere },
            _sum: { amount: true },
         }),
         // Phase 1: low stock is defined per product by its own
         // lowStockAlert threshold — the previous query hard-coded
         // quantity <= 10 for every product regardless of its setting.
         // P2-6: the full catalogue is no longer loaded to count it —
         // the matching ids are resolved with the canonical raw-SQL
         // predicate from lib/lowStock (the id-resolution pattern
         // the products list uses), then counted by Prisma below.
         prisma.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM Product
            WHERE isDeleted = 0
              AND ${Prisma.raw(lowStockSqlCondition())}
         `,
         prisma.order.findMany({
            where: { isDeleted: false },
            take: 5,
            orderBy: { createdAt: "desc" },
            include: { customer: true },
         }),
         // Employee ranking (restored simple system): employee
         // order figures come from the groupBy below — the nested
         // ordersHandled load (every handled order row for every
         // active employee) is not used. The user query keeps the
         // same ACTIVE filter and fields.
         prisma.user.findMany({
            where: { status: "ACTIVE" },
            select: {
               id: true,
               customId: true,
               name: true,
               image: true,
               role: { select: { name: true } },
            },
         }),
         // P2-6: category stock totals come from the product
         // groupBy below instead of loading every product row.
         // OBS-A2 (Full Live QA Audit 2026-11-25): ALL categories
         // are loaded now — the old take: 4 silently dropped every
         // category past the fourth from the distribution (the
         // donut showed 163 units of 295 in stock). The assembly
         // below keeps the top 4 slices and folds the rest into
         // "Other" so the chart total is the real stock total.
         prisma.category.findMany({
            select: { id: true, name: true },
         }),
         // Phase 3B owner KPIs — current state, not range-bounded.
         prisma.order.count({ where: { isDeleted: false, status: "PENDING" } }),
         prisma.order.count({
            where: {
               isDeleted: false,
               status: { notIn: ["CANCELLED", "FAILED"] },
               createdAt: { gte: todayStart, lte: todayEnd },
            },
         }),
         prisma.order.aggregate({
            where: {
               isDeleted: false,
               status: { notIn: ["CANCELLED", "FAILED"] },
               dueAmount: { gt: 0 },
            },
            _sum: { dueAmount: true },
         }),
      ]);

      // P2-6: count the products the canonical predicate resolved
      // above (quantity <= lowStockAlert || 10 — see lib/lowStock;
      // for every product with a positive stored threshold this is
      // exactly the previous in-JS `quantity <= lowStockAlert`).
      const lowStockCount = await prisma.product.count({
         where: {
            isDeleted: false,
            id: { in: lowStockIdRows.map((r) => r.id) },
         },
      });

      // Employee ranking (restored simple system): per-employee
      // handled-order figures via ONE groupBy (employee × status)
      // over non-deleted orders in the requested range, attributed
      // via Order.employeeId (the ordersHandled relation). Groups
      // for non-ACTIVE users are simply never read below, exactly
      // as the nested load never returned them.
      const employeeOrderStats = await prisma.order.groupBy({
         by: ["employeeId", "status"],
         where: {
            isDeleted: false,
            createdAt: rangeWhere,
            employeeId: { not: null },
         },
         _count: { id: true },
         _sum: { total: true },
      });
      const handledByEmployee = new Map<
         string,
         { handled: number; confirmed: number; cancelled: number; totalSales: number }
      >();
      for (const g of employeeOrderStats as any[]) {
         if (!g.employeeId) continue;
         const stats = handledByEmployee.get(g.employeeId) || {
            handled: 0,
            confirmed: 0,
            cancelled: 0,
            totalSales: 0,
         };
         const count = Number(g._count?.id || 0);
         stats.handled += count;
         if (g.status === "COMPLETED" || g.status === "DELIVERED") {
            stats.confirmed += count;
            stats.totalSales += Number(g._sum?.total || 0);
         }
         if (g.status === "CANCELLED") stats.cancelled += count;
         handledByEmployee.set(g.employeeId, stats);
      }

      // P2-6: per-category stock totals via ONE product groupBy
      // over the same population the nested load summed:
      // non-deleted products. OBS-A2: no longer restricted to the
      // selected categories — every category's stock is summed so
      // the "Other" fold below is exact.
      const categoryStockStats = await prisma.product.groupBy({
         by: ["categoryId"],
         where: { isDeleted: false },
         _sum: { quantity: true },
      });
      const stockByCategory = new Map<string, number>(
         (categoryStockStats as any[])
            .filter((g) => g.categoryId)
            .map((g) => [g.categoryId as string, Number(g._sum?.quantity || 0)]),
      );
      const totalRevenue = Number(revenueSum._sum.total || 0);
      const totalExpenses = Number(expenseSum._sum.amount || 0);
      const totalPurchases = Number(purchaseSum._sum.total || 0);
      const refunded = Number(refundSum._sum.total || 0);
      const settledPayouts = Number(payoutSum._sum.amount || 0);
      // DB/API-07 fix: Dashboard now uses the same shared profit
      // definition as Reports (revenue − expenses − purchases)
      // instead of its own revenue − expenses formula.
      const netProfit = calculateNetProfit(totalRevenue, totalExpenses, totalPurchases);
      // P3-7 honesty note: `currentBalance` is a range-derived net
      // (revenue − expenses − settled payouts over the selected
      // period), NOT a stored account balance, and `refunded` above
      // is the summed total of CANCELLED orders, not recorded
      // refunds. Field names are kept for API compatibility; the
      // Dashboard cards are labelled accordingly.
      // BUG-A1 (Full Live QA Audit 2026-11-25): the figure is NO
      // LONGER floored at 0 — the floor made a loss-making period
      // display "Net over selected period: ৳0.00" while the same
      // card showed negative Net Earnings. The true signed value is
      // returned so losses are visible.
      const currentBalance = totalRevenue - totalExpenses - settledPayouts;

      // Range-bucketed income vs expenses series — P2-6: the
      // per-bucket aggregate fan-out (one query per bucket per
      // model, up to ~124 calls) is collapsed into ONE grouped
      // query per model. A SQL CASE over the exact bucket
      // boundaries computed above assigns each in-range row to its
      // bucket index (lib/dashboardSeries), so the sums are the
      // same sums the per-bucket aggregates produced — same
      // filters (income = COMPLETED / DELIVERED orders only,
      // non-deleted, range-bounded), same clamped first/last
      // buckets, no timezone truncation.
      const bucketSqlBounds = bucketDefs.map((b) => ({
         start: b.start,
         end: b.end,
      }));
      const [bucketIncomeRows, bucketExpenseRows] = await Promise.all([
         prisma.$queryRaw<Array<{ bucket: number | bigint | null; total: unknown }>>`
            SELECT ${bucketIndexSql(Prisma.sql`createdAt`, bucketSqlBounds)} AS bucket,
                   SUM(total) AS total
            FROM \`Order\`
            WHERE isDeleted = 0
              AND status IN ('COMPLETED', 'DELIVERED')
              AND createdAt >= ${rangeStart} AND createdAt <= ${rangeEnd}
            GROUP BY bucket
         `,
         prisma.$queryRaw<Array<{ bucket: number | bigint | null; total: unknown }>>`
            SELECT ${bucketIndexSql(Prisma.sql`createdAt`, bucketSqlBounds)} AS bucket,
                   SUM(amount) AS total
            FROM Expense
            WHERE isDeleted = 0
              AND createdAt >= ${rangeStart} AND createdAt <= ${rangeEnd}
            GROUP BY bucket
         `,
      ]);
      const bucketIncome = applyBucketTotals(bucketDefs.length, bucketIncomeRows);
      const bucketExpenses = applyBucketTotals(bucketDefs.length, bucketExpenseRows);
      bucketDefs.forEach((b, i) => {
         b.income = bucketIncome[i];
         b.expenses = bucketExpenses[i];
      });
      const monthlyIncome = bucketDefs.map((b) => b.income);
      const monthlyExpenses = bucketDefs.map((b) => b.expenses);
      const seriesLabels = bucketDefs.map((b) => b.label);

      // Employee Ranking Calculation (restored simple system,
      // owner decision 2026-11-22 — replaces the short-lived
      // Phase 2 weighted-score engine). The figures come from the
      // employee × status groupBy above — handled = all groups,
      // confirmed ("completed sales") = COMPLETED + DELIVERED,
      // cancelled = CANCELLED, totalSales ("revenue") = the summed
      // totals of the confirmed groups. Cancelled orders never
      // count as completed sales.
      const calculatedRankings = allEmployees.map((emp) => {
         const handledStats = handledByEmployee.get(emp.id) || {
            handled: 0,
            confirmed: 0,
            cancelled: 0,
            totalSales: 0,
         };
         const handledCount = handledStats.handled;
         const confirmedCount = handledStats.confirmed;
         const cancelledCount = handledStats.cancelled;
         const totalSales = handledStats.totalSales;

         return {
            id: emp.id,
            customId: emp.customId || emp.id,
            name: emp.name || "Employee",
            avatar: emp.image || "/images/avatar-25.webp",
            role: emp.role?.name || "Staff",
            call: handledCount,
            conform: confirmedCount,
            cancel: cancelledCount,
            totalSales,
         };
      });

      // Sort: completed sales DESC, then revenue DESC, then
      // employee name ASC, then employee id ASC. (Owner-required
      // delta from the pre-Phase-2 sort, whose final key was
      // handled-count DESC: name/id make the order fully
      // deterministic even when two employees match on both
      // performance figures.)
      calculatedRankings.sort((a, b) => {
         if (b.conform !== a.conform) return b.conform - a.conform;
         if (b.totalSales !== a.totalSales) return b.totalSales - a.totalSales;
         const byName = String(a.name).localeCompare(String(b.name));
         if (byName !== 0) return byName;
         return String(a.id).localeCompare(String(b.id));
      });

      // Assign ranks with proper tie-handling (employees equal on
      // completed sales AND revenue share a rank).
      let currentRank = 1;
      const rankedEmployees = calculatedRankings.map((emp, index) => {
         if (index > 0) {
            const prev = calculatedRankings[index - 1];
            // If strictly lower performance than previous employee, increment rank
            if (emp.conform < prev.conform || (emp.conform === prev.conform && emp.totalSales < prev.totalSales)) {
               currentRank = index + 1;
            }
         }

         let rankBadge = `Top ${currentRank}`;
         let color: "primary" | "secondary" | "success" | "warning" | "error" | "default" = "default";

         // OBS-A5 (Full Live QA Audit 2026-11-25): with no completed
         // sales and no revenue, a "Top 1 / Top 2" badge celebrates
         // a 0–0 tie. Employees with zero performance in the range
         // get an unranked marker instead.
         const hasPerformance = emp.conform > 0 || emp.totalSales > 0;

         if (currentRank === 1) {
            rankBadge = "Top 1";
            color = "primary";
         } else if (currentRank === 2) {
            rankBadge = "Top 2";
            color = "secondary";
         } else if (currentRank === 3) {
            rankBadge = "Top 3";
            color = "success";
         } else if (currentRank === 4) {
            rankBadge = "Top 4";
            color = "warning";
         } else if (currentRank === 5) {
            rankBadge = "Top 5";
            color = "error";
         } else {
            rankBadge = `Top ${currentRank}`;
            color = "default";
         }

         if (!hasPerformance) {
            rankBadge = "—";
            color = "default";
         }

         return {
            id: emp.id,
            seller: {
               name: emp.name,
               url: emp.avatar,
            },
            name: emp.name,
            avatar: emp.avatar,
            call: emp.call,
            conform: emp.conform,
            cancel: emp.cancel,
            // Revenue is now included so the Dashboard table can
            // show it (the pre-Phase-2 payload computed totalSales
            // for sorting but dropped it from the response rows).
            totalSales: emp.totalSales,
            rank: rankBadge,
            rankNumber: currentRank,
            color,
         };
      });

      // Distribution data for RadialBar / Category distribution
      const distributionLabels: string[] = [];
      const distributionSeries: number[] = [];
      // Phase 1 (NEW-04): real quantities only — zero-stock categories
      // report 0, and when there are no categories the distribution is
      // empty so the UI shows an empty state. The previous code inflated
      // zero quantities to 1 and invented "Beverages/Snacks/Electronics"
      // 50/30/20 data when the database had none.
      // OBS-A2: rank categories by stock, keep the four largest
      // slices, and fold every remaining category into one "Other"
      // slice — the donut's total is now the true stock total
      // instead of only the first four categories'.
      const rankedCategories = categoryDistribution
         .map((cat) => ({
            name: cat.name,
            totalQty: stockByCategory.get(cat.id) || 0,
         }))
         .sort((a, b) => b.totalQty - a.totalQty);
      const topCategories = rankedCategories.slice(0, 4);
      const otherQty = rankedCategories
         .slice(4)
         .reduce((sum, c) => sum + c.totalQty, 0);
      topCategories.forEach((cat) => {
         distributionLabels.push(cat.name);
         distributionSeries.push(cat.totalQty);
      });
      if (rankedCategories.length > 4 && otherQty > 0) {
         distributionLabels.push("Other");
         distributionSeries.push(otherQty);
      }

      return NextResponse.json({
         totalOrders,
         completedOrders,
         cancelledOrders,
         holdOrders,
         totalRevenue,
         totalExpenses,
         netProfit,
         refunded,
         currentBalance,
         lowStockCount,
         recentOrders,
         monthlyIncome,
         monthlyExpenses,
         seriesLabels,
         range: {
            startDate: rangeStart.toISOString(),
            endDate: rangeEnd.toISOString(),
            bucket: bucketMode,
         },
         kpis: {
            pendingOrders,
            todaysOrders,
            totalCustomerDue: Number(customerDueAgg._sum?.dueAmount || 0),
            lowStockCount,
         },
         rankedEmployees,
         distribution: {
            labels: distributionLabels,
            series: distributionSeries,
         },
      });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch dashboard metrics" },
         { status: 500 },
      );
   }
}
