// Create-time audit-history events for the four order notes.
//
// The four notes (Courier / Customer / Packing / Employee) live as
// separate keys inside the Order.orderTags JSON. The PUT handler
// (src/app/api/orders/[id]/route.ts) appends an audit-history event
// whenever a note is created or updated, and the Order Details
// "Operational Audit & Staff Activity" timeline renders those events.
// Order CREATE never wrote such events, so an order created with
// notes had no auditHistory at all and the timeline could only show
// a synthesized customer-note fallback. This helper builds the
// creation events in the exact shape the PUT handler uses for a
// newly created note, so create and update histories are identical
// in structure.

export interface OrderNoteEventActor {
   id?: string | null;
   name?: string | null;
   role?: string | null;
   employeeCode?: string | null;
   email?: string | null;
}

export const ORDER_NOTE_EVENT_DEFS = [
   { title: "Courier Note", key: "courierNote" },
   { title: "Customer Note", key: "customerNote" },
   { title: "Packing Note", key: "packingNote" },
   { title: "Employee Note", key: "employeeNote" },
] as const;

/**
 * Build one "… Note Created" audit-history event per non-empty note
 * in `notes` (keyed by courierNote / customerNote / packingNote /
 * employeeNote). Values are cleaned exactly like the PUT handler
 * cleans them (String + trim); empty / whitespace-only / missing
 * notes produce no event. Returns [] when no note has content.
 */
export function buildNoteCreatedEvents(
   notes: Record<string, unknown> | null | undefined,
   actor: OrderNoteEventActor | null | undefined,
   nowIso: string = new Date().toISOString(),
): any[] {
   const safeActor = {
      id: actor?.id || null,
      name: actor?.name || "Staff Member",
      role: actor?.role || "Staff",
      employeeCode: actor?.employeeCode || "EP_1",
      email: actor?.email || null,
   };

   const events: any[] = [];
   for (const def of ORDER_NOTE_EVENT_DEFS) {
      const clean = String(notes?.[def.key] || "").trim();
      if (!clean) continue;
      events.push({
         id: `act-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
         action: `${def.title} Created`,
         category: "note",
         actor: safeActor,
         details: `"${clean}"`,
         diff: {
            field: def.title,
            previous: null,
            new: clean,
         },
         timestamp: nowIso,
         icon: "solar:notes-bold",
         badgeLabel: def.title,
         isImportant: def.title === "Employee Note",
      });
   }
   return events;
}
