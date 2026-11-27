import { INVOICE_TEMPLATES } from "@src/components/InvoiceTemplates/templates";
import type { InvoiceCustomization } from "@src/components/InvoiceTemplates/types";

/**
 * Cleanup Phase 2 — Custom Invoice Templates.
 *
 * A custom template is a named design stored in
 * `customConfig.customInvoiceTemplates`. It does NOT define a
 * new layout: it points at one of the 18 built-in layouts
 * (`baseTemplateId`) and carries presentation overrides (accent
 * colour, invoice header/footer, terms text, and the eight
 * receipt-visibility toggles). The existing selection key
 * `customConfig.invoiceTemplateId` may hold a custom template's
 * id exactly like a built-in id; the print path resolves it
 * through `applyInvoiceTemplateSelection`, so the renderer and
 * the built-in templates are never modified and existing
 * invoices render exactly as before.
 *
 * Honest scope: the renderer has no per-template font setting
 * (its font stacks follow the template design and the invoice
 * language), so custom templates do not offer font choices —
 * the builder UI says so instead of storing a value nothing
 * reads.
 *
 * Overrides are partial: a field that is absent (undefined)
 * inherits the store's global invoice setting at render time.
 * Templates created through the builder store their fields
 * explicitly, so a saved design is stable even if the global
 * settings later change.
 */

export const CUSTOM_INVOICE_TEMPLATES_KEY = "customInvoiceTemplates";
export const INVOICE_TEMPLATE_ID_KEY = "invoiceTemplateId";

export const CUSTOM_TEMPLATE_VISIBILITY_KEYS = [
   "showLogoOnReceipt",
   "showBarcodeOnReceipt",
   "showCustomerOnReceipt",
   "showCashierOnReceipt",
   "showCourierOnReceipt",
   "showSkuColumn",
   "showSignatureBox",
   "showTermsOnReceipt",
] as const;

export type CustomTemplateVisibilityKey =
   (typeof CUSTOM_TEMPLATE_VISIBILITY_KEYS)[number];

export interface CustomInvoiceTemplate {
   id: string;
   name: string;
   baseTemplateId: string;
   accentColor?: string;
   invoiceHeader?: string;
   invoiceFooter?: string;
   termsText?: string;
   showLogoOnReceipt?: boolean;
   showBarcodeOnReceipt?: boolean;
   showCustomerOnReceipt?: boolean;
   showCashierOnReceipt?: boolean;
   showCourierOnReceipt?: boolean;
   showSkuColumn?: boolean;
   showSignatureBox?: boolean;
   showTermsOnReceipt?: boolean;
}

const MAX_CUSTOM_TEMPLATES = 50;
const MAX_NAME_LENGTH = 60;
const MAX_TEXT_LENGTH = 500;
const MAX_TERMS_LENGTH = 2000;
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const BUILT_IN_IDS = new Set(INVOICE_TEMPLATES.map((t) => t.id));

export function isBuiltInTemplateId(id: unknown): boolean {
   return typeof id === "string" && BUILT_IN_IDS.has(id);
}

function asConfigObject(customConfig: unknown): Record<string, unknown> {
   return customConfig &&
      typeof customConfig === "object" &&
      !Array.isArray(customConfig)
      ? (customConfig as Record<string, unknown>)
      : {};
}

function sanitizeEntry(raw: unknown): CustomInvoiceTemplate | null {
   if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
   const e = raw as Record<string, unknown>;
   if (typeof e.id !== "string" || e.id.trim() === "") return null;
   if (typeof e.name !== "string" || e.name.trim() === "") return null;
   if (!isBuiltInTemplateId(e.baseTemplateId)) return null;
   const out: CustomInvoiceTemplate = {
      id: e.id,
      name: e.name,
      baseTemplateId: e.baseTemplateId as string,
   };
   if (typeof e.accentColor === "string" && HEX_COLOR.test(e.accentColor)) {
      out.accentColor = e.accentColor;
   }
   for (const key of ["invoiceHeader", "invoiceFooter", "termsText"] as const) {
      if (typeof e[key] === "string") out[key] = e[key] as string;
   }
   for (const key of CUSTOM_TEMPLATE_VISIBILITY_KEYS) {
      if (typeof e[key] === "boolean") out[key] = e[key] as boolean;
   }
   return out;
}

/** Sanitized read of the stored custom template list. */
export function resolveCustomInvoiceTemplates(
   customConfig: unknown,
): CustomInvoiceTemplate[] {
   const raw = asConfigObject(customConfig)[CUSTOM_INVOICE_TEMPLATES_KEY];
   if (!Array.isArray(raw)) return [];
   const seen = new Set<string>();
   const out: CustomInvoiceTemplate[] = [];
   for (const entry of raw) {
      const clean = sanitizeEntry(entry);
      if (clean && !seen.has(clean.id)) {
         seen.add(clean.id);
         out.push(clean);
      }
   }
   return out;
}

export function findCustomInvoiceTemplate(
   customConfig: unknown,
   id: unknown,
): CustomInvoiceTemplate | null {
   if (typeof id !== "string") return null;
   return (
      resolveCustomInvoiceTemplates(customConfig).find((t) => t.id === id) ??
      null
   );
}

/** Ids for new custom templates: unique, and namespaced so they
 * can never collide with a built-in template id. */
export function newCustomInvoiceTemplateId(): string {
   const rand = Math.random().toString(36).slice(2, 8);
   return `custom_${Date.now().toString(36)}_${rand}`;
}

/**
 * Resolve a renderer customization through the selected
 * template. When the selected id is a custom template, the
 * returned customization renders its BASE layout with the
 * custom template's present fields overriding the globals.
 * Built-in ids, unknown ids and absent selections pass through
 * unchanged — existing rendering is bit-for-bit preserved.
 */
export function applyInvoiceTemplateSelection<T extends InvoiceCustomization>(
   customization: T,
   customConfig: unknown,
): T {
   const selectedId = customization.templateId;
   const custom = findCustomInvoiceTemplate(customConfig, selectedId);
   if (!custom) return customization;
   const next: Record<string, unknown> = {
      ...(customization as Record<string, unknown>),
      templateId: custom.baseTemplateId,
   };
   if (custom.accentColor !== undefined) next.accentColor = custom.accentColor;
   if (custom.invoiceHeader !== undefined) next.invoiceHeader = custom.invoiceHeader;
   if (custom.invoiceFooter !== undefined) next.invoiceFooter = custom.invoiceFooter;
   if (custom.termsText !== undefined) next.termsText = custom.termsText;
   for (const key of CUSTOM_TEMPLATE_VISIBILITY_KEYS) {
      if (custom[key] !== undefined) next[key] = custom[key];
   }
   return next as T;
}

/**
 * Server-side validation for the settings PUT, mirroring
 * validatePaymentMethodsInConfig: a present value must be a
 * well-formed list; an absent value is always fine.
 */
export function validateCustomInvoiceTemplatesInConfig(
   customConfig: unknown,
): { ok: true } | { ok: false; message: string } {
   const raw = asConfigObject(customConfig)[CUSTOM_INVOICE_TEMPLATES_KEY];
   if (raw === undefined || raw === null) return { ok: true };
   if (!Array.isArray(raw)) {
      return {
         ok: false,
         message: `${CUSTOM_INVOICE_TEMPLATES_KEY} must be an array.`,
      };
   }
   if (raw.length > MAX_CUSTOM_TEMPLATES) {
      return {
         ok: false,
         message: `At most ${MAX_CUSTOM_TEMPLATES} custom invoice templates are supported.`,
      };
   }
   const seen = new Set<string>();
   for (const entry of raw) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
         return { ok: false, message: "Each custom invoice template must be an object." };
      }
      const e = entry as Record<string, unknown>;
      if (typeof e.id !== "string" || e.id.trim() === "") {
         return { ok: false, message: "Each custom invoice template needs a non-empty id." };
      }
      if (BUILT_IN_IDS.has(e.id)) {
         return {
            ok: false,
            message: `Custom invoice template id "${e.id}" conflicts with a built-in template.`,
         };
      }
      if (seen.has(e.id)) {
         return { ok: false, message: `Duplicate custom invoice template id "${e.id}".` };
      }
      seen.add(e.id);
      if (typeof e.name !== "string" || e.name.trim() === "") {
         return { ok: false, message: "Each custom invoice template needs a non-empty name." };
      }
      if (e.name.length > MAX_NAME_LENGTH) {
         return {
            ok: false,
            message: `Custom invoice template name "${e.name}" is too long (max ${MAX_NAME_LENGTH}).`,
         };
      }
      if (!isBuiltInTemplateId(e.baseTemplateId)) {
         return {
            ok: false,
            message: `Custom invoice template "${e.name}" must be based on a built-in template.`,
         };
      }
      if (
         e.accentColor !== undefined &&
         e.accentColor !== null &&
         (typeof e.accentColor !== "string" || !HEX_COLOR.test(e.accentColor))
      ) {
         return {
            ok: false,
            message: `Custom invoice template "${e.name}" has an invalid accent colour.`,
         };
      }
      for (const key of ["invoiceHeader", "invoiceFooter"] as const) {
         const v = e[key];
         if (v !== undefined && v !== null && (typeof v !== "string" || v.length > MAX_TEXT_LENGTH)) {
            return {
               ok: false,
               message: `Custom invoice template "${e.name}" has an invalid ${key} (max ${MAX_TEXT_LENGTH} characters).`,
            };
         }
      }
      if (
         e.termsText !== undefined &&
         e.termsText !== null &&
         (typeof e.termsText !== "string" || e.termsText.length > MAX_TERMS_LENGTH)
      ) {
         return {
            ok: false,
            message: `Custom invoice template "${e.name}" has an invalid termsText (max ${MAX_TERMS_LENGTH} characters).`,
         };
      }
      for (const key of CUSTOM_TEMPLATE_VISIBILITY_KEYS) {
         const v = e[key];
         if (v !== undefined && v !== null && typeof v !== "boolean") {
            return {
               ok: false,
               message: `Custom invoice template "${e.name}" field ${key} must be true or false.`,
            };
         }
      }
   }
   return { ok: true };
}
