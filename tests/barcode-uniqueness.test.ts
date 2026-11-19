import { describe, it, expect } from "vitest";
import {
   normalizeBarcode,
   findPayloadDuplicateBarcode,
   barcodeConflictMessage,
   findBarcodeConflict,
   assertBarcodeAvailable,
   BarcodeConflictError,
} from "@src/lib/barcodeUniqueness";

// Phase 4 (D6): barcode uniqueness is one namespace — non-deleted
// product barcodes + non-deleted variant barcodes of non-deleted
// products — because the scan lookup resolves both together.
// The stub below interprets exactly the where-shapes the lib uses.

interface StubProduct {
   id: string;
   productName: string;
   barcode: string | null;
   isDeleted: boolean;
}
interface StubVariant {
   id: string;
   variantName: string;
   barcode: string | null;
   isDeleted: boolean;
   product: StubProduct;
}

function makeDb(products: StubProduct[], variants: StubVariant[]) {
   return {
      product: {
         findFirst: async ({ where }: any) => {
            const hit = products.find(
               (p) =>
                  p.barcode === where.barcode &&
                  p.isDeleted === where.isDeleted &&
                  (!where.id?.not || p.id !== where.id.not),
            );
            return hit ? { id: hit.id, productName: hit.productName } : null;
         },
      },
      productVariant: {
         findFirst: async ({ where }: any) => {
            const hit = variants.find(
               (v) =>
                  v.barcode === where.barcode &&
                  v.isDeleted === where.isDeleted &&
                  v.product.isDeleted === where.product.isDeleted &&
                  (!where.id?.not || v.id !== where.id.not),
            );
            return hit
               ? {
                    id: hit.id,
                    variantName: hit.variantName,
                    product: {
                       id: hit.product.id,
                       productName: hit.product.productName,
                    },
                 }
               : null;
         },
      },
   };
}

const rice: StubProduct = {
   id: "p1",
   productName: "Rice 5kg",
   barcode: "8901001",
   isDeleted: false,
};
const oil: StubProduct = {
   id: "p2",
   productName: "Soybean Oil 1L",
   barcode: null,
   isDeleted: false,
};
const deletedSoap: StubProduct = {
   id: "p3",
   productName: "Soap (old)",
   barcode: "8901002",
   isDeleted: true,
};
const riceVariant: StubVariant = {
   id: "v1",
   variantName: "Rice 5kg — Miniket",
   barcode: "8902001",
   isDeleted: false,
   product: rice,
};

describe("normalizeBarcode", () => {
   it("trims and nulls blanks", () => {
      expect(normalizeBarcode(" 8901 ")).toBe("8901");
      expect(normalizeBarcode("")).toBeNull();
      expect(normalizeBarcode("   ")).toBeNull();
      expect(normalizeBarcode(null)).toBeNull();
      expect(normalizeBarcode(undefined)).toBeNull();
   });
});

describe("findPayloadDuplicateBarcode", () => {
   it("finds duplicates within one payload, ignoring blanks", () => {
      expect(findPayloadDuplicateBarcode(["111", null, "222", "111"])).toBe(
         "111",
      );
      expect(findPayloadDuplicateBarcode(["111", "", "222"])).toBeNull();
      expect(findPayloadDuplicateBarcode([])).toBeNull();
   });
});

describe("findBarcodeConflict", () => {
   const db = makeDb([rice, oil, deletedSoap], [riceVariant]);

   it("conflicts with another product's barcode", async () => {
      const c = await findBarcodeConflict(db, "8901001");
      expect(c?.kind).toBe("product");
      expect(c?.productName).toBe("Rice 5kg");
      expect(barcodeConflictMessage(c!)).toContain("Rice 5kg");
   });

   it("conflicts with a variant's barcode and names its product", async () => {
      const c = await findBarcodeConflict(db, "8902001");
      expect(c?.kind).toBe("variant");
      expect(c?.variantName).toBe("Rice 5kg — Miniket");
      expect(barcodeConflictMessage(c!)).toContain("Rice 5kg");
   });

   it("ignores barcodes of deleted products", async () => {
      expect(await findBarcodeConflict(db, "8901002")).toBeNull();
   });

   it("excludes the record being edited", async () => {
      expect(
         await findBarcodeConflict(db, "8901001", { excludeProductId: "p1" }),
      ).toBeNull();
      expect(
         await findBarcodeConflict(db, "8902001", { excludeVariantId: "v1" }),
      ).toBeNull();
   });

   it("free and blank codes never conflict", async () => {
      expect(await findBarcodeConflict(db, "9999999")).toBeNull();
      expect(await findBarcodeConflict(db, "")).toBeNull();
   });
});

describe("assertBarcodeAvailable", () => {
   const db = makeDb([rice], [riceVariant]);

   it("throws a 409-shaped BarcodeConflictError on conflict", async () => {
      await expect(assertBarcodeAvailable(db, "8902001")).rejects.toBeInstanceOf(
         BarcodeConflictError,
      );
      try {
         await assertBarcodeAvailable(db, "8902001");
      } catch (err: any) {
         expect(err.statusCode).toBe(409);
         expect(err.message).toContain("Rice 5kg");
      }
   });

   it("passes for free codes and blanks", async () => {
      await expect(assertBarcodeAvailable(db, "1234567")).resolves.toBeUndefined();
      await expect(assertBarcodeAvailable(db, null)).resolves.toBeUndefined();
   });
});
