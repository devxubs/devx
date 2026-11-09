import { useState, useEffect, useMemo, useCallback } from "react";
import { ProductType } from "../../type";
import { calculateSubtotal } from "../helpers/pricingHelpers";

export interface UseQuickEditProductsReturn {
   editableProducts: ProductType[];
   setEditableProducts: React.Dispatch<React.SetStateAction<ProductType[]>>;
   handleUpdateQuantity: (index: number, quantity: number) => void;
   handleUpdatePrice: (index: number, price: number) => void;
   handleUpdateSubtotal: (index: number, subtotal: number) => void;
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

      setEditableProducts((prev) => {
         // Check if already present in order items
         const existingIndex = prev.findIndex((p) => {
            const matchesId =
               Boolean(prodId) &&
               (p.productId === prodId ||
                  p.id === prodId ||
                  (p as any).customId === prodId);
            const matchesCode =
               Boolean(prodCode) && Boolean(p.code) && p.code === prodCode;
            return matchesId || matchesCode;
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
      handleRemoveItem,
      handleAddItem,
      calculatedSubtotal,
   };
};
