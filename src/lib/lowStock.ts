/**
 * Low-stock predicate (P2-19) — the ONE canonical definition, shared
 * by the Dashboard, the Reports products tab, the Stock workspace and
 * (after this change) the products list API filter:
 *
 *   a product is low when  quantity <= effectiveThreshold
 *   where effectiveThreshold = lowStockAlert || 10
 *
 * The `|| 10` is deliberate and load-bearing: a stored 0 (or a
 * missing/null value) means "use the default 10", exactly like the
 * JS fallback the Dashboard/Reports code has always used and like
 * the raw-SQL form `COALESCE(NULLIF(lowStockAlert, 0), 10)` in the
 * Reports products query. Do NOT "fix" this to `??` — a product
 * whose alert was saved as 0 would silently stop alerting until it
 * is completely out of stock.
 *
 * Variants carry their own threshold with a different schema
 * default: ProductVariant.lowStockAlert defaults to 5, and the
 * product PUT route falls back to 5 for variant rows, so the
 * variant predicate mirrors that: `lowStockAlert || 5`.
 */

export const DEFAULT_PRODUCT_LOW_STOCK_ALERT = 10;
export const DEFAULT_VARIANT_LOW_STOCK_ALERT = 5;

/** Effective product threshold: stored 0/null/undefined → 10. */
export function effectiveProductThreshold(
   lowStockAlert: number | null | undefined,
): number {
   return lowStockAlert || DEFAULT_PRODUCT_LOW_STOCK_ALERT;
}

/** Effective variant threshold: stored 0/null/undefined → 5. */
export function effectiveVariantThreshold(
   lowStockAlert: number | null | undefined,
): number {
   return lowStockAlert || DEFAULT_VARIANT_LOW_STOCK_ALERT;
}

/** Canonical product predicate: quantity <= (lowStockAlert || 10). */
export function isProductLowStock(
   quantity: number,
   lowStockAlert: number | null | undefined,
): boolean {
   return quantity <= effectiveProductThreshold(lowStockAlert);
}

/** Variant predicate: quantity <= (lowStockAlert || 5). */
export function isVariantLowStock(
   quantity: number,
   lowStockAlert: number | null | undefined,
): boolean {
   return quantity <= effectiveVariantThreshold(lowStockAlert);
}

/**
 * Raw-SQL form of the product predicate for a pair of column names,
 * mirroring the Reports products query verbatim in semantics:
 * `quantity <= COALESCE(NULLIF(lowStockAlert, 0), 10)`.
 * Used where Prisma cannot compare two columns in a `where`
 * (the products list low-stock filter resolves matching ids with
 * this condition, then lets Prisma apply every other filter and
 * paginate — so totals stay accurate).
 */
export function lowStockSqlCondition(
   quantityColumn = "quantity",
   thresholdColumn = "lowStockAlert",
): string {
   return `${quantityColumn} <= COALESCE(NULLIF(${thresholdColumn}, 0), ${DEFAULT_PRODUCT_LOW_STOCK_ALERT})`;
}
