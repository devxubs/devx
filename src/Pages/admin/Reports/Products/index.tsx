"use client";

import React, { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import { Alert, Stack, Typography } from "@mui/material";
import AnalyticsCard from "@cmp/AnalyticsCard";
import AnalyticsGraph from "@cmp/AnalyticsGraph";
import RadialBar from "@cmp/RadialBar";
import CustomTable from "@src/components/Table";
import { GridCellParams } from "@mui/x-data-grid";
import { Stock } from "../../Product";
import { useSettings } from "@src/lib/settingsContext";
import { ProductDetailModal } from "@src/components/EntityDetailModals/EntityModals";
import { fetchAllReportRows, reportParams } from "../reportExport";
import { formatCompactNumber } from "@src/lib/utils";

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

   useEffect(() => {
      setLoading(true);
      fetch("/api/reports?tab=products")
         .then((r) => {
            if (!r.ok) throw new Error("Failed to load products report");
            return r.json();
         })
         .then((d) => {
            if (d) setReport(d);
         })
         .catch(() =>
            setError("Failed to load the products report. The figures below may be out of date."),
         )
         .finally(() => setLoading(false));
   }, []);

   // The main response's availabilityRows are one page (100 rows,
   // sorted by quantity ascending — a biased sample), so chart counts
   // are taken from the complete row set via the export loader, using
   // the API's own per-row status. The previous chart computed its
   // "In Stock" segment as totalInStock − outOfStockCount −
   // lowStockCount, which subtracts PRODUCT counts from a QUANTITY
   // sum (units) and produced a meaningless distribution.
   useEffect(() => {
      fetchAllReportRows(reportParams("products"), (d) => d.availabilityRows || [])
         .then((all) => {
            if (all.length > 0) {
               setStockCounts({
                  inStock: all.filter((r: any) => r.status === "In stock").length,
                  low: all.filter((r: any) => r.status === "Low stock").length,
                  out: all.filter((r: any) => r.status === "Out of stock").length,
                  total: all.length,
               });
            }
         })
         .catch(() => {});
   }, []);

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

   const lowStockRows = report?.lowStockRows || [];
   const totalInStock = report?.totalInStock || 0;
   const outOfStockCount = report?.outOfStockCount || 0;
   const lowStockCount = report?.lowStockCount || lowStockRows.length;
   const topProducts = report?.topProducts || [];

   const graphData = topProducts.length
      ? topProducts.map((p: any) => ({ x: p.name, y: p.sold }))
      : [];

   return (
      <Stack spacing={3}>
         {error && <Alert severity="error">{error}</Alert>}
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
                           fetchAllReportRows(reportParams("products"), (d) => d.lowStockRows || []),
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
