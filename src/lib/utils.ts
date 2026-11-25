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
 * Clamp a user-supplied money field the way the order/purchase
 * write paths do (Phase C4, audit P2-11): non-finite input becomes
 * 0 and negatives clamp to 0 — a negative discount must never act
 * as a surcharge, nor a negative delivery charge / advance payment
 * distort the totals. Pure.
 */
export function clampNonNegativeMoney(value: unknown): number {
   const n = Number(value);
   return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Normalise one order line's quantity/price to EXACTLY the order
 * PUT handler's semantics (Phase C4, audit C-12 / P2-11 — POST
 * parity with PUT): quantity = max(1, Number(q) || 1), price =
 * max(0, Number(p) || 0). Before this, POST stored the raw values,
 * so a negative quantity produced a negative line (a discount the
 * stock engine could not see — it floors line quantities to 0) and
 * a negative price reduced the subtotal below the real sale value.
 * Pure.
 */
export function normalizeOrderLineInput(line: {
   price?: unknown;
   quantity?: unknown;
}): { quantity: number; price: number } {
   return {
      quantity: Math.max(1, Number(line.quantity) || 1),
      price: Math.max(0, Number(line.price) || 0),
   };
}

/**
 * The admin order-details path for any order identifier (db id,
 * customId, orderCode, orderId or invoiceNo). The identifier MUST be
 * URI-encoded: legacy orderIds are stored with a leading "#"
 * (e.g. "#6002"), and interpolated raw, the "#" turns the rest of
 * the path into a URL fragment — navigation silently stays on the
 * current page and the details view never opens (the same fragment
 * trap the QuickEdit fetches hit in BUG-C1). Pure.
 */
export function orderDetailsPath(id: string): string {
   return `/admin/order/${encodeURIComponent(id)}`;
}

/**
 * The overpaid excess of an order (Phase C4, audit C-13 / P2-12):
 * how much of the advance payment exceeds the order total. The
 * totals/due math is unchanged (due floors at 0) — this computed
 * field only makes the excess VISIBLE as customer credit on API
 * responses. Pure.
 */
export function overpaidAmountOf(order: {
   advancePayment?: unknown;
   total?: unknown;
}): number {
   const excess =
      (Number(order.advancePayment) || 0) - (Number(order.total) || 0);
   return parseFloat(Math.max(0, excess).toFixed(2));
}

/**
 * Split a purchase CREATION payment into the part applied to the
 * purchase itself and the excess over its total (Phase C4, audit
 * C-13 / P2-12). The applied part is what the purchase's `paid`
 * stores — the codebase's payment convention is that `paid` never
 * exceeds `total` (allocated supplier payments refuse overpayment
 * outright) — and the excess is recorded separately as unallocated
 * supplier credit by the caller. Pure.
 */
export function splitCreationPayment(
   total: number,
   paidAmount: number,
): { paidApplied: number; overpayment: number } {
   const t = Math.max(0, Math.round((Number(total) || 0) * 100) / 100);
   const p = Math.max(0, Math.round((Number(paidAmount) || 0) * 100) / 100);
   return {
      paidApplied: Math.min(p, t),
      overpayment: parseFloat(Math.max(0, p - t).toFixed(2)),
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
