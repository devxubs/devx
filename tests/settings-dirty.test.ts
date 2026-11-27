import { describe, expect, it } from "vitest";

import {
   isSettingsFormDirty,
   settingsValuesEqual,
} from "../src/lib/settingsDirty";

// RP-4: the Settings dirty-state comparison. The baseline is the
// last loaded/saved settings snapshot; the form is the live edit
// state. These cases mirror the owner's verification list:
// initial load clean, edit dirty, revert clean, cross-tab edits
// tracked (single form state), numeric inputs handing back
// strings for stored numbers.
describe("settingsValuesEqual / isSettingsFormDirty", () => {
   const baseline = {
      storeName: "DevX POS",
      defaultTaxRate: 5,
      customConfig: {
         termsText: "No returns",
         orderStatusOrder: ["PENDING", "CONFIRMED", "DELIVERED"],
         stockOutProductCanOrder: false,
      },
   };

   it("identical states are not dirty", () => {
      expect(isSettingsFormDirty(structuredClone(baseline), baseline)).toBe(false);
   });

   it("a missing baseline is never dirty (initial load / hydration)", () => {
      expect(isSettingsFormDirty(baseline, null)).toBe(false);
      expect(isSettingsFormDirty(null, baseline)).toBe(false);
      expect(isSettingsFormDirty({}, undefined)).toBe(false);
   });

   it("editing a text field is dirty; reverting it is clean again", () => {
      const form = { ...structuredClone(baseline), storeName: "New Name" };
      expect(isSettingsFormDirty(form, baseline)).toBe(true);
      form.storeName = "DevX POS";
      expect(isSettingsFormDirty(form, baseline)).toBe(false);
   });

   it("a numeric field edited to a string of the same number is not dirty", () => {
      const form = { ...structuredClone(baseline), defaultTaxRate: "5" };
      expect(isSettingsFormDirty(form, baseline)).toBe(false);
      form.defaultTaxRate = "7.5";
      expect(isSettingsFormDirty(form, baseline)).toBe(true);
   });

   it("a nested customConfig change is dirty", () => {
      const form = structuredClone(baseline);
      form.customConfig.termsText = "Changed terms";
      expect(isSettingsFormDirty(form, baseline)).toBe(true);
   });

   it("a boolean flip inside customConfig is dirty", () => {
      const form = structuredClone(baseline);
      form.customConfig.stockOutProductCanOrder = true;
      expect(isSettingsFormDirty(form, baseline)).toBe(true);
   });

   it("reordering an array setting is dirty (order is load-bearing)", () => {
      const form = structuredClone(baseline);
      form.customConfig.orderStatusOrder = ["CONFIRMED", "PENDING", "DELIVERED"];
      expect(isSettingsFormDirty(form, baseline)).toBe(true);
   });

   it("an added key is dirty; an undefined-valued key is not a change", () => {
      const withAdded = { ...structuredClone(baseline), newKey: "x" } as any;
      expect(isSettingsFormDirty(withAdded, baseline)).toBe(true);
      const withUndefined = { ...structuredClone(baseline), other: undefined } as any;
      expect(isSettingsFormDirty(withUndefined, baseline)).toBe(false);
      expect(settingsValuesEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true);
   });
});
