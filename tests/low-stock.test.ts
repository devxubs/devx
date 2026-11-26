import { describe, it, expect } from "vitest";
import {
   effectiveProductThreshold,
   effectiveVariantThreshold,
   globalLowStockFallback,
   isProductLowStock,
   isVariantLowStock,
   lowStockSqlCondition,
} from "@src/lib/lowStock";
import { resolveLowStockThreshold } from "@src/lib/stock";

// P2-19: the canonical low-stock predicate is
// quantity <= (lowStockAlert || 10) for products — a stored 0 means
// "use the default", matching the Dashboard filter, the Stock
// workspace and the Reports raw SQL
// (quantity <= COALESCE(NULLIF(lowStockAlert, 0), 10)).

describe("effectiveProductThreshold", () => {
   it("passes through a stored positive threshold", () => {
      expect(effectiveProductThreshold(3)).toBe(3);
      expect(effectiveProductThreshold(25)).toBe(25);
   });

   it("treats a stored 0 as the default 10 (the || fallback)", () => {
      expect(effectiveProductThreshold(0)).toBe(10);
   });

   it("treats null/undefined as the default 10", () => {
      expect(effectiveProductThreshold(null)).toBe(10);
      expect(effectiveProductThreshold(undefined)).toBe(10);
   });
});

describe("isProductLowStock", () => {
   it("is low at or below the product's own threshold", () => {
      expect(isProductLowStock(5, 5)).toBe(true);
      expect(isProductLowStock(4, 5)).toBe(true);
      expect(isProductLowStock(6, 5)).toBe(false);
   });

   it("uses threshold 10 when the stored alert is 0", () => {
      expect(isProductLowStock(10, 0)).toBe(true);
      expect(isProductLowStock(11, 0)).toBe(false);
      // The old hard-coded list filter (quantity <= 10) agreed here
      // only by accident; with a per-product alert of 3 it did not.
      expect(isProductLowStock(8, 3)).toBe(false);
   });

   it("counts out-of-stock as low under the bare predicate", () => {
      expect(isProductLowStock(0, 10)).toBe(true);
   });
});

describe("variant thresholds (schema default 5)", () => {
   it("falls back to 5 for 0/null/undefined", () => {
      expect(effectiveVariantThreshold(0)).toBe(5);
      expect(effectiveVariantThreshold(null)).toBe(5);
      expect(effectiveVariantThreshold(undefined)).toBe(5);
      expect(effectiveVariantThreshold(2)).toBe(2);
   });

   it("isVariantLowStock compares against the variant threshold", () => {
      expect(isVariantLowStock(5, 5)).toBe(true);
      expect(isVariantLowStock(6, 5)).toBe(false);
      expect(isVariantLowStock(5, 0)).toBe(true);
      expect(isVariantLowStock(6, 0)).toBe(false);
   });
});

describe("lowStockSqlCondition", () => {
   it("mirrors the Reports products raw-SQL predicate", () => {
      expect(lowStockSqlCondition()).toBe(
         "quantity <= COALESCE(NULLIF(lowStockAlert, 0), 10)",
      );
   });

   it("honours explicit column names", () => {
      expect(lowStockSqlCondition("p.quantity", "p.lowStockAlert")).toBe(
         "p.quantity <= COALESCE(NULLIF(p.lowStockAlert, 0), 10)",
      );
   });

   it("RP-2 (D2): substitutes the configured global fallback", () => {
      expect(lowStockSqlCondition("quantity", "lowStockAlert", 25)).toBe(
         "quantity <= COALESCE(NULLIF(lowStockAlert, 0), 25)",
      );
   });

   it("RP-2 (D2): a non-positive configured fallback stays 10", () => {
      expect(lowStockSqlCondition("quantity", "lowStockAlert", 0)).toBe(
         "quantity <= COALESCE(NULLIF(lowStockAlert, 0), 10)",
      );
      expect(lowStockSqlCondition("quantity", "lowStockAlert", null)).toBe(
         "quantity <= COALESCE(NULLIF(lowStockAlert, 0), 10)",
      );
   });
});

// RP-2 (D2): StoreSetting.defaultLowStockAlert becomes the
// store-wide fallback between a product's own threshold and the
// built-in 10 — in BOTH threshold systems: the listing predicate
// (|| semantics, this file's helpers) and the stock-engine
// notification resolution (?? semantics, lib/stock).
describe("RP-2 (D2) global low-stock fallback", () => {
   it("globalLowStockFallback sanitizes the configured value", () => {
      expect(globalLowStockFallback(25)).toBe(25);
      expect(globalLowStockFallback(12.9)).toBe(12);
      expect(globalLowStockFallback(0)).toBe(10);
      expect(globalLowStockFallback(-3)).toBe(10);
      expect(globalLowStockFallback(null)).toBe(10);
      expect(globalLowStockFallback(undefined)).toBe(10);
   });

   it("listing predicate: product threshold still wins over the global", () => {
      expect(effectiveProductThreshold(7, 25)).toBe(7);
      expect(isProductLowStock(7, 7, 25)).toBe(true);
      expect(isProductLowStock(8, 7, 25)).toBe(false);
   });

   it("listing predicate: global applies when the product has none", () => {
      expect(effectiveProductThreshold(null, 25)).toBe(25);
      expect(effectiveProductThreshold(0, 25)).toBe(25);
      expect(isProductLowStock(20, null, 25)).toBe(true);
      expect(isProductLowStock(30, null, 25)).toBe(false);
   });

   it("listing predicate: no global configured keeps the default 10", () => {
      expect(effectiveProductThreshold(null, undefined)).toBe(10);
      expect(effectiveProductThreshold(null, null)).toBe(10);
      expect(isProductLowStock(10, null)).toBe(true);
      expect(isProductLowStock(11, null)).toBe(false);
   });

   it("notification resolution: product ?? global ?? 10, in that order", () => {
      // Case 1 — the product's own threshold always wins.
      expect(resolveLowStockThreshold(5, 25)).toBe(5);
      // Case 2 — no product threshold: the configured global applies.
      expect(resolveLowStockThreshold(null, 25)).toBe(25);
      expect(resolveLowStockThreshold(undefined, 25)).toBe(25);
      // Case 3 — neither configured: the built-in default 10.
      expect(resolveLowStockThreshold(null, null)).toBe(10);
      expect(resolveLowStockThreshold(undefined, undefined)).toBe(10);
      // P2-19 doctrine: a stored 0 means "no own threshold"
      // (the column is NOT NULL; 0 is its unset marker), so the
      // global applies — without this, the global fallback
      // could never be reached in the notification path.
      expect(resolveLowStockThreshold(0, 25)).toBe(25);
      expect(resolveLowStockThreshold(0, null)).toBe(10);
   });
});
