import { useState, useEffect, useMemo, useCallback } from "react";
import { ProductType } from "../../type";
import { calculateSubtotal } from "../helpers/pricingHelpers";

export interface UseQuickEditProductsReturn {
   editableProducts: ProductType[];
   setEditableProducts: React.Dispatch<React.SetStateAction<ProductType[]>>;
   handleUpdateQuantity: (index: number, quantity: number) => void;
   handleUpdatePrice: (index: number, price: number) => void;
   handleUpdateSubtotal: (index: number, subtotal: number) => void;
   handleUpdateVariant: (index: number, variantId: string) => void;
   handleRemoveItem: (index: number) => boolean;
   handleAddItem: (catalogProduct: any) => void;
   calculatedSubtotal: number;
}

export const useQuickEditProducts = (
   initialProducts: ProductType[] = [],
): UseQuickEditProductsReturn => {
   const [editableProducts, setEditableProducts] = useState<ProductType[]>(() =>
      (initialProducts || []).map((p) => ({
         ...p,
         subtotal:
            p.subtotal != null
               ? Number(p.subtotal)
               : (Number(p.price) || 0) * (Number(p.quantity) || 1),
      })),
   );

   // Synchronize with external products prop when provided
   useEffect(() => {
      setEditableProducts(
         (initialProducts || []).map((p) => ({
            ...p,
            subtotal:
               p.subtotal != null
                  ? Number(p.subtotal)
                  : (Number(p.price) || 0) * (Number(p.quantity) || 1),
         })),
      );
   }, [initialProducts]);

   // Sum of product subtotals
   const calculatedSubtotal = useMemo(
      () => calculateSubtotal(editableProducts),
      [editableProducts],
   );

   // Quantity stepper / manual update
   const handleUpdateQuantity = useCallback(
      (index: number, quantity: number) => {
         const nextQty = Math.max(1, quantity);
         setEditableProducts((prev) =>
            prev.map((item, idx) =>
               idx === index
                  ? {
                       ...item,
                       quantity: nextQty,
                       subtotal: Number((nextQty * item.price).toFixed(2)),
                    }
                  : item,
            ),
         );
      },
      [],
   );

   // Price update
   const handleUpdatePrice = useCallback((index: number, price: number) => {
      const nextPrice = Math.max(0, price);
      setEditableProducts((prev) =>
         prev.map((item, idx) =>
            idx === index
               ? {
                    ...item,
                    price: nextPrice,
                    subtotal: Number((item.quantity * nextPrice).toFixed(2)),
                 }
               : item,
         ),
      );
   }, []);

   // Subtotal update
   const handleUpdateSubtotal = useCallback(
      (index: number, subtotal: number) => {
         const nextSub = Math.max(0, subtotal);
         setEditableProducts((prev) =>
            prev.map((item, idx) =>
               idx === index
                  ? {
                       ...item,
                       subtotal: nextSub,
                    }
                  : item,
            ),
         );
      },
      [],
   );

   // INV-02: switch a line to another variant of the same product —
   // SKU and price follow the variant, subtotal is recomputed.
   const handleUpdateVariant = useCallback((index: number, variantId: string) => {
      setEditableProducts((prev) =>
         prev.map((item, idx) => {
            if (idx !== index) return item;
            const variant = (item.variants || []).find((v) => v.id === variantId);
            if (!variant) return item;
            const price = Number(variant.salePrice ?? variant.regularPrice ?? item.price) || 0;
            return {
               ...item,
               variantId: variant.id,
               variantName: variant.variantName,
               code: variant.sku || item.code,
               price,
               subtotal: Number((item.quantity * price).toFixed(2)),
            };
         }),
      );
   }, []);

   // INV-02: backfill variant option lists for lines that arrived
   // without them (existing order lines), one fetch per product.
   useEffect(() => {
      const missing = Array.from(
         new Set(
            editableProducts
               .filter((p) => p.productId && p.variants === undefined)
               .map((p) => p.productId as string),
         ),
      );
      if (missing.length === 0) return;
      let cancelled = false;
      (async () => {
         const byProduct = new Map<string, ProductType["variants"]>();
         await Promise.all(
            missing.map(async (productId) => {
               try {
                  const res = await fetch(`/api/products/${productId}`);
                  if (!res.ok) return;
                  const data = await res.json();
                  const product = data.product || data;
                  if (product?.productType === "Variable" && Array.isArray(product.variants)) {
                     byProduct.set(
                        productId,
                        product.variants.filter((v: any) => !v.isDeleted),
                     );
                  } else {
                     byProduct.set(productId, []);
                  }
               } catch {
                  byProduct.set(productId, []);
               }
            }),
         );
         if (cancelled || byProduct.size === 0) return;
         setEditableProducts((prev) =>
            prev.map((p) =>
               p.productId && byProduct.has(p.productId) && p.variants === undefined
                  ? { ...p, variants: byProduct.get(p.productId) }
                  : p,
            ),
         );
      })();
      return () => {
         cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [editableProducts.map((p) => `${p.productId}:${p.variants === undefined}`).join("|")]);

   // Remove product item (guard against removing the last remaining item)
   const handleRemoveItem = useCallback((index: number): boolean => {
      let removed = false;
      setEditableProducts((prev) => {
         if (prev.length <= 1) {
            removed = false;
            return prev;
         }
         removed = true;
         return prev.filter((_, i) => i !== index);
      });
      return removed;
   }, []);

   // Add product from catalog with duplicate quantity increment
   const handleAddItem = useCallback((catalogProd: any) => {
      if (!catalogProd) return;

      const prodId = String(catalogProd.id || "").trim();
      const prodCode = String(
         catalogProd.productCode || catalogProd.productSku || "",
      ).trim();

      const catalogVariants =
         catalogProd.productType === "Variable" && Array.isArray(catalogProd.variants)
            ? catalogProd.variants.filter((v: any) => !v.isDeleted)
            : undefined;

      setEditableProducts((prev) => {
         // Check if already present in order items. INV-02: a
         // variable product only merges with a line holding the SAME
         // variant (both unset counts as same) — different variants
         // of one product are separate lines.
         const existingIndex = prev.findIndex((p) => {
            const matchesId =
               Boolean(prodId) &&
               (p.productId === prodId ||
                  p.id === prodId ||
                  (p as any).customId === prodId);
            const matchesCode =
               Boolean(prodCode) && Boolean(p.code) && p.code === prodCode;
            const sameVariant =
               !catalogVariants || (p.variantId ?? null) === null;
            return (matchesId || matchesCode) && sameVariant;
         });

         if (existingIndex >= 0) {
            // Product already in order: increment its quantity by 1
            return prev.map((item, idx) => {
               if (idx === existingIndex) {
                  const newQty = (Number(item.quantity) || 1) + 1;
                  const itemPrice = Number(item.price) || 0;
                  return {
                     ...item,
                     quantity: newQty,
                     subtotal: Number((newQty * itemPrice).toFixed(2)),
                  };
               }
               return item;
            });
         }

         // New product item: add new entry
         const price = Number(
            catalogProd.salePrice ?? catalogProd.regularPrice ?? 0,
         );
         const image =
            Array.isArray(catalogProd.images) && catalogProd.images.length > 0
               ? catalogProd.images[0]
               : typeof catalogProd.images === "string"
                 ? catalogProd.images
                 : "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-1.webp";

         const newItem: ProductType = {
            id: prodId,
            productId: prodId,
            variantId: null,
            variantName: null,
            ...(catalogVariants ? { variants: catalogVariants } : {}),
            name: catalogProd.productName || catalogProd.name || "Product Item",
            code: prodCode,
            quantity: 1,
            price: price,
            subtotal: price,
            images: image,
            isDeleted: false,
         };

         return [...prev, newItem];
      });
   }, []);

   return {
      editableProducts,
      setEditableProducts,
      handleUpdateQuantity,
      handleUpdatePrice,
      handleUpdateSubtotal,
      handleUpdateVariant,
      handleRemoveItem,
      handleAddItem,
      calculatedSubtotal,
   };
};
