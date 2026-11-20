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
