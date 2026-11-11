/**
 * Shared financial calculations (DB/API-07 fix).
 *
 * There is exactly ONE definition of net profit in the application,
 * used by both the Dashboard and the Reports summary so the same KPI
 * can never show two different values on different screens:
 *
 *   netProfit = totalRevenue − totalExpenses − totalPurchases
 *
 * where revenue is the sum of COMPLETED/DELIVERED order totals,
 * expenses is the sum of non-deleted expense amounts, and purchases
 * is the sum of non-deleted purchase totals. All inputs are plain
 * numbers converted from Prisma Decimals by the caller.
 */
export function calculateNetProfit(
   totalRevenue: number,
   totalExpenses: number,
   totalPurchases: number,
): number {
   const revenue = Number(totalRevenue) || 0;
   const expenses = Number(totalExpenses) || 0;
   const purchases = Number(totalPurchases) || 0;
   return revenue - expenses - purchases;
}
