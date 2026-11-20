"use client";

import React, { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import { Alert, Stack, Typography } from "@mui/material";
import AnalyticsCard from "@cmp/AnalyticsCard";
import AnalyticsGraph from "@cmp/AnalyticsGraph";
import RadialBar from "@cmp/RadialBar";
import CustomTable from "@src/components/Table";
import DateRangePickerCustom from "@src/components/DateRange";
import { GridCellParams } from "@mui/x-data-grid";
import { Stock } from "../../Product";
import { useSettings } from "@src/lib/settingsContext";
import { ProductDetailModal } from "@src/components/EntityDetailModals/EntityModals";
import { fetchAllReportRows, reportParams } from "../reportExport";
import { formatCompactNumber } from "@src/lib/utils";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { filterRowsBySearch } from "@src/lib/tableSearch";

const Products = () => {
   const { formatCurrency, settings } = useSettings();
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   // Product counts by availability status over the COMPLETE
   // catalogue (see the effect below) for the distribution chart.
   const [stockCounts, setStockCounts] = useState<{
      inStock: number;
      low: number;
      out: number;
      total: number;
   } | null>(null);
   const [detailProductId, setDetailProductId] = useState<string | null>(null);
   const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
   // The API paginates lowStockRows (follow-up round); the monitor
   // below renders the complete low-stock set, so it is assembled
   // through the shared chunked loader (bounded pages) and falls
   // back to the main response's first page until it arrives.
   const [allLowStockRows, setAllLowStockRows] = useState<any[] | null>(null);

   useEffect(() => {
      setLoading(true);
      fetch(`/api/reports?${reportParams("products", dateRange).toString()}`)
         .then((r) => {
            if (!r.ok) throw new Error("Failed to load products report");
            return r.json();
         })
         .then((d) => {
            if (d) {
               setReport(d);
               // P2-7: distribution counts now arrive as server
               // aggregates on the main response (availabilityCounts)
               // — no full availability row download for display.
               if (d.availabilityCounts) {
                  setStockCounts({
                     inStock: d.availabilityCounts.inStock,
                     low: d.availabilityCounts.low,
                     out: d.availabilityCounts.out,
                     total: d.availabilityCounts.total,
                  });
               }
            }
         })
         .catch(() =>
            setError("Failed to load the products report. The figures below may be out of date."),
         )
         .finally(() => setLoading(false));
   }, [dateRange]);

   // P2-7: the distribution counts used to be computed here by
   // downloading the COMPLETE availability row set through the
   // export loader and counting per-row statuses client-side. The
   // API now returns the identical counts as `availabilityCounts`
   // (same per-row status partition, computed server-side), set
   // from the main fetch above. The fallback in the chart below
   // (API headline counts only) still applies when they are absent.

   useEffect(() => {
      let cancelled = false;
      fetchAllReportRows(reportParams("products", dateRange), (d) => d.lowStockRows || [])
         .then((all) => {
            if (!cancelled) setAllLowStockRows(all);
         })
         .catch(() => {
            if (!cancelled) setAllLowStockRows(null);
         });
      return () => {
         cancelled = true;
      };
   }, [dateRange]);

   const hasRange = Boolean(dateRange[0] || dateRange[1]);

   const lowStockColumns = [
      {
         field: "id",
         headerName: "ID",
         width: 120,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setDetailProductId(params.row.id)}
            >
               {params.row.id}
            </Typography>
         ),
      },
      { field: "name", headerName: "Product Name", flex: 1 },
      { field: "stock", headerName: "Stock Quantity", width: 150 },
      { field: "lowStockAlert", headerName: "Alert Threshold", width: 140 },
      {
         field: "status",
         headerName: "Status",
         width: 140,
         renderCell: (params: GridCellParams) => {
            return (
               <Stock
                  quantity={params.row.stock}
                  lowAlert={params.row.lowStockAlert}
               />
            );
         },
      },
   ];

   // Phase B4b (P1-5): consume the shared toolbar search — the
   // monitor renders the complete low-stock set (assembled through
   // the chunked loader above), so the term filters that full set
   // client-side (lib/tableSearch) over the displayed fields.
   const { filterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";
   const lowStockRows: any[] = React.useMemo(
      () =>
         filterRowsBySearch(
            allLowStockRows ?? report?.lowStockRows ?? [],
            searchText,
            ["id", "name", "status"],
         ),
      [allLowStockRows, report, searchText],
   );
   const totalInStock = report?.totalInStock || 0;
   const outOfStockCount = report?.outOfStockCount || 0;
   // The headline count keeps describing the UNFILTERED set (the
   // API figure, or the complete loaded rows as its fallback) —
   // toolbar search narrows the table only, never the card.
   const lowStockCount =
      report?.lowStockCount ||
      (allLowStockRows ?? report?.lowStockRows ?? []).length;
   const topProducts = report?.topProducts || [];

   const graphData = topProducts.length
      ? topProducts.map((p: any) => ({ x: p.name, y: p.sold }))
      : [];

   return (
      <Stack spacing={3}>
         {error && <Alert severity="error">{error}</Alert>}
         <Stack direction="row" justifyContent="flex-end">
            <DateRangePickerCustom
               title="Top Sellers Period"
               value={dateRange}
               onChange={(v: [Date | null, Date | null]) => setDateRange(v)}
            />
         </Stack>
         {/* Honest scope caption: stock levels are the CURRENT state
             of the catalogue and cannot be date-ranged; only the
             order-derived Top Sellers figures follow the period. */}
         <Typography variant="caption" color="text.secondary">
            {hasRange
               ? "Stock figures (in stock, low stock, out of stock, distribution) are current and do not change with the period. Top Selling Products counts only sales in the selected period."
               : "Stock figures are the current state of the catalogue. Top Selling Products are all-time — pick a period above to narrow them."}
         </Typography>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Total Items in Stock"}
                  isPositive={true}
                  value={formatCompactNumber(totalInStock)}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Low Stock Alerts"}
                  isPositive={false}
                  value={formatCompactNumber(lowStockCount)}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Out of Stock"}
                  isPositive={false}
                  value={formatCompactNumber(outOfStockCount)}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  // The value is the top product's units sold (the
                  // API's topProducts[0].sold), not a sales amount.
                  title={"Top Product Units Sold"}
                  isPositive={true}
                  value={formatCompactNumber(topProducts[0]?.sold || 0)}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <RadialBar
                  title={"Inventory Distribution"}
                  value={stockCounts ? String(stockCounts.total) : undefined}
                  data={
                     stockCounts
                        ? [
                             { label: "In Stock", value: stockCounts.inStock },
                             { label: "Low Stock", value: stockCounts.low },
                             { label: "Out of Stock", value: stockCounts.out },
                          ]
                        : [
                             // Complete counts not loaded (fetch failed):
                             // show only the two API headline counts
                             // rather than a fabricated "In Stock" value.
                             { label: "Low Stock", value: lowStockCount },
                             { label: "Out of Stock", value: outOfStockCount },
                          ]
                  }
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
               <AnalyticsGraph
                  type="category"
                  title={"Top Selling Products by Units"}
                  isPositive={true}
                  data={graphData}
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
                     Low Stock Alert Monitor
                  </Typography>
                  <CustomTable
                     rows={lowStockRows}
                     columns={lowStockColumns}
                     loading={loading}
                     checkBox={true}
                     canExport={true}
                     canPrint={true}
                     exportConfig={{
                        filename: `Low_Stock_Alert_${new Date().toISOString().split("T")[0]}`,
                        title: "DevX POS - Low Stock Alert Monitor",
                        fetchAllData: () =>
                           fetchAllReportRows(reportParams("products", dateRange), (d) => d.lowStockRows || []),
                     }}
                     printConfig={{
                        title: "DevX POS - Low Stock Alert Monitor",
                     }}
                  />
               </Stack>
            </Grid>
         </Grid>

         <ProductDetailModal
            open={Boolean(detailProductId)}
            onClose={() => setDetailProductId(null)}
            productId={detailProductId}
         />
      </Stack>
   );
};

export default Products;
