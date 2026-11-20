import { describe, it, expect } from "vitest";
import {
   effectiveProductThreshold,
   effectiveVariantThreshold,
   isProductLowStock,
   isVariantLowStock,
   lowStockSqlCondition,
} from "@src/lib/lowStock";

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
});
