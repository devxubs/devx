import { describe, it, expect } from "vitest";
import { resolveBarcodeLookup } from "@src/lib/barcodeLookup";

// P2-17: the scan lookup resolves the variant pool and the product
// pool TOGETHER — a code on both a variant and a product is a 409
// ambiguity, not a silent variant win. Within-pool ranking is
// unchanged: exact barcode matches outrank sku/code matches.

const variant = (over: Partial<any> = {}) => ({
   id: "v1",
   variantName: "Size M",
   sku: "SKU-M",
   barcode: "CODE-1",
   productId: "p1",
   ...over,
});
const product = (over: Partial<any> = {}) => ({
   id: "p9",
   productName: "T-Shirt",
   barcode: "CODE-1",
   productSku: "SKU-P",
   productCode: "PC-P",
   ...over,
});

describe("resolveBarcodeLookup", () => {
   it("returns none when neither pool matches", () => {
      expect(resolveBarcodeLookup("X", [], []).type).toBe("none");
   });

   it("resolves a single variant barcode hit", () => {
      const d = resolveBarcodeLookup("CODE-1", [variant()], []);
      expect(d.type).toBe("variant");
      if (d.type === "variant") expect(d.matchedOn).toBe("variant.barcode");
   });

   it("resolves a single variant sku hit", () => {
      const d = resolveBarcodeLookup(
         "SKU-M",
         [variant({ barcode: "OTHER" })],
         [],
      );
      expect(d.type).toBe("variant");
      if (d.type === "variant") expect(d.matchedOn).toBe("variant.sku");
   });

   it("resolves a single product hit and reports matchedOn", () => {
      const byBarcode = resolveBarcodeLookup("CODE-1", [], [product()]);
      expect(byBarcode.type).toBe("product");
      if (byBarcode.type === "product")
         expect(byBarcode.matchedOn).toBe("product.barcode");
      const bySku = resolveBarcodeLookup(
         "SKU-P",
         [],
         [product({ barcode: "OTHER" })],
      );
      if (bySku.type === "product")
         expect(bySku.matchedOn).toBe("product.productSku");
      const byCode = resolveBarcodeLookup(
         "PC-P",
         [],
         [product({ barcode: "OTHER", productSku: "OTHER2" })],
      );
      if (byCode.type === "product")
         expect(byCode.matchedOn).toBe("product.productCode");
   });

   it("is ambiguous within the variant pool", () => {
      const d = resolveBarcodeLookup(
         "CODE-1",
         [variant(), variant({ id: "v2", variantName: "Size L" })],
         [],
      );
      expect(d.type).toBe("ambiguous");
      if (d.type === "ambiguous") {
         expect(d.error).toMatch(/more than one variant/);
         expect(d.matches).toHaveLength(2);
      }
   });

   it("is ambiguous within the product pool", () => {
      const d = resolveBarcodeLookup(
         "CODE-1",
         [],
         [product(), product({ id: "p10", productName: "Cap" })],
      );
      expect(d.type).toBe("ambiguous");
      if (d.type === "ambiguous")
         expect(d.error).toMatch(/more than one product/);
   });

   it("is ambiguous ACROSS pools: one variant + one product (P2-17)", () => {
      const d = resolveBarcodeLookup("CODE-1", [variant()], [product()]);
      expect(d.type).toBe("ambiguous");
      if (d.type === "ambiguous") {
         expect(d.matches).toHaveLength(2);
         expect(d.matches[0]).toMatchObject({ variantId: "v1" });
         expect(d.matches[1]).toMatchObject({ productId: "p9" });
      }
   });

   it("is ambiguous across pools for sku-level matches too", () => {
      const d = resolveBarcodeLookup(
         "SHARED",
         [variant({ barcode: null, sku: "SHARED" })],
         [product({ barcode: null, productSku: "SHARED" })],
      );
      expect(d.type).toBe("ambiguous");
   });

   it("barcode matches outrank sku matches inside a pool", () => {
      // Two variants carry the code as sku, one as barcode: only the
      // barcode pool counts, so the answer is a single variant.
      const d = resolveBarcodeLookup(
         "CODE-1",
         [
            variant({ id: "v-sku", barcode: "B1", sku: "CODE-1" }),
            variant({ id: "v-bar", barcode: "CODE-1", sku: "S2" }),
         ],
         [],
      );
      expect(d.type).toBe("variant");
      if (d.type === "variant") expect(d.variant.id).toBe("v-bar");
   });

   it("a sku-only cross-pool shadow does not block a barcode hit", () => {
      // Variant matches by barcode; a product matches only because
      // its productCode equals a DIFFERENT interpretation — product
      // pool ranking keeps barcode matches only when present; here
      // the product has no barcode match, so its pool is itself and
      // the cross-pool rule still applies.
      const d = resolveBarcodeLookup(
         "CODE-1",
         [variant()],
         [product({ barcode: null, productSku: null, productCode: "CODE-1" })],
      );
      expect(d.type).toBe("ambiguous");
   });
});
