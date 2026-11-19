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
   Snackbar,
} from "@mui/material";
import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { TableSkeleton } from "@src/components/SkeletonLoader";
import { useSettings } from "@src/lib/settingsContext";
import React, { useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { SupplierDetailModal } from "@src/components/EntityDetailModals/EntityModals";

type SuppliersTypes = {
   id: number | string;
   name: string;
   email: string;
   number: string; // 11 digit BD phone number
   address: string;
   // Phase 2 (§2.5): real aggregates from GET /api/suppliers `totals`
   // (summed over the supplier's non-deleted purchases). The previous
   // advance / pay_return / due_return fields had no data source
   // anywhere in the system and were displayed as constant zeros.
   purchases?: number;
   total?: number;
   pay?: number;
   due?: number;
};
export const suppliersData: SuppliersTypes[] = [];

export const SuppliersSchema = yup.object({
   name: yup
      .string()
      .min(2, "Name is too short")
      .max(50, "Name is too long")
      .required("Name is required"),

   number: yup
      .string()
      .matches(/^01[0-9]{9}$/, "Invalid Bangladeshi mobile number")
      .required("Mobile number is required"),

   email: yup
      .string()
      .email("Invalid email format")
      .required("Email is required"),

   address: yup.string().required("Address is required"),
});

export type SupplierFormValues = yup.InferType<typeof SuppliersSchema>;

interface SuppliersProfileProps {
   name: string | undefined;
   number: string | undefined;
}

export const SuppliersProfile = ({ name, number }: SuppliersProfileProps) => {
   return (
      <Stack height={"100%"} justifyContent={"center"}>
         <Typography
            variant="subtitle2"
            color="textPrimary"
            fontSize={15}
            fontWeight={500}
         >
            {name}
         </Typography>
         <Typography variant="subtitle1" fontSize={13} color="text.secondary">
            {number}
         </Typography>
      </Stack>
   );
};

const Suppliers = () => {
   const theme = useTheme();
   const { formatCurrency } = useSettings();
   const [detailSupplierId, setDetailSupplierId] = useState<string | null>(null);
   const [loadError, setLoadError] = useState(false);
   const [snack, setSnack] = useState<string | null>(null);

   // Phase 2 (2.3): global-search deep link — /admin/suppliers?supplier=<id>
   React.useEffect(() => {
      const id = new URLSearchParams(window.location.search).get("supplier");
      if (id) setDetailSupplierId(id);
   }, []);

   const columns: ColumnConfig[] = [
      {
         field: "id",
         headerName: "ID",
         flex: 0.2,
         renderCell: (params) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{ fontFamily: "monospace", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setDetailSupplierId(params.row.customId || params.row.id)}
            >
               {params.row.customId || params.row.id}
            </Typography>
         ),
      },
      {
         field: "name",
         headerName: "Name",
         flex: 1,
         renderCell: (params) => (
            <Stack
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setDetailSupplierId(params.row.customId || params.row.id)}
            >
               <SuppliersProfile
                  name={params.row.name}
                  number={params.row.number}
               />
            </Stack>
         ),
      },
      {
         field: "address",
         headerName: "Address",
         flex: 1,
      },
      {
         field: "purchases",
         headerName: "Purchases",
         width: 110,
      },
      {
         field: "total",
         headerName: "Total Purchased",
         renderCell: (params) => formatCurrency(Number(params.row.total || 0)),
      },
      {
         field: "pay",
         headerName: "Paid",
         renderCell: (params) => formatCurrency(Number(params.row.pay || 0)),
      },
      {
         field: "due",
         headerName: "Payable (Due)",
         renderCell: (params) =>
            Number(params.row.due || 0) > 0 ? (
               <Typography variant="body2" fontWeight={700} color="error.main">
                  {formatCurrency(Number(params.row.due))}
               </Typography>
            ) : (
               formatCurrency(0)
            ),
      },
      {
         field: "@actions",
         headerName: "",
      },
   ];

   const [suppliers, setSuppliers] = useState<SuppliersTypes[]>([]);
   const [loading, setLoading] = useState(false);

   const loadSuppliers = React.useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/suppliers");
         if (res.ok) {
            const data = await res.json();
            const mapped = (Array.isArray(data) ? data : data.suppliers || []).map((s: any, idx: number) => ({
               id: s.id,
               customId: s.customId || `SUP_${idx + 1}`,
               name: s.name,
               email: s.email || "-",
               number: s.phone || "-",
               address: s.address || "-",
               purchases: s.totals?.purchases ?? s._count?.purchases ?? 0,
               total: Number(s.totals?.total || 0),
               pay: Number(s.totals?.paid || 0),
               due: Number(s.totals?.due || 0),
            }));
            setSuppliers(mapped);
            setLoadError(false);
         } else {
            setLoadError(true);
         }
      } catch {
         setLoadError(true);
      } finally {
         setLoading(false);
      }
   }, []);

   React.useEffect(() => {
      loadSuppliers();
   }, [loadSuppliers]);

   // modal
   const [open, setModalOpen] = useState(false);

   // edit
   const [edit, setEdit] = useState<SuppliersTypes | null>(null);

   // delete
   const [deleteOpen, setDeleteOpen] = useState<SuppliersTypes | null>(null);

   const {
      control,
      handleSubmit,
      reset,
      formState: { errors },
   } = useForm<SupplierFormValues>({
      resolver: yupResolver<SupplierFormValues, any, any>(SuppliersSchema),
      defaultValues: {
         name: "",
         number: "",
         email: "",
         address: "",
      },
   });

   const onSubmit: SubmitHandler<SupplierFormValues> = async (formData) => {
      try {
         const res = await fetch(
            edit ? `/api/suppliers/${edit.id}` : "/api/suppliers",
            {
               method: edit ? "PUT" : "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  name: formData.name,
                  email: formData.email,
                  phone: formData.number,
                  address: formData.address,
               }),
            },
         );
         if (!res.ok) throw new Error("save failed");
         setSnack(edit ? "Supplier updated." : "Supplier added.");
         setEdit(null);
         loadSuppliers();
         setModalOpen(false);
      } catch {
         setSnack("Failed to save the supplier. Please try again.");
      }
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
                        color: theme.palette.common.white,
                     }}
                  />
               }
               onClick={() => {
                  reset({
                     name: "",
                     number: "",
                     email: "",
                     address: "",
                  });

                  setModalOpen(true);
               }}
            >
               Add Supplier
            </Button>
         </Stack>
         {loadError && !loading && (
            <Alert
               severity="error"
               action={
                  <Button color="inherit" size="small" onClick={loadSuppliers}>
                     Retry
                  </Button>
               }
            >
               Failed to load suppliers. Please try again.
            </Alert>
         )}
         {loading && suppliers.length === 0 ? (
            <TableSkeleton rows={5} cols={6} />
         ) : (
            <CustomTable
               rows={suppliers}
               columns={columns}
               checkBox={true}
               hideSelectionActions={true}
               canPrint={true}
               canExport={true}
               printConfig={{
                  title: "DevX POS - Suppliers Directory",
               }}
               exportConfig={{
                  filename: `Suppliers_Directory_${new Date().toISOString().split("T")[0]}`,
                  title: "DevX POS - Suppliers Directory",
                  fetchAllData: async () => {
                     try {
                        const res = await fetch("/api/suppliers");
                        if (!res.ok) return [];
                        const data = await res.json();
                        return (data || []).map((s: any, idx: number) => ({
                           id: s.customId || `SUP_${idx + 1}`,
                           name: s.name,
                           number: s.phone || "-",
                           address: s.address || "-",
                           purchases: s.totals?.purchases ?? s._count?.purchases ?? 0,
                           total: Number(s.totals?.total || 0),
                           pay: Number(s.totals?.paid || 0),
                           due: Number(s.totals?.due || 0),
                        }));
                     } catch {
                        return [];
                     }
                  },
                  summaryRows: (data: any[]) => [
                     { label: "Total Suppliers Count:", value: String(data.length) },
                  ],
               }}
               menuItems={[
                  {
                     label: "View Details",
                     onClick: (p) => {
                        setDetailSupplierId(p.row.customId || p.row.id);
                     },
                  },
                  {
                     label: "edit",
                     onClick: (p) => {
                        setEdit(p.row);
                        setModalOpen(true);
                     },
                  },
                  {
                     label: "print",
                     onClick: (p) => {
                        setDetailSupplierId(p.row.customId || p.row.id);
                     },
                  },
                  {
                     label: "delete",
                     color: "error",
                     onClick: (p) => {
                        setDeleteOpen(p.row);
                     },
                  },
               ]}
            />
         )}
         <SupplierDetailModal
            open={Boolean(detailSupplierId)}
            onClose={() => setDetailSupplierId(null)}
            supplierId={detailSupplierId}
         />
         <CustomModal
            open={open}
            onClose={() => setModalOpen(false)}
            title="Add Supplier"
         >
            <Stack
               width={{
                  xs: "90vw",
                  sm: "500px",
               }}
               p={{
                  xs: 2,
                  sm: 1,
               }}
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
                           Full Name
                        </Typography>
                        <Controller
                           name="name"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 value={field.value}
                                 onChange={field.onChange}
                                 fullWidth
                                 placeholder="Name"
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
                           Mobile Number
                        </Typography>
                        <Controller
                           name="number"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 value={field.value}
                                 onChange={field.onChange}
                                 fullWidth
                                 placeholder="Number"
                                 label="Number"
                                 error={!!errors.number}
                                 helperText={errors.number?.message}
                                 type="number"
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
                           Email
                        </Typography>
                        <Controller
                           name="email"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 value={field.value}
                                 onChange={field.onChange}
                                 fullWidth
                                 placeholder="Email"
                                 label="Email"
                                 error={!!errors.email}
                                 helperText={errors.email?.message}
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
                           Address
                        </Typography>
                        <Controller
                           name="address"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 value={field.value}
                                 onChange={field.onChange}
                                 fullWidth
                                 placeholder="Address"
                                 label="Address"
                                 error={!!errors.address}
                                 helperText={errors.address?.message}
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
                        reset();
                        setModalOpen(false);
                        setEdit(null);
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
                     {edit ? "Update Supplier" : "Add Supplier"}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>
         <AlertDialog
            open={Boolean(deleteOpen)}
            type={"error"}
            title={`Are you sure want to delete "${deleteOpen?.name}"?`}
            onConfirm={async () => {
               if (deleteOpen) {
                  try {
                     const res = await fetch(`/api/suppliers/${deleteOpen.id}`, { method: "DELETE" });
                     if (!res.ok) throw new Error("delete failed");
                     setSuppliers(suppliers.filter((s) => s.id !== deleteOpen.id));
                     setSnack("Supplier deleted.");
                  } catch {
                     setSnack("Failed to delete the supplier.");
                  }
                  setDeleteOpen(null);
               }
            }}
            onClose={function (): void {
               setDeleteOpen(null);
            }}
         />
         <Snackbar
            open={Boolean(snack)}
            autoHideDuration={4000}
            onClose={() => setSnack(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
         >
            {snack ? (
               <Alert
                  severity={snack.startsWith("Failed") ? "error" : "success"}
                  onClose={() => setSnack(null)}
                  sx={{ width: "100%" }}
               >
                  {snack}
               </Alert>
            ) : undefined}
         </Snackbar>
      </Stack>
   );
};

export default Suppliers;
