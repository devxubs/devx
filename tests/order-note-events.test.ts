import { describe, it, expect } from "vitest";
import { buildNoteCreatedEvents } from "@src/lib/orderNoteEvents";

// QA fix A1: order CREATE now seeds orderTags.auditHistory with a
// "… Note Created" event per non-empty note, in the exact shape the
// PUT handler appends for note updates (see
// src/app/api/orders/[id]/route.ts). Before this, an order created
// with notes had no auditHistory at all.
const actor = {
   id: "user-1",
   name: "Store Manager",
   role: "Manager",
   email: "manager@devxpos.test",
};
const NOW = "2026-11-21T00:00:00.000Z";

describe("buildNoteCreatedEvents", () => {
   it("builds one Created event per note when all four notes are present", () => {
      const events = buildNoteCreatedEvents(
         {
            courierNote: "cn",
            customerNote: "cus",
            packingNote: "pn",
            employeeNote: "en",
         },
         actor,
         NOW,
      );

      expect(events).toHaveLength(4);
      expect(events.map((e) => e.action)).toEqual([
         "Courier Note Created",
         "Customer Note Created",
         "Packing Note Created",
         "Employee Note Created",
      ]);
      expect(events.map((e) => e.badgeLabel)).toEqual([
         "Courier Note",
         "Customer Note",
         "Packing Note",
         "Employee Note",
      ]);
      for (const e of events) {
         expect(e.category).toBe("note");
         expect(e.icon).toBe("solar:notes-bold");
         expect(e.timestamp).toBe(NOW);
         expect(e.id).toMatch(/^act-audit-\d+-[a-z0-9]+$/);
         expect(e.actor).toEqual({
            id: "user-1",
            name: "Store Manager",
            role: "Manager",
            employeeCode: "EP_1",
            email: "manager@devxpos.test",
         });
      }
      expect(events[0].details).toBe('"cn"');
      expect(events[0].diff).toEqual({
         field: "Courier Note",
         previous: null,
         new: "cn",
      });
      // Only the Employee Note event is flagged important, mirroring PUT.
      expect(events.map((e) => e.isImportant)).toEqual([
         false,
         false,
         false,
         true,
      ]);
   });

   it("returns no events when every note is empty, whitespace, or missing", () => {
      expect(buildNoteCreatedEvents({}, actor, NOW)).toEqual([]);
      expect(
         buildNoteCreatedEvents(
            {
               courierNote: "",
               customerNote: "   ",
               packingNote: null,
               employeeNote: undefined,
            },
            actor,
            NOW,
         ),
      ).toEqual([]);
      expect(buildNoteCreatedEvents(null, actor, NOW)).toEqual([]);
      expect(buildNoteCreatedEvents(undefined, actor, NOW)).toEqual([]);
   });

   it("builds events only for the notes that have content, with values trimmed", () => {
      const events = buildNoteCreatedEvents(
         { packingNote: "  fragile  ", employeeNote: "call first" },
         actor,
         NOW,
      );

      expect(events).toHaveLength(2);
      expect(events.map((e) => e.badgeLabel)).toEqual([
         "Packing Note",
         "Employee Note",
      ]);
      expect(events[0].diff).toEqual({
         field: "Packing Note",
         previous: null,
         new: "fragile",
      });
      expect(events[0].details).toBe('"fragile"');
   });

   it("applies the PUT handler's actor fallbacks when actor fields are absent", () => {
      const events = buildNoteCreatedEvents(
         { customerNote: "cus" },
         null,
         NOW,
      );

      expect(events).toHaveLength(1);
      expect(events[0].actor).toEqual({
         id: null,
         name: "Staff Member",
         role: "Staff",
         employeeCode: "EP_1",
         email: null,
      });
   });
});
