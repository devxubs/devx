"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import {
   Alert,
   Button,
   Stack,
   useTheme,
   Grid,
   TextField,
   Typography,
} from "@mui/material";
import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { TableSkeleton } from "@src/components/SkeletonLoader";
import { AssetDetailModal } from "@src/components/EntityDetailModals/EntityModals";
import { useSettings } from "@src/lib/settingsContext";
import { useSnackbar } from "@src/lib/snackbarContext";
import { fetchAllPages } from "@src/lib/fetchAllPages";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import React, { useEffect, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";

// Phase 2 (2.9): rows and the form now carry the actual Asset fields
// (name, category, value, description). The previous expense-shaped
// form (type/amount/note) hard-coded the category to "Store Asset" on
// every save and destroyed the real category on edit, because the row
// only kept `description || category` as its "note".
type AssetsItem = {
   id: number | string;
   customId?: string;
   name: string;
   category: string;
   value: number;
   description: string;
   date: string;
};
type AssetForm = {
   name: string;
   category: string;
   value: string;
   description: string;
};

export const assetsData: AssetsItem[] = [];

const AssetsSchema = yup.object({
   name: yup.string().required("Name is required"),
   // Category/description are optional content-wise but always present
   // as strings in the form state (hence .defined(), not .optional()).
   category: yup.string().defined(),
   value: yup
      .string()
      .required("Value is required")
      .test("is-number", "Value must be a number", (v) =>
         v === undefined || v === "" ? false : !Number.isNaN(Number(v)),
      ),
   description: yup.string().defined(),
});

const Asset = () => {
   const theme = useTheme();
   const { formatCurrency } = useSettings();
   const { showSnackbar } = useSnackbar();
   // Phase B4b (P1-5): consume the shared toolbar search — the
   // assets API already accepts `search` (name / category / customId),
   // so the term is passed server-side exactly like Expenses does.
   // Previously the box rendered and showed a Keyword chip while this
   // page never read the term, so it filtered nothing.
   const { filterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";
   const [detailAssetId, setDetailAssetId] = useState<string | null>(null);

   // Phase 2 (2.3): global-search deep link — /admin/assets?asset=<id>
   useEffect(() => {
      const id = new URLSearchParams(window.location.search).get("asset");
      if (id) setDetailAssetId(id);
   }, []);

   const columns: ColumnConfig[] = [
      {
         field: "customId",
         headerName: "ID",
         width: 100,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setDetailAssetId(params.row.customId || params.row.id)}
            >
               {/* ID-02: dash instead of the raw database id when a
                   record has no customId yet (lookup still uses id). */}
               {params.row.customId || "—"}
            </Typography>
         ),
      },
      { field: "name", headerName: "Name", flex: 1 },
      { field: "category", headerName: "Category", width: 160 },
      {
         field: "value",
         headerName: "Value",
         width: 150,
         renderCell: (params: any) => formatCurrency(Number(params.row.value || 0)),
      },
      { field: "description", headerName: "Description", flex: 1 },
      { field: "date", headerName: "Date", width: 150 },
      {
         field: "@actions",
         headerName: "",
      },
   ];

   const [assets, setAssets] = useState<AssetsItem[]>([]);
   const [loading, setLoading] = useState(false);
   // Phase 2 (2.6): standard list feedback states.
   const [loadError, setLoadError] = useState<string | null>(null);
   // P3-2: feedback goes through the central snackbar (useSnackbar).

   const loadAssets = React.useCallback(async () => {
      setLoading(true);
      setLoadError(null);
      try {
         // P4-2: the assets API is paginated by default now, so the
         // page walks the bounded pages (carrying the active search
         // term) and renders the same complete set as the old single
         // unbounded response. A failed page throws and lands in the
         // load-error state below — never a silent partial list.
         const term = searchText.trim();
         const data = await fetchAllPages<any>(
            (page, limit) =>
               `/api/assets?page=${page}&limit=${limit}${term ? `&search=${encodeURIComponent(term)}` : ""}`,
            (d) => (Array.isArray(d) ? d : d.assets || []),
            (d) => d.total,
         );
         const mapped = data.map((a: any) => ({
            id: a.id,
            customId: a.customId,
            name: a.name,
            category: a.category || "",
            value: Number(a.value || 0),
            description: a.description || "",
            date: a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : "",
         }));
         setAssets(mapped);
      } catch {
         setLoadError("Failed to load assets.");
      } finally {
         setLoading(false);
      }
   }, [searchText]);

   useEffect(() => {
      loadAssets();
   }, [loadAssets]);

   const [openModal, setOpenModal] = useState(false);

   // edit
   const [editItem, setEditItem] = useState<AssetsItem | null>(null);

   // delete
   const [deleteItem, setDeleteItem] = useState<AssetsItem | null>(null);

   const {
      control,
      handleSubmit,
      reset,
      formState: { errors },
   } = useForm<AssetForm>({
      resolver: yupResolver(AssetsSchema),
      defaultValues: {
         name: "",
         category: "",
         value: "",
         description: "",
      },
   });

   useEffect(() => {
      if (editItem) {
         reset({
            name: editItem.name,
            category: editItem.category || "",
            value: String(editItem.value ?? ""),
            description: editItem.description || "",
         });
      } else {
         reset({
            name: "",
            category: "",
            value: "",
            description: "",
         });
      }
   }, [editItem, reset]);

   const onSubmit: SubmitHandler<AssetForm> = async (formData) => {
      const payload = {
         name: formData.name,
         category: formData.category || null,
         value: Number(formData.value || 0),
         description: formData.description || null,
      };
      try {
         const res = editItem
            ? await fetch(`/api/assets/${editItem.id}`, {
                 method: "PUT",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify(payload),
              })
            : await fetch("/api/assets", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify(payload),
              });
         if (!res.ok) throw new Error("request failed");
         showSnackbar(editItem
               ? "Asset updated successfully."
               : "Asset added successfully.", "success");
         loadAssets();
      } catch {
         showSnackbar("Failed to save the asset.", "error");
         return;
      }

      reset();
      setEditItem(null);
      setOpenModal(false);
   };
   return (
      <Stack spacing={2} py={2}>
         {loadError && (
            <Alert
               severity="error"
               action={
                  <Button color="inherit" size="small" onClick={loadAssets}>
                     Retry
                  </Button>
               }
            >
               {loadError}
            </Alert>
         )}

         {/* Header */}
         <Stack direction="row" justifyContent="flex-end" spacing={2}>
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
                  setEditItem(null);
                  setOpenModal(true);
               }}
            >
               Add Asset
            </Button>
         </Stack>
         {loading ? (
            <TableSkeleton rows={5} cols={5} />
         ) : (
            <CustomTable
               rows={assets}
               columns={columns}
               checkBox
               hideSelectionActions={true}
               canPrint={true}
               canExport={true}
               printConfig={{
                  title: "DevX POS - Fixed & Current Assets Inventory",
               }}
               exportConfig={{
                  filename: `Assets_Inventory_${new Date().toISOString().split("T")[0]}`,
                  title: "DevX POS - Fixed & Current Assets Inventory",
                  fetchAllData: async () => {
                     // Chunked export: walk the assets API in
                     // bounded pages rather than one full response.
                     // A failed page makes fetchAllPages throw, and
                     // the export dialog shows that error — the old
                     // catch-and-return-[] presented failures (and
                     // partial data) as a complete export.
                     const assets = await fetchAllPages(
                        (page, limit) =>
                           `/api/assets?page=${page}&limit=${limit}`,
                        (d) => (Array.isArray(d) ? d : d.assets || []),
                        (d) => d.total,
                     );
                     // Real Asset fields (value/createdAt) — the old
                     // mapping read non-existent amount/purchaseDate/
                     // status fields, so exports always showed 0.
                     return assets.map((a: any) => ({
                        // ID-02: exports show the business id or a
                        // dash — never the raw database id.
                        id: a.customId || "—",
                        name: a.name,
                        category: a.category || "-",
                        value: Number(a.value || 0),
                        date: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "-",
                        description: a.description || "-",
                     }));
                  },
                  summaryRows: (data: any[]) => {
                     const totalValue = data.reduce((acc, row) => acc + (Number(row.value) || 0), 0);
                     return [
                        { label: "Total Assets Tracked:", value: String(data.length) },
                        { label: "Grand Total Valuation:", value: formatCurrency(totalValue), isTotal: true },
                     ];
                  },
               }}
               menuItems={[
                  {
                     label: "View Details",
                     onClick: (params: any) => setDetailAssetId(params.row.customId || params.row.id),
                  },
                  {
                     label: "edit",
                     icon: <Icon icon="solar:pen-bold" size="small" />,
                     onClick: (params) => {
                        setOpenModal(true);
                        setEditItem(params.row);
                     },
                  },
                  {
                     label: "print",
                     icon: (
                        <Icon
                           icon="solar:printer-minimalistic-bold"
                           size="small"
                        />
                     ),
                     onClick: (params: any) => setDetailAssetId(params.row.customId || params.row.id),
                  },
                  {
                     label: "delete",
                     color: "error",
                     onClick: (params) => {
                        setDeleteItem(params.row);
                     },
                     icon: (
                        <Icon
                           icon="solar:trash-bin-trash-bold"
                           size="small"
                           color="error"
                        />
                     ),
                  },
               ]}
            />
         )}
         <CustomModal
            open={openModal}
            onClose={() => setOpenModal(false)}
            title={editItem ? "Edit Asset" : "Add Asset"}
         >
            <Stack
               width={600}
               component={"form"}
               onSubmit={handleSubmit(onSubmit)}
            >
               <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Name
                        </Typography>
                        <Controller
                           name="name"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 placeholder="e.g. Delivery Van"
                                 label="Name"
                                 error={!!errors.name}
                                 helperText={errors.name?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Category
                        </Typography>
                        <Controller
                           name="category"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 placeholder="e.g. Equipment"
                                 label="Category"
                                 error={!!errors.category}
                                 helperText={errors.category?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Value
                        </Typography>
                        <Controller
                           name="value"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 placeholder="Value"
                                 label="Value"
                                 error={!!errors.value}
                                 helperText={errors.value?.message}
                                 type="number"
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Description
                        </Typography>
                        <Controller
                           name="description"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 multiline
                                 minRows={3}
                                 maxRows={4}
                                 placeholder="Description"
                                 label="Description"
                                 error={!!errors.description}
                                 helperText={errors.description?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
               </Grid>
               <Stack
                  spacing={2}
                  direction="row"
                  justifyContent="flex-end"
                  width="100%"
                  mt={2}
               >
                  <Button
                     variant="text"
                     color="inherit"
                     onClick={() => {
                        setOpenModal(false);
                        reset();
                     }}
                  >
                     Cancel
                  </Button>

                  <Button
                     variant="contained"
                     color="primary"
                     type="submit"
                     sx={{
                        position: "relative",
                        overflow: "hidden",
                     }}
                  >
                     {editItem ? "Update Asset" : "Add Asset"}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>
         <AssetDetailModal
            open={Boolean(detailAssetId)}
            onClose={() => setDetailAssetId(null)}
            assetId={detailAssetId}
         />

         <AlertDialog
            open={!!deleteItem}
            onClose={function (): void {
               setDeleteItem(null);
            }}
            onConfirm={async () => {
               if (deleteItem) {
                  try {
                     const res = await fetch(`/api/assets/${deleteItem.id}`, { method: "DELETE" });
                     if (!res.ok) throw new Error("request failed");
                     setAssets((prev) =>
                        prev.filter((item) => item.id !== deleteItem.id),
                     );
                     showSnackbar("Asset deleted successfully.", "success");
                  } catch {
                     showSnackbar("Failed to delete the asset.", "error");
                  }
                  setDeleteItem(null);
               }
            }}
            type={"error"}
            title={`Are you sure want to delete "${deleteItem?.name}"?`}
         />
      </Stack>
   );
};

export default Asset;
