/**
 * Expense amount policy (Phase C4, audit C-13-adjacent / P2-10).
 *
 * USER-created expenses must be a finite amount greater than zero:
 * a negative expense is money BACK IN, and letting staff create one
 * through the normal expense endpoint inflates profit through the
 * one shared profit formula (revenue − expenses − purchases) with
 * no corresponding real inflow.
 *
 * The ONE legitimate negative expense in the system — the
 * "Purchase Return Refund" row booked when a purchase return is
 * settled as CASH_REFUND — is created internally by the returns
 * flow via Prisma directly (src/app/api/purchases/[id]/returns),
 * never through POST /api/expenses, so this endpoint policy cannot
 * break refunds. The helper is pure so the routes and the tests can
 * never drift apart.
 */

/**
 * Validate a user-supplied expense amount. Returns the parsed
 * amount, or an error message when the amount is missing /
 * non-finite / not positive.
 */
export function validateUserExpenseAmount(
   raw: unknown,
): { ok: true; amount: number } | { ok: false; error: string } {
   if (raw === undefined || raw === null || raw === "") {
      return { ok: false, error: "Expense amount is required" };
   }
   const amount = typeof raw === "number" ? raw : parseFloat(String(raw));
   if (!Number.isFinite(amount)) {
      return { ok: false, error: "Expense amount must be a valid number" };
   }
   if (amount <= 0) {
      return {
         ok: false,
         error: "Expense amount must be greater than zero",
      };
   }
   return { ok: true, amount };
}
