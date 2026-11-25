import { describe, it, expect } from "vitest";
import {
   deriveEmployeeActivities,
   deriveTrackingSteps,
} from "@src/Pages/admin/Order/Details/helpers/trackingHelpers";

// QA fix A2: the Staff Activity timeline's synthesized note fallback
// is per note type. Orders whose notes were saved without audit
// history (e.g. created before create-time note events existed) get
// one "… Note Added" fallback per uncovered type; types with real
// persistent events are never duplicated. Display-only — the order
// record is never modified.
const baseOrder = {
   status: "PENDING",
   createdAt: "2026-11-20T10:00:00.000Z",
   updatedAt: "2026-11-20T11:00:00.000Z",
   items: [],
};

const noteEntries = (order: any) =>
   deriveEmployeeActivities(order).filter((a) => a.category === "note");

const realNoteEvent = (title: string, value: string) => ({
   id: `act-audit-1763683200000-x1`,
   action: `${title} Created`,
   category: "note",
   actor: { name: "Store Manager", role: "Manager" },
   details: `"${value}"`,
   diff: { field: title, previous: null, new: value },
   timestamp: "2026-11-20T10:30:00.000Z",
   icon: "solar:notes-bold",
   badgeLabel: title,
   isImportant: title === "Employee Note",
});

describe("deriveEmployeeActivities note fallbacks", () => {
   it("synthesizes one Added entry per type when all four notes exist without history", () => {
      const notes = noteEntries({
         ...baseOrder,
         orderTags: {
            courierNote: "cn",
            customerNote: "cus",
            packingNote: "pn",
            employeeNote: "en",
         },
      });

      expect(notes.map((n) => n.action)).toEqual([
         "Courier Note Added",
         "Customer Note Added",
         "Packing Note Added",
         "Employee Note Added",
      ]);
      expect(notes.map((n) => n.badgeLabel)).toEqual([
         "Courier Note",
         "Customer Note",
         "Packing Note",
         "Employee Note",
      ]);
      expect(notes[3].details).toBe('"en"');
      expect(notes[3].diff).toEqual({
         field: "Employee Note",
         previous: null,
         new: "en",
      });
   });

   it("falls back only for uncovered types when history covers Courier only", () => {
      const notes = noteEntries({
         ...baseOrder,
         orderTags: {
            courierNote: "cn",
            customerNote: "cus",
            packingNote: "pn",
            employeeNote: "en",
            auditHistory: [realNoteEvent("Courier Note", "cn")],
         },
      });

      // The real Courier event is preserved; no synthesized duplicate.
      const courier = notes.filter((n) => n.badgeLabel === "Courier Note");
      expect(courier).toHaveLength(1);
      expect(courier[0].action).toBe("Courier Note Created");

      const synthesized = notes.filter((n) => n.id.startsWith("act-note"));
      expect(synthesized.map((n) => n.badgeLabel).sort()).toEqual([
         "Customer Note",
         "Employee Note",
         "Packing Note",
      ]);
   });

   it("synthesizes nothing when all four types have persistent events", () => {
      const notes = noteEntries({
         ...baseOrder,
         orderTags: {
            courierNote: "cn",
            customerNote: "cus",
            packingNote: "pn",
            employeeNote: "en",
            auditHistory: [
               realNoteEvent("Courier Note", "cn"),
               realNoteEvent("Customer Note", "cus"),
               realNoteEvent("Packing Note", "pn"),
               realNoteEvent("Employee Note", "en"),
            ],
         },
      });

      expect(notes).toHaveLength(4);
      expect(notes.every((n) => n.id.startsWith("act-audit-"))).toBe(true);
      expect(notes.map((n) => n.action)).toEqual([
         "Courier Note Created",
         "Customer Note Created",
         "Packing Note Created",
         "Employee Note Created",
      ]);
   });

   it("keeps the legacy orderNote-only order to exactly the old single Customer entry", () => {
      const notes = noteEntries({
         ...baseOrder,
         orderNote: "sfad",
      });

      expect(notes).toHaveLength(1);
      expect(notes[0]).toMatchObject({
         id: "act-note",
         action: "Customer Note Added",
         category: "note",
         details: '"sfad"',
         badgeLabel: "Customer Note",
         icon: "solar:notes-bold",
      });
      expect(notes[0].diff).toEqual({
         field: "Customer Note",
         previous: null,
         new: "sfad",
      });
   });

   it("prefers the tag customerNote over the legacy orderNote column for the fallback value", () => {
      const notes = noteEntries({
         ...baseOrder,
         orderNote: "legacy",
         orderTags: { customerNote: "from-tags" },
      });

      expect(notes).toHaveLength(1);
      expect(notes[0].details).toBe('"from-tags"');
   });
});

// Final Pre-Production Verification (2026-11-25): the section-6
// delivery/cancellation fallback fired even when the real terminal
// transition was already in the persistent audit history — a
// cancelled order showed TWO "Order Cancelled" entries, the
// synthesized one claiming "Previous: Active" for an order that was
// PENDING. The fallback is now suppressed by terminal coverage, and
// its fabricated previous is gone (the OBS-C3 rule).
const persistedCancelEvent = {
   id: "act-audit-1795584950083-u9i76",
   action: "Order Cancelled",
   category: "order",
   actor: { name: "jubayer", role: "System Admin", employeeCode: "EP_1" },
   details: "Order cancelled. Reason: Cancelled by user or staff",
   diff: { field: "status", previous: "PENDING", new: "CANCELLED" },
   timestamp: "2026-11-20T11:00:00.000Z",
   icon: "solar:close-circle-bold",
   badgeLabel: "Cancelled",
   isImportant: true,
};

describe("deriveEmployeeActivities terminal fallback", () => {
   it("shows only the persisted cancellation when one is logged", () => {
      const activities = deriveEmployeeActivities({
         ...baseOrder,
         status: "CANCELLED",
         orderTags: { auditHistory: [persistedCancelEvent] },
      });
      const cancels = activities.filter((a) => a.action === "Order Cancelled");
      expect(cancels).toHaveLength(1);
      expect(cancels[0].details).toContain("Reason: Cancelled by user or staff");
      expect(cancels[0].diff).toEqual({
         field: "status",
         previous: "PENDING",
         new: "CANCELLED",
      });
      expect(
         activities.some((a) => a.actor.role === "Order Exception"),
      ).toBe(false);
   });

   it("still synthesizes one fallback for a history-less cancelled order, with no fabricated previous", () => {
      const activities = deriveEmployeeActivities({
         ...baseOrder,
         status: "CANCELLED",
         orderTags: {},
      });
      const cancels = activities.filter((a) => a.action === "Order Cancelled");
      expect(cancels).toHaveLength(1);
      expect(cancels[0].diff).toEqual({
         field: "status",
         previous: null,
         new: "CANCELLED",
      });
   });

   it("does not duplicate a persisted completion with a synthesized delivery entry", () => {
      const activities = deriveEmployeeActivities({
         ...baseOrder,
         status: "COMPLETED",
         orderTags: {
            auditHistory: [
               {
                  ...persistedCancelEvent,
                  id: "act-audit-2",
                  action: "Order Completed",
                  details: "Order completed",
                  diff: { field: "status", previous: "OUT_FOR_DELIVERY", new: "COMPLETED" },
               },
            ],
         },
      });
      expect(
         activities.filter((a) => a.action === "Delivered to Customer"),
      ).toHaveLength(0);
   });

   it("still synthesizes the delivery entry for a history-less completed order", () => {
      const activities = deriveEmployeeActivities({
         ...baseOrder,
         status: "COMPLETED",
         orderTags: {},
      });
      expect(
         activities.filter((a) => a.action === "Delivered to Customer"),
      ).toHaveLength(1);
   });
});

// Final Pre-Production Verification (2026-11-25): a PENDING courier
// (or in-house) order had NO step in state "current" — stage 2 only
// became current at CONFIRMED — so the tracking header fell back to
// the last step and announced "Current: Delivered to Customer". The
// store-pickup workflow already marked its stage 2 current for a
// pending order; the other two workflows now do the same.
describe("deriveTrackingSteps current step", () => {
   it("marks Confirmed & Processing current for a PENDING courier order", () => {
      const steps = deriveTrackingSteps({
         status: "PENDING",
         createdAt: "2026-11-20T10:00:00.000Z",
         updatedAt: "2026-11-20T10:00:00.000Z",
      });
      const currents = steps.filter((s) => s.state === "current");
      expect(currents).toHaveLength(1);
      expect(currents[0].title).toBe("Confirmed & Processing");
   });

   it("marks Confirmed & Assembling current for a PENDING in-house order", () => {
      const steps = deriveTrackingSteps({
         status: "PENDING",
         orderType: "POS",
         createdAt: "2026-11-20T10:00:00.000Z",
         updatedAt: "2026-11-20T10:00:00.000Z",
      });
      const currents = steps.filter((s) => s.state === "current");
      expect(currents).toHaveLength(1);
      expect(currents[0].title).toBe("Confirmed & Assembling");
   });

   it("keeps a DELIVERED courier order fully completed with no current step", () => {
      const steps = deriveTrackingSteps({
         status: "DELIVERED",
         createdAt: "2026-11-20T10:00:00.000Z",
         updatedAt: "2026-11-20T11:00:00.000Z",
         deliveredAt: "2026-11-20T11:00:00.000Z",
      });
      expect(steps[steps.length - 1].state).toBe("completed");
      expect(steps.some((s) => s.state === "current")).toBe(false);
   });
});
