"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
   Alert,
   Box,
   Button,
   Chip,
   CircularProgress,
   FormControlLabel,
   Stack,
   Switch,
   TextField,
   Typography,
   alpha,
   useTheme,
} from "@mui/material";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import CustomModal from "@src/components/Modal";
import Icon from "@src/components/Icon";
import { useFilterQuery } from "@src/handler/useFilterQuery";

// Phase 3A (3.2): warehouses from the warehouses API (GET list with
// per-warehouse stock rows, POST create). P2-1: the API now also has
// PUT/DELETE on /api/warehouses/[id], so this tab offers edit and
// delete alongside create, following the Unit page's row-menu +
// confirm-dialog patterns.
interface WarehouseRow {
   id: string;
   customId: string;
   name: string;
   code: string;
   address: string;
   phone: string;
   isDefault: boolean;
   productCount: number;
   totalUnits: number;
}

const emptyForm = { name: "", code: "", address: "", phone: "", isDefault: false };

const WarehousesTab = ({ refreshKey }: { refreshKey: number }) => {
   const theme = useTheme();
   const [rows, setRows] = useState<WarehouseRow[]>([]);
   const [loading, setLoading] = useState(false);
   const [modalOpen, setModalOpen] = useState(false);
   const [editing, setEditing] = useState<WarehouseRow | null>(null);
   const [form, setForm] = useState(emptyForm);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<WarehouseRow | null>(null);
   const [deleting, setDeleting] = useState(false);
   const [deleteError, setDeleteError] = useState<string | null>(null);

   const load = useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/warehouses");
         if (res.ok) {
            const list = await res.json();
            setRows(
               (Array.isArray(list) ? list : []).map((w: any) => {
                  const stocks: any[] = Array.isArray(w.stocks) ? w.stocks : [];
                  return {
                     id: w.id,
                     customId: w.customId || "",
                     name: w.name,
                     code: w.code || "",
                     address: w.address || "",
                     phone: w.phone || "",
                     isDefault: !!w.isDefault,
                     productCount: stocks.length,
                     totalUnits: stocks.reduce(
                        (s: number, st: any) => s + (Number(st.quantity) || 0),
                        0,
                     ),
                  };
               }),
            );
         }
      } catch {
         // Empty state renders below.
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      load();
   }, [load, refreshKey]);

   const openCreate = () => {
      setEditing(null);
      setForm(emptyForm);
      setError(null);
      setModalOpen(true);
   };

   const openEdit = (row: WarehouseRow) => {
      setEditing(row);
      setForm({
         name: row.name,
         code: row.code,
         address: row.address,
         phone: row.phone,
         isDefault: row.isDefault,
      });
      setError(null);
      setModalOpen(true);
   };

   const handleSave = async () => {
      setError(null);
      if (!form.name.trim()) {
         setError("Warehouse name is required.");
         return;
      }
      setSaving(true);
      try {
         const res = await fetch(
            editing ? `/api/warehouses/${editing.id}` : "/api/warehouses",
            {
               method: editing ? "PUT" : "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  name: form.name.trim(),
                  code: form.code.trim() || undefined,
                  address: form.address.trim() || undefined,
                  phone: form.phone.trim() || undefined,
                  isDefault: form.isDefault,
               }),
            },
         );
         const data = await res.json().catch(() => ({}));
         if (!res.ok)
            throw new Error(
               data.error ||
                  (editing
                     ? "Failed to update warehouse"
                     : "Failed to create warehouse"),
            );
         setModalOpen(false);
         setEditing(null);
         setForm(emptyForm);
         load();
      } catch (err: any) {
         setError(
            err.message ||
               (editing
                  ? "Failed to update warehouse"
                  : "Failed to create warehouse"),
         );
      } finally {
         setSaving(false);
      }
   };

   const handleDelete = async () => {
      if (!deleteTarget) return;
      setDeleteError(null);
      setDeleting(true);
      try {
         const res = await fetch(`/api/warehouses/${deleteTarget.id}`, {
            method: "DELETE",
         });
         const data = await res.json().catch(() => ({}));
         if (!res.ok) throw new Error(data.error || "Failed to delete warehouse");
         setDeleteTarget(null);
         load();
      } catch (err: any) {
         setDeleteError(err.message || "Failed to delete warehouse");
      } finally {
         setDeleting(false);
      }
   };

   // The shared CustomTable toolbar renders a search box on every
   // table (wired to the page-level filter query, like Products and
   // the Movements tab). Consume it here too — the warehouse list is
   // loaded in full client-side (GET /api/warehouses takes no search
   // param), so the search filters the loaded rows client-side; the
   // API call itself is unchanged.
   const { filterQueryData } = useFilterQuery();
   const search = (filterQueryData.searchText || "").trim().toLowerCase();
   const visibleRows = useMemo(() => {
      if (!search) return rows;
      return rows.filter(
         (r) =>
            r.name.toLowerCase().includes(search) ||
            (r.code || "").toLowerCase().includes(search) ||
            (r.customId || "").toLowerCase().includes(search) ||
            (r.address || "").toLowerCase().includes(search) ||
            (r.phone || "").toLowerCase().includes(search),
      );
   }, [rows, search]);

   const columns: ColumnConfig[] = [
      { field: "customId", headerName: "ID", width: 110 },
      {
         field: "name",
         headerName: "Name",
         flex: 1,
         renderCell: (params: any) => (
            <Stack direction="row" spacing={1} alignItems="center">
               <Typography variant="body2">{params.row.name}</Typography>
               {params.row.isDefault && (
                  <Chip
                     size="small"
                     label="Default"
                     sx={{
                        // Same soft tinted chip the shared CustomTable
                        // chip columns render (no solid fills).
                        borderRadius: 0.5,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                     }}
                  />
               )}
            </Stack>
         ),
      },
      { field: "code", headerName: "Code", width: 130 },
      {
         field: "address",
         headerName: "Address",
         flex: 1,
         renderCell: (params: any) => params.row.address || "—",
      },
      {
         field: "phone",
         headerName: "Phone",
         width: 150,
         renderCell: (params: any) => params.row.phone || "—",
      },
      { field: "productCount", headerName: "Products", width: 110 },
      { field: "totalUnits", headerName: "Total Units", width: 120 },
      { field: "@actions", headerName: "" },
   ];

   return (
      <Stack spacing={2}>
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
         >
            <Typography variant="body2" color="text.secondary">
               Stock is mirrored to the default warehouse by the stock
               engine. Warehouses can be created, edited and deleted
               here; the default warehouse and warehouses still holding
               stock cannot be deleted.
            </Typography>
            <Button
               variant="contained"
               color="primary"
               startIcon={<Icon icon="mingcute:add-line" />}
               onClick={openCreate}
            >
               Add Warehouse
            </Button>
         </Stack>

         <CustomTable
            rows={visibleRows}
            columns={columns}
            loading={loading}
            canPrint={false}
            canExport={false}
            hideSelectionToolbar
            showSelectionIndicators={false}
            hideSelectionActions
            menuItems={[
               {
                  label: "edit",
                  icon: <Icon icon="solar:pen-bold" size="small" />,
                  onClick: (p: any) => openEdit(p.row as WarehouseRow),
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
                  onClick: (p: any) => {
                     setDeleteError(null);
                     setDeleteTarget(p.row as WarehouseRow);
                  },
               },
            ]}
         />

         <CustomModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={editing ? "Edit Warehouse" : "Add Warehouse"}
         >
            <Stack spacing={2} sx={{ mt: 1, minWidth: { sm: 420 } }}>
               <TextField
                  label="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  fullWidth
                  size="small"
                  required
               />
               <TextField
                  label="Code (optional)"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  fullWidth
                  size="small"
               />
               <TextField
                  label="Address"
                  value={form.address}
                  onChange={(e) =>
                     setForm({ ...form, address: e.target.value })
                  }
                  fullWidth
                  size="small"
               />
               <TextField
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  fullWidth
                  size="small"
               />
               <FormControlLabel
                  control={
                     <Switch
                        checked={form.isDefault}
                        onChange={(e) =>
                           setForm({ ...form, isDefault: e.target.checked })
                        }
                        color="primary"
                     />
                  }
                  label={
                     <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                           Default warehouse
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                           The stock engine mirrors stock changes to the
                           default warehouse
                        </Typography>
                     </Box>
                  }
               />
               {error && <Alert severity="error">{error}</Alert>}
               <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                  <Button
                     variant="text"
                     color="inherit"
                     onClick={() => setModalOpen(false)}
                     disabled={saving}
                  >
                     Cancel
                  </Button>
                  <Button
                     variant="contained"
                     color="primary"
                     onClick={handleSave}
                     disabled={saving}
                  >
                     {saving
                        ? "Saving..."
                        : editing
                          ? "Save Changes"
                          : "Create Warehouse"}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>

         {/* Delete confirmation — same shape as the Unit delete
             dialog. Copy is honest about the current behaviour:
             warehouses are soft-deleted server-side and stock
             history is preserved, but there is no Bin restore entry
             for warehouses yet. */}
         <CustomModal
            open={Boolean(deleteTarget)}
            onClose={() => {
               if (!deleting) setDeleteTarget(null);
            }}
            closeIcon={!deleting}
            sx={{ width: { xs: "92%", sm: 440 }, borderRadius: 1.5, p: 3 }}
         >
            <Stack spacing={2.5}>
               <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                     sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        bgcolor: "error.lighter",
                        color: "error.main",
                     }}
                  >
                     <Icon icon="solar:trash-bin-trash-bold" size="24px" />
                  </Box>
                  <Box>
                     <Typography variant="h6" fontWeight={700}>
                        Delete Warehouse
                     </Typography>
                     <Typography variant="caption" color="text.secondary">
                        ID: {deleteTarget?.customId || "—"}
                     </Typography>
                  </Box>
               </Stack>

               <Typography variant="body2" color="text.secondary">
                  Are you sure you want to delete warehouse{" "}
                  <Typography
                     component="span"
                     fontWeight={600}
                     color="text.primary"
                  >
                     &quot;{deleteTarget?.name}&quot;
                  </Typography>
                  ? It will be removed from the warehouses list. Its stock
                  history is preserved in the movement ledger.
               </Typography>

               {deleteTarget?.isDefault && (
                  <Alert severity="warning" sx={{ fontSize: "0.85rem" }}>
                     This is the default warehouse — the server will refuse
                     the deletion until another warehouse is set as default.
                  </Alert>
               )}
               {deleteError && <Alert severity="error">{deleteError}</Alert>}

               <Stack direction="row" spacing={1.5} justifyContent="flex-end" pt={1}>
                  <Button
                     color="inherit"
                     variant="outlined"
                     onClick={() => setDeleteTarget(null)}
                     disabled={deleting}
                     sx={{ px: 2.5 }}
                  >
                     Cancel
                  </Button>
                  <Button
                     variant="contained"
                     color="error"
                     onClick={handleDelete}
                     disabled={deleting}
                     startIcon={
                        deleting ? (
                           <CircularProgress size={16} color="inherit" />
                        ) : (
                           <Icon icon="solar:trash-bin-trash-bold" size="18px" />
                        )
                     }
                     sx={{ px: 3 }}
                  >
                     {deleting ? "Deleting..." : "Delete"}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>
      </Stack>
   );
};

export default WarehousesTab;
