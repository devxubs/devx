import { ProductType } from "../../type";

/**
 * Calculates the sum of subtotals for an array of products.
 */
export const calculateSubtotal = (products: ProductType[]): number => {
   if (!Array.isArray(products)) return 0;
   const sum = products.reduce((acc, it) => {
      const price = Number(it.price) || 0;
      const qty = Number(it.quantity) || 1;
      const sub = it.subtotal != null ? Number(it.subtotal) : price * qty;
      return acc + sub;
   }, 0);
   return Number(sum.toFixed(2));
};

/**
 * Calculates final total and balance due amount based on financial parameters.
 */
export const calculateOrderPricing = (
   subtotal: number,
   deliveryCharge: number,
   discount: number,
   advancePayment: number,
) => {
   const cleanSub = Math.max(0, Number(subtotal) || 0);
   const cleanDel = Math.max(0, Number(deliveryCharge) || 0);
   const cleanDisc = Math.max(0, Number(discount) || 0);
   const cleanAdv = Math.max(0, Number(advancePayment) || 0);

   const total = Math.max(0, cleanSub + cleanDel - cleanDisc);
   const dueAmount = Math.max(0, total - cleanAdv);

   return {
      subtotal: Number(cleanSub.toFixed(2)),
      deliveryCharge: Number(cleanDel.toFixed(2)),
      discount: Number(cleanDisc.toFixed(2)),
      advancePayment: Number(cleanAdv.toFixed(2)),
      total: Number(total.toFixed(2)),
      dueAmount: Number(dueAmount.toFixed(2)),
   };
};

/**
 * Formats a numeric currency value with thousands separator and Bengali Taka symbol.
 */
export const formatCurrency = (val: number | string): string => {
   const num = Number(val) || 0;
   return `৳${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};
