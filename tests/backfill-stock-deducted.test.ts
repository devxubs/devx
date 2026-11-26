import { describe, it, expect } from "vitest";
// The backfill is a plain-JS ops script; its classifier is pure and
// exported for exactly these regression tests.
import backfillScript from "../scripts/backfill-stock-deducted.js";

const { classifyOrder } = backfillScript as {
   classifyOrder: (
      order: {
         status: string;
         isDeleted: boolean;
         items: Array<{
            productId: string | null;
            variantId: string | null;
            quantity: number;
            trackInventory?: boolean;
            name?: string;
         }>;
      },
      pools: Array<{
         productId: string;
         variantId: string | null;
         net: number;
         count: number;
      }>,
   ) => { target: boolean | null; reason: string | null };
};

// Phase 1B backfill safeguard: classification compares the ledger
// against current items PER (productId, variantId) POOL. Aggregate
// totals must never let one pool's surplus mask another's shortage.

const item = (
   productId: string,
   quantity: number,
   variantId: string | null = null,
   extra: Record<string, unknown> = {},
) => ({ productId, variantId, quantity, name: productId, ...extra });

const pool = (productId: string, net: number, variantId: string | null = null, count = 1) => ({
   productId,
   variantId,
   net,
   count,
});

const liveOrder = (items: ReturnType<typeof item>[], status = "CONFIRMED") => ({
   status,
   isDeleted: false,
   items,
});

describe("backfill classifyOrder — per-pool safeguard", () => {
   it("aggregate totals match while individual PRODUCTS mismatch → AMBIGUOUS", () => {
      // Owner's example: A items 1 / ledger out 2; B items 1 /
      // ledger out 0. Aggregates: items 2, outstanding 2 — equal,
      // but pool A is over-deducted and pool B never deducted.
      const verdict = classifyOrder(
         liveOrder([item("A", 1), item("B", 1)]),
         [pool("A", -2)],
      );
      expect(verdict.target).toBeNull();
      expect(verdict.reason).toContain("pool");
   });

   it("aggregate totals match while VARIANTS mismatch → AMBIGUOUS", () => {
      // Item is variant X of P; the deduction sits on variant Y.
      const verdict = classifyOrder(
         liveOrder([item("P", 1, "X")]),
         [pool("P", -1, "Y")],
      );
      expect(verdict.target).toBeNull();
      expect(verdict.reason).toContain("pool");
   });

   it("a variant pool and the null-variant pool of one product are distinct", () => {
      // Item is the null-variant line; the ledger deducted a variant.
      const verdict = classifyOrder(
         liveOrder([item("P", 2, null)]),
         [pool("P", -2, "X")],
      );
      expect(verdict.target).toBeNull();
   });

   it("correct product/variant-level matches classify as deducted", () => {
      const verdict = classifyOrder(
         liveOrder([item("A", 2), item("P", 1, "X"), item("P", 3, "Y")]),
         [pool("A", -2), pool("P", -1, "X"), pool("P", -3, "Y")],
      );
      expect(verdict).toEqual({ target: true, reason: null });
   });

   it("multiple order items sharing one pool are summed", () => {
      const verdict = classifyOrder(
         liveOrder([item("A", 1), item("A", 2), item("P", 1, "X"), item("P", 2, "X")]),
         [pool("A", -3), pool("P", -3, "X")],
      );
      expect(verdict).toEqual({ target: true, reason: null });
   });

   it("null variant pool matches when both sides are variant-less", () => {
      const verdict = classifyOrder(liveOrder([item("A", 2, null)]), [pool("A", -2, null)]);
      expect(verdict).toEqual({ target: true, reason: null });
   });
});

describe("backfill classifyOrder — preserved classifications", () => {
   it("terminal order with stock still out → AMBIGUOUS (pools match, net < 0)", () => {
      const verdict = classifyOrder(
         liveOrder([item("A", 2)], "CANCELLED"),
         [pool("A", -2)],
      );
      expect(verdict.target).toBeNull();
      expect(verdict.reason).toContain("still out");
   });

   it("deleted order with stock still out → AMBIGUOUS", () => {
      const verdict = classifyOrder(
         { status: "PENDING", isDeleted: true, items: [item("A", 1)] },
         [pool("A", -1)],
      );
      expect(verdict.target).toBeNull();
   });

   it("live order with tracked items but no movements → AMBIGUOUS", () => {
      const verdict = classifyOrder(liveOrder([item("A", 1)], "PENDING"), []);
      expect(verdict.target).toBeNull();
      expect(verdict.reason).toContain("no stock movements");
   });

   it("terminal order with items but no movements → not deducted", () => {
      const verdict = classifyOrder(liveOrder([item("A", 1)], "CANCELLED"), []);
      expect(verdict).toEqual({ target: false, reason: null });
   });

   it("fully restored order (movements net to zero, items removed) → not deducted", () => {
      const verdict = classifyOrder(liveOrder([], "PENDING"), [
         pool("A", 0, null, 2), // SALE -2 then RETURN +2
      ]);
      expect(verdict).toEqual({ target: false, reason: null });
   });

   it("movements net to zero but the live order still holds the items → AMBIGUOUS", () => {
      const verdict = classifyOrder(liveOrder([item("A", 2)], "PENDING"), [
         pool("A", 0, null, 2),
      ]);
      expect(verdict.target).toBeNull();
      expect(verdict.reason).toContain("pool");
   });

   it("more restored than deducted in a pool → AMBIGUOUS", () => {
      const verdict = classifyOrder(liveOrder([item("A", 1)]), [pool("A", 1, null, 2)]);
      expect(verdict.target).toBeNull();
   });

   it("untracked products never hold stock and are excluded from pools", () => {
      const verdict = classifyOrder(
         liveOrder([item("A", 5, null, { trackInventory: false })], "PENDING"),
         [],
      );
      expect(verdict).toEqual({ target: false, reason: null });
   });

   it("an order with no items and no movements → not deducted", () => {
      const verdict = classifyOrder(liveOrder([], "PENDING"), []);
      expect(verdict).toEqual({ target: false, reason: null });
   });
});
