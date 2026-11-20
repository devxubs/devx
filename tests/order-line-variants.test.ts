import { describe, it, expect } from "vitest";
import { mergeLineVariants } from "@src/lib/orderLineVariants";

// P2-2: Order Publish EDIT hydration — each hydrated line gains its
// product's LIVE variants so the existing variant selector renders;
// everything else on the line is untouched.

const v = (id: string) => ({ id, variantName: `Variant ${id}` });

describe("mergeLineVariants", () => {
   it("attaches the product's live variants to each line", () => {
      const lines = [
         { productId: "p1", variantId: "v1", quantity: 2 },
         { productId: "p2", variantId: null, quantity: 1 },
      ];
      const out = mergeLineVariants(lines, {
         p1: [v("v1"), v("v2")],
         p2: [v("v9")],
      });
      expect(out[0].variants).toEqual([v("v1"), v("v2")]);
      expect(out[1].variants).toEqual([v("v9")]);
   });

   it("preserves the line's stored variant linkage and other fields", () => {
      const lines = [{ productId: "p1", variantId: "v1", variantName: "Size M", quantity: 3 }];
      const out = mergeLineVariants(lines, { p1: [v("v1"), v("v2")] });
      expect(out[0].variantId).toBe("v1");
      expect(out[0].variantName).toBe("Size M");
      expect(out[0].quantity).toBe(3);
   });

   it("gives an empty list when the product has no live variants", () => {
      const out = mergeLineVariants([{ productId: "p1" }], {});
      expect(out[0].variants).toEqual([]);
   });

   it("gives an empty list for a line without a productId", () => {
      const out = mergeLineVariants([{ productId: "" }, { name: "x" }], {
         p1: [v("v1")],
      });
      expect(out[0].variants).toEqual([]);
      expect(out[1].variants).toEqual([]);
   });

   it("two lines of the same product share its variant list", () => {
      const lines = [
         { productId: "p1", variantId: "v1" },
         { productId: "p1", variantId: "v2" },
      ];
      const out = mergeLineVariants(lines, { p1: [v("v1"), v("v2")] });
      expect(out[0].variants).toHaveLength(2);
      expect(out[1].variants).toHaveLength(2);
   });

   it("does not mutate the input lines", () => {
      const lines = [{ productId: "p1", variants: [] as any[] }];
      mergeLineVariants(lines, { p1: [v("v1")] });
      expect(lines[0].variants).toEqual([]);
   });
});
