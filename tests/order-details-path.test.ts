import { describe, it, expect } from "vitest";
import { orderDetailsPath } from "../src/lib/utils";

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
