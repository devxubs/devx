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
import { ExpenseDetailModal } from "@src/components/EntityDetailModals/EntityModals";
import React, { useEffect, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";

type ExpenseItem = {
   id: number | string;
   customId?: string;
   type: string;
   date: string;
   amount: string;
   note: string;
};
type ExpenseForm = {
   type: string;
   amount: string;
   note: string;
};

export const expensesData: ExpenseItem[] = [];

const expenseSchema = yup.object({
   type: yup.string().required("Type is required"),
   amount: yup.string().required("Amount is required"),
   note: yup.string().required("Note is required"),
});

const Expense = () => {
   const theme = useTheme();
   const [detailExpenseId, setDetailExpenseId] = useState<string | null>(null);

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
               onClick={() => setDetailExpenseId(params.row.customId || params.row.id)}
            >
               {params.row.customId || params.row.id}
            </Typography>
         ),
      },
      { field: "type", headerName: "Type", flex: 1 },
      { field: "date", headerName: "Date", width: 150 },
      { field: "amount", headerName: "Amount", width: 150 },
      { field: "note", headerName: "Note", flex: 1 },
      { field: "@actions", headerName: "" },
   ];

   const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
   const [loading, setLoading] = useState(false);

   const loadExpenses = React.useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/expenses?limit=100");
         if (res.ok) {
            const data = await res.json();
            const mapped = (data.expenses || []).map((e: any) => ({
               id: e.id,
               customId: e.customId,
               type: e.type,
               date: e.createdAt ? new Date(e.createdAt).toISOString().split("T")[0] : "",
               amount: String(e.amount),
               note: e.note || "",
            }));
            setExpenses(mapped);
         }
      } catch {
         // fallback
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      loadExpenses();
   }, [loadExpenses]);

   const [openModal, setOpenModal] = useState(false);

   // edit
   const [editItem, setEditItem] = useState<ExpenseItem | null>(null);

   // delete
   const [deleteItem, setDeleteItem] = useState<ExpenseItem | null>(null);

   const {
      control,
      handleSubmit,
      reset,
      formState: { errors },
   } = useForm<ExpenseForm>({
      resolver: yupResolver(expenseSchema),
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

   const onSubmit: SubmitHandler<ExpenseForm> = async (formData) => {
      try {
         if (!editItem) {
            await fetch("/api/expenses", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(formData),
            });
         } else {
            await fetch(`/api/expenses/${editItem.id}`, {
               method: "PUT",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(formData),
            });
         }
         loadExpenses();
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
               Add Expense
            </Button>
         </Stack>
         {loading ? (
            <TableSkeleton rows={5} cols={5} />
         ) : (
            <CustomTable
               rows={expenses}
               columns={columns}
               checkBox={true}
               canPrint={true}
               canExport={true}
               printConfig={{
                  title: "DevX POS - Operating Expenses Report",
               }}
               exportConfig={{
                  filename: `Expenses_Report_${new Date().toISOString().split("T")[0]}`,
                  title: "DevX POS - Operating Expenses Report",
                  fetchAllData: async () => {
                     try {
                        const res = await fetch("/api/expenses?all=true");
                        if (!res.ok) return [];
                        const d = await res.json();
                        return (d.expenses || []).map((ex: any, idx: number) => ({
                           id: ex.customId || `EXP_${idx + 1}`,
                           type: ex.type || "-",
                           amount: Number(ex.amount || 0),
                           date: ex.date ? new Date(ex.date).toLocaleDateString() : "-",
                           note: ex.note || "-",
                        }));
                     } catch {
                        return [];
                     }
                  },
                  summaryRows: (data: any[]) => {
                     const totalAmount = data.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
                     return [
                        { label: "Total Vouchers:", value: String(data.length) },
                        { label: "Grand Total Expenses:", value: `৳ ${totalAmount.toFixed(2)}`, isTotal: true },
                     ];
                  },
               }}
               menuItems={[
                  {
                     label: "View Details",
                     onClick: (params: any) => setDetailExpenseId(params.row.customId || params.row.id),
                  },
                  {
                     label: "edit",
                     icon: <Icon icon="solar:pen-bold" size="small" />,
                     onClick: (params) => {
                        setEditItem(params.row);
                        setOpenModal(true);
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
                     onClick: (params: any) => setDetailExpenseId(params.row.customId || params.row.id),
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
            title="Add expense"
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
                        setEditItem(null);
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
                     {editItem ? "Update Expense" : "Add Expense"}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>
         <ExpenseDetailModal
            open={Boolean(detailExpenseId)}
            onClose={() => setDetailExpenseId(null)}
            expenseId={detailExpenseId}
         />

         <AlertDialog
            open={deleteItem !== null}
            onClose={function (): void {
               setDeleteItem(null);
            }}
            onConfirm={async () => {
               if (deleteItem) {
                  try {
                     await fetch(`/api/expenses/${deleteItem.id}`, { method: "DELETE" });
                  } catch {}
                  setExpenses((prev) =>
                     prev.filter((item) => item.id !== deleteItem.id),
                  );
                  setDeleteItem(null);
               }
            }}
            type={"error"}
            title={`Are you sure want to delete <b>${deleteItem?.type}</b>?`}
         />
      </Stack>
   );
};

export default Expense;
