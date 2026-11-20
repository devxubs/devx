import { describe, it, expect } from "vitest";
import {
   computeReturnSettlement,
   validateReturnQuantities,
   computeReturnableQuantity,
   soldOrConsumedQuantity,
   standingCreditOf,
} from "@src/lib/purchaseReturns";
import {
   deductStockForPurchaseReturn,
   restoreStockForPurchaseReturn,
   StockReversalUnsafeError,
} from "@src/lib/stock";
import { makeFakeTx } from "./helpers/fakeTx";

// Phase 4 (D2): the approved settlement math — total is reduced by
// dueAbsorbed = min(R, due) ONLY, the remainder becomes supplier
// credit or a cash refund, and standing credit is always
// totalAmount − creditConsumed (schema diff §2.2, owner-corrected).
describe("computeReturnSettlement", () => {
   it("R < due: fully absorbed → DUE_REDUCTION, no standing credit", () => {
      // Purchase total ৳100, paid ৳40, due ৳60; return ৳25.
      const s = computeReturnSettlement(25, 60);
      expect(s.settlement).toBe("DUE_REDUCTION");
      expect(s.dueAbsorbed).toBe(25);
      expect(s.remainder).toBe(0);
      expect(s.creditConsumed).toBe(25);
      expect(s.standingCredit).toBe(0);
   });

   it("R = due: exactly absorbed → DUE_REDUCTION", () => {
      const s = computeReturnSettlement(60, 60);
      expect(s.settlement).toBe("DUE_REDUCTION");
      expect(s.dueAbsorbed).toBe(60);
      expect(s.remainder).toBe(0);
      expect(s.creditConsumed).toBe(60);
   });

   it("R > due with SUPPLIER_CREDIT (owner's example): total 100, paid 80, due 20, R 50", () => {
      const s = computeReturnSettlement(50, 20, "SUPPLIER_CREDIT");
      expect(s.dueAbsorbed).toBe(20); // total 100 → 80, due 80 − 80 = 0
      expect(s.remainder).toBe(30);
      expect(s.settlement).toBe("SUPPLIER_CREDIT");
      // creditConsumed initialized to dueAbsorbed so standing credit
      // = 50 − 20 = the remainder, exactly.
      expect(s.creditConsumed).toBe(20);
      expect(s.standingCredit).toBe(30);
   });

   it("R > due defaults to SUPPLIER_CREDIT when no choice is given", () => {
      const s = computeReturnSettlement(50, 20);
      expect(s.settlement).toBe("SUPPLIER_CREDIT");
      expect(s.standingCredit).toBe(30);
   });

   it("R > due with CASH_REFUND: remainder leaves as cash, no credit stands", () => {
      const s = computeReturnSettlement(50, 20, "CASH_REFUND");
      expect(s.dueAbsorbed).toBe(20);
      expect(s.remainder).toBe(30);
      expect(s.creditConsumed).toBe(50);
      expect(s.standingCredit).toBe(0);
   });

   it("rejects a non-DUE_REDUCTION settlement when the remainder is 0", () => {
      expect(() => computeReturnSettlement(25, 60, "SUPPLIER_CREDIT")).toThrow(
         /DUE_REDUCTION/,
      );
      expect(() => computeReturnSettlement(25, 60, "CASH_REFUND")).toThrow(
         /DUE_REDUCTION/,
      );
   });

   it("rejects an unknown settlement choice for a positive remainder", () => {
      expect(() => computeReturnSettlement(50, 20, "STORE_CREDIT")).toThrow(
         /SUPPLIER_CREDIT or CASH_REFUND/,
      );
   });

   it("rejects a zero or negative return amount", () => {
      expect(() => computeReturnSettlement(0, 20)).toThrow(/greater than zero/);
      expect(() => computeReturnSettlement(-5, 20)).toThrow(/greater than zero/);
   });

   it("a fully-paid purchase (due 0) sends the whole return to the remainder", () => {
      const s = computeReturnSettlement(40, 0, "SUPPLIER_CREDIT");
      expect(s.dueAbsorbed).toBe(0);
      expect(s.remainder).toBe(40);
      expect(s.creditConsumed).toBe(0);
      expect(s.standingCredit).toBe(40);
   });

   it("rounds money to 2 decimals", () => {
      const s = computeReturnSettlement(33.333, 100);
      expect(s.totalAmount).toBe(33.33);
      expect(s.dueAbsorbed).toBe(33.33);
   });
});

describe("validateReturnQuantities", () => {
   it("accepts lines within the available quantity", () => {
      expect(
         validateReturnQuantities([
            { name: "Rice", purchased: 10, alreadyReturned: 3, requested: 7 },
            { name: "Oil", purchased: 5, alreadyReturned: 0, requested: 1 },
         ]),
      ).toBeNull();
   });

   it("rejects returning more than purchased minus already returned", () => {
      const err = validateReturnQuantities([
         { name: "Rice", purchased: 10, alreadyReturned: 3, requested: 8 },
      ]);
      expect(err).toMatch(/at most 7/);
   });

   it("rejects zero, negative and fractional quantities", () => {
      expect(
         validateReturnQuantities([
            { name: "Rice", purchased: 10, alreadyReturned: 0, requested: 0 },
         ]),
      ).toMatch(/at least 1/);
      expect(
         validateReturnQuantities([
            { name: "Rice", purchased: 10, alreadyReturned: 0, requested: 1.5 },
         ]),
      ).toMatch(/at least 1/);
   });

   // Stock-aware cap (owner's reported case): units that were
   // already sold are NOT returnable, even when the
   // purchased − returned arithmetic would still allow them.
   it("refuses a return of a unit that was already sold (purchased 1, sold 1, on hand 0)", () => {
      const err = validateReturnQuantities([
         {
            name: "Kids Denim Pant",
            purchased: 1,
            alreadyReturned: 0,
            requested: 1,
            onHand: 0,
         },
      ]);
      expect(err).toMatch(/Kids Denim Pant/);
      expect(err).toMatch(/Only 0 of the 1 requested/);
      expect(err).toMatch(/1 unit\(s\) were already sold/);
      expect(err).not.toMatch(/manually/i);
   });

   it("caps at the stock still on hand (purchased 5, sold 2, already returned 1 → returnable 2)", () => {
      // On hand = 5 − 1 returned − 2 sold = 2.
      expect(
         validateReturnQuantities([
            { name: "Shirt", purchased: 5, alreadyReturned: 1, requested: 2, onHand: 2 },
         ]),
      ).toBeNull();
      const err = validateReturnQuantities([
         { name: "Shirt", purchased: 5, alreadyReturned: 1, requested: 3, onHand: 2 },
      ]);
      expect(err).toMatch(/Only 2 of the 3 requested/);
      expect(err).toMatch(/2 unit\(s\) were already sold/);
   });

   it("onHand above the purchased cap does not raise the limit", () => {
      // Restocked by a later purchase: onHand 9, but only
      // 5 − 1 = 4 of THIS purchase remain returnable.
      expect(
         validateReturnQuantities([
            { name: "Shirt", purchased: 5, alreadyReturned: 1, requested: 4, onHand: 9 },
         ]),
      ).toBeNull();
      expect(
         validateReturnQuantities([
            { name: "Shirt", purchased: 5, alreadyReturned: 1, requested: 5, onHand: 9 },
         ]),
      ).toMatch(/at most 4/);
   });

   it("onHand = null leaves the purchased-only rule in charge (untracked/snapshot lines)", () => {
      expect(
         validateReturnQuantities([
            { name: "Service", purchased: 3, alreadyReturned: 1, requested: 2, onHand: null },
         ]),
      ).toBeNull();
   });
});

describe("computeReturnableQuantity / soldOrConsumedQuantity", () => {
   it("distinguishes purchased, returned, sold and on-hand", () => {
      // Purchased 5, returned 1, sold 2, on hand 2.
      expect(soldOrConsumedQuantity(5, 1, 2)).toBe(2);
      expect(computeReturnableQuantity(5, 1, 2)).toBe(2);
   });

   it("everything sold → nothing returnable", () => {
      expect(soldOrConsumedQuantity(1, 0, 0)).toBe(1);
      expect(computeReturnableQuantity(1, 0, 0)).toBe(0);
   });

   it("restocks from other purchases never make sold negative or raise the cap", () => {
      expect(soldOrConsumedQuantity(5, 1, 9)).toBe(0);
      expect(computeReturnableQuantity(5, 1, 9)).toBe(4);
   });

   it("null onHand → only the purchased cap applies", () => {
      expect(computeReturnableQuantity(5, 1, null)).toBe(4);
      expect(computeReturnableQuantity(5, 5, null)).toBe(0);
   });
});

describe("standingCreditOf", () => {
   it("is totalAmount − creditConsumed, floored at 0", () => {
      expect(standingCreditOf(50, 20)).toBe(30);
      expect(standingCreditOf(50, 50)).toBe(0);
      expect(standingCreditOf(50, 75)).toBe(0);
   });
});

describe("deductStockForPurchaseReturn", () => {
   it("deducts stock and writes a NEGATIVE RETURN movement with purchaseId", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 20 }],
      });
      await deductStockForPurchaseReturn(
         f.tx,
         [{ productId: "p1", quantity: 4 }],
         { purchaseId: "pur1", note: "Purchase return PRET_1" },
      );
      expect(f.productQty("p1")).toBe(16);
      expect(f.movements).toHaveLength(1);
      expect(f.movements[0]).toMatchObject({
         productId: "p1",
         type: "RETURN",
         quantity: -4,
         purchaseId: "pur1",
         note: "Purchase return PRET_1",
      });
   });

   it("deducts variant and product quantities together for variant lines", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Shirt", quantity: 12 }],
         variants: [
            { id: "v1", productId: "p1", variantName: "Red", quantity: 7 },
         ],
      });
      await deductStockForPurchaseReturn(
         f.tx,
         [{ productId: "p1", quantity: 3, variantId: "v1" }],
         { purchaseId: "pur1", note: "Purchase return PRET_2" },
      );
      expect(f.productQty("p1")).toBe(9);
      expect(f.variantQty("v1")).toBe(4);
      expect(f.movements[0]).toMatchObject({ type: "RETURN", quantity: -3, variantId: "v1" });
   });

   it("refuses the whole deduction when units were already sold (nothing written)", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 2 }],
      });
      await expect(
         deductStockForPurchaseReturn(
            f.tx,
            [{ productId: "p1", quantity: 5 }],
            { purchaseId: "pur1", note: "Purchase return PRET_3" },
         ),
      ).rejects.toBeInstanceOf(StockReversalUnsafeError);
      expect(f.productQty("p1")).toBe(2);
      expect(f.movements).toHaveLength(0);
   });

   it("the unsafe-reversal error explains the sold units and never suggests manual adjustment", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Kids Denim Pant", quantity: 0 }],
      });
      const err = await deductStockForPurchaseReturn(
         f.tx,
         [{ productId: "p1", quantity: 1 }],
         { purchaseId: "pur1", note: "Purchase return PRET_4" },
      ).catch((e: any) => e);
      expect(err).toBeInstanceOf(StockReversalUnsafeError);
      expect(err.message).toMatch(/Kids Denim Pant/);
      expect(err.message).toMatch(/already sold/);
      expect(err.message).toMatch(/stock negative/);
      expect(err.message).not.toMatch(/manually/i);
      expect(f.productQty("p1")).toBe(0);
      expect(f.movements).toHaveLength(0);
   });
});

describe("restoreStockForPurchaseReturn", () => {
   it("puts stock back with a POSITIVE RETURN movement (deletion reversal)", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 16 }],
      });
      await restoreStockForPurchaseReturn(
         f.tx,
         [{ productId: "p1", quantity: 4 }],
         { purchaseId: "pur1", note: "Purchase return PRET_1 deleted — stock restored" },
      );
      expect(f.productQty("p1")).toBe(20);
      expect(f.movements[0]).toMatchObject({
         type: "RETURN",
         quantity: 4,
         purchaseId: "pur1",
      });
   });
});
