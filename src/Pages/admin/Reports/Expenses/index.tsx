"use client";

import { Alert, Stack, Typography } from "@mui/material";
import CustomTable from "@src/components/Table";
import DateRangePicker from "@src/components/DateRange";
import { useEffect, useState, useCallback } from "react";
import { useSettings } from "@src/lib/settingsContext";
import { ExpenseDetailModal } from "@src/components/EntityDetailModals/EntityModals";
import { fetchAllReportRows, reportParams } from "../reportExport";
// Phase 1: the old ExpenseChart was intentionally not rendered — it
// was built entirely on hard-coded example data (invented daily
// expenses for Dec 2025), not on the reports API. The table below is
// real. (Phase 4/5 cleanup: the unused ExpenseChart file has been
// removed; a future data-backed chart can be rebuilt from the API's
// byType totals.)

const Expenses = () => {
   const { formatCurrency } = useSettings();
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
   const [detailExpenseId, setDetailExpenseId] = useState<string | null>(null);

   const loadExpensesReport = useCallback(async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams();
         params.set("tab", "expenses");
         if (dateRange[0]) params.set("startDate", dateRange[0].toISOString());
         if (dateRange[1]) params.set("endDate", dateRange[1].toISOString());

         const res = await fetch(`/api/reports?${params.toString()}`);
         if (res.ok) {
            const data = await res.json();
            setReport(data);
            setError(null);
         } else {
            setError("Failed to load the expenses report. The figures below may be out of date.");
         }
      } catch {
         setError("Failed to load the expenses report. The figures below may be out of date.");
      }
      setLoading(false);
   }, [dateRange]);

   useEffect(() => {
      loadExpensesReport();
   }, [loadExpensesReport]);

   const columns = [
      {
         field: "id",
         headerName: "ID",
         width: 100,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setDetailExpenseId(params.row.id)}
            >
               {params.row.id}
            </Typography>
         ),
      },
      { field: "type", headerName: "Type", width: 150 },
      { field: "date", headerName: "Date", width: 150 },
      {
         field: "amount",
         headerName: "Amount",
         width: 150,
         renderCell: (params: any) => formatCurrency(params.row.amount),
      },
      { field: "note", headerName: "Note", width: 200 },
   ];

   const rows = report?.rows || [];

   return (
      <Stack spacing={3}>
         {error && <Alert severity="error">{error}</Alert>}
         <Stack
            spacing={2}
            bgcolor={"background.paper"}
            sx={{
               borderRadius: 1.5,
            }}
         >
            <Typography
               variant="h5"
               fontWeight={700}
               sx={{
                  px: 3,
                  pt: 2,
                  pb: 0,
               }}
            >
               Expenses Report
            </Typography>
            <CustomTable
               rows={rows}
               columns={columns}
               loading={loading}
               checkBox={true}
               canExport={true}
               canPrint={true}
               exportConfig={{
                  filename: `Expenses_Report_${new Date().toISOString().split("T")[0]}`,
                  title: "DevX POS - Expenses Report",
                  fetchAllData: () =>
                     fetchAllReportRows(
                        reportParams("expenses", dateRange),
                        (d) => d.rows || [],
                     ),
               }}
               printConfig={{
                  title: "DevX POS - Expenses Report",
               }}
               filter={(data, onChange) => (
                  <DateRangePicker
                     title="Filter by Expense Date"
                     value={dateRange}
                     onChange={(v: [Date | null, Date | null]) => {
                        setDateRange(v);
                     }}
                  />
               )}
            />
         </Stack>

         <ExpenseDetailModal
            open={Boolean(detailExpenseId)}
            onClose={() => setDetailExpenseId(null)}
            expenseId={detailExpenseId}
         />
      </Stack>
   );
};

export default Expenses;
