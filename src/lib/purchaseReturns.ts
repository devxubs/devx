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
 * the PRET_ id; since C4-4 the return-delete reversal primarily
 * finds the row by the expense customId recorded in the return's
 * CREATE audit row (see resolveRefundExpense below), with the
 * note match kept as the legacy fallback.
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
 * The `dueAbsorbed` a return recorded at creation time.
 *
 * `dueAbsorbed` is NOT a column on PurchaseReturn — creation
 * records it in the return's CREATE audit row
 * (`changes.dueAbsorbed.to`), and return deletion restores the
 * purchase totals from exactly that recorded value (see
 * `src/app/api/purchase-returns/[id]/route.ts`). This resolver
 * mirrors the deletion route's source of truth and its
 * settlement-derived fallbacks, so any other consumer (the
 * purchase PUT totals recompute) agrees with deletion about what
 * a return absorbed:
 *
 *   1. the CREATE audit row's recorded `dueAbsorbed`, when present;
 *   2. SUPPLIER_CREDIT → the audit row's recorded initial
 *      `creditConsumed`, else the row's stored `creditConsumed`
 *      (creation initialised it to `dueAbsorbed`);
 *   3. CASH_REFUND → `totalAmount − remainder`, the remainder read
 *      from the refund Expense row by the caller (the same source
 *      deletion uses); when the caller cannot supply it, the whole
 *      amount is treated as absorbed — reachable only when the
 *      audit row is also missing, which creation's same-transaction
 *      audit write makes impossible in practice;
 *   4. DUE_REDUCTION → `totalAmount` (fully absorbed by design).
 */
export function resolveRecordedDueAbsorbed(input: {
   settlement: string;
   totalAmount: number;
   creditConsumed: number;
   auditDueAbsorbed?: number | null;
   auditCreditConsumed?: number | null;
   cashRefundRemainder?: number | null;
}): number {
   if (
      input.auditDueAbsorbed != null &&
      Number.isFinite(Number(input.auditDueAbsorbed))
   ) {
      return round2(input.auditDueAbsorbed);
   }
   const totalAmount = round2(input.totalAmount);
   if (input.settlement === "SUPPLIER_CREDIT") {
      return round2(input.auditCreditConsumed ?? input.creditConsumed);
   }
   if (input.settlement === "CASH_REFUND") {
      const remainder =
         input.cashRefundRemainder != null
            ? round2(input.cashRefundRemainder)
            : 0;
      return round2(totalAmount - remainder);
   }
   // DUE_REDUCTION (and any legacy settlement): fully absorbed.
   return totalAmount;
}

// ─────────────────────────────────────────────
// C4-4 (audit R-4 / P2-23): CASH_REFUND expense link hardening
// ─────────────────────────────────────────────

/**
 * Resolve the negative Expense row a CASH_REFUND return booked at
 * creation, for the return-deletion reversal.
 *
 * PurchaseReturn has NO stored expense reference (no FK column —
 * adding one needs a schema change), so creation records the
 * refund expense's customId in the return's CREATE audit row
 * (`changes.refundExpenseCustomId.to`) — the same audit row the
 * settlement reversal already treats as its source of truth.
 * Resolution prefers that recorded id: it is immune to the staff
 * edits (amount / type / note) that break the legacy lookup. The
 * legacy lookup (type + note contains the PRET id, oldest first)
 * runs ONLY when no id was recorded (returns created before this
 * hardening). A recorded id that no longer resolves to a live
 * expense is "missing" — the reversal must refuse rather than
 * fall back and possibly reverse a different return's expense.
 */
export type RefundExpenseResolution =
   | {
        kind: "found";
        expense: { id: string; customId?: string | null; amount: unknown };
        source: "recorded" | "legacy";
     }
   | { kind: "missing"; source: "recorded" | "legacy" };

export async function resolveRefundExpense(
   db: any,
   args: {
      recordedCustomId?: string | null;
      returnCustomId?: string | null;
      returnId: string;
   },
): Promise<RefundExpenseResolution> {
   const recorded = args.recordedCustomId
      ? String(args.recordedCustomId).trim()
      : "";
   if (recorded) {
      const expense = await db.expense.findFirst({
         where: { customId: recorded, isDeleted: false },
      });
      return expense
         ? { kind: "found", expense, source: "recorded" }
         : { kind: "missing", source: "recorded" };
   }
   const expense = await db.expense.findFirst({
      where: {
         type: CASH_REFUND_EXPENSE_TYPE,
         isDeleted: false,
         note: { contains: args.returnCustomId || args.returnId },
      },
      orderBy: { createdAt: "asc" },
   });
   return expense
      ? { kind: "found", expense, source: "legacy" }
      : { kind: "missing", source: "legacy" };
}

/**
 * Verify a resolved refund expense still carries the refund
 * remainder recorded at creation. Staff can edit the expense's
 * amount through the normal expense UI; reversing a mismatched
 * amount would desync the cash trail, so the deletion route
 * refuses (409) on any discrepancy. Returns the refusal message,
 * or null when the amount matches — or when no remainder was
 * recorded (legacy rows: nothing trustworthy to check against;
 * the amount found remains the remainder source, as before).
 * Pure.
 */
export function refundExpenseMismatch(
   expense: { amount: unknown },
   expectedRemainder: number | null | undefined,
): string | null {
   if (expectedRemainder == null || !Number.isFinite(Number(expectedRemainder))) {
      return null;
   }
   const expected = round2(expectedRemainder);
   const actual = round2(Math.abs(Number(expense.amount)));
   if (actual === expected) return null;
   return `This return cannot be deleted: its cash-refund expense now shows ৳${actual.toFixed(2)}, but the refund recorded at creation was ৳${expected.toFixed(2)}. Correct the expense amount (or restore it) before deleting this return, so the reversal matches the original refund.`;
}

/** Σ recorded `dueAbsorbed` over a purchase's live returns. */
export function sumRecordedDueAbsorbed(
   entries: Array<Parameters<typeof resolveRecordedDueAbsorbed>[0]>,
): number {
   return round2(
      entries.reduce((sum, entry) => sum + resolveRecordedDueAbsorbed(entry), 0),
   );
}

export interface PurchaseTotalsInput {
   productAmount: number;
   othersCost: number;
   discount: number;
   paid: number;
   /**
    * Σ recorded `dueAbsorbed` over the purchase's non-deleted
    * returns (see `resolveRecordedDueAbsorbed`). Returns reduce
    * `total`/`due` by this amount but never touch `productAmount`,
    * so a totals recompute that omits it resurrects due the shop
    * already settled (audit C-1 / P0-1).
    */
   totalDueAbsorbed: number;
}

export interface PurchaseTotals {
   total: number;
   due: number;
}

/**
 * The purchase totals recompute used by the purchase PUT route:
 * gross totals from the (possibly edited) money fields, minus the
 * due already absorbed by live purchase returns, with the same
 * clamping the handler has always applied (`total` never negative,
 * `due = max(0, total − paid)`). Pure — the route feeds it values
 * read under the Purchase-row lock.
 */
export function computePurchaseTotals(
   input: PurchaseTotalsInput,
): PurchaseTotals {
   const total = round2(
      Math.max(
         0,
         round2(input.productAmount) +
            round2(input.othersCost) -
            round2(input.discount) -
            round2(input.totalDueAbsorbed),
      ),
   );
   const due = round2(Math.max(0, total - round2(input.paid)));
   return { total, due };
}

/**
 * Σ standing return credit for one supplier over non-deleted
 * returns, computed from stored columns alone (one aggregate, no
 * settlement-type branch — see the header for why that holds).
 * Works with any Prisma-like client (root or transaction).
 */
/**
 * SupplierPayment.paymentMethod value used for the ledger row that
 * records standing return credit applied to a purchase (B2-3 /
 * audit C-9 / P1-7). The row carries no TxID and no cash — it exists
 * so the credit application is visible in the supplier ledger and
 * so the purchase's stored `paid` counter and the ledger total stay
 * reconcilable. Voiding such a row reverses the credit consumption
 * (see the supplier-payment void route).
 */
export const RETURN_CREDIT_PAYMENT_METHOD = "Return Credit";

// ─────────────────────────────────────────────
// B2-1 (audit C-11 / P1-3): net purchase quantities
// ─────────────────────────────────────────────

export interface PurchaseStockLine {
   productId: string | null;
   variantId?: string | null;
   quantity: number;
}

export interface NetPurchaseLine {
   productId: string;
   variantId: string | null;
   quantity: number;
}

/**
 * Per product+variant NET quantities of a purchase:
 * purchased − Σ quantities in the purchase's non-deleted return
 * items. Purchase delete (stock reversal) and Bin restore (stock
 * re-add) must move exactly this amount: the returned units already
 * left stock through the return flow, so reversing/re-adding the
 * GROSS purchased quantities would double-move them. Lines whose
 * net reaches zero are dropped (they move nothing), snapshot lines
 * without a product are dropped (the stock engine skips them too),
 * and duplicate lines for the same product+variant are aggregated
 * — variant lines are keyed separately from each other and from
 * the product pool, mirroring the stock engine's own aggregation.
 * Pure — routes feed it rows read under the Purchase-row lock.
 */
export function computeNetPurchaseQuantities(
   purchasedItems: PurchaseStockLine[],
   returnItems: PurchaseStockLine[],
): NetPurchaseLine[] {
   const keyOf = (productId: string, variantId: string | null) =>
      `${productId}::${variantId ?? ""}`;
   const net = new Map<string, NetPurchaseLine>();
   for (const item of purchasedItems) {
      if (!item.productId) continue;
      const variantId = item.variantId ?? null;
      const key = keyOf(item.productId, variantId);
      const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
      const existing = net.get(key);
      if (existing) existing.quantity += qty;
      else net.set(key, { productId: item.productId, variantId, quantity: qty });
   }
   for (const item of returnItems) {
      if (!item.productId) continue;
      const key = keyOf(item.productId, item.variantId ?? null);
      const existing = net.get(key);
      if (!existing) continue;
      existing.quantity -= Math.max(0, Math.floor(Number(item.quantity) || 0));
   }
   return Array.from(net.values())
      .map((line) => ({ ...line, quantity: Math.max(0, line.quantity) }))
      .filter((line) => line.quantity > 0);
}

// ─────────────────────────────────────────────
// B2-3 (audit C-9 / P1-7): standing return-credit consumption
// ─────────────────────────────────────────────

export interface StandingCreditReturn {
   id: string;
   customId?: string | null;
   totalAmount: number;
   creditConsumed: number;
}

export interface ReturnCreditAllocation {
   returnId: string;
   returnCustomId: string | null;
   /** Amount of this return's standing credit consumed. */
   amount: number;
   /** The return's creditConsumed after this allocation. */
   newCreditConsumed: number;
}

/**
 * Plan how `amount` of standing return credit is consumed across a
 * supplier's live SUPPLIER_CREDIT returns, OLDEST FIRST (the caller
 * supplies the rows in creation order; only rows with standing
 * credit > 0 take part). Pure — the route re-reads the rows inside
 * its transaction, under the purchase + supplier locks, and applies
 * exactly the returned increments, so the plan and the writes can
 * never drift apart.
 *
 * Rejects (throws) when the amount is not positive, exceeds the
 * purchase's outstanding due, or exceeds the total standing credit
 * — a partial silent application would desync the caller's books.
 */
export function planReturnCreditApplication(
   returns: StandingCreditReturn[],
   amount: number,
   purchaseDue: number,
): ReturnCreditAllocation[] {
   const requested = round2(amount);
   if (!(requested > 0)) {
      throw new Error("Return credit amount must be greater than zero");
   }
   const due = round2(purchaseDue);
   if (requested > due) {
      throw new Error(
         `Return credit of ৳${requested.toFixed(2)} exceeds the outstanding due on this purchase (৳${due.toFixed(2)}).`,
      );
   }
   const live = returns
      .map((r) => ({
         id: r.id,
         customId: r.customId ?? null,
         creditConsumed: round2(r.creditConsumed),
         standing: standingCreditOf(r.totalAmount, r.creditConsumed),
      }))
      .filter((r) => r.standing > 0);
   const totalStanding = round2(
      live.reduce((sum, r) => sum + r.standing, 0),
   );
   if (requested > totalStanding) {
      throw new Error(
         `Return credit of ৳${requested.toFixed(2)} exceeds this supplier's standing return credit (৳${totalStanding.toFixed(2)}).`,
      );
   }
   const allocations: ReturnCreditAllocation[] = [];
   let remaining = requested;
   for (const r of live) {
      if (remaining <= 0) break;
      const take = round2(Math.min(remaining, r.standing));
      allocations.push({
         returnId: r.id,
         returnCustomId: r.customId,
         amount: take,
         newCreditConsumed: round2(r.creditConsumed + take),
      });
      remaining = round2(remaining - take);
   }
   return allocations;
}

/**
 * The return-deletion guard predicate (B2-3): a SUPPLIER_CREDIT
 * return may be deleted only while NONE of its standing credit has
 * been consumed beyond the value `creditConsumed` was initialised
 * to at creation (its recorded dueAbsorbed). Once a later flow has
 * consumed standing credit, deletion is refused — that consumption
 * cannot be unwound from the delete route. Pure; the delete route
 * feeds it the CREATE audit row's recorded baseline and the row's
 * current stored value.
 */
export function returnCreditWasConsumed(
   baselineCreditConsumed: number,
   currentCreditConsumed: number,
): boolean {
   return round2(currentCreditConsumed) > round2(baselineCreditConsumed);
}

/**
 * Serialize standing-credit consumption per supplier on the
 * Supplier row itself. Credit applications target one purchase
 * (locked via lockPurchaseRow) but consume return rows that may
 * belong to OTHER purchases of the same supplier, so the purchase
 * lock alone cannot serialize two applications against different
 * purchases. Must run inside the caller's transaction, after the
 * purchase lock (one consistent lock order: purchase → supplier).
 * Returns false when no such supplier row exists.
 */
export async function lockSupplierRow(
   tx: any,
   supplierId: string,
): Promise<boolean> {
   const rows = await tx.$queryRaw`
      SELECT id FROM Supplier WHERE id = ${supplierId} FOR UPDATE
   `;
   return Array.isArray(rows) && rows.length > 0;
}

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
