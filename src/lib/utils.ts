/**
 * DevX POS — Business Logic & Currency Helpers
 */

/**
 * Format number as currency (BDT default)
 */
export function formatCurrency(
   amount: number | string,
   currency = "BDT",
   locale = "en-BD",
): string {
   const num = typeof amount === "string" ? parseFloat(amount) : amount;
   if (isNaN(num)) return "0.00";
   return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
   }).format(num);
}

export interface FormatCompactNumberOptions {
   /** Symbol prefixed to the compact value, after any "-" sign (e.g. "৳"). */
   currencySymbol?: string;
}

/**
 * Format a number compactly for KPI cards, chart labels and other
 * large-number summaries (never for precise figures in tables/exports):
 *
 *   1000 → "1k"    1500 → "1.5k"    10000 → "10k"    100000 → "100k"
 *   1000000 → "1M" 1500000 → "1.5M" 1e9 and above use the "B" tier.
 *
 * Rules:
 * - Lowercase "k", uppercase "M"/"B"; at most 1 decimal place and no
 *   trailing ".0".
 * - Boundary: the value is rounded to 1 decimal WITHIN its tier; if
 *   that rounding reaches 1000 of the current tier (e.g. 999950 →
 *   999.95k → rounds to 1000.0k) it is promoted to the next tier
 *   ("1M"). The top "B" tier has no higher tier, so it may show
 *   values such as "1000B".
 * - |value| < 1000 passes through as a plain number: integers are
 *   unchanged, non-integers are rounded to at most 1 decimal (and a
 *   value like 999.96, which rounds to 1000, is promoted to "1k").
 * - Negatives keep their sign: -1500 → "-1.5k". With a currency
 *   symbol the sign comes first: "-৳1.5k".
 * - null / undefined / NaN / non-numeric input → "0" (the same
 *   fallback style as formatCurrency above, which returns "0.00").
 */
export function formatCompactNumber(
   value: number | string | null | undefined,
   options?: FormatCompactNumberOptions,
): string {
   if (value === null || value === undefined) return "0";
   const num = typeof value === "string" ? parseFloat(value) : value;
   if (typeof num !== "number" || isNaN(num)) return "0";

   const sign = num < 0 ? "-" : "";
   const symbol = options?.currencySymbol || "";
   const abs = Math.abs(num);

   // Round to at most 1 decimal and render without a trailing ".0".
   const render = (n: number): string => {
      const rounded = Math.round(n * 10) / 10;
      return Number.isInteger(rounded)
         ? String(rounded)
         : rounded.toFixed(1);
   };

   if (abs < 1000) {
      const rounded = Math.round(abs * 10) / 10;
      // 999.96 rounds to 1000 — promote into the "k" tier below
      // instead of printing a plain "1000".
      if (rounded < 1000) return `${sign}${symbol}${render(abs)}`;
   }

   const tiers = [
      { threshold: 1e9, suffix: "B" },
      { threshold: 1e6, suffix: "M" },
      { threshold: 1e3, suffix: "k" },
   ];
   let tierIndex = tiers.findIndex((t) => abs >= t.threshold);
   if (tierIndex === -1) tierIndex = tiers.length - 1;
   let scaled = abs / tiers[tierIndex].threshold;
   // Boundary promotion: 1000.0 of one tier is 1 of the next tier up.
   while (Math.round(scaled * 10) / 10 >= 1000 && tierIndex > 0) {
      tierIndex -= 1;
      scaled = abs / tiers[tierIndex].threshold;
   }
   return `${sign}${symbol}${render(scaled)}${tiers[tierIndex].suffix}`;
}

/**
 * Pure calculation for POS order totals
 * total = max(subtotal + deliveryCharge - discount, 0)
 * dueAmount = max(total - advancePayment, 0)
 */
export function calculateOrderTotals(
   items: { price: number; quantity: number }[],
   deliveryCharge = 0,
   discount = 0,
   advancePayment = 0,
) {
   const subtotal = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0,
   );
   const total = Math.max(subtotal + (Number(deliveryCharge) || 0) - (Number(discount) || 0), 0);
   const dueAmount = Math.max(total - (Number(advancePayment) || 0), 0);

   return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      deliveryCharge: parseFloat((Number(deliveryCharge) || 0).toFixed(2)),
      discount: parseFloat((Number(discount) || 0).toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      advancePayment: parseFloat((Number(advancePayment) || 0).toFixed(2)),
      dueAmount: parseFloat(dueAmount.toFixed(2)),
   };
}

/**
 * Generate sequential order IDs (e.g. #6012, INV-6012)
 */
export function generateOrderIdentifiers(existingCount: number): {
   orderId: string;
   invoiceNo: string;
} {
   const num = 6000 + existingCount + 1;
   return {
      orderId: `#${num}`,
      invoiceNo: `INV-${num}`,
   };
}
