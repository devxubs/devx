import { describe, it, expect } from "vitest";
import { deriveEmployeeActivities } from "@src/Pages/admin/Order/Details/helpers/trackingHelpers";

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
