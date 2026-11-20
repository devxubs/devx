import { describe, it, expect } from "vitest";
import {
   isCascadeDeletedVariant,
   selectCascadeDeletedVariantIds,
} from "@src/lib/binRestore";

// P0-2 (audit C-2): Bin product restore must un-flag exactly the
// variants that were cascade-deleted WITH the product. Product
// DELETE writes one shared `deletedAt` to the product and its
// then-live variants; that shared stamp is the linkage the
// selector matches on. Variants deleted individually at another
// time carry a different stamp and must stay deleted.
describe("selectCascadeDeletedVariantIds", () => {
   const productDeletedAt = new Date("2026-11-20T10:00:00.000Z");

   it("selects variants stamped with the product's delete timestamp", () => {
      const ids = selectCascadeDeletedVariantIds(productDeletedAt, [
         { id: "v1", isDeleted: true, deletedAt: new Date("2026-11-20T10:00:00.000Z") },
         { id: "v2", isDeleted: true, deletedAt: new Date("2026-11-20T10:00:00.000Z") },
      ]);
      expect(ids).toEqual(["v1", "v2"]);
   });

   it("leaves variants deleted individually at another time deleted", () => {
      const ids = selectCascadeDeletedVariantIds(productDeletedAt, [
         { id: "v1", isDeleted: true, deletedAt: new Date("2026-11-20T10:00:00.000Z") },
         { id: "v2", isDeleted: true, deletedAt: new Date("2026-11-18T09:30:00.000Z") },
         { id: "v3", isDeleted: true, deletedAt: new Date("2026-11-20T10:00:01.000Z") },
      ]);
      expect(ids).toEqual(["v1"]);
   });

   it("never selects live variants, even with a matching stamp value", () => {
      const ids = selectCascadeDeletedVariantIds(productDeletedAt, [
         { id: "v1", isDeleted: false, deletedAt: null },
         { id: "v2", isDeleted: false, deletedAt: new Date("2026-11-20T10:00:00.000Z") },
      ]);
      expect(ids).toEqual([]);
   });

   it("selects nothing when the product carries no delete stamp", () => {
      expect(
         selectCascadeDeletedVariantIds(null, [
            { id: "v1", isDeleted: true, deletedAt: new Date("2026-11-20T10:00:00.000Z") },
         ]),
      ).toEqual([]);
      expect(
         selectCascadeDeletedVariantIds(undefined, [
            { id: "v1", isDeleted: true, deletedAt: null },
         ]),
      ).toEqual([]);
   });

   it("matches timestamps across Date / ISO-string representations", () => {
      expect(
         isCascadeDeletedVariant(
            { id: "v1", isDeleted: true, deletedAt: "2026-11-20T10:00:00.000Z" },
            productDeletedAt,
         ),
      ).toBe(true);
      expect(
         isCascadeDeletedVariant(
            { id: "v1", isDeleted: true, deletedAt: null },
            productDeletedAt,
         ),
      ).toBe(false);
   });

   it("a product with no variants restores none", () => {
      expect(selectCascadeDeletedVariantIds(productDeletedAt, [])).toEqual([]);
   });
});
