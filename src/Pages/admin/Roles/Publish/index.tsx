"use client";

import {
   Stack,
   useTheme,
   Button,
   TextField,
   InputAdornment,
   useMediaQuery,
} from "@mui/material";
import Masonry from "@mui/lab/Masonry";

import Icon from "@src/components/Icon";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Item from "./Item";
import Scrollbar from "react-browser-scrollbar";
import { orderStatuses } from "../../Order/data";
import { storedToEditorState, editorStateToStored } from "./permissions";

export interface Permission {
   id: number;
   name: string;
   allow: boolean;
}

interface DataItem {
   id: number;
   name: string;
   permissions: Permission[];
}

const data: DataItem[] = [
   {
      id: 1,
      name: "Dashboard",
      permissions: [
         {
            id: 1,
            name: "View Dashboard",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 2,
      name: "User",
      permissions: [
         {
            id: 1,
            name: "View User",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
         {
            id: 5,
            name: "Suspend",
            allow: false,
         },
      ],
   },
   {
      id: 3,
      name: "Product",
      permissions: [
         {
            id: 1,
            name: "View Product",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 4,
      name: "Category",
      permissions: [
         {
            id: 1,
            name: "View Category",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 5,
      name: "Unit",
      permissions: [
         {
            id: 1,
            name: "View Unit",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },

   {
      id: 6,
      name: "Order",
      permissions: [
         {
            id: 1,
            name: "View Order",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
         ...orderStatuses.map((status, index) => ({
            // Ids must stay unique within the category: 1–4 are the
            // CRUD permissions above (Delete is 4), so statuses
            // start at 5. (Previously the first status shared id 4
            // with Delete, and toggling one toggled both.)
            id: 5 + index,
            name: status,
            allow: false,
         })),
      ],
   },
   {
      id: 7,
      name: "Customer",
      permissions: [
         {
            id: 1,
            name: "View Customer",
            allow: false,
         },
      ],
   },
   {
      id: 8,
      name: "Supplier",
      permissions: [
         {
            id: 1,
            name: "View Supplier",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 9,
      name: "Purchase",
      permissions: [
         {
            id: 1,
            name: "View Purchase",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 10,
      name: "Expense",
      permissions: [
         {
            id: 1,
            name: "View Expense",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 11,
      name: "Asset",
      permissions: [
         {
            id: 1,
            name: "View Asset",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      // P0-3: previously TWO categories were both named "Chat"
      // (one holding only Delete, one holding the other six), so
      // the two groups collided on the shared category name and
      // could not be addressed independently. They are merged into
      // one Chat category here. Every permission keeps its exact
      // name, so every stored key ("chat_delete",
      // "chat_view_chat", "chat_send_message", …) is unchanged —
      // no key any route checks was renamed.
      id: 12,
      name: "Chat",
      permissions: [
         {
            id: 1,
            name: "View Chat",
            allow: false,
         },
         {
            id: 2,
            name: "Send Message",
            allow: false,
         },
         {
            id: 3,
            name: "Create Group",
            allow: false,
         },
         {
            id: 4,
            name: "Delete Group",
            allow: false,
         },
         {
            id: 5,
            name: "Add Member",
            allow: false,
         },
         {
            id: 6,
            name: "Remove Member",
            allow: false,
         },
         {
            id: 7,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 14,
      name: "Report",
      permissions: [
         {
            id: 1,
            name: "View Report",
            allow: false,
         },
      ],
   },
   {
      id: 15,
      name: "Setting",
      permissions: [
         {
            id: 1,
            name: "View Setting",
            allow: false,
         },
         {
            id: 2,
            name: "Update Setting",
            allow: false,
         },
      ],
   },
   {
      id: 16,
      name: "Role",
      permissions: [
         {
            id: 1,
            name: "View Role",
            allow: false,
         },
         {
            id: 2,
            name: "Create Role",
            allow: false,
         },
         {
            id: 3,
            name: "Update Role",
            allow: false,
         },
         {
            id: 4,
            name: "Delete Role",
            allow: false,
         },
      ],
   },
   {
      id: 17,
      name: "Billing",
      permissions: [
         {
            id: 1,
            name: "View Billing",
            allow: false,
         },
      ],
   },
];

const Publish = () => {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
   const router = useRouter();
   const params = useSearchParams();
   const id = params?.get("id");

   const [role, setRole] = useState(data);
   const [roleName, setRoleName] = useState("");
   const [submitting, setSubmitting] = useState(false);
   // Granted keys the checkbox catalogue cannot represent (seed
   // broad grants, legacy keys) — carried through to the next save
   // verbatim so editing a role never drops them (P0-3).
   const [extraPermissions, setExtraPermissions] = useState<
      Record<string, boolean>
   >({});
   const [searchQuery, setSearchQuery] = useState("");

   useEffect(() => {
      if (!id) return;
      const fetchRole = async () => {
         try {
            const res = await fetch(`/api/roles/${id}`);
            if (res.ok) {
               const r = await res.json();
               setRoleName(r.name || "");
               // P0-3 (audit C-3): hydrate the checkbox state from
               // the role's stored permissions (any stored shape).
               // Previously only the name was loaded and the boxes
               // stayed all-unchecked, so saving wiped every
               // permission the user did not re-tick.
               const hydrated = storedToEditorState(r.permissions, data);
               setRole(hydrated.categories);
               setExtraPermissions(hydrated.extraPermissions);
            }
         } catch {}
      };
      fetchRole();
   }, [id]);

   const updatePermissions = (id: number, updater: (p: any) => any) => {
      setRole((prev) =>
         prev.map((r) =>
            r.id !== id
               ? r
               : {
                    ...r,
                    permissions: r.permissions.map(updater),
                 },
         ),
      );
   };

   const handleSaveRole = async () => {
      if (!roleName.trim()) {
         alert("Please enter a role name");
         return;
      }
      setSubmitting(true);
      try {
         // Checkbox keys plus the preserved non-catalogue grants —
         // saving an unchanged role is a permission no-op (P0-3).
         const permissionSummary = editorStateToStored(
            role,
            extraPermissions,
         );

         const url = id ? `/api/roles/${id}` : "/api/roles";
         const method = id ? "PUT" : "POST";

         const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               name: roleName.trim(),
               description: `${roleName.trim()} role permissions`,
               permissions: permissionSummary,
            }),
         });

         if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to save role");
         }

         router.push("/admin/roles");
      } catch (err: any) {
         alert(err.message || "Failed to save role");
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <Scrollbar autoHide thumbSize={6} darkMode>
         <Stack spacing={2} py={2}>
            <Stack
               spacing={2}
               direction={{ xs: "column", sm: "row" }}
               alignItems="center"
               justifyContent="space-between"
               bgcolor={"background.paper"}
               borderRadius={1}
               p={2}
            >
               <TextField
                  fullWidth
                  placeholder="Search"
                  size={isMobile ? "small" : "medium"}
                  InputProps={{
                     startAdornment: (
                        <InputAdornment position="start">
                           <Icon icon="eva:search-fill" />
                        </InputAdornment>
                     ),
                  }}
                  sx={{
                     flex: !isMobile ? 0.4 : 1,
                  }}
                  onChange={(e) => {
                     // Filter the VISIBLE categories only — the full
                     // checkbox state in `role` is left untouched.
                     // (Previously this replaced the state with the
                     // pristine catalogue, discarding hydrated and
                     // ticked permissions before save.)
                     setSearchQuery(e.target.value);
                  }}
               />
               <TextField
                  fullWidth
                  placeholder="Role Name"
                  value={roleName}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                     flex: !isMobile ? 0.4 : 1,
                  }}
                  onChange={(e) => setRoleName(e.target.value)}
               />
            </Stack>

            <Masonry columns={{ xs: 1, md: 2 }} spacing={2} sequential>
               {role
                  .filter((item) =>
                     item.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
                  )
                  .map((item) => (
                  <Item
                     key={item.id}
                     id={item.id}
                     title={item.name}
                     permissions={item.permissions}
                     onChecked={(PId, allow) => {
                        // Handle individual permission check/uncheck logic here
                        updatePermissions(item.id, (p) =>
                           p.id === PId ? { ...p, allow } : p,
                        );
                     }}
                     onCheckedAll={(id) => {
                        // Handle check/uncheck all logic here
                        updatePermissions(id, (p) => ({
                           ...p,
                           allow:
                              !!item.permissions?.some((p: any) => p.allow) &&
                              !item.permissions?.every((p: any) => p.allow)
                                 ? true
                                 : !item.permissions?.every(
                                      (p: any) => p.allow,
                                   ),
                        }));
                     }}
                  />
               ))}
            </Masonry>

            <Stack
               spacing={2}
               direction={"row"}
               justifyContent={"flex-end"}
            >
               <Button
                  variant="text"
                  color="inherit"
                  disabled={submitting}
                  onClick={() => router.push("/admin/roles")}
               >
                  Cancel
               </Button>
               <Button
                  variant="contained"
                  color="primary"
                  disabled={submitting}
                  onClick={handleSaveRole}
               >
                  {submitting ? "Saving..." : id ? "Update Role" : "Create Role"}
               </Button>
            </Stack>
         </Stack>
      </Scrollbar>
   );
};

export default Publish;
