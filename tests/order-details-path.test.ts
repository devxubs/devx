import { describe, it, expect } from "vitest";
import { orderDetailsPath, normalizeOrderIdParam } from "../src/lib/utils";

// Regression (Final Pre-Production Verification 2026-11-25): legacy
// orders store orderId with a leading "#" ("#6002"). Interpolated raw
// into `/admin/order/${id}`, the "#" turned the id into a URL
// fragment — "View Details" (and every other details navigation)
// silently stayed on the list page and the details view never opened
// for those orders. The API resolves the encoded id fine
// (GET /api/orders/%236002 -> 200, matched on orderId).
describe("orderDetailsPath", () => {
   it("encodes a legacy '#'-prefixed orderId so it survives as a path segment", () => {
      expect(orderDetailsPath("#6002")).toBe("/admin/order/%236002");
   });

   it("leaves sequence ids untouched", () => {
      expect(orderDetailsPath("ORD_1")).toBe("/admin/order/ORD_1");
      expect(orderDetailsPath("INV-6002")).toBe("/admin/order/INV-6002");
   });

   it("leaves a cuid untouched", () => {
      expect(orderDetailsPath("cmwvnprcq001dzst2f7yaoqev")).toBe(
         "/admin/order/cmwvnprcq001dzst2f7yaoqev",
      );
   });
});

// The details page receives the route param STILL percent-encoded
// ("%236002") in this Next.js version. The API fetch must encode the
// id exactly once: decoding first makes "%236002" and "#6002" land on
// the same fetch URL (/api/orders/%236002 -> 200), while encoding the
// raw param again produces "%25236002" -> 404 "Order not found".
describe("normalizeOrderIdParam", () => {
   it("decodes a still-encoded legacy id", () => {
      expect(normalizeOrderIdParam("%236002")).toBe("#6002");
   });

   it("leaves an already-decoded legacy id unchanged", () => {
      expect(normalizeOrderIdParam("#6002")).toBe("#6002");
   });

   it("leaves plain ids unchanged", () => {
      expect(normalizeOrderIdParam("ORD_1")).toBe("ORD_1");
      expect(normalizeOrderIdParam("cmwvnprcq001dzst2f7yaoqev")).toBe(
         "cmwvnprcq001dzst2f7yaoqev",
      );
   });

   it("returns malformed encodings as-is instead of throwing", () => {
      expect(normalizeOrderIdParam("%ZZ")).toBe("%ZZ");
   });

   it("round-trips: encode(normalize(param)) is the path the API resolves", () => {
      expect(encodeURIComponent(normalizeOrderIdParam("%236002"))).toBe("%236002");
      expect(encodeURIComponent(normalizeOrderIdParam("#6002"))).toBe("%236002");
   });
});
