/**
 * Settings customConfig hygiene (P2-20).
 *
 * `customConfig` is a free-form JSON blob on the singleton
 * StoreSetting row. Over time the Settings UI grew toggles that are
 * WRITE-ONLY: saved into the blob, never read by any consumer — a
 * lying control. Each key that ever appeared in the Settings UI was
 * audited against every consumer in `src/`:
 *
 * LIVE keys (a real consumer reads them — kept):
 *   - defaultExpenseCategory — the Expense page seeds its category
 *     options from it.
 *   - invoiceTemplateId, accentColor, termsText, showSkuColumn,
 *     showSignatureBox, showCustomerOnReceipt, showCashierOnReceipt,
 *     showCourierOnReceipt, showTermsOnReceipt — the invoice
 *     renderer consumes them via the print document's customization
 *     (the four *OnReceipt keys and the template id are mapped onto
 *     the renderer's field names at the consumption sites).
 *   - defaultCourierStatus (O4) — the bulk courier submission
 *     applies it when no explicit courier status is chosen (read
 *     server-side by POST /api/orders/bulk and pre-selected in the
 *     orders-list bulk courier modal; validated on save against
 *     COURIER_STATUSES in src/lib/courierSubmission.ts).
 *
 * DEAD keys (no consumer exists — UI removed, and stripped here on
 * save so they stop being persisted):
 *   compactTableDensity, loyaltyRewardRate, supplierCreditDays,
 *   requireCustomerPhone, allowGuestCustomer, autoCreateCustomerOnPos,
 *   notifySuppliersLowStock, purchaseTaxRate,
 *   defaultExpensePaymentMethod, autoApprovePurchases,
 *   requireExpenseProof, cashierCanDiscount, requireApprovalForVoid,
 *   cashiersCanViewCost, managerCanAccessSettings, defaultOrderStatus,
 *   allowDuePayment, autoPrintReceipt, roundTotals, defaultUnit,
 *   defaultCategory, autoDeductStock, enableBarcodeScannerQuickAdd,
 *   dailySalesEmail, notifyOnCancelledOrder.
 *
 * Wiring the dead ones would have meant inventing features (a
 * loyalty engine, a mailer, an approval workflow, POS payment
 * policies) — explicitly out of scope for a cleanup. Unknown keys
 * NOT in either list are preserved untouched (forward-compatible).
 */

export const DEAD_CUSTOM_CONFIG_KEYS: readonly string[] = [
   "compactTableDensity",
   "loyaltyRewardRate",
   "supplierCreditDays",
   "requireCustomerPhone",
   "allowGuestCustomer",
   "autoCreateCustomerOnPos",
   "notifySuppliersLowStock",
   "purchaseTaxRate",
   "defaultExpensePaymentMethod",
   "autoApprovePurchases",
   "requireExpenseProof",
   "cashierCanDiscount",
   "requireApprovalForVoid",
   "cashiersCanViewCost",
   "managerCanAccessSettings",
   "defaultOrderStatus",
   "allowDuePayment",
   "autoPrintReceipt",
   "roundTotals",
   "defaultUnit",
   "defaultCategory",
   "autoDeductStock",
   "enableBarcodeScannerQuickAdd",
   "dailySalesEmail",
   "notifyOnCancelledOrder",
];

const DEAD_SET = new Set(DEAD_CUSTOM_CONFIG_KEYS);

/**
 * Return a copy of a customConfig value with every dead key removed.
 * Non-object values pass through unchanged (the settings route stores
 * the blob as given); arrays are not valid config objects and also
 * pass through.
 */
export function sanitizeCustomConfig(value: unknown): unknown {
   if (!value || typeof value !== "object" || Array.isArray(value)) {
      return value;
   }
   const out: Record<string, unknown> = {};
   for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (!DEAD_SET.has(key)) out[key] = v;
   }
   return out;
}
