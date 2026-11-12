// Order Create (upgrade) — centralized calculation engine.
//
// Sequence (mirrors the server's calculateOrderTotals in src/lib/utils.ts,
// extended with product discounts and tax):
//   1. Subtotal          = Σ quantity × list unit price
//   2. Product Discount  = Σ per-line discounts (folded into effective unit price)
//   3. Net Product Amt   = Subtotal − Product Discount   (== server subtotal)
//   4. Overall Discount  = fixed amount OR % of Net Product Amount
//   5. Taxable Amount    = Net Product Amount − Overall Discount
//   6. Tax               = Taxable Amount × Tax % / 100   (0 when tax disabled)
//   7. Grand Total       = Taxable Amount + Tax + Delivery Charge
//   8. Due Amount        = Grand Total − Advance Payment
//
// The server recomputes total = subtotal − discount + deliveryCharge from the
// submitted item prices and has no tax column, so:
//   • each line is submitted at its effective (post-product-discount) unit
//     price, making the server subtotal identical to Net Product Amount;
//   • the submitted pricing.discount = Overall Discount − Tax, which makes
//     the server total identical to Grand Total. The true breakdown is
//     persisted to orderTags after creation (see useOrderCreate).
import type { DiscountType, OrderLine, OrderTotals } from "./types";

/** Coerce anything into a finite number; empty/invalid input becomes 0. */
export function num(value: unknown): number {
   const n = typeof value === "number" ? value : Number(value);
   return Number.isFinite(n) ? n : 0;
}

/** Round to 2 decimal places, NaN/Infinity-safe. */
export function round2(value: unknown): number {
   const n = num(value);
   return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function clamp(value: number, min: number, max: number): number {
   return Math.min(Math.max(value, min), max);
}

/** Gross amount of one line before its product discount. */
export function lineGross(line: OrderLine): number {
   return round2(Math.max(0, num(line.listPrice)) * Math.max(0, num(line.quantity)));
}

/** Product-discount amount (BDT) for one line, never exceeding the line gross. */
export function lineDiscountAmount(line: OrderLine): number {
   const gross = lineGross(line);
   if (gross <= 0) return 0;
   const value = Math.max(0, num(line.discountValue));
   const amount =
      line.discountType === "percent" ? (gross * clamp(value, 0, 100)) / 100 : value;
   return round2(Math.min(amount, gross));
}

/**
 * Effective unit price after the line's product discount. This is the price
 * submitted to the API, so the server-side subtotal matches the UI exactly.
 */
export function lineEffectiveUnitPrice(line: OrderLine): number {
   const qty = Math.max(0, num(line.quantity));
   if (qty <= 0) return round2(Math.max(0, num(line.listPrice)));
   return round2((lineGross(line) - lineDiscountAmount(line)) / qty);
}

/** Net line total (effective unit price × quantity). */
export function lineTotal(line: OrderLine): number {
   return round2(lineEffectiveUnitPrice(line) * Math.max(0, num(line.quantity)));
}

export interface ChargesInput {
   discountType: DiscountType;
   discountValue: number;
   taxEnabled: boolean;
   taxRate: number;
   deliveryCharge: number;
   advancePayment: number;
}

export function calculateOrderTotals(
   lines: OrderLine[],
   charges: ChargesInput,
): OrderTotals {
   const subtotal = round2(lines.reduce((s, l) => s + lineGross(l), 0));
   const productDiscount = round2(
      lines.reduce((s, l) => s + lineDiscountAmount(l), 0),
   );
   const netProductAmount = round2(
      lines.reduce((s, l) => s + lineTotal(l), 0),
   );

   const discountValue = Math.max(0, num(charges.discountValue));
   const overallDiscount =
      charges.discountType === "percent"
         ? round2((netProductAmount * clamp(discountValue, 0, 100)) / 100)
         : round2(Math.min(discountValue, netProductAmount));

   const taxableAmount = round2(Math.max(0, netProductAmount - overallDiscount));
   const taxRate = charges.taxEnabled ? clamp(num(charges.taxRate), 0, 100) : 0;
   const taxAmount = round2((taxableAmount * taxRate) / 100);

   const deliveryCharge = round2(Math.max(0, num(charges.deliveryCharge)));
   const grandTotal = round2(taxableAmount + taxAmount + deliveryCharge);

   const advancePayment = round2(
      clamp(num(charges.advancePayment), 0, Math.max(grandTotal, 0)),
   );
   const dueAmount = round2(Math.max(0, grandTotal - advancePayment));

   const paymentStatus: OrderTotals["paymentStatus"] =
      grandTotal <= 0 || advancePayment >= grandTotal
         ? "Paid"
         : advancePayment > 0
           ? "Partial"
           : "Unpaid";

   return {
      subtotal,
      productDiscount,
      netProductAmount,
      overallDiscount,
      taxableAmount,
      taxAmount,
      deliveryCharge,
      grandTotal,
      advancePayment,
      dueAmount,
      paymentStatus,
      submittedDiscount: round2(overallDiscount - taxAmount),
   };
}

/** Consistent BDT formatting, e.g. ৳ 1,250.50 */
export function formatBDT(value: unknown, symbol = "৳"): string {
   const n = round2(value);
   return `${symbol} ${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
   })}`;
}
