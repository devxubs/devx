import { describe, expect, it } from "vitest";
import {
   applyInvoiceTemplateSelection,
   findCustomInvoiceTemplate,
   newCustomInvoiceTemplateId,
   resolveCustomInvoiceTemplates,
   validateCustomInvoiceTemplatesInConfig,
} from "../src/lib/customInvoiceTemplates";

const custom = {
   id: "custom_abc123",
   name: "My Design",
   baseTemplateId: "modern-minimal",
   accentColor: "#BE123C",
   showBarcodeOnReceipt: false,
   termsText: "Custom terms.",
};

const cfg = { customInvoiceTemplates: [custom] };

describe("resolveCustomInvoiceTemplates", () => {
   it("returns [] for absent or malformed config", () => {
      expect(resolveCustomInvoiceTemplates(undefined)).toEqual([]);
      expect(resolveCustomInvoiceTemplates({})).toEqual([]);
      expect(resolveCustomInvoiceTemplates({ customInvoiceTemplates: "x" })).toEqual([]);
   });

   it("keeps well-formed entries and drops broken ones", () => {
      const list = resolveCustomInvoiceTemplates({
         customInvoiceTemplates: [
            custom,
            { id: "custom_bad", name: "Bad", baseTemplateId: "nope" },
            { name: "No id", baseTemplateId: "corporate" },
            { id: "custom_abc123", name: "Dupe", baseTemplateId: "corporate" },
         ],
      });
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe("My Design");
   });

   it("drops a non-hex accent and non-boolean visibility on read", () => {
      const list = resolveCustomInvoiceTemplates({
         customInvoiceTemplates: [
            { ...custom, accentColor: "red", showSkuColumn: "yes" },
         ],
      });
      expect(list[0].accentColor).toBeUndefined();
      expect(list[0].showSkuColumn).toBeUndefined();
   });
});

describe("findCustomInvoiceTemplate", () => {
   it("finds by id and returns null otherwise", () => {
      expect(findCustomInvoiceTemplate(cfg, "custom_abc123")?.name).toBe("My Design");
      expect(findCustomInvoiceTemplate(cfg, "classic-pro")).toBeNull();
      expect(findCustomInvoiceTemplate(cfg, undefined)).toBeNull();
   });
});

describe("applyInvoiceTemplateSelection", () => {
   it("passes built-in and unknown selections through unchanged", () => {
      const builtin = { templateId: "classic-pro", accentColor: "#111111" };
      expect(applyInvoiceTemplateSelection(builtin, cfg)).toBe(builtin);
      const unknown = { templateId: "whatever" };
      expect(applyInvoiceTemplateSelection(unknown, cfg)).toBe(unknown);
      const none = { accentColor: "#111111" };
      expect(applyInvoiceTemplateSelection(none, cfg)).toBe(none);
   });

   it("renders the base layout with the custom overrides applied", () => {
      const out = applyInvoiceTemplateSelection(
         {
            templateId: "custom_abc123",
            accentColor: "#0F766E",
            showBarcodeOnReceipt: true,
            showLogoOnReceipt: true,
            termsText: "Global terms.",
         },
         cfg,
      );
      expect(out.templateId).toBe("modern-minimal");
      expect(out.accentColor).toBe("#BE123C");
      expect(out.showBarcodeOnReceipt).toBe(false);
      expect(out.termsText).toBe("Custom terms.");
      // Fields the custom template does not set inherit the globals.
      expect(out.showLogoOnReceipt).toBe(true);
   });
});

describe("validateCustomInvoiceTemplatesInConfig", () => {
   it("accepts absent values and a well-formed list", () => {
      expect(validateCustomInvoiceTemplatesInConfig({})).toEqual({ ok: true });
      expect(validateCustomInvoiceTemplatesInConfig(cfg)).toEqual({ ok: true });
   });

   it("rejects a non-array, duplicate ids and built-in id collisions", () => {
      expect(validateCustomInvoiceTemplatesInConfig({ customInvoiceTemplates: {} }).ok).toBe(false);
      expect(
         validateCustomInvoiceTemplatesInConfig({
            customInvoiceTemplates: [custom, { ...custom, name: "Copy" }],
         }).ok,
      ).toBe(false);
      expect(
         validateCustomInvoiceTemplatesInConfig({
            customInvoiceTemplates: [{ ...custom, id: "classic-pro" }],
         }).ok,
      ).toBe(false);
   });

   it("rejects an unknown base template, a bad colour and non-boolean visibility", () => {
      expect(
         validateCustomInvoiceTemplatesInConfig({
            customInvoiceTemplates: [{ ...custom, baseTemplateId: "nope" }],
         }).ok,
      ).toBe(false);
      expect(
         validateCustomInvoiceTemplatesInConfig({
            customInvoiceTemplates: [{ ...custom, accentColor: "red" }],
         }).ok,
      ).toBe(false);
      expect(
         validateCustomInvoiceTemplatesInConfig({
            customInvoiceTemplates: [{ ...custom, showTermsOnReceipt: "yes" }],
         }).ok,
      ).toBe(false);
   });

   it("rejects an over-long name", () => {
      expect(
         validateCustomInvoiceTemplatesInConfig({
            customInvoiceTemplates: [{ ...custom, name: "x".repeat(61) }],
         }).ok,
      ).toBe(false);
   });
});

describe("newCustomInvoiceTemplateId", () => {
   it("is namespaced and unique across calls", () => {
      const a = newCustomInvoiceTemplateId();
      const b = newCustomInvoiceTemplateId();
      expect(a.startsWith("custom_")).toBe(true);
      expect(a).not.toBe(b);
   });
});
