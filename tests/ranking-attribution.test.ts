import { describe, it, expect } from "vitest";
import {
   transitionsFromAuditLog,
   transitionsFromAuditHistory,
   dedupeTransitions,
   firstTransitionsByClass,
   buildAggregates,
   type AttributedTransition,
   type RankingOrderInfo,
} from "@src/lib/ranking/attribution";
import type { RankingSettings } from "@src/lib/rankingSettings";

// Plan §2 / §4.0: extraction from both audit trails, minute-level
// dedupe preferring AuditLog, first-per-order-per-class, and the
// aggregate rules (CancPre from-status, SLA boundary, §4.1
// current-status filter, duplicate-excluded cancellations).

const settings: RankingSettings = {
   weights: {
      completedSales: 30,
      netRevenue: 25,
      confirmationRate: 20,
      handlingQuality: 15,
      cancellationControl: 10,
   },
   salesTargetMonthly: 60,
   revenueTargetMonthly: 300000,
   minEligibleOrders: 10,
   cancellationPenalty: 1.0,
   processingSlaHours: 48,
   autoRecalculate: true,
};

const T = (overrides: Partial<AttributedTransition> = {}): AttributedTransition => ({
   orderId: "o1",
   employeeId: "u1",
   toStatus: "CONFIRMED",
   fromStatus: "PENDING",
   at: new Date("2026-11-10T10:00:00.000Z"),
   source: "auditlog",
   ...overrides,
});

const orderInfo = (
   overrides: Partial<RankingOrderInfo> = {},
): RankingOrderInfo => ({
   total: 5000,
   createdAt: new Date("2026-11-10T09:00:00.000Z"),
   cancellationReason: null,
   isDuplicate: false,
   currentStatus: "DELIVERED",
   ...overrides,
});

const users = new Map([
   ["u1", { customId: "EP_1", name: "User One", roleName: "Staff" }],
   ["u2", { customId: "EP_2", name: "User Two", roleName: "Staff" }],
]);

describe("transitionsFromAuditLog", () => {
   it("extracts a status transition with from/to and actor", () => {
      const out = transitionsFromAuditLog([
         {
            entityId: "o1",
            actorId: "u1",
            createdAt: new Date("2026-11-10T10:00:00.000Z"),
            changes: { status: { from: "PENDING", to: "CONFIRMED" } },
         },
      ]);
      expect(out).toHaveLength(1);
      expect(out[0]).toMatchObject({
         orderId: "o1",
         employeeId: "u1",
         toStatus: "CONFIRMED",
         fromStatus: "PENDING",
         source: "auditlog",
      });
   });

   it("skips rows without a status change, without an actor, or with a bad date", () => {
      const out = transitionsFromAuditLog([
         {
            entityId: "o1",
            actorId: "u1",
            createdAt: new Date(),
            changes: { total: { from: 100, to: 200 } },
         },
         {
            entityId: "o2",
            actorId: null,
            createdAt: new Date(),
            changes: { status: { from: "PENDING", to: "CONFIRMED" } },
         },
         {
            entityId: "o3",
            actorId: "u1",
            createdAt: "not-a-date",
            changes: { status: { from: "PENDING", to: "CONFIRMED" } },
         },
      ]);
      expect(out).toEqual([]);
   });

   it("carries the AuditLog cancellationReason diff onto CANCELLED transitions", () => {
      const out = transitionsFromAuditLog([
         {
            entityId: "o1",
            actorId: "u1",
            createdAt: new Date("2026-11-10T10:00:00.000Z"),
            changes: {
               status: { from: "PENDING", to: "CANCELLED" },
               cancellationReason: { from: null, to: "Wrong Product" },
            },
         },
      ]);
      expect(out[0].cancellationReason).toBe("Wrong Product");
   });
});

describe("transitionsFromAuditHistory", () => {
   const historyOrder = {
      id: "o1",
      orderTags: {
         auditHistory: [
            {
               action: "Status Changed to CONFIRMED",
               category: "workflow",
               actor: { id: "u1", name: "User One" },
               timestamp: "2026-11-10T10:00:00.000Z",
               diff: { field: "status", previous: "PENDING", new: "CONFIRMED" },
            },
            {
               // Note event — diff.field is the note title, must be ignored.
               action: "Customer Note Created",
               category: "note",
               actor: { id: "u1", name: "User One" },
               timestamp: "2026-11-10T10:05:00.000Z",
               details: '"call after 6pm"',
               diff: { field: "Customer Note", previous: null, new: "call after 6pm" },
            },
            {
               action: "Order Cancelled",
               category: "order",
               actor: { id: "u2", name: "User Two" },
               timestamp: "2026-11-10T11:00:00.000Z",
               details: "Order cancelled. Reason: Wrong Product",
               diff: { field: "status", previous: "CONFIRMED", new: "CANCELLED" },
            },
            {
               // No actor id — cannot be attributed, must be skipped.
               action: "Status Changed to SHIPPED",
               category: "workflow",
               actor: { name: "Ghost" },
               timestamp: "2026-11-10T12:00:00.000Z",
               diff: { field: "status", previous: "CONFIRMED", new: "SHIPPED" },
            },
         ],
      },
   };

   it("extracts only status-diff events with an actor id", () => {
      const out = transitionsFromAuditHistory(historyOrder);
      expect(out).toHaveLength(2);
      expect(out[0]).toMatchObject({
         orderId: "o1",
         employeeId: "u1",
         toStatus: "CONFIRMED",
         fromStatus: "PENDING",
         source: "history",
      });
   });

   it("parses the cancellation reason out of the event details", () => {
      const out = transitionsFromAuditHistory(historyOrder);
      const cancel = out.find((t) => t.toStatus === "CANCELLED");
      expect(cancel?.employeeId).toBe("u2");
      expect(cancel?.cancellationReason).toBe("Wrong Product");
   });

   it("accepts orderTags as a JSON string and tolerates missing/garbage tags", () => {
      const asString = transitionsFromAuditHistory({
         id: "o1",
         orderTags: JSON.stringify(historyOrder.orderTags),
      });
      expect(asString).toHaveLength(2);
      expect(transitionsFromAuditHistory({ id: "o1", orderTags: null })).toEqual([]);
      expect(transitionsFromAuditHistory({ id: "o1", orderTags: "{broken" })).toEqual([]);
      expect(transitionsFromAuditHistory({ id: "o1", orderTags: {} })).toEqual([]);
   });
});

describe("dedupeTransitions", () => {
   it("collapses AuditLog + auditHistory evidence of the same transition, preferring AuditLog", () => {
      const history = T({
         source: "history",
         employeeId: "u1",
         at: new Date("2026-11-10T10:00:30.000Z"), // same minute
      });
      const auditlog = T({ source: "auditlog" });
      const out = dedupeTransitions([history, auditlog]);
      expect(out).toHaveLength(1);
      expect(out[0].source).toBe("auditlog");
   });

   it("keeps transitions a minute apart separate", () => {
      const out = dedupeTransitions([
         T({ at: new Date("2026-11-10T10:00:59.000Z") }),
         T({ source: "history", at: new Date("2026-11-10T10:01:00.000Z") }),
      ]);
      expect(out).toHaveLength(2);
   });

   it("prefers history over implied for the same key", () => {
      const out = dedupeTransitions([
         T({ source: "implied" }),
         T({ source: "history" }),
      ]);
      expect(out).toHaveLength(1);
      expect(out[0].source).toBe("history");
   });

   it("different to-status in the same minute is not a duplicate", () => {
      const out = dedupeTransitions([
         T({ toStatus: "CONFIRMED" }),
         T({ toStatus: "PROCESSING", fromStatus: "CONFIRMED", source: "history" }),
      ]);
      expect(out).toHaveLength(2);
   });
});

describe("firstTransitionsByClass (§4.0)", () => {
   it("confirm-class: first transition into the confirm set FROM PENDING/HOLD wins", () => {
      const { confirm } = firstTransitionsByClass([
         T({ toStatus: "PROCESSING", fromStatus: "CONFIRMED", at: new Date("2026-11-10T09:00:00.000Z") }),
         T({ toStatus: "CONFIRMED", fromStatus: "PENDING", at: new Date("2026-11-10T10:00:00.000Z") }),
         T({ toStatus: "SHIPPED", fromStatus: "HOLD", employeeId: "u2", at: new Date("2026-11-10T11:00:00.000Z") }),
      ]);
      // The 09:00 PROCESSING is not confirm-class (from CONFIRMED);
      // the 10:00 CONFIRMED from PENDING is the first that qualifies.
      expect(confirm.get("o1")?.employeeId).toBe("u1");
      expect(confirm.get("o1")?.toStatus).toBe("CONFIRMED");
   });

   it("complete-class: earliest DELIVERED/COMPLETED wins, one per order", () => {
      const { complete } = firstTransitionsByClass([
         T({ toStatus: "COMPLETED", fromStatus: "DELIVERED", employeeId: "u2", at: new Date("2026-11-12T10:00:00.000Z") }),
         T({ toStatus: "DELIVERED", fromStatus: "SHIPPED", employeeId: "u1", at: new Date("2026-11-11T10:00:00.000Z") }),
      ]);
      expect(complete.get("o1")?.employeeId).toBe("u1");
   });

   it("cancel-class: first CANCELLED per order only", () => {
      const { cancel } = firstTransitionsByClass([
         T({ toStatus: "CANCELLED", fromStatus: "PENDING", employeeId: "u2", at: new Date("2026-11-11T10:00:00.000Z") }),
         T({ toStatus: "CANCELLED", fromStatus: "PENDING", employeeId: "u1", at: new Date("2026-11-10T10:00:00.000Z") }),
      ]);
      expect(cancel).toHaveLength(1);
      expect(cancel[0].employeeId).toBe("u1");
   });

   it("same-timestamp tie prefers the AuditLog-sourced transition", () => {
      const at = new Date("2026-11-10T10:00:00.000Z");
      const { confirm } = firstTransitionsByClass([
         T({ source: "history", employeeId: "u2", at }),
         T({ source: "auditlog", employeeId: "u1", at }),
      ]);
      expect(confirm.get("o1")?.employeeId).toBe("u1");
   });
});

describe("buildAggregates", () => {
   it("confirm + complete credit, SLA latency, H, evidence counts", () => {
      const transitions = [
         T({}), // confirm o1 at 10:00, created 09:00 → 1h latency
         T({
            toStatus: "DELIVERED",
            fromStatus: "CONFIRMED",
            at: new Date("2026-11-11T10:00:00.000Z"),
            source: "history",
         }),
      ];
      const { aggregates, unattributedOrders } = buildAggregates({
         transitions,
         orders: new Map([["o1", orderInfo()]]),
         users,
         settings,
         unattributedOrders: 7,
      });
      expect(unattributedOrders).toBe(7);
      expect(aggregates).toHaveLength(1);
      const a = aggregates[0];
      expect(a).toMatchObject({
         employeeId: "u1",
         employeeCustomId: "EP_1",
         employeeName: "User One",
         completedSales: 1,
         netRevenue: 5000,
         confirmations: 1,
         slaOnTime: 1,
         slaEvaluated: 1,
         handledOrders: 1,
         attributableCancellations: 0,
      });
      expect(a.evidence).toEqual({
         auditLogTransitions: 1,
         auditHistoryTransitions: 1,
         impliedTransitions: 0,
         unattributedOrders: 7,
      });
   });

   it("SLA boundary: exactly at the limit is on-time, 1ms past is not", () => {
      const created = new Date("2026-11-10T00:00:00.000Z");
      const transitions = [
         T({ orderId: "o-on", at: new Date(created.getTime() + 48 * 3600_000) }),
         T({ orderId: "o-late", at: new Date(created.getTime() + 48 * 3600_000 + 1) }),
      ];
      const { aggregates } = buildAggregates({
         transitions,
         orders: new Map([
            ["o-on", orderInfo({ createdAt: created })],
            ["o-late", orderInfo({ createdAt: created })],
         ]),
         users,
         settings,
         unattributedOrders: 0,
      });
      expect(aggregates[0].confirmations).toBe(2);
      expect(aggregates[0].slaEvaluated).toBe(2);
      expect(aggregates[0].slaOnTime).toBe(1);
   });

   it("CancPre counts only cancels FROM PENDING/HOLD (§4.3)", () => {
      const transitions = [
         T({ orderId: "o-pre", toStatus: "CANCELLED", fromStatus: "PENDING" }),
         T({ orderId: "o-post", toStatus: "CANCELLED", fromStatus: "CONFIRMED" }),
         T({ orderId: "o-hold", toStatus: "CANCELLED", fromStatus: "HOLD" }),
      ];
      const { aggregates } = buildAggregates({
         transitions,
         orders: new Map([
            ["o-pre", orderInfo({ currentStatus: "CANCELLED" })],
            ["o-post", orderInfo({ currentStatus: "CANCELLED" })],
            ["o-hold", orderInfo({ currentStatus: "CANCELLED" })],
         ]),
         users,
         settings,
         unattributedOrders: 0,
      });
      expect(aggregates[0].preConfirmationCancellations).toBe(2);
      expect(aggregates[0].handledOrders).toBe(3);
   });

   it("completed-then-cancelled orders drop out of C/R via currentStatus (§4.1)", () => {
      const transitions = [
         T({ orderId: "o1", toStatus: "DELIVERED", fromStatus: "SHIPPED" }),
         T({
            orderId: "o1",
            toStatus: "CANCELLED",
            fromStatus: "DELIVERED",
            employeeId: "u2",
            at: new Date("2026-11-12T10:00:00.000Z"),
         }),
      ];
      const { aggregates } = buildAggregates({
         transitions,
         orders: new Map([["o1", orderInfo({ currentStatus: "CANCELLED" })]]),
         users,
         settings,
         unattributedOrders: 0,
      });
      const u1 = aggregates.find((a) => a.employeeId === "u1");
      expect(u1?.completedSales).toBe(0);
      expect(u1?.netRevenue).toBe(0);
      // u2 still handled the order (the cancel itself).
      const u2 = aggregates.find((a) => a.employeeId === "u2");
      expect(u2?.handledOrders).toBe(1);
   });

   it("duplicate-flagged cancellations are excluded from A(E); explicit staff reasons count", () => {
      const transitions = [
         T({ orderId: "o-dup", toStatus: "CANCELLED", fromStatus: "PENDING" }),
         T({ orderId: "o-staff", toStatus: "CANCELLED", fromStatus: "PENDING" }),
         T({ orderId: "o-cust", toStatus: "CANCELLED", fromStatus: "PENDING" }),
      ];
      const { aggregates } = buildAggregates({
         transitions,
         orders: new Map([
            ["o-dup", orderInfo({ currentStatus: "CANCELLED", cancellationReason: "Wrong Product", isDuplicate: true })],
            ["o-staff", orderInfo({ currentStatus: "CANCELLED", cancellationReason: "Wrong Product" })],
            ["o-cust", orderInfo({ currentStatus: "CANCELLED", cancellationReason: "Customer Refused" })],
         ]),
         users,
         settings,
         unattributedOrders: 0,
      });
      expect(aggregates[0].attributableCancellations).toBe(1);
   });

   it("the transition's own recorded reason beats the order column for classification", () => {
      const transitions = [
         T({
            toStatus: "CANCELLED",
            fromStatus: "PENDING",
            cancellationReason: "Customer Refused",
         }),
      ];
      const { aggregates } = buildAggregates({
         transitions,
         orders: new Map([
            ["o1", orderInfo({ currentStatus: "CANCELLED", cancellationReason: "Wrong Product" })],
         ]),
         users,
         settings,
         unattributedOrders: 0,
      });
      expect(aggregates[0].attributableCancellations).toBe(0);
   });

   it("H counts distinct orders, not transitions", () => {
      const transitions = [
         T({}),
         T({ toStatus: "PROCESSING", fromStatus: "CONFIRMED" }),
         T({ toStatus: "SHIPPED", fromStatus: "PROCESSING" }),
      ];
      const { aggregates } = buildAggregates({
         transitions,
         orders: new Map([["o1", orderInfo()]]),
         users,
         settings,
         unattributedOrders: 0,
      });
      expect(aggregates[0].handledOrders).toBe(1);
      expect(aggregates[0].evidence.auditLogTransitions).toBe(3);
   });

   it("implied transitions credit the creator: H, completion, zero-latency SLA", () => {
      const created = new Date("2026-11-10T09:00:00.000Z");
      const transitions = [
         T({
            toStatus: "DELIVERED",
            fromStatus: null,
            at: created,
            source: "implied",
         }),
      ];
      const { aggregates } = buildAggregates({
         transitions,
         orders: new Map([["o1", orderInfo({ createdAt: created })]]),
         users,
         settings,
         unattributedOrders: 0,
      });
      const a = aggregates[0];
      expect(a.handledOrders).toBe(1);
      expect(a.completedSales).toBe(1);
      expect(a.confirmations).toBe(1);
      expect(a.slaOnTime).toBe(1);
      expect(a.evidence.impliedTransitions).toBe(1);
   });

   it("employees with no transitions do not appear; unknown users fall back to their id", () => {
      const { aggregates } = buildAggregates({
         transitions: [T({ employeeId: "ghost" })],
         orders: new Map([["o1", orderInfo()]]),
         users: new Map(),
         settings,
         unattributedOrders: 0,
      });
      expect(aggregates).toHaveLength(1);
      expect(aggregates[0].employeeName).toBe("ghost");
      expect(aggregates[0].employeeCustomId).toBeNull();
   });

   it("accepts plain-record lookups as well as Maps", () => {
      const { aggregates } = buildAggregates({
         transitions: [T({ toStatus: "DELIVERED", fromStatus: "SHIPPED" })],
         orders: { o1: orderInfo() },
         users: { u1: { customId: "EP_1", name: "User One" } },
         settings,
         unattributedOrders: 0,
      });
      expect(aggregates[0].completedSales).toBe(1);
      expect(aggregates[0].netRevenue).toBe(5000);
   });
});
