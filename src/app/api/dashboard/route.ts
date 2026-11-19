import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { calculateNetProfit } from "@src/lib/finance";

// Dashboard API (Phase 3B, roadmap 3.9 / PERF-02).
//
// All period figures are bounded by the requested range
// (`startDate`/`endDate`; a legacy `year` param still maps to that
// calendar year; default = last 30 days) and come from Prisma
// count/aggregate queries. The chart series is built from one
// aggregate query per time bucket (daily buckets up to 62 days,
// monthly beyond) — QA fix (B4): no code path loads the range's
// order/expense rows into memory to build the series. Current-state
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
         lowStockProducts,
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
         prisma.product.findMany({
            where: { isDeleted: false },
            select: { quantity: true, lowStockAlert: true },
         }),
         prisma.order.findMany({
            where: { isDeleted: false },
            take: 5,
            orderBy: { createdAt: "desc" },
            include: { customer: true },
         }),
         prisma.user.findMany({
            where: { status: "ACTIVE" },
            select: {
               id: true,
               customId: true,
               name: true,
               image: true,
               role: { select: { name: true } },
               ordersHandled: {
                  where: { isDeleted: false, createdAt: rangeWhere },
                  select: { status: true, total: true },
               },
            },
         }),
         prisma.category.findMany({
            select: {
               name: true,
               products: {
                  where: { isDeleted: false },
                  select: { quantity: true },
               },
            },
            take: 4,
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

      const lowStockCount = lowStockProducts.filter(
         (p) => p.quantity <= p.lowStockAlert,
      ).length;
      const totalRevenue = Number(revenueSum._sum.total || 0);
      const totalExpenses = Number(expenseSum._sum.amount || 0);
      const totalPurchases = Number(purchaseSum._sum.total || 0);
      const refunded = Number(refundSum._sum.total || 0);
      const settledPayouts = Number(payoutSum._sum.amount || 0);
      // DB/API-07 fix: Dashboard now uses the same shared profit
      // definition as Reports (revenue − expenses − purchases)
      // instead of its own revenue − expenses formula.
      const netProfit = calculateNetProfit(totalRevenue, totalExpenses, totalPurchases);
      const currentBalance = Math.max(totalRevenue - totalExpenses - settledPayouts, 0);

      // Range-bucketed income vs expenses series — one bounded
      // aggregate query per bucket (QA fix B4; previously every
      // order/expense row in the range was loaded and bucketed in
      // memory). Income counts COMPLETED / DELIVERED orders only,
      // exactly as the row pass did.
      const [bucketIncomeAggs, bucketExpenseAggs] = await Promise.all([
         Promise.all(
            bucketDefs.map((b) =>
               prisma.order.aggregate({
                  where: {
                     isDeleted: false,
                     status: { in: ["COMPLETED", "DELIVERED"] },
                     createdAt: { gte: b.start, lte: b.end },
                  },
                  _sum: { total: true },
               }),
            ),
         ),
         Promise.all(
            bucketDefs.map((b) =>
               prisma.expense.aggregate({
                  where: {
                     isDeleted: false,
                     createdAt: { gte: b.start, lte: b.end },
                  },
                  _sum: { amount: true },
               }),
            ),
         ),
      ]);
      bucketDefs.forEach((b, i) => {
         b.income = Number(bucketIncomeAggs[i]._sum.total || 0);
         b.expenses = Number(bucketExpenseAggs[i]._sum.amount || 0);
      });
      const monthlyIncome = bucketDefs.map((b) => b.income);
      const monthlyExpenses = bucketDefs.map((b) => b.expenses);
      const seriesLabels = bucketDefs.map((b) => b.label);

      // Employee Ranking Calculation with deterministic tie-breaking
      const calculatedRankings = allEmployees.map((emp) => {
         const handledCount = emp.ordersHandled.length;
         const confirmedCount = emp.ordersHandled.filter(
            (o) => o.status === "COMPLETED" || o.status === "DELIVERED",
         ).length;
         const cancelledCount = emp.ordersHandled.filter(
            (o) => o.status === "CANCELLED",
         ).length;
         const totalSales = emp.ordersHandled
            .filter((o) => o.status === "COMPLETED" || o.status === "DELIVERED")
            .reduce((sum, o) => sum + Number(o.total), 0);

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

      // Sort by confirmedCount DESC, then totalSales DESC, then handledCount DESC
      calculatedRankings.sort((a, b) => {
         if (b.conform !== a.conform) return b.conform - a.conform;
         if (b.totalSales !== a.totalSales) return b.totalSales - a.totalSales;
         return b.call - a.call;
      });

      // Assign ranks with proper tie-handling
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
      categoryDistribution.forEach((cat) => {
         const totalQty = cat.products.reduce((acc, p) => acc + p.quantity, 0);
         distributionLabels.push(cat.name);
         distributionSeries.push(totalQty);
      });

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
