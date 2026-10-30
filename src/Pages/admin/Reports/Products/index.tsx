"use client";

import React, { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import { Stack, Typography } from "@mui/material";
import AnalyticsCard from "@cmp/AnalyticsCard";
import AnalyticsGraph from "@cmp/AnalyticsGraph";
import RadialBar from "@cmp/RadialBar";
import CustomTable from "@src/components/Table";
import { GridCellParams } from "@mui/x-data-grid";
import { Stock } from "../../Product";
import { useSettings } from "@src/lib/settingsContext";
import { ProductDetailModal } from "@src/components/EntityDetailModals/EntityModals";

const Products = () => {
   const { formatCurrency, settings } = useSettings();
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [detailProductId, setDetailProductId] = useState<string | null>(null);

   useEffect(() => {
      setLoading(true);
      fetch("/api/reports?tab=products")
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => {
            if (d) setReport(d);
         })
         .catch(() => {})
         .finally(() => setLoading(false));
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
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Total Items in Stock"}
                  isPositive={true}
                  data={[10, 30, 40, 50, 60, 70, 80]}
                  value={totalInStock}
                  percentage={"+12%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Low Stock Alerts"}
                  isPositive={false}
                  data={[10, 8, 6, 5, 4, 3, 2]}
                  value={lowStockCount}
                  percentage={"-15%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Out of Stock"}
                  isPositive={false}
                  data={[5, 4, 3, 2, 2, 1, 0]}
                  value={outOfStockCount}
                  percentage={"-25%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Top Product Sales"}
                  isPositive={true}
                  data={[10, 25, 45, 60, 75, 90, 110]}
                  value={topProducts[0]?.sold || 0}
                  percentage={"+30%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <RadialBar
                  title={"Inventory Distribution"}
                  data={[
                     { label: "In Stock", value: Math.max(totalInStock - outOfStockCount - lowStockCount, 1) },
                     { label: "Low Stock", value: lowStockCount },
                     { label: "Out of Stock", value: outOfStockCount },
                  ]}
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
                     checkBox={true}
                     canExport={true}
                     canPrint={true}
                     exportConfig={{
                        filename: `Low_Stock_Alert_${new Date().toISOString().split("T")[0]}`,
                        title: "DevX POS - Low Stock Alert Monitor",
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
