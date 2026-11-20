/**
 * Purchase returns (Phase 4, D2) — settlement math, quantity guard,
 * Purchase-row locking and standing-credit aggregation.
 *
 * The settlement rules are the owner's approved ones
 * (DEVX_POS_PHASE4_SCHEMA_FINAL_DIFF.md §2.2, as corrected
 * 2026-11-20) and live ONLY here so the create/delete routes and
 * the tests can never drift apart:
 *
 *   dueAbsorbed = min(R, purchase.due)
 *   purchase.total -= dueAbsorbed        (never the full R)
 *   purchase.due    = purchase.total - purchase.paid
 *   remainder       = R - dueAbsorbed    → SUPPLIER_CREDIT | CASH_REFUND
 *
 * creditConsumed at creation: SUPPLIER_CREDIT → dueAbsorbed;
 * DUE_REDUCTION / CASH_REFUND → totalAmount. Standing credit of a
 * row is therefore always `totalAmount - creditConsumed`, and the
 * supplier outstanding definition (suppliers list, payableSummary,
 * Finance payables) gains standing return credit as the credit
 * term's second source next to unallocated payments:
 *
 *   netPayable = max(0, Σ purchase.due − Σ unallocated payments
 *                       − Σ standing return credit)
 *
 * dueAbsorbed is NOT a term of that formula — it already reduced
 * purchase.due at creation; subtracting it again would double-count.
 */

export const RETURN_SETTLEMENTS = [
   "DUE_REDUCTION",
   "SUPPLIER_CREDIT",
   "CASH_REFUND",
] as const;
export type ReturnSettlement = (typeof RETURN_SETTLEMENTS)[number];

/**
 * Expense ledger type used to record a CASH_REFUND in the shop's
 * cash/bank accounting (see the returns create route): the refund
 * is money BACK IN, so it is booked as a negative Expense row —
 * Finance's expense total (and the one shared profit formula,
 * revenue − expenses − purchases) then reflects the inflow with no
 * parallel ledger and no formula change. The row's note carries
 * the PRET_ id, which is how the return-delete reversal finds it.
 */
export const CASH_REFUND_EXPENSE_TYPE = "Purchase Return Refund";

const round2 = (n: number): number =>
   Math.round((Number(n) || 0) * 100) / 100;

export interface ReturnSettlementResult {
   totalAmount: number;
   dueAbsorbed: number;
   remainder: number;
   settlement: ReturnSettlement;
   /** creditConsumed value to store at creation (see header). */
   creditConsumed: number;
   /** Standing credit the new row contributes (0 unless credit). */
   standingCredit: number;
}

/**
 * Compute the settlement for a return of `totalAmount` against a
 * purchase whose CURRENT due is `purchaseDue` (read under the
 * Purchase-row lock by the caller).
 *
 * `choice` is the operator's pick for a positive remainder:
 * SUPPLIER_CREDIT (the default per the approved design) or
 * CASH_REFUND. When the remainder is 0 the settlement is forced to
 * DUE_REDUCTION and any other choice is a caller error.
 */
export function computeReturnSettlement(
   totalAmount: number,
   purchaseDue: number,
   choice?: string | null,
): ReturnSettlementResult {
   const R = round2(totalAmount);
   const due = round2(purchaseDue);
   if (!(R > 0)) {
      throw new Error("Return amount must be greater than zero");
   }
   const dueAbsorbed = Math.min(R, Math.max(0, due));
   const remainder = round2(R - dueAbsorbed);

   let settlement: ReturnSettlement;
   if (remainder <= 0) {
      if (choice && choice !== "DUE_REDUCTION") {
         throw new Error(
            "Settlement must be DUE_REDUCTION when the return is fully absorbed by the purchase due",
         );
      }
      settlement = "DUE_REDUCTION";
   } else {
      const picked = (choice || "SUPPLIER_CREDIT").toUpperCase();
      if (picked !== "SUPPLIER_CREDIT" && picked !== "CASH_REFUND") {
         throw new Error(
            "Settlement must be SUPPLIER_CREDIT or CASH_REFUND when part of the return is not absorbed by the purchase due",
         );
      }
      settlement = picked;
   }

   const creditConsumed =
      settlement === "SUPPLIER_CREDIT" ? dueAbsorbed : R;
   return {
      totalAmount: R,
      dueAbsorbed,
      remainder,
      settlement,
      creditConsumed,
      standingCredit: round2(R - creditConsumed),
   };
}

/** Standing credit of one return row, from its stored columns. */
export function standingCreditOf(
   totalAmount: number,
   creditConsumed: number,
): number {
   return Math.max(0, round2(Number(totalAmount) || 0) - round2(creditConsumed));
}

export interface ReturnQuantityLine {
   name: string;
   purchased: number;
   alreadyReturned: number;
   requested: number;
   /**
    * Current on-hand stock for the line's product (or variant, for
    * variant lines), read under the Purchase-row lock. `null` means
    * stock does not limit this line — snapshot lines with no product,
    * or products that do not track inventory (the stock engine skips
    * those too). When a number is given, the request is ALSO capped
    * at the stock still on hand: units that were already sold can
    * never be returned, because deducting them would push stock
    * below zero.
    */
   onHand?: number | null;
}

/**
 * Units of a purchase line that are gone for good — sold (or
 * otherwise consumed) after the purchase and never returned:
 * purchased − already returned − still on hand, floored at 0 (other
 * purchases may have restocked the product, which must not make
 * this number negative). Only meaningful when `onHand` is known.
 */
export function soldOrConsumedQuantity(
   purchased: number,
   alreadyReturned: number,
   onHand: number,
): number {
   return Math.max(
      0,
      Math.floor(purchased) -
         Math.max(0, Math.floor(alreadyReturned)) -
         Math.max(0, Math.floor(onHand)),
   );
}

/**
 * The maximum quantity of a purchase line that can actually be
 * returned right now: what was purchased and not yet returned,
 * further capped at the stock still on hand (sold units cannot be
 * returned). With `onHand === null` stock does not limit the line
 * and only the purchased cap applies. Pure — shared by the API
 * validation and the return form's per-line caps so the two can
 * never disagree about the limit.
 */
export function computeReturnableQuantity(
   purchased: number,
   alreadyReturned: number,
   onHand: number | null,
): number {
   const purchasable = Math.max(
      0,
      Math.floor(purchased) - Math.max(0, Math.floor(alreadyReturned)),
   );
   if (onHand == null) return purchasable;
   return Math.min(purchasable, Math.max(0, Math.floor(onHand)));
}

/**
 * Per-line quantity guard: a return line must request a whole
 * number ≥ 1, may never push the cumulative returned quantity past
 * what was purchased, and — when the line's on-hand stock is known —
 * may never exceed the stock still on hand (already-sold units are
 * not returnable). Returns an error message, or null when every
 * line is valid. Pure — the route feeds it quantities read under
 * the Purchase-row lock.
 */
export function validateReturnQuantities(
   lines: ReturnQuantityLine[],
): string | null {
   for (const line of lines) {
      if (!Number.isInteger(line.requested) || line.requested < 1) {
         return `Return quantity for "${line.name}" must be a whole number of at least 1.`;
      }
      const already = Math.max(0, line.alreadyReturned || 0);
      if (already + line.requested > line.purchased) {
         const available = Math.max(0, line.purchased - already);
         return `Cannot return ${line.requested} unit(s) of "${line.name}": ${line.purchased} purchased, ${already} already returned, so at most ${available} can be returned.`;
      }
      if (line.onHand != null) {
         const returnable = computeReturnableQuantity(
            line.purchased,
            already,
            line.onHand,
         );
         if (line.requested > returnable) {
            const sold = soldOrConsumedQuantity(
               line.purchased,
               already,
               line.onHand,
            );
            return `Only ${returnable} of the ${line.requested} requested unit(s) of "${line.name}" can be returned: ${sold} unit(s) were already sold (purchased ${line.purchased}, already returned ${already}, in stock ${Math.max(0, Math.floor(line.onHand))}).`;
         }
      }
   }
   return null;
}

/**
 * Serialize every writer of a purchase's totals/due/quantities on
 * the purchase's own row (approved §2.2 concurrency design). Must
 * be the FIRST statement of the caller's interactive transaction:
 * the row lock is held until commit/rollback, so the reads that
 * follow it see the latest committed state instead of a stale
 * REPEATABLE READ snapshot.
 *
 * Returns false when no such purchase row exists.
 */
export async function lockPurchaseRow(
   tx: any,
   purchaseId: string,
): Promise<boolean> {
   const rows = await tx.$queryRaw`
      SELECT id FROM Purchase WHERE id = ${purchaseId} FOR UPDATE
   `;
   return Array.isArray(rows) && rows.length > 0;
}

/**
 * Σ standing return credit for one supplier over non-deleted
 * returns, computed from stored columns alone (one aggregate, no
 * settlement-type branch — see the header for why that holds).
 * Works with any Prisma-like client (root or transaction).
 */
export async function getStandingReturnCredit(
   db: any,
   supplierId: string,
): Promise<number> {
   if (!supplierId) return 0;
   const agg = await db.purchaseReturn.aggregate({
      where: { supplierId, isDeleted: false },
      _sum: { totalAmount: true, creditConsumed: true },
   });
   return standingCreditOf(
      Number(agg?._sum?.totalAmount || 0),
      Number(agg?._sum?.creditConsumed || 0),
   );
}
