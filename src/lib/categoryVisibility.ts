/**
 * Category visibility on product reads (P4-12, audit §B.5).
 *
 * Categories are soft-deleted (Bin), but products keep their
 * `categoryId` — so a product whose category sits in the Bin used
 * to keep rendering that category as if it were live (the product
 * list showed the binned category's name). The data is NOT touched:
 * the product still points at the category row, and restoring the
 * category from the Bin makes it present again. Read paths that
 * include the category relation pass the product through this
 * helper, which presents a soft-deleted category as `null` — the
 * exact shape an uncategorised product already has, so every
 * consumer's existing fallback applies ("General" in the product
 * list, "—"/empty elsewhere).
 */
export function hideDeletedCategory<
   T extends { category?: { isDeleted?: boolean | null } | null },
>(product: T): T {
   if (product && product.category && product.category.isDeleted) {
      return { ...product, category: null };
   }
   return product;
}
