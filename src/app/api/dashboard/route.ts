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
   const yearParam = searchParams.get("year");
   const targetYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

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
         lowStockCount,
         recentOrders,
         allEmployees,
         ordersForYear,
         expensesForYear,
         categoryDistribution,
      ] = await Promise.all([
         prisma.order.count({ where: { isDeleted: false } }),
         prisma.order.count({ where: { status: "COMPLETED", isDeleted: false } }),
         prisma.order.count({ where: { status: "CANCELLED", isDeleted: false } }),
         prisma.order.count({ where: { status: "HOLD", isDeleted: false } }),
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
         prisma.order.aggregate({
            where: { isDeleted: false, status: "CANCELLED" },
            _sum: { total: true },
         }),
         prisma.billingTransaction.aggregate({
            where: { status: "COMPLETED" },
            _sum: { amount: true },
         }),
         prisma.product.count({
            where: { isDeleted: false, quantity: { lte: 10 } },
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
                  where: { isDeleted: false },
                  select: { status: true, total: true },
               },
            },
         }),
         prisma.order.findMany({
            where: {
               isDeleted: false,
               createdAt: {
                  gte: new Date(targetYear, 0, 1),
                  lte: new Date(targetYear, 11, 31, 23, 59, 59),
               },
            },
            select: { total: true, status: true, createdAt: true },
         }),
         prisma.expense.findMany({
            where: {
               isDeleted: false,
               createdAt: {
                  gte: new Date(targetYear, 0, 1),
                  lte: new Date(targetYear, 11, 31, 23, 59, 59),
               },
            },
            select: { amount: true, createdAt: true },
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
      ]);

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

      // Monthly sales vs expenses array (12 months)
      const monthlyIncome = new Array(12).fill(0);
      const monthlyExpenses = new Array(12).fill(0);

      ordersForYear.forEach((ord) => {
         const m = new Date(ord.createdAt).getMonth();
         if (ord.status === "COMPLETED" || ord.status === "DELIVERED") {
            monthlyIncome[m] += Number(ord.total);
         }
      });

      expensesForYear.forEach((exp) => {
         const m = new Date(exp.createdAt).getMonth();
         monthlyExpenses[m] += Number(exp.amount);
      });

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
      categoryDistribution.forEach((cat) => {
         const totalQty = cat.products.reduce((acc, p) => acc + p.quantity, 0);
         distributionLabels.push(cat.name);
         distributionSeries.push(totalQty > 0 ? totalQty : 1);
      });

      if (distributionLabels.length === 0) {
         distributionLabels.push("Beverages", "Snacks", "Electronics");
         distributionSeries.push(50, 30, 20);
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
