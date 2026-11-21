import { describe, it, expect } from "vitest";
import {
   planOrderStockDiffs,
   variantAssignmentError,
} from "@src/lib/orderLineVariants";

// O6: variant change in Order Edit.
//  - variantAssignmentError is the PUT /api/orders/[id] Step 3b
//    decision: a requested variant must exist, belong to the
//    line's product, and — only when the line is new or its
//    variant actually changed — be neither deleted nor non-ACTIVE.
//  - planOrderStockDiffs is the PUT Step 4 netting: computed from
//    the complete before/after item sets per product+variant, so
//    a variant change restores the OLD variant and deducts the
//    NEW one exactly once, regardless of whether the caller kept
//    the line (Quick Edit) or recreated it (Publish edit).

const variant = (over: Record<string, unknown> = {}) => ({
   productId: "p1",
   variantName: "Size M",
   isDeleted: false,
   status: "ACTIVE",
   ...over,
});

describe("variantAssignmentError", () => {
   const base = {
      variantId: "v1",
      lineName: "T-Shirt",
      lineProductId: "p1",
      variantChanged: true,
   };

   it("allows an active variant of the line's own product", () => {
      expect(variantAssignmentError({ ...base, variant: variant() })).toBeNull();
   });

   it("rejects a variant that does not exist", () => {
      const err = variantAssignmentError({ ...base, variant: undefined });
      expect(err?.error).toBe("Invalid variant");
      expect(err?.message).toContain("does not belong to product 'T-Shirt'");
   });

   it("rejects a variant belonging to a different product", () => {
      const err = variantAssignmentError({
         ...base,
         variant: variant({ productId: "p2" }),
      });
      expect(err?.error).toBe("Invalid variant");
   });

   it("rejects a soft-deleted variant on a changed line", () => {
      const err = variantAssignmentError({
         ...base,
         variant: variant({ isDeleted: true }),
      });
      expect(err?.error).toBe("Variant unavailable");
      expect(err?.message).toContain("archived/deleted");
   });

   it("rejects a non-ACTIVE variant on a changed line (O6)", () => {
      for (const status of ["INACTIVE", "DRAFT"]) {
         const err = variantAssignmentError({
            ...base,
            variant: variant({ status }),
         });
         expect(err?.error).toBe("Variant unavailable");
         expect(err?.message).toContain("not active");
      }
   });

   it("allows a deleted variant on an UNCHANGED line (unrelated edit)", () => {
      expect(
         variantAssignmentError({
            ...base,
            variantChanged: false,
            variant: variant({ isDeleted: true }),
         }),
      ).toBeNull();
   });

   it("allows a deactivated variant on an UNCHANGED line (unrelated edit)", () => {
      expect(
         variantAssignmentError({
            ...base,
            variantChanged: false,
            variant: variant({ status: "INACTIVE" }),
         }),
      ).toBeNull();
   });

   it("treats a variant without a status field as active (legacy rows)", () => {
      const v = variant();
      delete (v as any).status;
      expect(variantAssignmentError({ ...base, variant: v })).toBeNull();
   });
});

describe("planOrderStockDiffs", () => {
   const line = (
      productId: string,
      variantId: string | null,
      quantity: number,
   ) => ({ productId, variantId, quantity });

   it("variant change A→B: restores A, deducts B, exactly once each", () => {
      const diffs = planOrderStockDiffs(
         [line("p1", "vA", 2)],
         [line("p1", "vB", 2)],
         true,
         true,
      );
      expect(diffs).toEqual([
         { productId: "p1", variantId: "vA", diff: -2 },
         { productId: "p1", variantId: "vB", diff: 2 },
      ]);
   });

   it("unchanged variant line with a quantity increase nets to the delta only", () => {
      const diffs = planOrderStockDiffs(
         [line("p1", "vA", 2)],
         [line("p1", "vA", 5)],
         true,
         true,
      );
      expect(diffs).toEqual([{ productId: "p1", variantId: "vA", diff: 3 }]);
   });

   it("identical before/after sets net to zero (no stock movement)", () => {
      const diffs = planOrderStockDiffs(
         [line("p1", "vA", 2), line("p2", null, 1)],
         [line("p1", "vA", 2), line("p2", null, 1)],
         true,
         true,
      );
      expect(diffs.every((d) => d.diff === 0)).toBe(true);
   });

   it("removed line restores its variant; added line deducts its variant", () => {
      const diffs = planOrderStockDiffs(
         [line("p1", "vA", 3)],
         [line("p1", "vB", 1), line("p3", null, 4)],
         true,
         true,
      );
      expect(diffs).toContainEqual({ productId: "p1", variantId: "vA", diff: -3 });
      expect(diffs).toContainEqual({ productId: "p1", variantId: "vB", diff: 1 });
      expect(diffs).toContainEqual({ productId: "p3", variantId: null, diff: 4 });
   });

   it("two lines naming the same variant aggregate into one diff", () => {
      const diffs = planOrderStockDiffs(
         [],
         [line("p1", "vA", 2), line("p1", "vA", 3), line("p1", "vB", 1)],
         true,
         true,
      );
      expect(diffs).toEqual([
         { productId: "p1", variantId: "vA", diff: 5 },
         { productId: "p1", variantId: "vB", diff: 1 },
      ]);
   });

   it("variant-less lines net against the product pool only", () => {
      const diffs = planOrderStockDiffs(
         [line("p1", null, 4)],
         [line("p1", null, 1)],
         true,
         true,
      );
      expect(diffs).toEqual([{ productId: "p1", variantId: null, diff: -3 }]);
   });

   it("terminal order that held and holds no stock plans no diffs", () => {
      const diffs = planOrderStockDiffs(
         [line("p1", "vA", 2)],
         [line("p1", "vB", 2)],
         false,
         false,
      );
      expect(diffs).toEqual([]);
   });

   it("leaving a terminal status re-deducts the NEW variant only", () => {
      const diffs = planOrderStockDiffs(
         [line("p1", "vA", 2)],
         [line("p1", "vB", 2)],
         false,
         true,
      );
      expect(diffs).toEqual([{ productId: "p1", variantId: "vB", diff: 2 }]);
   });

   it("entering a terminal status restores the OLD variant only", () => {
      const diffs = planOrderStockDiffs(
         [line("p1", "vA", 2)],
         [line("p1", "vB", 2)],
         true,
         false,
      );
      expect(diffs).toEqual([{ productId: "p1", variantId: "vA", diff: -2 }]);
   });

   it("lines without a productId never plan diffs", () => {
      const diffs = planOrderStockDiffs(
         [line(null as any, "vA", 2)],
         [line(null as any, "vB", 2)],
         true,
         true,
      );
      expect(diffs).toEqual([]);
   });
});
