"use client";

import { Alert, Button, Chip, Stack, Typography, useTheme } from "@mui/material";
import AlertDialog from "@src/components/AlertDialog";
import { TableSkeleton } from "@src/components/SkeletonLoader";
import { useSnackbar } from "@src/lib/snackbarContext";
import Icon from "@src/components/Icon";
import CustomTable, { MenuItem } from "@src/components/Table";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { filterRowsBySearch } from "@src/lib/tableSearch";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import Scrollbar from "react-browser-scrollbar";

// Phase 1 (1.7): read-only permission summary for the roles list, so an
// admin can see what a role grants without opening the editor. Handles
// all three stored permission shapes (seed map, Roles-UI map, array).
// (The unused hard-coded `roles` mock array that used to sit here was
// removed — the table has always rendered API data.)
const summarizePermissions = (raw: any) => {
   const granted = new Set<string>();
   if (Array.isArray(raw)) {
      raw.forEach((entry: any) => {
         const key =
            entry && typeof entry === "object"
               ? String(entry.key || entry.name || "")
               : String(entry || "");
         const allow =
            entry && typeof entry === "object"
               ? entry.allow !== false && entry.value !== false
               : true;
         if (key && allow) granted.add(key.trim().toLowerCase());
      });
   } else if (raw && typeof raw === "object") {
      Object.entries(raw).forEach(([k, v]) => {
         if (v === true || v === "true") granted.add(k.trim().toLowerCase());
      });
   }
   if (granted.has("all")) {
      return { fullAccess: true, modules: [] as string[], count: granted.size };
   }
   const modules = Array.from(
      new Set(
         Array.from(granted).map((k) => {
            const head = k.split("_")[0];
            return head.charAt(0).toUpperCase() + head.slice(1);
         }),
      ),
   ).sort();
   return { fullAccess: false, modules, count: granted.size };
};

const columns = [
   {
      field: "customId",
      headerName: "ID",
      width: 120,
      renderCell: (params: any) => (
         <Typography variant="body2" fontWeight={600} color="primary.main">
            {params.row.customId || params.row.id}
         </Typography>
      ),
   },
   {
      field: "name",
      headerName: "Name",
      flex: 0.6,
   },
   {
      field: "permissions",
      headerName: "Permissions",
      flex: 1.4,
      sortable: false,
      renderCell: (params: any) => {
         const summary = summarizePermissions(params.row.permissions);
         const userCount = params.row._count?.users;
         if (summary.fullAccess) {
            return (
               <Stack direction="row" spacing={1} alignItems="center" height="100%">
                  <Chip label="Full access" size="small" color="primary" />
                  {typeof userCount === "number" && (
                     <Typography variant="caption" color="text.secondary">
                        {userCount} user{userCount === 1 ? "" : "s"}
                     </Typography>
                  )}
               </Stack>
            );
         }
         if (summary.count === 0) {
            return (
               <Typography variant="body2" color="text.secondary">
                  No permissions granted
               </Typography>
            );
         }
         const shown = summary.modules.slice(0, 4);
         const extra = summary.modules.length - shown.length;
         return (
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" height="100%">
               {shown.map((m) => (
                  <Chip key={m} label={m} size="small" variant="outlined" />
               ))}
               {extra > 0 && (
                  <Chip label={`+${extra} more`} size="small" variant="outlined" />
               )}
               <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  {summary.count} permission{summary.count === 1 ? "" : "s"}
                  {typeof userCount === "number" ? ` · ${userCount} user${userCount === 1 ? "" : "s"}` : ""}
               </Typography>
            </Stack>
         );
      },
   },
   {
      field: "@actions",
      headerName: "",
      width: 150,
   },
];

const Roles = () => {
   const theme = useTheme();
   const { showSnackbar } = useSnackbar();
   const router = useRouter();

   const [rolesData, setRolesData] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);
   // P3-5: a failed load used to be silent (empty table, no signal).
   // It now surfaces the Product/Purchase banner + Retry pattern.
   const [loadError, setLoadError] = useState<string | null>(null);

   const loadRoles = React.useCallback(async () => {
      setLoading(true);
      setLoadError(null);
      try {
         const res = await fetch("/api/roles");
         if (res.ok) {
            const data = await res.json();
            setRolesData(data);
         } else {
            setLoadError("Failed to load roles.");
         }
      } catch {
         setLoadError("Failed to load roles.");
      } finally {
         setLoading(false);
      }
   }, []);

   React.useEffect(() => {
      loadRoles();
   }, [loadRoles]);

   const [roleToDelete, setRoleToDelete] = useState<any>(null);

   // Phase B4b (P1-5): consume the shared toolbar search — roles are
   // a small fully-loaded set, so the term filters client-side
   // (lib/tableSearch) over the displayed name / ID and the granted
   // permission modules the Permissions cell renders (so searching a
   // module name finds the roles that grant it).
   const { filterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";
   const filteredRoles = React.useMemo(
      () =>
         filterRowsBySearch(rolesData, searchText, [
            "name",
            "customId",
            "id",
            (r: any) => {
               const summary = summarizePermissions(r.permissions);
               return summary.fullAccess
                  ? "full access"
                  : summary.modules.join(" ");
            },
         ]),
      [rolesData, searchText],
   );

   const actionMenu: MenuItem[] = [
      {
         label: "edit",
         icon: <Icon icon="solar:pen-bold" size="small" />,
         onClick: (params) => {
            router.push(
               `/admin/roles/publish?id=${encodeURIComponent(params.row.id)}`,
            );
         },
      },
      {
         label: "delete",
         color: "error",
         icon: (
            <Icon
               icon="solar:trash-bin-trash-bold"
               size="small"
               color="error"
            />
         ),
         onClick: (params) => {
            setRoleToDelete(params.row);
         },
      },
   ];

   return (
      <Scrollbar autoHide thumbSize={6} darkMode>
         <Stack spacing={2} py={2}>
            <Stack direction={"row"} justifyContent={"flex-end"}>
               <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                     <Icon
                        icon="mingcute:add-line"
                        style={{
                           color: theme.palette.text.primary,
                        }}
                     />
                  }
                  onClick={() => {
                     router.push("/admin/roles/publish");
                  }}
               >
                  Add Roles
               </Button>
            </Stack>
            {loadError && (
               <Alert
                  severity="error"
                  action={
                     <Button color="inherit" size="small" onClick={loadRoles}>
                        Retry
                     </Button>
                  }
               >
                  {loadError}
               </Alert>
            )}
            <Stack>
               {/* P3-4: sibling list pages show a TableSkeleton while
                   loading; Roles passed no loading visual at all. */}
               {loading ? (
                  <TableSkeleton rows={5} cols={4} />
               ) : (
                  <CustomTable
                     rows={filteredRoles}
                     columns={columns}
                     menuItems={actionMenu}
                  />
               )}
               <AlertDialog
                  open={!!roleToDelete}
                  onClose={() => {
                     setRoleToDelete(null);
                  }}
                  onConfirm={async () => {
                     if (roleToDelete) {
                        // P3-2: deletes previously gave no feedback.
                        try {
                           const res = await fetch(`/api/roles/${roleToDelete.id}`, { method: "DELETE" });
                           if (!res.ok) throw new Error("request failed");
                           showSnackbar("Role deleted successfully.", "success");
                        } catch {
                           showSnackbar("Failed to delete the role.", "error");
                        }
                        setRolesData((prev) =>
                           prev.filter((role) => role.id !== roleToDelete.id),
                        );
                        setRoleToDelete(null);
                     }
                  }}
                  type={"delete"}
                  title={`Are you sure you want to delete the role <b>${roleToDelete?.name}</b>?`}
               />
            </Stack>
         </Stack>
      </Scrollbar>
   );
};

export default Roles;
