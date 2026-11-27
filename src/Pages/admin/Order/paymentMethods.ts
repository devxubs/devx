// Order payment-method helpers shared by the Order Create and
// Quick Edit payment sections (Phase 3B).
//
// RP-7 (X1): whether a method uses transaction IDs is configured
// per payment method in Settings (requiresTransactionId), resolved
// centrally by @src/lib/paymentMethods with a legacy fallback to
// the three Bangladeshi mobile-money names for configurations
// saved before the flag existed. The server enforces the same
// resolver on order writes (src/lib/payments.ts), so what the
// forms show and what the API accepts cannot drift apart.

import { paymentMethodRequiresTxId } from "@src/lib/paymentMethods";

/** Methods for which TxID / sender-number inputs were shown before the per-method flag. */
export const MOBILE_PAYMENT_METHODS = ["bKash", "Nagad", "Rocket"];

export function isMobilePaymentMethod(method?: string | null): boolean {
   if (!method) return false;
   const normalized = method.trim().toLowerCase();
   return MOBILE_PAYMENT_METHODS.some((m) => m.toLowerCase() === normalized);
}

/** Config-aware TxID visibility for the order payment forms. */
export function methodUsesTxId(
   customConfig: unknown,
   method?: string | null,
): boolean {
   return paymentMethodRequiresTxId(customConfig, method);
}
