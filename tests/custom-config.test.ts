import { describe, it, expect } from "vitest";
import {
   DEAD_CUSTOM_CONFIG_KEYS,
   sanitizeCustomConfig,
} from "@src/lib/customConfig";

// P2-20: write-only customConfig keys are stripped on save; live
// keys (invoice renderer + expense category consumers) and unknown
// keys pass through untouched.

describe("sanitizeCustomConfig", () => {
   it("strips every audited dead key", () => {
      const input: Record<string, any> = {};
      for (const k of DEAD_CUSTOM_CONFIG_KEYS) input[k] = true;
      expect(sanitizeCustomConfig(input)).toEqual({});
   });

   it("keeps live keys with their values", () => {
      const input = {
         defaultExpenseCategory: "Store Rent",
         invoiceTemplateId: "thermal-80",
         accentColor: "#0F766E",
         termsText: "No refunds after 7 days",
         showSkuColumn: false,
         showSignatureBox: true,
         showCustomerOnReceipt: false,
         showCashierOnReceipt: true,
         showCourierOnReceipt: true,
         showTermsOnReceipt: false,
      };
      expect(sanitizeCustomConfig(input)).toEqual(input);
   });

   it("keeps unknown keys (forward-compatible)", () => {
      expect(
         sanitizeCustomConfig({ someFutureKey: 1, roundTotals: true }),
      ).toEqual({ someFutureKey: 1 });
   });

   it("passes non-object values through unchanged", () => {
      expect(sanitizeCustomConfig(null)).toBe(null);
      expect(sanitizeCustomConfig(undefined)).toBe(undefined);
      expect(sanitizeCustomConfig("x")).toBe("x");
      expect(sanitizeCustomConfig([1, 2])).toEqual([1, 2]);
   });

   it("does not mutate the input", () => {
      const input = { loyaltyRewardRate: 2, termsText: "t" };
      sanitizeCustomConfig(input);
      expect(input).toEqual({ loyaltyRewardRate: 2, termsText: "t" });
   });

   it("covers the removed Settings toggles", () => {
      // Spot-check the highest-risk keys by name so a future edit
      // cannot silently drop one from the dead list.
      for (const k of [
         "autoDeductStock",
         "roundTotals",
         "cashierCanDiscount",
         "managerCanAccessSettings",
         "dailySalesEmail",
         "compactTableDensity",
         "defaultOrderStatus",
      ]) {
         expect(DEAD_CUSTOM_CONFIG_KEYS).toContain(k);
      }
   });
});
