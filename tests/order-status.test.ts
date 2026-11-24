import { describe, it, expect } from "vitest";
import {
   ORDER_STATUSES,
   normalizeOrderStatus,
   INVALID_ORDER_STATUSES,
   VALID_ORDER_WHERE,
   isValidOrder,
   isDeliveredValidOrder,
   isOrderStatusTransitionAllowed,
} from "@src/lib/orderStatus";

// Phase B1 (P1-4): the API-boundary status normaliser. The Publish
// flow speaks Title Case; the database speaks the enum. Every form
// below must land on the same canonical value, and anything unknown
// must come back null so routes can answer 400 (never 500).
describe("normalizeOrderStatus", () => {
   it("passes canonical enum values through unchanged", () => {
      for (const status of ORDER_STATUSES) {
         expect(normalizeOrderStatus(status)).toBe(status);
      }
   });

   it("maps Title Case forms (the Publish flow's vocabulary)", () => {
      expect(normalizeOrderStatus("Pending")).toBe("PENDING");
      expect(normalizeOrderStatus("Confirmed")).toBe("CONFIRMED");
      expect(normalizeOrderStatus("Processing")).toBe("PROCESSING");
      expect(normalizeOrderStatus("Shipped")).toBe("SHIPPED");
      expect(normalizeOrderStatus("Out for Delivery")).toBe("OUT_FOR_DELIVERY");
      expect(normalizeOrderStatus("Delivered")).toBe("DELIVERED");
      expect(normalizeOrderStatus("Completed")).toBe("COMPLETED");
      expect(normalizeOrderStatus("Hold")).toBe("HOLD");
      expect(normalizeOrderStatus("Cancelled")).toBe("CANCELLED");
      expect(normalizeOrderStatus("Failed")).toBe("FAILED");
   });

   it("maps lower-case, spaced, hyphenated and underscored variants", () => {
      for (const status of ORDER_STATUSES) {
         expect(normalizeOrderStatus(status.toLowerCase())).toBe(status);
         expect(normalizeOrderStatus(status.replace(/_/g, " "))).toBe(status);
         expect(normalizeOrderStatus(status.replace(/_/g, "-"))).toBe(status);
         expect(normalizeOrderStatus(status.replace(/_/g, " ").toLowerCase())).toBe(
            status,
         );
      }
      expect(normalizeOrderStatus("out for delivery")).toBe("OUT_FOR_DELIVERY");
      expect(normalizeOrderStatus("OUT FOR DELIVERY")).toBe("OUT_FOR_DELIVERY");
      expect(normalizeOrderStatus("  Out   for   Delivery  ")).toBe(
         "OUT_FOR_DELIVERY",
      );
   });

   it("returns null for unknown or malformed input", () => {
      expect(normalizeOrderStatus("RETURNED")).toBeNull();
      expect(normalizeOrderStatus("OutForDelivery")).toBeNull();
      expect(normalizeOrderStatus("PENDINGG")).toBeNull();
      expect(normalizeOrderStatus("")).toBeNull();
      expect(normalizeOrderStatus("   ")).toBeNull();
      expect(normalizeOrderStatus(null)).toBeNull();
      expect(normalizeOrderStatus(undefined)).toBeNull();
      expect(normalizeOrderStatus(42)).toBeNull();
      expect(normalizeOrderStatus({})).toBeNull();
   });
});

// Phase B1 (P1-2): the ONE canonical valid-order definition — an
// order counts toward customer stats/dues iff it is not soft-deleted
// and its status is neither CANCELLED nor FAILED.
describe("canonical valid-order definition", () => {
   it("exposes the where-fragment with the exact canonical shape", () => {
      expect(VALID_ORDER_WHERE).toEqual({
         isDeleted: false,
         status: { notIn: ["CANCELLED", "FAILED"] },
      });
      expect([...INVALID_ORDER_STATUSES]).toEqual(["CANCELLED", "FAILED"]);
   });

   it("predicate truth table across every status × deleted flag", () => {
      for (const status of ORDER_STATUSES) {
         const terminal = status === "CANCELLED" || status === "FAILED";
         expect(isValidOrder({ status, isDeleted: false })).toBe(!terminal);
         expect(isValidOrder({ status, isDeleted: true })).toBe(false);
      }
   });

   it("predicate and where-fragment agree on representative rows", () => {
      const rows = [
         { status: "PENDING", isDeleted: false },
         { status: "DELIVERED", isDeleted: false },
         { status: "CANCELLED", isDeleted: false },
         { status: "FAILED", isDeleted: false },
         { status: "DELIVERED", isDeleted: true },
         { status: "PENDING", isDeleted: true },
      ];
      for (const row of rows) {
         const fragmentMatches =
            row.isDeleted === VALID_ORDER_WHERE.isDeleted &&
            !VALID_ORDER_WHERE.status.notIn.includes(
               row.status as (typeof INVALID_ORDER_STATUSES)[number],
            );
         expect(isValidOrder(row)).toBe(fragmentMatches);
      }
   });

   it("treats a missing deleted flag as not deleted", () => {
      expect(isValidOrder({ status: "PENDING" })).toBe(true);
      expect(isValidOrder({ status: "FAILED" })).toBe(false);
      expect(isValidOrder({ status: "PENDING", isDeleted: null })).toBe(true);
   });
});

describe("isDeliveredValidOrder", () => {
   it("is true only for DELIVERED / COMPLETED valid orders", () => {
      expect(isDeliveredValidOrder({ status: "DELIVERED", isDeleted: false })).toBe(true);
      expect(isDeliveredValidOrder({ status: "COMPLETED", isDeleted: false })).toBe(true);
      expect(isDeliveredValidOrder({ status: "PENDING", isDeleted: false })).toBe(false);
      expect(isDeliveredValidOrder({ status: "SHIPPED", isDeleted: false })).toBe(false);
   });

   it("never counts a CANCELLED / FAILED / deleted order as delivered", () => {
      // The exact leak the old Customers-list sub-aggregate had: a
      // CANCELLED order whose courierStatus said DELIVERED. The
      // predicate looks at the order status only, so no courierStatus
      // value can resurrect it.
      expect(isDeliveredValidOrder({ status: "CANCELLED", isDeleted: false })).toBe(false);
      expect(isDeliveredValidOrder({ status: "FAILED", isDeleted: false })).toBe(false);
      expect(isDeliveredValidOrder({ status: "DELIVERED", isDeleted: true })).toBe(false);
   });
});

// BUG-C1 (Full Live QA Audit 2026-11-25): the transition policy the
// single-order PUT and the bulk status action now enforce. Before
// this, CANCELLED → PENDING was accepted, resurrecting the order and
// re-deducting its stock.
describe("isOrderStatusTransitionAllowed (BUG-C1)", () => {
   it("never allows leaving CANCELLED or FAILED", () => {
      for (const from of ["CANCELLED", "FAILED"]) {
         for (const to of ORDER_STATUSES) {
            if (to === from) continue;
            expect(isOrderStatusTransitionAllowed(from, to)).toBe(false);
         }
      }
   });

   it("treats COMPLETED as terminal and DELIVERED as completable-only", () => {
      expect(isOrderStatusTransitionAllowed("COMPLETED", "PENDING")).toBe(false);
      expect(isOrderStatusTransitionAllowed("COMPLETED", "DELIVERED")).toBe(false);
      expect(isOrderStatusTransitionAllowed("DELIVERED", "COMPLETED")).toBe(true);
      expect(isOrderStatusTransitionAllowed("DELIVERED", "PENDING")).toBe(false);
      expect(isOrderStatusTransitionAllowed("DELIVERED", "CANCELLED")).toBe(false);
   });

   it("preserves the normal fulfilment flows", () => {
      expect(isOrderStatusTransitionAllowed("PENDING", "CONFIRMED")).toBe(true);
      expect(isOrderStatusTransitionAllowed("CONFIRMED", "PROCESSING")).toBe(true);
      expect(isOrderStatusTransitionAllowed("PROCESSING", "SHIPPED")).toBe(true);
      expect(isOrderStatusTransitionAllowed("SHIPPED", "OUT_FOR_DELIVERY")).toBe(true);
      expect(isOrderStatusTransitionAllowed("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
      expect(isOrderStatusTransitionAllowed("CONFIRMED", "COMPLETED")).toBe(true);
      expect(isOrderStatusTransitionAllowed("PENDING", "HOLD")).toBe(true);
      expect(isOrderStatusTransitionAllowed("HOLD", "PENDING")).toBe(true);
   });

   it("allows cancelling / failing from any active status", () => {
      for (const from of ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "HOLD"]) {
         expect(isOrderStatusTransitionAllowed(from, "CANCELLED")).toBe(true);
         expect(isOrderStatusTransitionAllowed(from, "FAILED")).toBe(true);
      }
   });

   it("always allows a same-status save (not a transition)", () => {
      for (const s of ORDER_STATUSES) {
         expect(isOrderStatusTransitionAllowed(s, s)).toBe(true);
      }
   });
});
