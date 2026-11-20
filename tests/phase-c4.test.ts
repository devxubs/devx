import { describe, it, expect } from "vitest";
import { validateUserExpenseAmount } from "@src/lib/expenses";
import {
   clampNonNegativeMoney,
   normalizeOrderLineInput,
   overpaidAmountOf,
   splitCreationPayment,
} from "@src/lib/utils";
import { orderTxIdMethodError } from "@src/lib/payments";
import {
   resolveRefundExpense,
   refundExpenseMismatch,
} from "@src/lib/purchaseReturns";
import { lockOrderRow } from "@src/lib/orderLock";

// Phase C4 (P2 correctness batch): hermetic tests for the pure /
// decision logic behind the route changes. Route handlers
// themselves need a database; everything they decide is factored
// into these helpers so the policies are pinned here.

describe("C4-1 · validateUserExpenseAmount (P2-10)", () => {
   it("accepts a positive amount, numeric or string", () => {
      expect(validateUserExpenseAmount(10)).toEqual({ ok: true, amount: 10 });
      expect(validateUserExpenseAmount("12.50")).toEqual({
         ok: true,
         amount: 12.5,
      });
   });

   it("rejects zero and negative amounts (a negative user expense inflates profit)", () => {
      expect(validateUserExpenseAmount(0).ok).toBe(false);
      expect(validateUserExpenseAmount(-5).ok).toBe(false);
      expect(validateUserExpenseAmount("-0.01").ok).toBe(false);
   });

   it("rejects non-finite / missing amounts instead of persisting NaN", () => {
      expect(validateUserExpenseAmount("abc").ok).toBe(false);
      expect(validateUserExpenseAmount(Number.NaN).ok).toBe(false);
      expect(validateUserExpenseAmount(undefined).ok).toBe(false);
      expect(validateUserExpenseAmount(null).ok).toBe(false);
      expect(validateUserExpenseAmount("").ok).toBe(false);
   });
});

describe("C4-2 · order POST parity clamps (P2-11)", () => {
   it("normalizeOrderLineInput mirrors PUT: quantity max(1, …), price max(0, …)", () => {
      expect(normalizeOrderLineInput({ quantity: -3, price: 10 })).toEqual({
         quantity: 1,
         price: 10,
      });
      expect(normalizeOrderLineInput({ quantity: 0, price: -1 })).toEqual({
         quantity: 1,
         price: 0,
      });
      expect(normalizeOrderLineInput({ quantity: 3, price: 9.5 })).toEqual({
         quantity: 3,
         price: 9.5,
      });
      expect(normalizeOrderLineInput({})).toEqual({ quantity: 1, price: 0 });
      expect(
         normalizeOrderLineInput({ quantity: "abc", price: "xyz" }),
      ).toEqual({ quantity: 1, price: 0 });
   });

   it("clampNonNegativeMoney: negatives and non-finite become 0 (no surcharge-by-discount)", () => {
      expect(clampNonNegativeMoney(-50)).toBe(0);
      expect(clampNonNegativeMoney(25)).toBe(25);
      expect(clampNonNegativeMoney("abc")).toBe(0);
      expect(clampNonNegativeMoney(undefined)).toBe(0);
      expect(clampNonNegativeMoney(Number.POSITIVE_INFINITY)).toBe(0);
   });

   it("orderTxIdMethodError: a TxID requires a mobile payment method", () => {
      expect(orderTxIdMethodError("bKash", "TX123")).toBeNull();
      expect(orderTxIdMethodError("Nagad", "TX123")).toBeNull();
      expect(orderTxIdMethodError("Rocket", "TX123")).toBeNull();
      expect(orderTxIdMethodError("Cash", "TX123")).toMatch(/mobile payment method/);
      expect(orderTxIdMethodError("Cash on Delivery", "TX123")).toMatch(
         /mobile payment method/,
      );
      expect(orderTxIdMethodError(undefined, "TX123")).toMatch(
         /mobile payment method/,
      );
      // Empty TxID is always fine, whatever the method.
      expect(orderTxIdMethodError("Cash", "")).toBeNull();
      expect(orderTxIdMethodError("Cash", "   ")).toBeNull();
      expect(orderTxIdMethodError("Cash", null)).toBeNull();
   });
});

describe("C4-3 · overpayment visibility (P2-12)", () => {
   it("overpaidAmountOf exposes only the excess over the total", () => {
      expect(overpaidAmountOf({ advancePayment: 150, total: 100 })).toBe(50);
      expect(overpaidAmountOf({ advancePayment: 100, total: 100 })).toBe(0);
      expect(overpaidAmountOf({ advancePayment: 80, total: 100 })).toBe(0);
      expect(overpaidAmountOf({ advancePayment: 0, total: 0 })).toBe(0);
   });

   it("splitCreationPayment caps the applied part at the total and returns the excess", () => {
      expect(splitCreationPayment(100, 150)).toEqual({
         paidApplied: 100,
         overpayment: 50,
      });
      expect(splitCreationPayment(100, 80)).toEqual({
         paidApplied: 80,
         overpayment: 0,
      });
      expect(splitCreationPayment(100, 100)).toEqual({
         paidApplied: 100,
         overpayment: 0,
      });
      expect(splitCreationPayment(0, 0)).toEqual({
         paidApplied: 0,
         overpayment: 0,
      });
   });
});

describe("C4-4 · CASH_REFUND expense resolution (P2-23 / R-4)", () => {
   const makeExpenseDb = (rows: any[]) => {
      const calls: any[] = [];
      return {
         calls,
         expense: {
            findFirst: async ({ where }: any) => {
               calls.push(where);
               if (where.customId) {
                  return (
                     rows.find(
                        (r) => r.customId === where.customId && !r.isDeleted,
                     ) ?? null
                  );
               }
               if (where.note?.contains) {
                  return (
                     rows
                        .filter(
                           (r) =>
                              r.type === where.type &&
                              !r.isDeleted &&
                              String(r.note || "").includes(where.note.contains),
                        )
                        .sort(
                           (a, b) =>
                              new Date(a.createdAt).getTime() -
                              new Date(b.createdAt).getTime(),
                        )[0] ?? null
                  );
               }
               return null;
            },
         },
      };
   };

   it("recorded-id hit resolves the exact expense, immune to note/type edits", async () => {
      const db = makeExpenseDb([
         {
            id: "e1",
            customId: "EXP_9",
            // Staff renamed the type and rewrote the note — the
            // legacy lookup would miss this row entirely.
            type: "Misc",
            note: "edited beyond recognition",
            amount: -30,
            isDeleted: false,
            createdAt: new Date("2026-01-01"),
         },
         {
            id: "e2",
            customId: "EXP_10",
            type: "Purchase Return Refund",
            note: "Cash refund received for purchase return PRET_7 (PUR_1)",
            amount: -99,
            isDeleted: false,
            createdAt: new Date("2026-01-02"),
         },
      ]);
      const res = await resolveRefundExpense(db, {
         recordedCustomId: "EXP_9",
         returnCustomId: "PRET_7",
         returnId: "ret1",
      });
      expect(res.kind).toBe("found");
      if (res.kind === "found") {
         expect(res.source).toBe("recorded");
         expect(res.expense.id).toBe("e1");
      }
      // The legacy note query was never consulted.
      expect(db.calls).toHaveLength(1);
      expect(db.calls[0].customId).toBe("EXP_9");
   });

   it("recorded id that no longer resolves is missing — NO legacy fallback", async () => {
      const db = makeExpenseDb([
         {
            id: "e2",
            customId: "EXP_10",
            type: "Purchase Return Refund",
            note: "Cash refund received for purchase return PRET_7 (PUR_1)",
            amount: -30,
            isDeleted: false,
            createdAt: new Date("2026-01-02"),
         },
      ]);
      const res = await resolveRefundExpense(db, {
         recordedCustomId: "EXP_404",
         returnCustomId: "PRET_7",
         returnId: "ret1",
      });
      expect(res).toEqual({ kind: "missing", source: "recorded" });
      expect(db.calls).toHaveLength(1);
   });

   it("legacy fallback: no recorded id → type + note match, oldest first", async () => {
      const db = makeExpenseDb([
         {
            id: "e1",
            customId: "EXP_9",
            type: "Purchase Return Refund",
            note: "Cash refund received for purchase return PRET_7 (PUR_1)",
            amount: -30,
            isDeleted: false,
            createdAt: new Date("2026-01-01"),
         },
      ]);
      const res = await resolveRefundExpense(db, {
         recordedCustomId: null,
         returnCustomId: "PRET_7",
         returnId: "ret1",
      });
      expect(res.kind).toBe("found");
      if (res.kind === "found") {
         expect(res.source).toBe("legacy");
         expect(res.expense.id).toBe("e1");
      }
   });

   it("legacy fallback with no matching row is missing (refuse, as before)", async () => {
      const db = makeExpenseDb([]);
      const res = await resolveRefundExpense(db, {
         recordedCustomId: null,
         returnCustomId: "PRET_7",
         returnId: "ret1",
      });
      expect(res).toEqual({ kind: "missing", source: "legacy" });
   });

   it("refundExpenseMismatch refuses when the amount no longer equals the recorded remainder", () => {
      const msg = refundExpenseMismatch({ amount: -30 }, 50);
      expect(msg).toMatch(/30\.00/);
      expect(msg).toMatch(/50\.00/);
      // Decimal-shaped amounts from Prisma compare by value.
      expect(refundExpenseMismatch({ amount: "-50" }, 50)).toBeNull();
      expect(refundExpenseMismatch({ amount: -50 }, 50)).toBeNull();
      // No recorded remainder (legacy rows): nothing to check.
      expect(refundExpenseMismatch({ amount: -30 }, null)).toBeNull();
      expect(refundExpenseMismatch({ amount: -30 }, undefined)).toBeNull();
   });
});

describe("C4-5 · lockOrderRow (P2-22)", () => {
   it("is true when the row exists and false when it does not", async () => {
      const txHit: any = { $queryRaw: async () => [{ id: "o1" }] };
      const txMiss: any = { $queryRaw: async () => [] };
      await expect(lockOrderRow(txHit, "o1")).resolves.toBe(true);
      await expect(lockOrderRow(txMiss, "o1")).resolves.toBe(false);
   });
});
