"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import {
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
import React, { useEffect, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";

type AssetsItem = {
   id: number | string;
   customId?: string;
   type: string;
   date: string;
   amount: string;
   note: string;
};
type AssetForm = {
   type: string;
   amount: string;
   note: string;
};

export const assetsData: AssetsItem[] = [];

const AssetsSchema = yup.object({
   type: yup.string().required("Type is required"),
   amount: yup.string().required("Amount is required"),
   note: yup.string().required("Note is required"),
});

const Asset = () => {
   const theme = useTheme();
   const [detailAssetId, setDetailAssetId] = useState<string | null>(null);

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
               {params.row.customId || params.row.id}
            </Typography>
         ),
      },
      { field: "type", headerName: "Type", flex: 1 },
      { field: "date", headerName: "Date", width: 150 },
      { field: "amount", headerName: "Amount", width: 150 },
      { field: "note", headerName: "Note", flex: 1 },
      {
         field: "@actions",
         headerName: "",
      },
   ];

   const [assets, setAssets] = useState<AssetsItem[]>([]);
   const [loading, setLoading] = useState(false);

   const loadAssets = React.useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/assets");
         if (res.ok) {
            const data = await res.json();
            const mapped = (Array.isArray(data) ? data : []).map((a: any) => ({
               id: a.id,
               customId: a.customId,
               type: a.name,
               date: a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : "",
               amount: String(a.value),
               note: a.description || a.category || "",
            }));
            setAssets(mapped);
         }
      } catch {
         // fallback
      } finally {
         setLoading(false);
      }
   }, []);

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
         type: "",
         amount: "",
         note: "",
      },
   });

   useEffect(() => {
      if (editItem) {
         reset({
            type: editItem.type,
            amount: editItem.amount,
            note: editItem.note,
         });
      } else {
         reset({
            type: "",
            amount: "",
            note: "",
         });
      }
   }, [editItem, reset]);

   const onSubmit: SubmitHandler<AssetForm> = async (formData) => {
      try {
         if (editItem) {
            await fetch(`/api/assets/${editItem.id}`, {
               method: "PUT",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  name: formData.type,
                  category: "Store Asset",
                  value: formData.amount,
                  description: formData.note,
               }),
            });
         } else {
            await fetch("/api/assets", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  name: formData.type,
                  category: "Store Asset",
                  value: formData.amount,
                  description: formData.note,
               }),
            });
         }
         loadAssets();
      } catch {}

      reset();
      setEditItem(null);
      setOpenModal(false);
   };
   return (
      <Stack spacing={2} py={2}>
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
               onClick={() => setOpenModal(true)}
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
                     try {
                        const res = await fetch("/api/assets");
                        if (!res.ok) return [];
                        const d = await res.json();
                        return (d || []).map((a: any, idx: number) => ({
                           id: a.customId || `AST_${idx + 1}`,
                           name: a.name,
                           category: a.category || "-",
                           amount: Number(a.amount || 0),
                           date: a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : "-",
                           status: a.status || "ACTIVE",
                           description: a.description || "-",
                        }));
                     } catch {
                        return [];
                     }
                  },
                  summaryRows: (data: any[]) => {
                     const totalValue = data.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
                     return [
                        { label: "Total Assets Tracked:", value: String(data.length) },
                        { label: "Grand Total Valuation:", value: `৳ ${totalValue.toFixed(2)}`, isTotal: true },
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
            title="Add Asset"
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
                           Type
                        </Typography>
                        <Controller
                           name="type"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 placeholder="Type"
                                 label="Type"
                                 error={!!errors.type}
                                 helperText={errors.type?.message}
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
                           Amount
                        </Typography>
                        <Controller
                           name="amount"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 placeholder="Amount"
                                 label="Amount"
                                 error={!!errors.amount}
                                 helperText={errors.amount?.message}
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
                           Note
                        </Typography>
                        <Controller
                           name="note"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 multiline
                                 minRows={3}
                                 maxRows={4}
                                 placeholder="Note"
                                 label="Note"
                                 error={!!errors.note}
                                 helperText={errors.note?.message}
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
                     await fetch(`/api/assets/${deleteItem.id}`, { method: "DELETE" });
                  } catch {}
                  setAssets((prev) =>
                     prev.filter((item) => item.id !== deleteItem.id),
                  );
                  setDeleteItem(null);
               }
            }}
            type={"error"}
            title={`Are you sure want to delete "${deleteItem?.type}"?`}
         />
      </Stack>
   );
};

export default Asset;
