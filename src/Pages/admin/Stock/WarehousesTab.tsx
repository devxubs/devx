"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
   Alert,
   Button,
   Chip,
   Stack,
   TextField,
   Typography,
   alpha,
   useTheme,
} from "@mui/material";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import CustomModal from "@src/components/Modal";
import Icon from "@src/components/Icon";
import { useFilterQuery } from "@src/handler/useFilterQuery";

// Phase 3A (3.2): warehouses from the existing warehouses API.
// The API supports GET (list, now including per-warehouse stock rows)
// and POST (create) — there is NO update/delete endpoint, so editing
// is not offered here; the list is otherwise read-only.
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

const WarehousesTab = ({ refreshKey }: { refreshKey: number }) => {
   const theme = useTheme();
   const [rows, setRows] = useState<WarehouseRow[]>([]);
   const [loading, setLoading] = useState(false);
   const [modalOpen, setModalOpen] = useState(false);
   const [form, setForm] = useState({
      name: "",
      code: "",
      address: "",
      phone: "",
   });
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);

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
                     address: w.address || "—",
                     phone: w.phone || "—",
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

   const handleCreate = async () => {
      setError(null);
      if (!form.name.trim()) {
         setError("Warehouse name is required.");
         return;
      }
      setSaving(true);
      try {
         const res = await fetch("/api/warehouses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               name: form.name.trim(),
               code: form.code.trim() || undefined,
               address: form.address.trim() || undefined,
               phone: form.phone.trim() || undefined,
            }),
         });
         const data = await res.json().catch(() => ({}));
         if (!res.ok) throw new Error(data.error || "Failed to create warehouse");
         setModalOpen(false);
         setForm({ name: "", code: "", address: "", phone: "" });
         load();
      } catch (err: any) {
         setError(err.message || "Failed to create warehouse");
      } finally {
         setSaving(false);
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
      { field: "address", headerName: "Address", flex: 1 },
      { field: "phone", headerName: "Phone", width: 150 },
      { field: "productCount", headerName: "Products", width: 110 },
      { field: "totalUnits", headerName: "Total Units", width: 120 },
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
               engine. Warehouses can be created here; editing is not
               supported by the current API.
            </Typography>
            <Button
               variant="contained"
               color="primary"
               startIcon={<Icon icon="mingcute:add-line" />}
               onClick={() => setModalOpen(true)}
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
         />

         <CustomModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Add Warehouse"
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
                     onClick={handleCreate}
                     disabled={saving}
                  >
                     {saving ? "Saving..." : "Create Warehouse"}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>
      </Stack>
   );
};

export default WarehousesTab;
