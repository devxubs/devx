import { describe, expect, it } from "vitest";
import {
   computePurchaseTotals,
   lineSubtotal,
   lineValidation,
   paymentStatusLabel,
   roundMoney,
} from "../src/Pages/admin/Purchase/Publish/calculations";

// The engine must agree with POST /api/purchases, which recomputes:
//   productAmount = Σ round2(qty × price)
//   total         = max(0, productAmount + othersCost − discount)
//   due           = max(0, total − min(paid, total))
// (paidApplied / overpayment via the shared splitCreationPayment).

describe("purchase calculations engine", () => {
   it("keeps exact decimals in the product amount (no integer truncation)", () => {
      // Regression: the old Pricing effect ran parseInt on the sum,
      // displaying ৳31 for a ৳31.50 product amount the server stored
      // in full.
      const totals = computePurchaseTotals(
         [{ quantity: 3, price: 10.5 }],
         0,
         0,
         0,
      );
      expect(totals.productAmount).toBe(31.5);
      expect(totals.total).toBe(31.5);
      expect(totals.due).toBe(31.5);
   });

   it("rounds each line subtotal to 2 decimals before summing", () => {
      expect(lineSubtotal(3, 3.333)).toBe(10);
      const totals = computePurchaseTotals(
         [
            { quantity: 2, price: 19.99 },
            { quantity: 1, price: 0.05 },
         ],
         0,
         0,
         0,
      );
      expect(totals.productAmount).toBe(40.03);
   });

   it("applies others cost and discount: total = amount + others − discount", () => {
      const totals = computePurchaseTotals(
         [{ quantity: 2, price: 100 }],
         25.5,
         10,
         0,
      );
      expect(totals.productAmount).toBe(200);
      expect(totals.total).toBe(215.5);
      expect(totals.due).toBe(215.5);
      expect(totals.paymentStatus).toBe("UNPAID");
   });

   it("never lets discount drive the total below zero", () => {
      const totals = computePurchaseTotals(
         [{ quantity: 1, price: 50 }],
         0,
         999,
         0,
      );
      expect(totals.total).toBe(0);
      expect(totals.due).toBe(0);
   });

   it("computes due from a partial payment and reports PARTIAL", () => {
      const totals = computePurchaseTotals(
         [{ quantity: 1, price: 200 }],
         0,
         0,
         75.25,
      );
      expect(totals.paidApplied).toBe(75.25);
      expect(totals.due).toBe(124.75);
      expect(totals.overpayment).toBe(0);
      expect(totals.paymentStatus).toBe("PARTIAL");
   });

   it("splits an overpayment into applied + excess, exactly like the API", () => {
      const totals = computePurchaseTotals(
         [{ quantity: 1, price: 100 }],
         0,
         0,
         150,
      );
      expect(totals.paidApplied).toBe(100);
      expect(totals.overpayment).toBe(50);
      expect(totals.due).toBe(0);
      expect(totals.paymentStatus).toBe("PAID");
   });

   it("treats a fully paid purchase as PAID and an empty one as UNPAID", () => {
      expect(
         computePurchaseTotals([{ quantity: 1, price: 10 }], 0, 0, 10)
            .paymentStatus,
      ).toBe("PAID");
      expect(computePurchaseTotals([], 0, 0, 0).paymentStatus).toBe(
         "UNPAID",
      );
      expect(paymentStatusLabel("PARTIAL")).toBe("Partially Paid");
   });

   it("clamps negative and non-numeric money inputs like the API's safeMoney", () => {
      const totals = computePurchaseTotals(
         [{ quantity: 1, price: 100 }],
         -5,
         Number.NaN,
         -1,
      );
      expect(totals.othersCost).toBe(0);
      expect(totals.discount).toBe(0);
      expect(totals.paid).toBe(0);
      expect(totals.total).toBe(100);
   });

   it("flags invalid line values and accepts valid ones", () => {
      expect(lineValidation({ quantity: 0, price: 10 }).quantityError).toBe(
         "Quantity must be at least 1",
      );
      expect(lineValidation({ quantity: 1, price: -2 }).priceError).toBe(
         "Price cannot be negative",
      );
      expect(lineValidation({ quantity: 2, price: 0 })).toEqual({});
   });

   it("roundMoney matches the server's toFixed rounding", () => {
      // The API rounds with parseFloat(x.toFixed(2)); 2.675 is stored
      // as 2.67499… in binary, so both sides produce 2.67 — parity
      // with the server matters more than decimal intuition here.
      expect(roundMoney(2.675)).toBe(2.67);
      expect(roundMoney(Number.NaN)).toBe(0);
   });
});
