import React from "react";
import Grid from "@mui/material/Grid";
import { Stack, Typography } from "@mui/material";
import AnalyticsCard from "../components/AnalyticsCard";
import AnalyticsGraph from "../components/AnalyticsGraph";
import RadialBar from "../components/RadialBar";
import CustomTable from "@src/components/Table";
import { GridCellParams } from "@mui/x-data-grid";
import { Stock } from "../../Product";

const Products = () => {
   const lowStockColumns = [
      { field: "id", headerName: "ID", width: 70 },
      { field: "name", headerName: "Product Name", flex: 1 },
      { field: "stock", headerName: "Stock Quantity", width: 150 },
      { field: "lowStockAlert", headerName: "Alert", width: 120 },
      {
         field: "status",
         headerName: "Status",
         width: 120,
         renderCell: (params: GridCellParams) => {
            const isLowStock = params.row.stock <= params.row.lowStockAlert;
            return (
               <Stock
                  quantity={params.row.stock}
                  lowAlert={params.row.lowStockAlert}
               />
            );
         },
      },
   ];

   const lowStockRows = [
      { id: 1, name: "Product A", lowStockAlert: 20, stock: 0 },
      { id: 2, name: "Product B", lowStockAlert: 5, stock: 30 },
      { id: 3, name: "Product C", lowStockAlert: 15, stock: 80 },
   ];

   const stockAvailabilityColumns = [
      { field: "id", headerName: "ID", width: 70 },
      { field: "name", headerName: "Product Name", flex: 1 },
      { field: "stock", headerName: "Stock Quantity", width: 150 },
      { field: "status", headerName: "Status", width: 120 },
   ];

   const stockAvailabilityRows = [
      { id: 1, name: "Product A", stock: 50, status: "In Stock" },
      { id: 2, name: "Product B", stock: 20, status: "In Stock" },
      { id: 3, name: "Product C", stock: 0, status: "Out of Stock" },
   ];

   return (
      <Stack spacing={3}>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Total Products"}
                  isPositive={true}
                  data={[10, 30, 40, 40, 30, 10, 20]}
                  value={"150"}
                  percentage={"25%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Low Stock Items"}
                  isPositive={false}
                  data={[40, 50, 70, 80, 55, 30, 5]}
                  value={"15"}
                  percentage={"20%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Stock Value"}
                  isPositive={true}
                  data={[10, 70, 20, 90, 10, 50, 20]}
                  value={"300"}
                  percentage={"5%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Total Revenue"}
                  isPositive={true}
                  data={[90, 70, 10, 40, 30, 10, 20]}
                  value={"$5000"}
                  percentage={"10%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <RadialBar
                  title={"Top selling products"}
                  data={[
                     { label: "Healthy", value: 70 },
                     { label: "Low", value: 30 },
                     { label: "Reserved", value: 10 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
               <AnalyticsGraph
                  type="day"
                  title="Revenue"
                  isPositive={true}
                  currency="$"
                  data={[
                     { x: "2026-03-01", y: 50 },
                     { x: "2026-03-02", y: 60 },
                     { x: "2026-03-03", y: 55 },
                     { x: "2026-03-04", y: 70 },
                     { x: "2026-03-05", y: 65 },
                     { x: "2026-03-06", y: 80 },
                  ]}
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
                     Low Stock
                  </Typography>
                  <CustomTable rows={lowStockRows} columns={lowStockColumns} />
               </Stack>
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Products;
