/**
 * Order Publish edit hydration (P2-2) — pure mapping helper.
 *
 * The create flow builds each line's `variants` picker list from the
 * product payload it picked (GET /api/products list shape). The edit
 * flow hydrates lines from the stored order, whose items carry only
 * the CHOSEN variant — the picker list has to be loaded live per
 * product (GET /api/products/[id] returns the product's live,
 * non-deleted variants in the same field shape). This helper merges
 * those per-product lists into hydrated lines: every line gains the
 * live variants of its product, so the existing variant selector
 * renders and a change flows through the unchanged line-update +
 * PUT machinery (the API already nets stock per product+variant).
 *
 * Lines whose product has no live variants (simple product, or the
 * product fetch failed) keep an empty list — the selector simply
 * does not render, exactly as before this change.
 */
// The page's line objects come from untyped API JSON (the order
// payload is `any` end-to-end in the Publish page), so the helper
// deliberately works in `any` terms like the surrounding code.
export function mergeLineVariants(
   lines: any[],
   variantsByProductId: Record<string, any[]>,
): any[] {
   return lines.map((line) => ({
      ...line,
      variants:
         (line?.productId && variantsByProductId[line.productId]) || [],
   }));
}

/**
 * O6: may a PUT order line carry its requested variant?
 *
 * Pure decision extracted from the PUT /api/orders/[id] Step 3b
 * validation so the rules are hermetically testable. Returns the
 * `{ error, message }` rejection the route responds with (400), or
 * null when the assignment is allowed.
 *
 * Rules (mirroring the route's long-standing behaviour, plus the
 * O6 status rule):
 *  - the variant must exist and belong to the line's product —
 *    always enforced;
 *  - a soft-deleted or non-ACTIVE variant is rejected only when
 *    the line is new or its variant actually changed — an
 *    unrelated edit must not fail because a variant on an old
 *    line was archived/deactivated after the sale.
 */
export function variantAssignmentError(input: {
   variantId: string;
   lineName: string;
   lineProductId: string | null;
   variant:
      | {
           productId: string;
           variantName: string;
           isDeleted?: boolean | null;
           status?: string | null;
        }
      | undefined;
   variantChanged: boolean;
}): { error: string; message: string } | null {
   const { variantId, lineName, lineProductId, variant, variantChanged } =
      input;
   if (!variant || variant.productId !== lineProductId) {
      return {
         error: "Invalid variant",
         message: `Variant '${variantId}' does not belong to product '${lineName}'.`,
      };
   }
   if (variantChanged && variant.isDeleted) {
      return {
         error: "Variant unavailable",
         message: `Variant '${variant.variantName}' is archived/deleted and cannot be added to an order.`,
      };
   }
   if (variantChanged && variant.status && variant.status !== "ACTIVE") {
      return {
         error: "Variant unavailable",
         message: `Variant '${variant.variantName}' is not active and cannot be added to an order.`,
      };
   }
   return null;
}

/**
 * O6: plan the net stock effect of an order PUT, per
 * product + variant (INV-02).
 *
 * Pure extraction of the PUT handler's Step 4 netting. The diff
 * is computed from the COMPLETE before/after item sets — never
 * from line matching — so it is identical whether the caller
 * kept the line (Quick Edit sends `orderItemId`) or the line is
 * deleted and recreated (the Publish edit payload carries no
 * orderItemId). A variant change on a line therefore always
 * plans −quantity against the OLD variant (stock restored) and
 * +quantity against the NEW variant (stock deducted), exactly
 * once per product+variant key; two lines naming the same
 * variant aggregate. Both sides are gated by the caller's
 * stock-holding predicate, so an order that held no stock
 * (CANCELLED/FAILED/deleted) and still holds none plans no
 * diffs at all. Positive diff = units to deduct (validated by
 * the stock engine); negative = units to restore.
 */
export interface OrderStockDiff {
   productId: string;
   variantId: string | null;
   diff: number;
}

export function planOrderStockDiffs(
   existingItems: ReadonlyArray<{
      productId?: string | null;
      variantId?: string | null;
      quantity: number;
   }>,
   finalItems: ReadonlyArray<{
      productId?: string | null;
      variantId?: string | null;
      quantity: number;
   }>,
   wasHoldingStock: boolean,
   willHoldStock: boolean,
): OrderStockDiff[] {
   const stockDiffMap = new Map<string, OrderStockDiff>();
   const addStockDiff = (
      productId: string,
      variantId: string | null,
      delta: number,
   ) => {
      const key = `${productId}::${variantId ?? ""}`;
      const current = stockDiffMap.get(key);
      if (current) current.diff += delta;
      else stockDiffMap.set(key, { productId, variantId, diff: delta });
   };

   if (wasHoldingStock) {
      for (const existingIt of existingItems) {
         if (existingIt.productId) {
            addStockDiff(
               existingIt.productId,
               existingIt.variantId ?? null,
               -existingIt.quantity,
            );
         }
      }
   }

   if (willHoldStock) {
      for (const newIt of finalItems) {
         if (newIt.productId) {
            addStockDiff(newIt.productId, newIt.variantId ?? null, newIt.quantity);
         }
      }
   }

   return Array.from(stockDiffMap.values());
}
