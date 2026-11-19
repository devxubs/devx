"use client";

// Reports — Finance (Phase 3B, roadmap 3.8).
//
// Owner-level P&L for the selected period plus the two money
// worklists (customer receivables, supplier payables). The net
// profit figure is the ONE shared definition from src/lib/finance.ts
// — revenue − expenses − purchases — and is labelled exactly as
// that; it is not gross profit and not COGS-based. Estimated COGS
// (sold qty × current product cost price) is shown separately and
// labelled as an estimate. Receivables/payables are current-state
// figures (everything outstanding today), independent of the
// selected period. All data comes from GET /api/reports?tab=finance.
import {
   Button,
   Grid,
   Stack,
   Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomTable from "@src/components/Table";
import DateRange from "@src/components/DateRange";
import AnalyticsCard from "@cmp/AnalyticsCard";
import { useSettings } from "@src/lib/settingsContext";
import { DEFAULT_FILTERS } from "@src/Pages/admin/Customers/components/customerFilterUtils";
import { fetchAllReportRows, reportParams } from "../reportExport";

const Finance = () => {
   const router = useRouter();
   const { formatCurrency } = useSettings();
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

   const loadReport = useCallback(async () => {
      setLoading(true);
      try {
         const params = reportParams("finance", dateRange);
         const res = await fetch(`/api/reports?${params.toString()}`);
         if (res.ok) setReport(await res.json());
      } catch {}
      setLoading(false);
   }, [dateRange]);

   useEffect(() => {
      loadReport();
   }, [loadReport]);

   // Receivables worklist lives on the Customers page (its filter
   // engine already supports Due > 0) — deep-link with the preset
   // applied instead of duplicating that table here.
   const openReceivables = () => {
      const preset = {
         ...DEFAULT_FILTERS,
         due: { op: "gt" as const, value: "0", value2: "" },
      };
      const filterParam = encodeURIComponent(
         JSON.stringify({ customerData: { _raw: preset } }),
      );
      router.push(`/admin/customers?filter=${filterParam}`);
   };

   const cards = [
      { title: "Revenue (completed/delivered)", value: formatCurrency(report?.revenue ?? 0), isPositive: true },
      { title: "Expenses", value: formatCurrency(report?.expensesTotal ?? 0), isPositive: false },
      { title: "Purchases", value: formatCurrency(report?.purchasesTotal ?? 0), isPositive: false },
      {
         title: "Net Profit",
         value: formatCurrency(report?.netProfit ?? 0),
         isPositive: Number(report?.netProfit ?? 0) >= 0,
      },
   ];

   const expenseTypeRows = (report?.expensesByType || []).map((b: any) => ({
      id: b.type,
      ...b,
   }));
   const methodRows = (report?.paymentMethods || []).map((m: any) => ({
      id: m.method,
      ...m,
   }));
   const receivableRows = (report?.receivables?.rows || []).map((r: any) => ({
      id: r.customerId || r.customer,
      ...r,
      oldestDueAtLabel: r.oldestDueAt ? new Date(r.oldestDueAt).toLocaleDateString() : "—",
   }));
   const payableRows = (report?.payables?.rows || []).map((r: any) => ({
      id: r.supplierId,
      ...r,
      oldestDueAtLabel: r.oldestDueAt ? new Date(r.oldestDueAt).toLocaleDateString() : "—",
   }));

   const expenseColumns = [
      { field: "type", headerName: "Expense Type", width: 220 },
      {
         field: "amount",
         headerName: "Amount",
         width: 160,
         renderCell: (p: any) => formatCurrency(p.row.amount),
      },
   ];
   const methodColumns = [
      { field: "method", headerName: "Payment Method", width: 200 },
      { field: "orders", headerName: "Orders", width: 100 },
      {
         field: "advanceCollected",
         headerName: "Advance Collected",
         width: 170,
         renderCell: (p: any) => formatCurrency(p.row.advanceCollected),
      },
      {
         field: "dueExpected",
         headerName: "Due / COD Expected",
         width: 170,
         renderCell: (p: any) => formatCurrency(p.row.dueExpected),
      },
   ];
   const receivableColumns = [
      {
         field: "customer",
         headerName: "Customer",
         width: 200,
         renderCell: (p: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color={p.row.customerId ? "primary.main" : "text.primary"}
               sx={p.row.customerId ? { cursor: "pointer", "&:hover": { textDecoration: "underline" } } : undefined}
               onClick={() => {
                  if (p.row.customerId) {
                     router.push(`/admin/customers?customer=${p.row.customerId}`);
                  }
               }}
            >
               {p.row.customer}
            </Typography>
         ),
      },
      { field: "phone", headerName: "Phone", width: 140 },
      { field: "orders", headerName: "Open Orders", width: 110 },
      { field: "oldestDueAtLabel", headerName: "Oldest Due", width: 120 },
      {
         field: "due",
         headerName: "Outstanding Due",
         width: 160,
         renderCell: (p: any) => (
            <Typography variant="body2" fontWeight={700} color="error.main">
               {formatCurrency(p.row.due)}
            </Typography>
         ),
      },
   ];
   const payableColumns = [
      {
         field: "supplier",
         headerName: "Supplier",
         width: 200,
         renderCell: (p: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() =>
                  router.push(`/admin/suppliers?supplier=${p.row.supplierCustomId || p.row.supplierId}`)
               }
            >
               {p.row.supplier}
            </Typography>
         ),
      },
      { field: "oldestDueAtLabel", headerName: "Oldest Due Purchase", width: 160 },
      { field: "purchasesWithDue", headerName: "Purchases w/ Due", width: 140 },
      {
         field: "totalDue",
         headerName: "Total Due",
         width: 140,
         renderCell: (p: any) => formatCurrency(p.row.totalDue),
      },
      {
         field: "credit",
         headerName: "Supplier Credit",
         width: 140,
         renderCell: (p: any) => formatCurrency(p.row.credit),
      },
      {
         field: "netPayable",
         headerName: "Net Payable",
         width: 150,
         renderCell: (p: any) => (
            <Typography variant="body2" fontWeight={700} color={p.row.netPayable > 0 ? "error.main" : "text.primary"}>
               {formatCurrency(p.row.netPayable)}
            </Typography>
         ),
      },
   ];

   return (
      <Stack spacing={2}>
         <Stack direction="row" justifyContent="flex-end">
            <DateRange
               title="Filter by period"
               value={dateRange}
               onChange={(v: [Date | null, Date | null]) => setDateRange(v)}
            />
         </Stack>

         <Grid container spacing={2}>
            {cards.map((item, index) => (
               <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                  <AnalyticsCard title={item.title} value={item.value} isPositive={item.isPositive} />
               </Grid>
            ))}
         </Grid>
         <Typography variant="caption" color="text.secondary">
            Net Profit = Revenue − Expenses − Purchases, the shared definition used across the
            app. It is a cash-style business result, not gross profit and not a COGS-based
            figure. Estimated COGS for this period:{" "}
            <b>{formatCurrency(report?.estimatedCogs ?? 0)}</b> — estimated at current cost
            prices
            {Number(report?.cogsExcludedItems || 0) > 0
               ? `; ${report.cogsExcludedItems} sold item(s) excluded because their product has no cost price recorded`
               : ""}
            .
         </Typography>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={2} bgcolor="background.paper" sx={{ borderRadius: 1.5 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ px: 3, pt: 2 }}>
                     Expenses by type
                  </Typography>
                  {expenseTypeRows.length === 0 && !loading ? (
                     <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 3 }}>
                        No expenses recorded for this period.
                     </Typography>
                  ) : (
                     <CustomTable rows={expenseTypeRows} columns={expenseColumns} />
                  )}
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={2} bgcolor="background.paper" sx={{ borderRadius: 1.5 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ px: 3, pt: 2 }}>
                     Payments by method
                  </Typography>
                  {methodRows.length === 0 && !loading ? (
                     <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 3 }}>
                        No orders recorded for this period.
                     </Typography>
                  ) : (
                     <CustomTable rows={methodRows} columns={methodColumns} />
                  )}
               </Stack>
            </Grid>
         </Grid>

         <Stack spacing={2} bgcolor="background.paper" sx={{ borderRadius: 1.5 }}>
            <Stack
               direction="row"
               justifyContent="space-between"
               alignItems="center"
               sx={{ px: 3, pt: 2 }}
            >
               <Typography variant="h5" fontWeight={700}>
                  Customer receivables — {formatCurrency(report?.receivables?.total ?? 0)} outstanding
                  ({report?.receivables?.customers ?? 0} customers)
               </Typography>
               <Button variant="outlined" size="small" onClick={openReceivables}>
                  Open in Customers (Due &gt; 0)
               </Button>
            </Stack>
            {receivableRows.length === 0 && !loading ? (
               <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 3 }}>
                  No customer has an outstanding due right now.
               </Typography>
            ) : (
               <CustomTable
                  rows={receivableRows}
                  columns={receivableColumns}
                  canExport={true}
                  exportConfig={{
                     filename: `Customer_Receivables_${new Date().toISOString().split("T")[0]}`,
                     title: "DevX POS - Customer Receivables",
                     fetchAllData: () =>
                        fetchAllReportRows(reportParams("finance", dateRange), (d) =>
                           (d.receivables?.rows || []).map((r: any) => ({
                              id: r.customerId || r.customer,
                              ...r,
                           })),
                        ),
                  }}
               />
            )}
         </Stack>

         <Stack spacing={2} bgcolor="background.paper" sx={{ borderRadius: 1.5 }}>
            <Stack
               direction="row"
               justifyContent="space-between"
               alignItems="center"
               sx={{ px: 3, pt: 2 }}
            >
               <Typography variant="h5" fontWeight={700}>
                  Supplier payables — {formatCurrency(report?.payables?.total ?? 0)} net outstanding
                  ({report?.payables?.suppliers ?? 0} suppliers)
               </Typography>
               <Button
                  variant="outlined"
                  size="small"
                  onClick={() => router.push("/admin/suppliers")}
               >
                  Open Suppliers
               </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ px: 3 }}>
               Net Payable = total purchase due − unallocated supplier credit (payments recorded
               against a purchase already reduced that purchase&apos;s due). Oldest due purchase
               first.
            </Typography>
            {payableRows.length === 0 && !loading ? (
               <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 3 }}>
                  No supplier has an outstanding payable right now.
               </Typography>
            ) : (
               <CustomTable
                  rows={payableRows}
                  columns={payableColumns}
                  canExport={true}
                  exportConfig={{
                     filename: `Supplier_Payables_${new Date().toISOString().split("T")[0]}`,
                     title: "DevX POS - Supplier Payables",
                     fetchAllData: () =>
                        fetchAllReportRows(reportParams("finance", dateRange), (d) =>
                           (d.payables?.rows || []).map((r: any) => ({
                              id: r.supplierId,
                              ...r,
                           })),
                        ),
                  }}
               />
            )}
         </Stack>
      </Stack>
   );
};

export default Finance;
