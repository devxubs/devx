/**
 * DevX POS — Business Logic & Currency Helpers
 */

/**
 * Format number as currency (BDT default)
 */
export function formatCurrency(
   amount: number | string,
   currency = "BDT",
   locale = "en-BD",
): string {
   const num = typeof amount === "string" ? parseFloat(amount) : amount;
   if (isNaN(num)) return "0.00";
   return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
   }).format(num);
}

/**
 * Pure calculation for POS order totals
 * total = max(subtotal + deliveryCharge - discount, 0)
 * dueAmount = max(total - advancePayment, 0)
 */
export function calculateOrderTotals(
   items: { price: number; quantity: number }[],
   deliveryCharge = 0,
   discount = 0,
   advancePayment = 0,
) {
   const subtotal = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0,
   );
   const total = Math.max(subtotal + (Number(deliveryCharge) || 0) - (Number(discount) || 0), 0);
   const dueAmount = Math.max(total - (Number(advancePayment) || 0), 0);

   return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      deliveryCharge: parseFloat((Number(deliveryCharge) || 0).toFixed(2)),
      discount: parseFloat((Number(discount) || 0).toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      advancePayment: parseFloat((Number(advancePayment) || 0).toFixed(2)),
      dueAmount: parseFloat(dueAmount.toFixed(2)),
   };
}

/**
 * Generate sequential order IDs (e.g. #6012, INV-6012)
 */
export function generateOrderIdentifiers(existingCount: number): {
   orderId: string;
   invoiceNo: string;
} {
   const num = 6000 + existingCount + 1;
   return {
      orderId: `#${num}`,
      invoiceNo: `INV-${num}`,
   };
}
