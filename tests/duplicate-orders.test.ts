import { describe, it, expect } from "vitest";
import {
   arePossibleDuplicates,
   findDuplicateMatches,
   normalizeCustomerPhone,
   orderItemSignature,
   dhakaDayKey,
   type DuplicateOrderInput,
} from "@src/lib/duplicateOrders";

// O8: the exact duplicate rule — same normalised phone + same item
// signature + same grand total + same Asia/Dhaka calendar day, both
// orders valid (not CANCELLED/FAILED, not soft-deleted). Same
// customer alone must never flag.
const base: DuplicateOrderInput = {
   id: "order-1",
   customId: "ORD_1",
   customerPhone: "01712345678",
   total: 1250,
   // 2026-11-21 10:00 in Dhaka (UTC+6) = 04:00Z.
   createdAt: "2026-11-21T04:00:00.000Z",
   status: "PENDING",
   isDeleted: false,
   items: [
      { productId: "prod-a", variantId: "var-1", quantity: 2 },
      { productId: "prod-b", variantId: null, quantity: 1 },
   ],
};

const twin = (overrides: Partial<DuplicateOrderInput> = {}): DuplicateOrderInput => ({
   ...base,
   id: "order-2",
   customId: "ORD_2",
   // Same lines, deliberately reversed: signature is order-insensitive.
   items: [
      { productId: "prod-b", variantId: null, quantity: 1 },
      { productId: "prod-a", variantId: "var-1", quantity: 2 },
   ],
   ...overrides,
});

describe("arePossibleDuplicates", () => {
   it("flags an exact twin (all dimensions match, lines reordered)", () => {
      expect(arePossibleDuplicates(base, twin())).toBe(true);
      expect(arePossibleDuplicates(twin(), base)).toBe(true);
   });

   it("matches phone numbers across +880 / spacing / dash formats", () => {
      expect(
         arePossibleDuplicates(base, twin({ customerPhone: "+880 1712-345678" })),
      ).toBe(true);
   });

   it("does not flag a different phone", () => {
      expect(
         arePossibleDuplicates(base, twin({ customerPhone: "01812345678" })),
      ).toBe(false);
   });

   it("does not flag when either phone is empty/missing", () => {
      expect(arePossibleDuplicates(base, twin({ customerPhone: "" }))).toBe(false);
      expect(arePossibleDuplicates(base, twin({ customerPhone: null }))).toBe(false);
   });

   it("does not flag different items (product, variant, or quantity)", () => {
      expect(
         arePossibleDuplicates(
            base,
            twin({
               items: [{ productId: "prod-c", variantId: null, quantity: 3 }],
            }),
         ),
      ).toBe(false);
      expect(
         arePossibleDuplicates(
            base,
            twin({
               items: [
                  { productId: "prod-a", variantId: "var-2", quantity: 2 },
                  { productId: "prod-b", variantId: null, quantity: 1 },
               ],
            }),
         ),
      ).toBe(false);
      expect(
         arePossibleDuplicates(
            base,
            twin({
               items: [
                  { productId: "prod-a", variantId: "var-1", quantity: 3 },
                  { productId: "prod-b", variantId: null, quantity: 1 },
               ],
            }),
         ),
      ).toBe(false);
   });

   it("does not flag a different grand total", () => {
      expect(arePossibleDuplicates(base, twin({ total: 1251 }))).toBe(false);
      expect(arePossibleDuplicates(base, twin({ total: "1249.99" }))).toBe(false);
   });

   it("does not flag orders created on different Dhaka calendar days", () => {
      // 2026-11-22 01:00 Dhaka = 2026-11-21T19:00Z — next Dhaka day.
      expect(
         arePossibleDuplicates(base, twin({ createdAt: "2026-11-21T19:00:00.000Z" })),
      ).toBe(false);
   });

   it("uses the Dhaka day, not the UTC day", () => {
      // 2026-11-21 23:30 Dhaka = 17:30Z and 2026-11-22 00:30 Dhaka =
      // 18:30Z share a UTC day but are different Dhaka days.
      const late = { ...base, createdAt: "2026-11-21T17:30:00.000Z" };
      const earlyNext = twin({ createdAt: "2026-11-21T18:30:00.000Z" });
      expect(arePossibleDuplicates(late, earlyNext)).toBe(false);
      // 01:00 Dhaka (19:00Z prev UTC day) and 23:00 Dhaka (17:00Z)
      // are the SAME Dhaka day across a UTC midnight.
      const dhakaMorning = { ...base, createdAt: "2026-11-20T19:00:00.000Z" };
      const dhakaNight = twin({ createdAt: "2026-11-21T17:00:00.000Z" });
      expect(arePossibleDuplicates(dhakaMorning, dhakaNight)).toBe(true);
   });

   it("excludes CANCELLED and FAILED orders on either side", () => {
      expect(arePossibleDuplicates(base, twin({ status: "CANCELLED" }))).toBe(false);
      expect(arePossibleDuplicates(base, twin({ status: "FAILED" }))).toBe(false);
      expect(arePossibleDuplicates({ ...base, status: "CANCELLED" }, twin())).toBe(false);
   });

   it("excludes soft-deleted orders", () => {
      expect(arePossibleDuplicates(base, twin({ isDeleted: true }))).toBe(false);
   });

   it("does not flag same-customer-only orders (different items/total)", () => {
      const repeatCustomerOrder = twin({
         total: 500,
         items: [{ productId: "prod-z", variantId: null, quantity: 1 }],
      });
      expect(arePossibleDuplicates(base, repeatCustomerOrder)).toBe(false);
   });

   it("never flags an order against itself, and empty-item orders never match", () => {
      expect(arePossibleDuplicates(base, { ...base })).toBe(false);
      expect(
         arePossibleDuplicates(
            { ...base, items: [] },
            twin({ items: [] }),
         ),
      ).toBe(false);
   });
});

describe("findDuplicateMatches", () => {
   it("maps each order to the other's display id", () => {
      const matches = findDuplicateMatches([base, twin()]);
      expect(matches.get("order-1")).toEqual(["ORD_2"]);
      expect(matches.get("order-2")).toEqual(["ORD_1"]);
   });

   it("returns an empty map when nothing matches", () => {
      const matches = findDuplicateMatches([
         base,
         twin({ total: 999 }),
         twin({ id: "order-3", customId: "ORD_3", customerPhone: "01900000000" }),
      ]);
      expect(matches.size).toBe(0);
   });

   it("lists every match for a three-way duplicate", () => {
      const third = twin({ id: "order-3", customId: "ORD_3" });
      const matches = findDuplicateMatches([base, twin(), third]);
      expect(matches.get("order-1")?.sort()).toEqual(["ORD_2", "ORD_3"]);
      expect(matches.get("order-3")?.sort()).toEqual(["ORD_1", "ORD_2"]);
   });
});

describe("helpers", () => {
   it("normalizes phones", () => {
      expect(normalizeCustomerPhone("+880 1712-345678")).toBe("01712345678");
      expect(normalizeCustomerPhone("01712 345 678")).toBe("01712345678");
      expect(normalizeCustomerPhone(null)).toBe("");
      expect(normalizeCustomerPhone(undefined)).toBe("");
   });

   it("builds an order-insensitive item signature", () => {
      expect(orderItemSignature(base.items)).toBe(
         orderItemSignature(twin().items),
      );
      expect(orderItemSignature([])).toBe("");
   });

   it("computes Dhaka day keys", () => {
      expect(dhakaDayKey("2026-11-21T17:30:00.000Z")).toBe("2026-11-21");
      expect(dhakaDayKey("2026-11-21T18:30:00.000Z")).toBe("2026-11-22");
      expect(dhakaDayKey("not-a-date")).toBe("");
   });
});
