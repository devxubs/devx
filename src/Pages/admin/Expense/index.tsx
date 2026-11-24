"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import {
   Box,
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
import CustomAutocomplete from "@src/components/Autocomplete";
import { useSettings } from "@src/lib/settingsContext";
import { fetchAllPages } from "@src/lib/fetchAllPages";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { useSnackbar } from "@src/lib/snackbarContext";
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
   const { showSnackbar } = useSnackbar();
   const { filterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";
   const [detailExpenseId, setDetailExpenseId] = useState<string | null>(null);
   // Phase 2 (2.1): server-side pagination + toolbar search — the API
   // accepts page/limit/search and returns the filtered total; the
   // list previously fetched a flat limit=100.
   const [paginationModel, setPaginationModel] = useState({
      page: 0,
      pageSize: 25,
   });
   const [totalExpenses, setTotalExpenses] = useState(0);
   const [denied, setDenied] = useState(false);
   // OBS-H1: money total of the filtered expense set (from the API).
   const [totalAmount, setTotalAmount] = useState(0);
   const [loadError, setLoadError] = useState(false);

   // Phase 2 (2.3): global-search deep link — /admin/expense?expense=<id>
   useEffect(() => {
      const id = new URLSearchParams(window.location.search).get("expense");
      if (id) setDetailExpenseId(id);
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

   // Phase 2 (2.10): expense-category suggestions — the distinct types
   // already present in the data, plus the Settings default category.
   const { settings, formatCurrency } = useSettings();
   const [knownTypes, setKnownTypes] = useState<string[]>([]);
   useEffect(() => {
      fetch("/api/expenses?limit=100")
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => {
            const rows = d?.data || d?.expenses || [];
            const types = Array.from(
               new Set(
                  (Array.isArray(rows) ? rows : [])
                     .map((e: any) => String(e.type || "").trim())
                     .filter(Boolean),
               ),
            ) as string[];
            setKnownTypes(types);
         })
         .catch(() => {});
   }, []);
   const categoryOptions = React.useMemo(() => {
      const set = new Set<string>();
      const def = (settings as any)?.customConfig?.defaultExpenseCategory;
      if (def) set.add(String(def));
      knownTypes.forEach((t) => set.add(t));
      expenses.forEach((e) => {
         if (e.type) set.add(e.type);
      });
      return Array.from(set).map((t) => ({ label: t, value: t }));
   }, [knownTypes, expenses, settings]);

   const loadExpenses = React.useCallback(async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams();
         params.set("page", String(paginationModel.page + 1));
         params.set("limit", String(paginationModel.pageSize));
         if (searchText.trim()) params.set("search", searchText.trim());
         const res = await fetch(`/api/expenses?${params.toString()}`);
         if (res.status === 403) {
            // OBS-G2 companion: a permission denial is not a
            // connection failure — say so, and don't offer a Retry
            // that can never succeed.
            setDenied(true);
            setLoadError(false);
            setExpenses([]);
            return;
         }
         if (res.ok) {
            setDenied(false);
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
            setTotalExpenses(Number(data.total ?? mapped.length));
            setTotalAmount(Number(data.totalAmount ?? 0));
            setLoadError(false);
         } else {
            setLoadError(true);
            showSnackbar("Failed to load expenses. Please try again.", "error");
         }
      } catch {
         setLoadError(true);
         showSnackbar("Failed to load expenses. Please try again.", "error");
      } finally {
         setLoading(false);
      }
   }, [paginationModel, searchText, showSnackbar]);

   useEffect(() => {
      loadExpenses();
   }, [loadExpenses]);

   // Search changes return to the first page.
   useEffect(() => {
      setPaginationModel((prev) =>
         prev.page === 0 ? prev : { ...prev, page: 0 },
      );
   }, [searchText]);

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
      // OBS-H3 (Full Live QA Audit 2026-11-25): a successful save
      // gave no confirmation, and a FAILED save was
      // indistinguishable — the response status was never checked
      // and the catch swallowed errors, yet the modal still closed
      // and the form reset. Now: success shows the standard
      // snackbar; failure keeps the modal open with the server's
      // message, so no entry is silently lost.
      try {
         const res = !editItem
            ? await fetch("/api/expenses", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify(formData),
              })
            : await fetch(`/api/expenses/${editItem.id}`, {
                 method: "PUT",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify(formData),
              });
         if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(
               err.message || err.error || "Failed to save expense",
            );
         }
         loadExpenses();
         showSnackbar(
            editItem ? "Expense updated." : "Expense added.",
            "success",
         );
         reset();
         setEditItem(null);
         setOpenModal(false);
      } catch (err: any) {
         showSnackbar(
            err?.message || "Failed to save expense. Please try again.",
            "error",
         );
      }
   };

   return (
      <Stack spacing={2} py={2}>
         {/* Header */}
         <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            {!loadError && !denied ? (
               <Typography variant="body2" color="text.secondary">
                  Total expenses:{" "}
                  <Box component="span" fontWeight={700} color="text.primary">
                     {formatCurrency(totalAmount)}
                  </Box>{" "}
                  ({totalExpenses} {totalExpenses === 1 ? "record" : "records"})
               </Typography>
            ) : (
               <span />
            )}
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
         {denied && !loading && (
            <Stack
               direction="row"
               alignItems="center"
               justifyContent="center"
               spacing={1.5}
               sx={{ py: 3 }}
            >
               <Typography variant="body2" color="text.secondary">
                  You don&apos;t have permission to view expenses.
               </Typography>
            </Stack>
         )}
         {loadError && !loading && expenses.length === 0 && (
            <Stack
               direction="row"
               alignItems="center"
               justifyContent="center"
               spacing={1.5}
               sx={{ py: 3 }}
            >
               <Typography variant="body2" color="text.secondary">
                  Failed to load expenses.
               </Typography>
               <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Icon icon="solar:restart-bold" size="16px" />}
                  onClick={loadExpenses}
               >
                  Retry
               </Button>
            </Stack>
         )}
         {loading && expenses.length === 0 ? (
            <TableSkeleton rows={5} cols={5} />
         ) : (
            <CustomTable
               rows={expenses}
               columns={columns}
               serverPagination
               rowCount={totalExpenses}
               paginationModel={paginationModel}
               onPaginationModelChange={setPaginationModel}
               loading={loading}
               checkBox={true}
               hideSelectionActions={true}
               canPrint={true}
               canExport={true}
               printConfig={{
                  title: "DevX POS - Operating Expenses Report",
               }}
               exportConfig={{
                  filename: `Expenses_Report_${new Date().toISOString().split("T")[0]}`,
                  title: "DevX POS - Operating Expenses Report",
                  fetchAllData: async () => {
                     // PERF-03: page through the list API in
                     // bounded chunks; same rows, same order. A
                     // failed page makes fetchAllPages throw and the
                     // export dialog shows the error instead of
                     // exporting partial data as the complete set.
                     const expenses = await fetchAllPages(
                        (page, limit) => `/api/expenses?page=${page}&limit=${limit}`,
                        (d) => d.expenses || [],
                        (d) => d.total,
                     );
                     return expenses.map((ex: any) => ({
                        // Real identity only — the old fallback
                        // fabricated EXP_<row index> when customId
                        // was missing (same anti-pattern removed
                        // from Reports in the runtime-fix round).
                        id: ex.customId || ex.id,
                        type: ex.type || "-",
                        amount: Number(ex.amount || 0),
                        date: ex.date ? new Date(ex.date).toLocaleDateString() : "-",
                        note: ex.note || "-",
                     }));
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
                              // Phase 2 (2.10): category is now an
                              // autocomplete over the categories already
                              // in use (plus the Settings default),
                              // instead of blind free text. freeSolo —
                              // a brand-new category can still be typed.
                              // OBS-H2 (Full Live QA Audit 2026-11-25):
                              // typed text never reached the form —
                              // MUI only commits freeSolo input on blur
                              // when autoSelect is set, so the field
                              // stayed "" and submit failed with
                              // "Type is required" while the text sat
                              // visibly in the box. Sync real typing
                              // (reason "input") into the field;
                              // selections keep flowing via onChange.
                              <CustomAutocomplete
                                 label="Type"
                                 placeholder="Select or type a category"
                                 options={categoryOptions}
                                 value={field.value || null}
                                 onInputChange={(_: any, v: string, reason: string) => {
                                    if (reason === "input") field.onChange(v);
                                 }}
                                 onChange={(v: any) =>
                                    field.onChange(
                                       typeof v === "string"
                                          ? v
                                          : v?.value || v?.label || "",
                                    )
                                 }
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
                  // OBS-H5: the old handler filtered the row out
                  // locally and never refreshed, so the record count
                  // (and now the money total) stayed stale — and a
                  // failed DELETE looked identical to a successful
                  // one. Refresh from the server on success; report
                  // failure honestly.
                  try {
                     const res = await fetch(`/api/expenses/${deleteItem.id}`, { method: "DELETE" });
                     if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || err.error || "Failed to delete expense");
                     }
                     setDeleteItem(null);
                     loadExpenses();
                  } catch (err: any) {
                     showSnackbar(
                        err?.message || "Failed to delete expense. Please try again.",
                        "error",
                     );
                  }
               }
            }}
            type={"delete"}
            // OBS-H4: the dialog named only the expense's category —
            // with several expenses in one category it didn't identify
            // WHICH record was being deleted. Amount + date pin it down.
            title={`Are you sure you want to delete <b>${deleteItem?.type}</b> (৳ ${Number(deleteItem?.amount || 0).toFixed(2)}${deleteItem?.date ? `, ${deleteItem.date}` : ""})?`}
         />
      </Stack>
   );
};

export default Expense;
