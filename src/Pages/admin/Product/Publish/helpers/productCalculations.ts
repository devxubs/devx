/**
 * Pure calculation helpers for DevX POS Product Pricing, Tax, and Inventory
 */

export interface PricingInput {
   costPrice?: number;
   regularPrice: number;
   salePrice?: number | null;
   taxRate?: number;
   taxMode?: "EXCLUSIVE" | "INCLUSIVE" | string;
}

export interface PricingOutput {
   effectivePrice: number;
   hasDiscount: boolean;
   discountAmount: number;
   discountPercentage: number;
   grossProfit: number;
   profitMargin: number; // percentage e.g. 25.5
   taxAmount: number;
   subtotalBeforeTax: number;
   totalWithTax: number;
   isProfitable: boolean;
}

export function calculateProductPricing(input: PricingInput): PricingOutput {
   const regPrice = Math.max(0, Number(input.regularPrice) || 0);
   const salePrice =
      input.salePrice !== undefined && input.salePrice !== null && !isNaN(Number(input.salePrice))
         ? Math.max(0, Number(input.salePrice))
         : null;
   const cost = Math.max(0, Number(input.costPrice) || 0);
   const rate = Math.max(0, Number(input.taxRate) || 0);
   const mode = (input.taxMode || "EXCLUSIVE").toUpperCase();

   // Valid sale price cannot exceed regular price
   const isSaleValid = salePrice !== null && salePrice > 0 && (regPrice === 0 || salePrice <= regPrice);
   const effectivePrice = isSaleValid ? salePrice : regPrice;

   // Discount calculations
   const hasDiscount = isSaleValid && regPrice > salePrice;
   const discountAmount = hasDiscount ? regPrice - salePrice : 0;
   const discountPercentage = hasDiscount && regPrice > 0 ? (discountAmount / regPrice) * 100 : 0;

   // Profit calculations
   const grossProfit = effectivePrice - cost;
   const profitMargin = effectivePrice > 0 ? (grossProfit / effectivePrice) * 100 : 0;
   const isProfitable = grossProfit >= 0;

   // Tax calculations
   let taxAmount = 0;
   let subtotalBeforeTax = effectivePrice;
   let totalWithTax = effectivePrice;

   if (rate > 0) {
      if (mode === "INCLUSIVE") {
         // Tax is already included in effectivePrice
         taxAmount = effectivePrice - effectivePrice / (1 + rate / 100);
         subtotalBeforeTax = effectivePrice - taxAmount;
         totalWithTax = effectivePrice;
      } else {
         // EXCLUSIVE: Tax is added on top of effectivePrice
         taxAmount = (effectivePrice * rate) / 100;
         subtotalBeforeTax = effectivePrice;
         totalWithTax = effectivePrice + taxAmount;
      }
   }

   return {
      effectivePrice: Number(effectivePrice.toFixed(2)),
      hasDiscount,
      discountAmount: Number(discountAmount.toFixed(2)),
      discountPercentage: Number(discountPercentage.toFixed(1)),
      grossProfit: Number(grossProfit.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(1)),
      taxAmount: Number(taxAmount.toFixed(2)),
      subtotalBeforeTax: Number(subtotalBeforeTax.toFixed(2)),
      totalWithTax: Number(totalWithTax.toFixed(2)),
      isProfitable,
   };
}

export function formatBDT(amount: number): string {
   return `৳ ${amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const formatCurrencyBDT = formatBDT;
