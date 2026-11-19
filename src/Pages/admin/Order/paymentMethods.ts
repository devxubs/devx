// Order payment-method constants shared by the Order Create and
// Quick Edit payment sections (Phase 3B). The server-side copy lives
// in src/lib/payments.ts (API code cannot import page modules); the
// two lists must be kept in sync — both are the three Bangladeshi
// mobile-money methods for which a transaction ID is meaningful.

/** Methods for which TxID / sender-number inputs are shown. */
export const MOBILE_PAYMENT_METHODS = ["bKash", "Nagad", "Rocket"];

export function isMobilePaymentMethod(method?: string | null): boolean {
   if (!method) return false;
   const normalized = method.trim().toLowerCase();
   return MOBILE_PAYMENT_METHODS.some((m) => m.toLowerCase() === normalized);
}
