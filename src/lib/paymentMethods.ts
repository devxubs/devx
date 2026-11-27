// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — Payment Method Settings (central module).
//
// Audit facts this design rests on:
//   • paymentMethod is a free String on Order / SupplierPayment /
//     BillingTransaction. There is NO PaymentMethod model and NO
//     enum, and no Financial Account model exists in the schema —
//     methods are labels on payment records, nothing more.
//   • Because history stores the string itself, renaming or
//     deactivating a method can NEVER rewrite history: past
//     payments keep the exact name they were recorded with. That
//     is the historical-safety mechanism, and it is why no schema
//     change is needed.
//   • Four divergent hardcoded lists existed (Order Create,
//     Quick Edit, the Settings default dropdown, the supplier
//     ledger). This module centralises the SALES side; the
//     supplier ledger keeps its own list (purchase-side flow,
//     deliberately untouched by Phase 5).
//
// Configuration lives in StoreSetting.customConfig:
//   paymentMethods: [{ name, description?, active }]
// Array order is the display order everywhere. Unset → the
// built-in list below (the Order Create list, the most complete
// of the legacy copies), all active — today's behaviour.
// ─────────────────────────────────────────────────────────────────────────────

export const PAYMENT_METHODS_KEY = "paymentMethods";

export interface PaymentMethodConfig {
   name: string;
   description?: string;
   active: boolean;
   /**
    * RP-7 (X1): whether this method uses transaction IDs (TxID +
    * sender number on order payments). Optional for backward
    * compatibility: when unset, the legacy name rule applies
    * (bKash / Nagad / Rocket — see paymentMethodRequiresTxId).
    */
   requiresTransactionId?: boolean;
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
   { name: "Cash", active: true },
   { name: "Cash on Delivery", active: true },
   { name: "bKash", active: true, requiresTransactionId: true },
   { name: "Nagad", active: true, requiresTransactionId: true },
   { name: "Rocket", active: true, requiresTransactionId: true },
   { name: "Card", active: true },
   { name: "Bank Transfer", active: true },
   { name: "Wallet", active: true },
   { name: "Credit Card", active: true },
   { name: "Other", active: true },
];

function asConfigObject(customConfig: unknown): Record<string, unknown> {
   return customConfig && typeof customConfig === "object" && !Array.isArray(customConfig)
      ? (customConfig as Record<string, unknown>)
      : {};
}

/**
 * The effective method list: the saved list when it is a non-empty
 * array of usable entries (trimmed, de-duplicated by name
 * case-insensitively, first occurrence wins), otherwise the
 * built-in defaults.
 */
export function resolvePaymentMethods(customConfig: unknown): PaymentMethodConfig[] {
   const raw = asConfigObject(customConfig)[PAYMENT_METHODS_KEY];
   if (!Array.isArray(raw)) return DEFAULT_PAYMENT_METHODS.map((m) => ({ ...m }));
   const out: PaymentMethodConfig[] = [];
   const seen = new Set<string>();
   for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const name = typeof e.name === "string" ? e.name.trim() : "";
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
         name,
         description:
            typeof e.description === "string" && e.description.trim() !== ""
               ? e.description.trim()
               : undefined,
         active: e.active !== false,
         requiresTransactionId:
            typeof e.requiresTransactionId === "boolean"
               ? e.requiresTransactionId
               : undefined,
      });
   }
   return out.length > 0 ? out : DEFAULT_PAYMENT_METHODS.map((m) => ({ ...m }));
}

/** Names of the methods selectable for NEW transactions, in display order. */
export function activePaymentMethodNames(customConfig: unknown): string[] {
   return resolvePaymentMethods(customConfig)
      .filter((m) => m.active)
      .map((m) => m.name);
}

/**
 * Selector options for a payment form: the active methods, with
 * the form's current value merged back in when it is not among
 * them (an order recorded with a since-deactivated or renamed
 * method must stay displayable and re-savable in edit contexts —
 * historical preservation at the UI level).
 */
export function paymentMethodOptionsFor(
   customConfig: unknown,
   currentMethod?: string | null,
): string[] {
   const options = activePaymentMethodNames(customConfig);
   const current = typeof currentMethod === "string" ? currentMethod.trim() : "";
   if (current && !options.some((o) => o.toLowerCase() === current.toLowerCase())) {
      options.push(current);
   }
   return options;
}

/**
 * The default for NEW payment forms: the configured
 * StoreSetting.defaultPaymentMethod when it names an ACTIVE
 * method; otherwise "Cash" when active; otherwise the first
 * active method; otherwise "Cash" (no active methods configured
 * at all — the form still needs a value).
 */
export function resolveDefaultPaymentMethod(
   customConfig: unknown,
   configuredDefault?: string | null,
): string {
   const methods = resolvePaymentMethods(customConfig);
   const active = methods.filter((m) => m.active);
   const wanted = typeof configuredDefault === "string" ? configuredDefault.trim() : "";
   if (wanted) {
      const hit = active.find((m) => m.name.toLowerCase() === wanted.toLowerCase());
      if (hit) return hit.name;
   }
   const cash = active.find((m) => m.name.toLowerCase() === "cash");
   if (cash) return cash.name;
   return active[0]?.name ?? "Cash";
}

/**
 * Server-side selection rule for order writes. Returns an error
 * message when the selection must be rejected, else null.
 *
 * The rule is deliberately narrow: a method that EXISTS in the
 * configured list but is INACTIVE is rejected — that is the
 * "inactive methods cannot be selected for new transactions"
 * guarantee. Unknown strings pass (legacy data and API clients
 * predate the list; no UI offers them). On EDIT, keeping the
 * order's existing method is always allowed (isNewSelection =
 * false) so deactivating a method never strands a historical
 * order.
 */
export function paymentMethodSelectionError(
   customConfig: unknown,
   method: string | null | undefined,
   opts: { isNewSelection: boolean },
): string | null {
   if (!opts.isNewSelection) return null;
   const name = typeof method === "string" ? method.trim() : "";
   if (!name) return null;
   const entry = resolvePaymentMethods(customConfig).find(
      (m) => m.name.toLowerCase() === name.toLowerCase(),
   );
   if (entry && !entry.active) {
      return `Payment method "${entry.name}" is inactive and cannot be used for new transactions.`;
   }
   return null;
}

/**
 * Settings-PUT validation for the paymentMethods config,
 * mirroring the other customConfig validators' contract.
 */
export function validatePaymentMethodsInConfig(
   customConfig: unknown,
): { ok: true } | { ok: false; message: string } {
   const cfg = asConfigObject(customConfig);
   const raw = cfg[PAYMENT_METHODS_KEY];
   if (raw === undefined || raw === null) return { ok: true };
   if (!Array.isArray(raw)) {
      return { ok: false, message: `${PAYMENT_METHODS_KEY} must be an array.` };
   }
   const seen = new Set<string>();
   for (const entry of raw) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
         return { ok: false, message: "Each payment method must be an object." };
      }
      const e = entry as Record<string, unknown>;
      const name = typeof e.name === "string" ? e.name.trim() : "";
      if (!name) {
         return { ok: false, message: "Each payment method needs a non-empty name." };
      }
      if (name.length > 50) {
         return { ok: false, message: `Payment method name "${name}" is too long (max 50).` };
      }
      const key = name.toLowerCase();
      if (seen.has(key)) {
         return { ok: false, message: `Duplicate payment method name "${name}".` };
      }
      seen.add(key);
      if (
         e.description !== undefined &&
         e.description !== null &&
         typeof e.description !== "string"
      ) {
         return { ok: false, message: `Description for "${name}" must be a string.` };
      }
      if (e.active !== undefined && typeof e.active !== "boolean") {
         return { ok: false, message: `Active flag for "${name}" must be a boolean.` };
      }
      if (
         e.requiresTransactionId !== undefined &&
         typeof e.requiresTransactionId !== "boolean"
      ) {
         return {
            ok: false,
            message: `Transaction ID flag for "${name}" must be a boolean.`,
         };
      }
   }
   return { ok: true };
}

/** The methods that used transaction IDs before the per-method flag existed. */
export const LEGACY_TXID_METHODS = ["bKash", "Nagad", "Rocket"];

/**
 * RP-7 (X1) — does this payment method use transaction IDs?
 *
 * Resolution order (backward compatible by construction):
 *   1. The method's own explicit `requiresTransactionId` flag in
 *      the configured list wins — a renamed wallet keeps its TxID
 *      behaviour, and a method named "bKash" can opt out.
 *   2. Otherwise the legacy name rule: bKash / Nagad / Rocket
 *      (case-insensitive). Configurations saved before the flag
 *      existed therefore behave exactly as they always have, and
 *      historical orders are unaffected — this only governs how
 *      NEW writes and forms treat a method.
 */
export function paymentMethodRequiresTxId(
   customConfig: unknown,
   method: string | null | undefined,
): boolean {
   const name = typeof method === "string" ? method.trim() : "";
   if (!name) return false;
   const entry = resolvePaymentMethods(customConfig).find(
      (m) => m.name.toLowerCase() === name.toLowerCase(),
   );
   if (entry && typeof entry.requiresTransactionId === "boolean") {
      return entry.requiresTransactionId;
   }
   return LEGACY_TXID_METHODS.some((m) => m.toLowerCase() === name.toLowerCase());
}
