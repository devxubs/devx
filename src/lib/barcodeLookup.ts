/**
 * Barcode scan resolution (P2-17) — the decision half of
 * GET /api/products/barcode, extracted pure so it is hermetically
 * testable. The route performs the two pool queries (live variants
 * and live products whose barcode / sku / code equals the scanned
 * code) and hands the raw matches here.
 *
 * Ranking inside each pool mirrors the route's long-standing rule:
 * exact barcode matches outrank sku/code matches for the same code
 * (a pool with any barcode match ignores its sku-only matches).
 *
 * The pools are then resolved TOGETHER — a code carried by one
 * variant AND one product is ambiguous, exactly like a code carried
 * by two variants. Previously the route returned the variant pool
 * first and never looked at the product pool, so a cross-pool
 * duplicate silently resolved to the variant.
 */

export interface VariantCodeMatch {
   id: string;
   variantName: string;
   sku: string | null;
   barcode: string | null;
   productId: string;
}

export interface ProductCodeMatch {
   id: string;
   productName: string;
   barcode: string | null;
   productSku: string | null;
   productCode: string | null;
}

export type BarcodeMatchDescriptor =
   | { variantId: string; variantName: string; productId: string }
   | { productId: string; productName: string };

export type BarcodeLookupDecision<V, P> =
   | {
        type: "variant";
        variant: V;
        matchedOn: "variant.barcode" | "variant.sku";
     }
   | {
        type: "product";
        product: P;
        matchedOn: "product.barcode" | "product.productSku" | "product.productCode";
     }
   | { type: "ambiguous"; error: string; matches: BarcodeMatchDescriptor[] }
   | { type: "none" };

export function resolveBarcodeLookup<
   V extends VariantCodeMatch,
   P extends ProductCodeMatch,
>(
   code: string,
   variantMatches: V[],
   productMatches: P[],
): BarcodeLookupDecision<V, P> {
   // Barcode matches outrank sku matches within each pool.
   const variantBarcodeMatches = variantMatches.filter((v) => v.barcode === code);
   const variantPool =
      variantBarcodeMatches.length > 0 ? variantBarcodeMatches : variantMatches;
   const productBarcodeMatches = productMatches.filter((p) => p.barcode === code);
   const productPool =
      productBarcodeMatches.length > 0 ? productBarcodeMatches : productMatches;

   const variantDescriptors: BarcodeMatchDescriptor[] = variantPool.map((v) => ({
      variantId: v.id,
      variantName: v.variantName,
      productId: v.productId,
   }));
   const productDescriptors: BarcodeMatchDescriptor[] = productPool.map((p) => ({
      productId: p.id,
      productName: p.productName,
   }));

   if (variantPool.length > 1) {
      return {
         type: "ambiguous",
         error: "This code is assigned to more than one variant",
         matches: variantDescriptors,
      };
   }
   if (productPool.length > 1) {
      return {
         type: "ambiguous",
         error: "This code is assigned to more than one product",
         matches: productDescriptors,
      };
   }
   if (variantPool.length === 1 && productPool.length === 1) {
      // Cross-pool ambiguity (P2-17): the code exists on a variant
      // AND a product — neither pool may silently win.
      return {
         type: "ambiguous",
         error: "This code is assigned to more than one item",
         matches: [...variantDescriptors, ...productDescriptors],
      };
   }
   if (variantPool.length === 1) {
      const variant = variantPool[0];
      return {
         type: "variant",
         variant,
         matchedOn: variant.barcode === code ? "variant.barcode" : "variant.sku",
      };
   }
   if (productPool.length === 1) {
      const product = productPool[0];
      return {
         type: "product",
         product,
         matchedOn:
            product.barcode === code
               ? "product.barcode"
               : product.productSku === code
                 ? "product.productSku"
                 : "product.productCode",
      };
   }
   return { type: "none" };
}
