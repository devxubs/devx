"use client";

import { Alert, Stack, Grid, Typography, Chip } from "@mui/material";
import React, { useState, useEffect } from "react";
import AnalyticsCard from "@cmp/AnalyticsCard";
import AnalyticsGraph from "@cmp/AnalyticsGraph";
import CustomTable from "@src/components/Table";
import DateRange from "@src/components/DateRange";
import { SellerProFile } from "../../Dashboard";
import { GridCellParams } from "@mui/x-data-grid";
import { useSettings } from "@src/lib/settingsContext";
import { EmployeeDetailModal } from "@src/components/EntityDetailModals/EntityModals";
import { fetchAllReportRows, reportParams } from "../reportExport";
import { formatCompactNumber } from "@src/lib/utils";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { filterRowsBySearch } from "@src/lib/tableSearch";

const Employees = () => {
   const { formatCurrency, settings } = useSettings();
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
   const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
   // Phase B4b (P1-5): consume the shared toolbar search — the
   // term filters the displayed ranked rows client-side
   // (lib/tableSearch). The cards keep the unfiltered server
   // totals (report.summary).
   const { filterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";

   useEffect(() => {
      let cancelled = false;
      setLoading(true);
      // P2-7: the display path now reads ONE page of the ranked
      // rows plus the server-side `summary` aggregates (totals over
      // the complete ranked set) from a single request — ranking is
      // computed server-side before slicing, so rank labels stay
      // global, and the cards no longer require assembling the full
      // employee set client-side. The chunked export loader below
      // still assembles the complete set for EXPORT only, with its
      // throw-on-failure contract unchanged. The table's own
      // pagination is the CustomTable's client-side paging over
      // this page of rows, as on the other report tabs.
      fetch(`/api/reports?${reportParams("employees", dateRange).toString()}`)
         .then((r) => {
            if (!r.ok) throw new Error("Failed to load employees report");
            return r.json();
         })
         .then((d) => {
            if (!cancelled) setReport(d);
         })
         .catch(() => {
            if (!cancelled) {
               setError("Failed to load the employees report. The figures below may be out of date.");
            }
         })
         .finally(() => {
            if (!cancelled) setLoading(false);
         });
      return () => {
         cancelled = true;
      };
   }, [dateRange]);

   const hasRange = Boolean(dateRange[0] || dateRange[1]);

   const rankSalesmanColumns = [
      {
         field: "seller",
         headerName: "Seller / Employee",
         width: 250,
         renderCell: (params: GridCellParams) => (
            <Stack
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setDetailEmployeeId(params.row.id)}
            >
               <SellerProFile
                  name={params.row.name}
                  url={
                     "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-1.webp"
                  }
               />
            </Stack>
         ),
      },
      // Phase 1: the "Interactions" (calls) column is removed — the API
      // deliberately returns calls: null because the old value was a
      // fabricated formula and no call/interaction data exists in the
      // system. An always-empty column only invites misreading.
      { field: "conforms", headerName: "Completed Sales", width: 150 },
      { field: "cancels", headerName: "Cancelled", width: 130 },
      {
         field: "revenue",
         headerName: "Revenue",
         width: 150,
         renderCell: (params: any) => formatCurrency(params.row.revenue || 0),
      },
      {
         field: "rank",
         headerName: "Rank",
         width: 140,
         renderCell: (params: any) => {
            const rank = String(params.row.rank || "Top 1");
            const colorMap: Record<string, "primary" | "secondary" | "success" | "warning" | "error" | "default"> = {
               "Top 1": "primary",
               "Top 2": "secondary",
               "Top 3": "success",
               "Top 4": "warning",
               "Top 5": "error",
            };
            const color = colorMap[rank] || "default";

            return (
               <Chip
                  label={rank}
                  size="small"
                  color={color}
                  sx={{ fontWeight: 700, borderRadius: 1, minWidth: 62 }}
               />
            );
         },
      },
   ];

   const rows = report?.rows || [];
   const filteredRows: any[] = React.useMemo(
      () =>
         filterRowsBySearch(report?.rows || [], searchText, [
            "name",
            "email",
            "role",
            "customId",
            "rank",
         ]),
      [report, searchText],
   );
   // P2-7: headline totals are the API's complete-set aggregates;
   // the displayed-page reductions remain only as a fallback for a
   // response without `summary` (they equal the aggregates whenever
   // the whole ranked set fits on the first page).
   const totalEmployees = report?.summary?.totalEmployees ?? rows.length;
   const totalCompletedSales =
      report?.summary?.totalCompletedSales ??
      rows.reduce((s: number, r: any) => s + Number(r.conforms || 0), 0);
   const totalGeneratedRevenue =
      report?.summary?.totalRevenue ??
      rows.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0);

   return (
      <Stack spacing={3}>
         {error && <Alert severity="error">{error}</Alert>}
         {/* Honest scope caption: sales/revenue figures follow the
             selected period; the employee list itself is current. */}
         <Typography variant="caption" color="text.secondary">
            {hasRange
               ? "Completed Sales, Cancelled and Revenue count only orders handled in the selected period."
               : "Figures are all-time. Pick a date range in the table filter to view a specific period."}
         </Typography>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Employees"}
                  isPositive={true}
                  value={formatCompactNumber(totalEmployees)}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Completed Sales"}
                  isPositive={true}
                  value={formatCompactNumber(totalCompletedSales)}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Revenue Generated"}
                  isPositive={true}
                  value={formatCompactNumber(totalGeneratedRevenue, {
                     currencySymbol: settings.currencySymbol || "৳",
                  })}
               />
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
               <AnalyticsGraph
                  title={"Sales by Employee Rank"}
                  isPositive={true}
                  type="category"
                  data={rows.slice(0, 5).map((r: any) => ({
                     x: r.name,
                     y: r.conforms,
                  }))}
               />
            </Grid>
            <Grid size={{ xs: 12 }}>
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
                     Employee Performance Ranking
                  </Typography>

                  <CustomTable
                     rows={filteredRows}
                     columns={rankSalesmanColumns}
                     loading={loading}
                     checkBox={true}
                     canExport={true}
                     canPrint={true}
                     exportConfig={{
                        filename: `Employees_Ranking_${new Date().toISOString().split("T")[0]}`,
                        title: "DevX POS - Employee Performance Ranking",
                        fetchAllData: () =>
                           fetchAllReportRows(reportParams("employees", dateRange), (d) => d.rows || []),
                     }}
                     printConfig={{
                        title: "DevX POS - Employee Performance Ranking",
                     }}
                     filter={(data, onChange) => (
                        <DateRange
                           title="Filter by Order Date"
                           value={dateRange}
                           onChange={(v: [Date | null, Date | null]) => {
                              setDateRange(v);
                           }}
                        />
                     )}
                  />
               </Stack>
            </Grid>
         </Grid>

         <EmployeeDetailModal
            open={Boolean(detailEmployeeId)}
            onClose={() => setDetailEmployeeId(null)}
            employeeId={detailEmployeeId}
         />
      </Stack>
   );
};

export default Employees;
