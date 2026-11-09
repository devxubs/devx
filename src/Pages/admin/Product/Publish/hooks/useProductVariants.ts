import { useState, useCallback } from "react";
import { ProductVariantItem } from "../types";

export interface AttributeDefinition {
   name: string;
   values: string[];
}

export function useProductVariants(
   initialVariants: ProductVariantItem[] = [],
   baseSku: string = "PROD",
   baseRegularPrice: number = 0,
   baseCostPrice: number = 0,
) {
   const [attributes, setAttributes] = useState<AttributeDefinition[]>([
      { name: "Size", values: [] },
   ]);
   const [variants, setVariants] = useState<ProductVariantItem[]>(initialVariants);

   const addAttribute = useCallback((name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setAttributes((prev) => {
         if (prev.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) return prev;
         return [...prev, { name: trimmed, values: [] }];
      });
   }, []);

   const removeAttribute = useCallback((index: number) => {
      setAttributes((prev) => prev.filter((_, i) => i !== index));
   }, []);

   const addAttributeValue = useCallback((attrIndex: number, value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setAttributes((prev) => {
         const copy = [...prev];
         const target = copy[attrIndex];
         if (!target || target.values.includes(trimmed)) return prev;
         copy[attrIndex] = { ...target, values: [...target.values, trimmed] };
         return copy;
      });
   }, []);

   const removeAttributeValue = useCallback((attrIndex: number, valIndex: number) => {
      setAttributes((prev) => {
         const copy = [...prev];
         const target = copy[attrIndex];
         if (!target) return prev;
         copy[attrIndex] = {
            ...target,
            values: target.values.filter((_, i) => i !== valIndex),
         };
         return copy;
      });
   }, []);

   // Generate Cartesian product matrix of attributes
   const generateCombinations = useCallback(() => {
      const populatedAttrs = attributes.filter((a) => a.values.length > 0);
      if (populatedAttrs.length === 0) return;

      const cartesian = (arrays: string[][]): string[][] => {
         return arrays.reduce<string[][]>(
            (acc, curr) => acc.flatMap((x) => curr.map((y) => [...x, y])),
            [[]],
         );
      };

      const valueArrays = populatedAttrs.map((a) => a.values);
      const combos = cartesian(valueArrays);

      const generated: ProductVariantItem[] = combos.map((combo, idx) => {
         const attrMap: Record<string, string> = {};
         populatedAttrs.forEach((a, i) => {
            attrMap[a.name] = combo[i];
         });

         const variantName = combo.join(" / ");
         const skuSuffix = combo
            .map((c) => c.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 3))
            .join("-");
         const sku = `${baseSku || "PROD"}-${skuSuffix || idx + 1}`;

         return {
            variantName,
            sku,
            barcode: "",
            regularPrice: baseRegularPrice || 0,
            salePrice: null,
            costPrice: baseCostPrice || 0,
            wholesalePrice: 0,
            quantity: 0,
            lowStockAlert: 5,
            status: "ACTIVE",
            attributes: attrMap,
         };
      });

      setVariants(generated);
   }, [attributes, baseSku, baseRegularPrice, baseCostPrice]);

   const updateVariant = useCallback((index: number, updates: Partial<ProductVariantItem>) => {
      setVariants((prev) => {
         const copy = [...prev];
         if (!copy[index]) return prev;
         copy[index] = { ...copy[index], ...updates };
         return copy;
      });
   }, []);

   const removeVariant = useCallback((index: number) => {
      setVariants((prev) => prev.filter((_, i) => i !== index));
   }, []);

   const addManualVariant = useCallback(() => {
      const idx = variants.length + 1;
      const newVar: ProductVariantItem = {
         variantName: `Custom Variant ${idx}`,
         sku: `${baseSku || "PROD"}-V${idx}`,
         barcode: "",
         regularPrice: baseRegularPrice || 0,
         salePrice: null,
         costPrice: baseCostPrice || 0,
         wholesalePrice: 0,
         quantity: 0,
         lowStockAlert: 5,
         status: "ACTIVE",
      };
      setVariants((prev) => [...prev, newVar]);
   }, [variants.length, baseSku, baseRegularPrice, baseCostPrice]);

   const totalVariantQuantity = variants.reduce(
      (acc, v) => acc + (Math.max(0, Number(v.quantity) || 0)),
      0,
   );

   return {
      attributes,
      variants,
      setVariants,
      addAttribute,
      removeAttribute,
      addAttributeValue,
      removeAttributeValue,
      generateCombinations,
      updateVariant,
      removeVariant,
      addManualVariant,
      totalVariantQuantity,
   };
}
