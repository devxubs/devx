import { OrderNoteItem } from "../types";

/**
 * Extracts, normalizes, and de-duplicates all saved notes and instructions
 * for an order from its structured tags, dedicated fields, and audit history.
 */
export const extractOrderNotes = (orderData: any): OrderNoteItem[] => {
   if (!orderData) return [];

   const tags =
      typeof orderData.orderTags === "object" && orderData.orderTags !== null
         ? orderData.orderTags
         : typeof orderData.orderTags === "string"
           ? (() => {
                try {
                   return JSON.parse(orderData.orderTags);
                } catch {
                   return {};
                }
             })()
           : {};

   const list: OrderNoteItem[] = [];
   const seenContent = new Set<string>();

   const addIfDistinct = (note: OrderNoteItem) => {
      const cleanContent = note.content.trim();
      if (!cleanContent) return;

      const normalized = `${note.type}:${cleanContent.toLowerCase()}`;
      if (!seenContent.has(normalized)) {
         seenContent.add(normalized);
         list.push({
            ...note,
            content: cleanContent,
         });
      }
   };

   // 1. Array of notes stored in orderTags.notes
   if (Array.isArray(tags.notes)) {
      for (const n of tags.notes) {
         if (n && n.content) {
            addIfDistinct({
               id: n.id || `note-${Math.random().toString(36).substring(2, 7)}`,
               type: n.type || "general",
               title: n.title || "Order Note",
               content: String(n.content).trim(),
               author: n.author || "Staff",
               createdAt:
                  n.createdAt ||
                  orderData.createdAt ||
                  new Date().toISOString(),
            });
         }
      }
   }

   // 2. Individual note fields in orderTags
   if (tags.courierNote) {
      addIfDistinct({
         id: "tag-courier-note",
         type: "courier",
         title: "Courier Note",
         content: String(tags.courierNote).trim(),
         author: "Staff",
         createdAt:
            orderData.updatedAt ||
            orderData.createdAt ||
            new Date().toISOString(),
      });
   }

   if (tags.customerNote) {
      addIfDistinct({
         id: "tag-customer-note",
         type: "customer",
         title: "Customer Note",
         content: String(tags.customerNote).trim(),
         author: "Customer",
         createdAt: orderData.createdAt || new Date().toISOString(),
      });
   }

   if (tags.packingNote) {
      addIfDistinct({
         id: "tag-packing-note",
         type: "packing",
         title: "Packing Note",
         content: String(tags.packingNote).trim(),
         author: "Staff",
         createdAt:
            orderData.updatedAt ||
            orderData.createdAt ||
            new Date().toISOString(),
      });
   }

   if (tags.employeeNote) {
      addIfDistinct({
         id: "tag-employee-note",
         type: "employee",
         title: "Employee Note",
         content: String(tags.employeeNote).trim(),
         author: "Staff",
         createdAt:
            orderData.updatedAt ||
            orderData.createdAt ||
            new Date().toISOString(),
      });
   }

   // 3. Root orderNote field on Order model
   if (orderData.orderNote) {
      addIfDistinct({
         id: "order-note-field",
         type: "customer",
         title: "Customer Note",
         content: String(orderData.orderNote).trim(),
         author: "Customer",
         createdAt: orderData.createdAt || new Date().toISOString(),
      });
   }

   // 4. Audit History note events
   const auditHistory = Array.isArray(tags.auditHistory)
      ? tags.auditHistory
      : [];
   for (const event of auditHistory) {
      if (
         event &&
         (event.category === "note" ||
            String(event.action || "")
               .toLowerCase()
               .includes("note"))
      ) {
         let content = "";
         if (event.diff?.new) {
            content = String(event.diff.new).trim();
         } else if (event.details) {
            content = String(event.details)
               .replace(/^"|"$/g, "")
               .trim();
         }

         if (content) {
            const actionStr = String(event.action || "").toLowerCase();
            const type: OrderNoteItem["type"] = actionStr.includes("courier")
               ? "courier"
               : actionStr.includes("packing")
                 ? "packing"
                 : actionStr.includes("employee")
                   ? "employee"
                   : actionStr.includes("customer")
                     ? "customer"
                     : "general";

            addIfDistinct({
               id:
                  event.id ||
                  `audit-note-${Math.random().toString(36).substring(2, 7)}`,
               type,
               title: event.badgeLabel || event.action || "Order Note",
               content,
               author: event.actor?.name || "Staff",
               createdAt:
                  event.timestamp ||
                  orderData.createdAt ||
                  new Date().toISOString(),
            });
         }
      }
   }

   return list;
};
