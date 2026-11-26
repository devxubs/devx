import { describe, it, expect } from "vitest";
import { findCourierShortages } from "@src/lib/stock";

// Phase 1E: the courier-submission availability computation.
// Required quantities are aggregated per (productId, variantId)
// pool and compared against the pool's current quantity PLUS the
// units the order itself already holds (its deducted lines).

const product = (over: Record<string, unknown> = {}) => ({
   id: "p1",
   productName: "Rice",
   quantity: 10,
   trackInventory: true,
   allowNegativeStock: false,
   variants: [] as Array<{ id: string; quantity: number }>,
   ...over,
});

const line = (quantity: number, over: Record<string, unknown> = {}) => ({
   productId: "p1",
   variantId: null as string | null,
   quantity,
   ...over,
});

describe("findCourierShortages", () => {
   it("passes when the pool covers the requirement", () => {
      expect(findCourierShortages([product()], [line(4)])).toEqual([]);
   });

   it("flags a shortage with required and available", () => {
      const shortages = findCourierShortages([product({ quantity: 2 })], [line(5)]);
      expect(shortages).toEqual([
         {
            productId: "p1",
            variantId: null,
            productName: "Rice",
            required: 5,
            available: 2,
         },
      ]);
   });

   it("aggregates duplicate lines in the same pool before comparing", () => {
      expect(
         findCourierShortages([product({ quantity: 5 })], [line(3), line(3)]),
      ).toHaveLength(1);
      expect(
         findCourierShortages([product({ quantity: 6 })], [line(3), line(3)]),
      ).toEqual([]);
   });

   it("checks variant lines against the variant pool, not the product pool", () => {
      const p = product({
         quantity: 100,
         variants: [
            { id: "v1", quantity: 1 },
            { id: "v2", quantity: 9 },
         ],
      });
      expect(findCourierShortages([p], [line(2, { variantId: "v1" })])).toHaveLength(1);
      expect(findCourierShortages([p], [line(2, { variantId: "v2" })])).toEqual([]);
   });

   it("a missing variant pool counts as zero available", () => {
      const p = product({ quantity: 100, variants: [] });
      const shortages = findCourierShortages([p], [line(1, { variantId: "gone" })]);
      expect(shortages).toHaveLength(1);
      expect(shortages[0].available).toBe(0);
   });

   it("the order's own held units count toward its requirement", () => {
      // Stock was deducted at confirmation: pool is 0, but the
      // order itself holds the 3 units it needs to ship.
      const p = product({ quantity: 0 });
      expect(findCourierShortages([p], [line(3)], [line(3)])).toEqual([]);
      // Held fewer than required (edited up after deduction).
      const shortages = findCourierShortages([p], [line(5)], [line(3)]);
      expect(shortages).toHaveLength(1);
      expect(shortages[0].available).toBe(3);
   });

   it("skips untracked and negative-allowed products entirely", () => {
      expect(
         findCourierShortages([product({ quantity: 0, trackInventory: false })], [line(5)]),
      ).toEqual([]);
      expect(
         findCourierShortages(
            [product({ quantity: 0, allowNegativeStock: true })],
            [line(5)],
         ),
      ).toEqual([]);
   });

   it("skips lines whose product no longer exists and custom lines", () => {
      expect(
         findCourierShortages([], [line(5), { productId: null, variantId: null, quantity: 5 }]),
      ).toEqual([]);
   });

   it("reports every short pool, not just the first", () => {
      const p2 = product({ id: "p2", productName: "Oil", quantity: 0 });
      const shortages = findCourierShortages(
         [product({ quantity: 1 }), p2],
         [line(3), { productId: "p2", variantId: null, quantity: 2 }],
      );
      expect(shortages.map((s) => s.productId).sort()).toEqual(["p1", "p2"]);
   });
});
