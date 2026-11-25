// Purchase Create (redesign) — the page's single calculation engine.
//
// Every figure the form displays derives from these pure functions,
// and the formulas are the server's own (POST /api/purchases
// recomputes all totals from the validated items; the client values
// are advisory):
//
//   lineSubtotal  = round2(quantity × price)
//   productAmount = round2(Σ lineSubtotal)
//   total         = max(0, productAmount + othersCost − discount)
//   due           = max(0, total − paidApplied)
//
// `paidApplied` / `overpayment` come from the shared
// `splitCreationPayment` helper — the exact function the API uses —
// so the paid/due the user sees is the paid/due the server stores,
// including the creation-overpayment rule (excess over the total is
// held as supplier credit when a supplier is named).
//
// This replaces the Pricing section's old effect, which truncated
// the product amount with parseInt (৳31.50 displayed as ৳31) while
// the server stored the exact figure.

import { splitCreationPayment } from "@src/lib/utils";

export interface PurchaseLineLike {
   quantity: number;
   price: number;
}

export type PurchasePaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export interface PurchaseTotals {
   productAmount: number;
   othersCost: number;
   discount: number;
   total: number;
   paid: number;
   paidApplied: number;
   overpayment: number;
   due: number;
   paymentStatus: PurchasePaymentStatus;
}

/** Round to 2 decimals the same way the API does (toFixed-based). */
export const roundMoney = (value: number): number => {
   const n = Number(value);
   return Number.isFinite(n) ? parseFloat(n.toFixed(2)) : 0;
};

/** Money inputs are never negative and never NaN (the API's safeMoney). */
const clampMoney = (value: number): number => {
   const n = Number(value);
   return Number.isFinite(n) ? Math.max(0, n) : 0;
};

export const lineSubtotal = (quantity: number, price: number): number =>
   roundMoney((Number(quantity) || 0) * (Number(price) || 0));

export function computePurchaseTotals(
   lines: PurchaseLineLike[],
   othersCost: number,
   discount: number,
   paid: number,
): PurchaseTotals {
   const productAmount = roundMoney(
      (lines || []).reduce(
         (sum, line) => sum + lineSubtotal(line.quantity, line.price),
         0,
      ),
   );
   const others = clampMoney(othersCost);
   const disc = clampMoney(discount);
   const paidAmount = clampMoney(paid);
   const total = Math.max(0, roundMoney(productAmount + others - disc));
   const { paidApplied, overpayment } = splitCreationPayment(
      total,
      paidAmount,
   );
   const due = Math.max(0, roundMoney(total - paidApplied));

   const paymentStatus: PurchasePaymentStatus =
      due > 0
         ? paidApplied > 0
            ? "PARTIAL"
            : "UNPAID"
         : total > 0 || paidApplied > 0
           ? "PAID"
           : "UNPAID";

   return {
      productAmount,
      othersCost: others,
      discount: disc,
      total,
      paid: paidAmount,
      paidApplied,
      overpayment,
      due,
      paymentStatus,
   };
}

export const paymentStatusLabel = (status: PurchasePaymentStatus): string =>
   status === "PAID"
      ? "Paid"
      : status === "PARTIAL"
        ? "Partially Paid"
        : "Unpaid";

/**
 * Live per-line validation for the items table. Mirrors the form
 * schema (quantity ≥ 1, price ≥ 0) so invalid values are visible
 * while typing, not only after a failed submit.
 */
export function lineValidation(line: PurchaseLineLike): {
   quantityError?: string;
   priceError?: string;
} {
   const errors: { quantityError?: string; priceError?: string } = {};
   const quantity = Number(line.quantity);
   if (!Number.isFinite(quantity) || quantity < 1) {
      errors.quantityError = "Quantity must be at least 1";
   }
   const price = Number(line.price);
   if (!Number.isFinite(price) || price < 0) {
      errors.priceError = "Price cannot be negative";
   }
   return errors;
}

export const lineHasError = (line: PurchaseLineLike): boolean => {
   const v = lineValidation(line);
   return Boolean(v.quantityError || v.priceError);
};
