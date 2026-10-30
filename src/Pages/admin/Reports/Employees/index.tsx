"use client";

import { Stack, Grid, Typography, Chip } from "@mui/material";
import React, { useState, useEffect } from "react";
import AnalyticsCard from "@cmp/AnalyticsCard";
import AnalyticsGraph from "@cmp/AnalyticsGraph";
import RadialBar from "@cmp/RadialBar";
import CustomTable from "@src/components/Table";
import { SellerProFile } from "../../Dashboard";
import { GridCellParams } from "@mui/x-data-grid";
import { useSettings } from "@src/lib/settingsContext";
import { EmployeeDetailModal } from "@src/components/EntityDetailModals/EntityModals";

const Employees = () => {
   const { formatCurrency } = useSettings();
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);

   useEffect(() => {
      setLoading(true);
      fetch("/api/reports?tab=employees")
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => {
            if (d) setReport(d);
         })
         .catch(() => {})
         .finally(() => setLoading(false));
   }, []);

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
      { field: "calls", headerName: "Interactions", width: 140 },
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
   const totalEmployees = rows.length;
   const totalCompletedSales = rows.reduce((s: number, r: any) => s + Number(r.conforms || 0), 0);
   const totalGeneratedRevenue = rows.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0);

   return (
      <Stack spacing={3}>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Employees"}
                  isPositive={true}
                  data={[1, 2, 3, 4, 5, 6, 8]}
                  value={totalEmployees}
                  percentage={"+5%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Completed Sales"}
                  isPositive={true}
                  data={[5, 10, 15, 20, 25, 30, 35]}
                  value={totalCompletedSales}
                  percentage={"+15%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Revenue Generated"}
                  isPositive={true}
                  data={[5000, 10000, 15000, 20000, 25000, 30000]}
                  value={formatCurrency(totalGeneratedRevenue)}
                  percentage={"+12%"}
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
            <Grid size={{ xs: 12, md: 4 }}>
               <RadialBar
                  title="Team Performance"
                  data={[
                     { label: "High Achievers", value: 75 },
                     { label: "On Track", value: 20 },
                     { label: "Need Attention", value: 5 },
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
                     Employee Performance Ranking
                  </Typography>

                  <CustomTable
                     rows={rows}
                     columns={rankSalesmanColumns}
                     checkBox={true}
                     canExport={true}
                     canPrint={true}
                     exportConfig={{
                        filename: `Employees_Ranking_${new Date().toISOString().split("T")[0]}`,
                        title: "DevX POS - Employee Performance Ranking",
                     }}
                     printConfig={{
                        title: "DevX POS - Employee Performance Ranking",
                     }}
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
