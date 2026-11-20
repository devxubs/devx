import { describe, it, expect } from "vitest";
import {
   permissionKey,
   normalizeStoredPermissions,
   storedToEditorState,
   editorStateToStored,
   type EditorCategory,
} from "@src/Pages/admin/Roles/Publish/permissions";
import { normalizePermissions } from "@src/lib/auth";
import { orderStatuses } from "@src/Pages/admin/Order/data";

// P0-3 (audit C-3): the role editor must hydrate stored
// permissions into its checkbox state, for every stored shape, so
// open → save with no changes persists byte-identical EFFECTIVE
// permissions (the granted-key set the server enforcer computes).
//
// The catalogue below mirrors the editor's (post-fix) catalogue
// shape — including the single merged Chat category — without
// importing the client page component itself.

function buildCatalogue(): EditorCategory[] {
   const cat = (
      id: number,
      name: string,
      permissionNames: string[],
   ): EditorCategory => ({
      id,
      name,
      permissions: permissionNames.map((permissionName, i) => ({
         id: i + 1,
         name: permissionName,
         allow: false,
      })),
   });
   return [
      cat(1, "Dashboard", ["View Dashboard", "Create", "Update", "Delete"]),
      cat(2, "User", ["View User", "Create", "Update", "Delete", "Suspend"]),
      cat(3, "Product", ["View Product", "Create", "Update", "Delete"]),
      cat(6, "Order", [
         "View Order",
         "Create",
         "Update",
         "Delete",
         ...orderStatuses,
      ]),
      cat(7, "Customer", ["View Customer"]),
      cat(12, "Chat", [
         "View Chat",
         "Send Message",
         "Create Group",
         "Delete Group",
         "Add Member",
         "Remove Member",
         "Delete",
      ]),
      cat(14, "Report", ["View Report"]),
      cat(16, "Role", ["View Role", "Create Role", "Update Role", "Delete Role"]),
   ];
}

/** The granted-key set the server enforcer sees for a payload. */
function effectiveKeys(raw: unknown): Record<string, boolean> {
   const normalized = normalizePermissions(raw);
   const out: Record<string, boolean> = {};
   for (const [key, granted] of Object.entries(normalized)) {
      if (granted) out[key] = true;
   }
   return out;
}

/** Open → save with no changes, through the editor mapping. */
function roundTrip(raw: unknown): Record<string, boolean> {
   const state = storedToEditorState(raw, buildCatalogue());
   return editorStateToStored(state.categories, state.extraPermissions);
}

describe("normalizeStoredPermissions mirrors the server enforcer", () => {
   it("agrees with auth.normalizePermissions on every stored shape", () => {
      const shapes: unknown[] = [
         { all: true, orders: true, products: true, users: true, reports: true },
         { user_view_user: true, user_create: true, chat_delete: false },
         { "User Create": "true", ORDERS: true },
         [
            { name: "orders", allow: true },
            { key: "user_create", allow: true },
            { name: "user_delete", allow: false },
            "reports",
         ],
         null,
         undefined,
         {},
      ];
      for (const shape of shapes) {
         expect(normalizeStoredPermissions(shape)).toEqual(
            normalizePermissions(shape),
         );
      }
   });
});

describe("role editor round-trip is lossless for every stored shape", () => {
   it("seed flat map — System Admin ({ all: true, … })", () => {
      const stored = {
         all: true,
         orders: true,
         products: true,
         users: true,
         reports: true,
      };
      expect(roundTrip(stored)).toEqual(effectiveKeys(stored));
   });

   it("seed flat map — Store Manager", () => {
      const stored = {
         orders: true,
         products: true,
         customers: true,
         reports: true,
      };
      expect(roundTrip(stored)).toEqual(effectiveKeys(stored));
   });

   it("seed flat map — Cashier, including the dead orders_read key", () => {
      // `orders_read` matches no route and no checkbox; it must
      // still survive an open → save cycle untouched.
      const stored = { orders: true, orders_read: true, customers: true };
      expect(roundTrip(stored)).toEqual(effectiveKeys(stored));
   });

   it("UI-saved map hydrates the matching checkboxes", () => {
      const stored = {
         user_view_user: true,
         user_create: true,
         product_delete: true,
         order_pending: true,
         report_view_report: true,
      };
      const state = storedToEditorState(stored, buildCatalogue());
      const ticked = state.categories.flatMap((category) =>
         category.permissions
            .filter((p) => p.allow)
            .map((p) => permissionKey(category.name, p.name)),
      );
      expect(ticked.sort()).toEqual(Object.keys(stored).sort());
      expect(state.extraPermissions).toEqual({});
      expect(roundTrip(stored)).toEqual(effectiveKeys(stored));
   });

   it("array form — objects with name/key + allow, and bare strings", () => {
      const stored = [
         { name: "user_view_user", allow: true },
         { key: "chat_send_message", allow: true },
         { name: "user_delete", allow: false },
         "orders",
      ];
      expect(roundTrip(stored)).toEqual(effectiveKeys(stored));
      expect(roundTrip(stored)).toEqual({
         user_view_user: true,
         chat_send_message: true,
         orders: true,
      });
   });

   it("a role holding Chat permissions from BOTH formerly-colliding categories", () => {
      // chat_delete came from the old standalone "Chat" (Delete)
      // category; the rest from the old second "Chat" category.
      // After the merge all of them are individually addressable
      // checkboxes in the single Chat category, under unchanged
      // keys, and the round-trip is exact.
      const stored = {
         chat_delete: true,
         chat_view_chat: true,
         chat_send_message: true,
         chat_create_group: true,
         chat_delete_group: true,
         chat_add_member: true,
         chat_remove_member: true,
      };
      const state = storedToEditorState(stored, buildCatalogue());
      const chatCategories = state.categories.filter(
         (c) => c.name === "Chat",
      );
      expect(chatCategories).toHaveLength(1);
      expect(
         chatCategories[0].permissions.every((p) => p.allow),
      ).toBe(true);
      expect(state.extraPermissions).toEqual({});
      expect(roundTrip(stored)).toEqual(effectiveKeys(stored));
   });

   it("mixed catalogue + non-catalogue keys round-trip together", () => {
      const stored = {
         all: true,
         user_create: true,
         some_future_key: true,
         user_delete: false,
      };
      expect(roundTrip(stored)).toEqual({
         all: true,
         user_create: true,
         some_future_key: true,
      });
   });

   it("empty / missing permissions open as an all-unchecked editor and save empty", () => {
      expect(roundTrip(null)).toEqual({});
      expect(roundTrip(undefined)).toEqual({});
      expect(roundTrip({})).toEqual({});
   });
});

describe("storedToEditorState hygiene", () => {
   it("never mutates the catalogue it is given", () => {
      const catalogue = buildCatalogue();
      const snapshot = JSON.parse(JSON.stringify(catalogue));
      storedToEditorState({ user_create: true, all: true }, catalogue);
      expect(catalogue).toEqual(snapshot);
   });

   it("an edit after hydration keeps the preserved extras", () => {
      const state = storedToEditorState(
         { orders: true, user_create: true },
         buildCatalogue(),
      );
      // User additionally ticks Product → Create.
      const edited = state.categories.map((category) =>
         category.name !== "Product"
            ? category
            : {
                 ...category,
                 permissions: category.permissions.map((p) =>
                    p.name === "Create" ? { ...p, allow: true } : p,
                 ),
              },
      );
      expect(editorStateToStored(edited, state.extraPermissions)).toEqual({
         orders: true,
         user_create: true,
         product_create: true,
      });
   });

   it("permissionKey matches the editor's historical serialization", () => {
      expect(permissionKey("User", "View User")).toBe("user_view_user");
      expect(permissionKey("Order", "Out for Delivery")).toBe(
         "order_out_for_delivery",
      );
      expect(permissionKey("Chat", "Delete")).toBe("chat_delete");
      expect(permissionKey("Chat", "Delete Group")).toBe(
         "chat_delete_group",
      );
   });
});
