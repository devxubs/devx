"use client";

import { Grid, Stack, Typography } from "@mui/material";
import CustomerInfo from "@src/Pages/admin/Customers/CustomerInfo";
import CustomTable from "@src/components/Table";
import React, { useState, useEffect, useCallback } from "react";
import AnalyticsCard from "@cmp/AnalyticsCard";
import AnalyticsGraph from "@cmp/AnalyticsGraph";
import { CustomerDetailModal } from "@src/components/EntityDetailModals/EntityModals";

export const customerOrderData: any[] = [];

const Customer = () => {
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

   const loadCustomerReport = useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/reports?tab=customers");
         if (res.ok) {
            const data = await res.json();
            setReport(data);
         }
      } catch {}
      setLoading(false);
   }, []);

   useEffect(() => {
      loadCustomerReport();
   }, [loadCustomerReport]);

   const columns = [
      {
         field: "id",
         headerName: "Customer ID",
         width: 140,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setSelectedCustomerId(params.row.id)}
            >
               {params.row.id}
            </Typography>
         ),
      },
      {
         field: "customerName",
         headerName: "Customer",
         width: 200,
         renderCell: (params: any) => (
            <Stack
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setSelectedCustomerId(params.row.id)}
            >
               <CustomerInfo
                  name={params.row.customerName}
                  phone={params.row.phone}
               />
            </Stack>
         ),
      },
      {
         field: "lastOrderAt",
         headerName: "Last Order At",
         width: 150,
         renderCell: (params: any) => (
            <Stack justifyContent="center" height={"100%"}>
               <Typography variant="body2" color="textPrimary">
                  {params.row.lastOrderAt || "N/A"}
               </Typography>
            </Stack>
         ),
      },
      {
         field: "totalOrders",
         headerName: "Total Orders",
         width: 150,
      },
      {
         field: "completedOrders",
         headerName: "Completed Orders",
         width: 150,
      },
      {
         field: "failedOrders",
         headerName: "Failed Orders",
         width: 150,
      },
      {
         field: "address",
         headerName: "Address",
         width: 300,
      },
   ];

   const rows = report?.rows || [];
   const totalCustomers = report?.totalCustomers || rows.length;
   const activeCustomers = report?.activeCustomers || rows.filter((r: any) => r.totalOrders > 0).length;
   const repeatCustomers = report?.returningCustomers || rows.filter((r: any) => r.totalOrders > 1).length;

   return (
      <Stack>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Customers"}
                  isPositive={true}
                  data={[10, 20, 25, 30, 35, 40, 50]}
                  value={totalCustomers}
                  percentage={"+12%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Active Customers"}
                  isPositive={true}
                  data={[5, 10, 15, 20, 25, 30, 35]}
                  value={activeCustomers}
                  percentage={"+18%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Repeat Customers"}
                  isPositive={true}
                  data={[1, 3, 5, 8, 12, 16, 20]}
                  value={repeatCustomers}
                  percentage={"+25%"}
               />
            </Grid>
            <Grid size={{ xs: 12 }}>
               <AnalyticsGraph
                  title={"Customer Growth"}
                  isPositive={true}
                  type="day"
                  data={[
                     { x: "Week 1", y: 15 },
                     { x: "Week 2", y: 28 },
                     { x: "Week 3", y: 42 },
                     { x: "Week 4", y: 60 },
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
                     Customer Records
                  </Typography>

                  <CustomTable
                     rows={rows}
                     columns={columns}
                     checkBox={true}
                     canExport={true}
                     canPrint={true}
                     exportConfig={{
                        filename: `Customers_Report_${new Date().toISOString().split("T")[0]}`,
                        title: "DevX POS - Customers Analytics Report",
                     }}
                     printConfig={{
                        title: "DevX POS - Customers Analytics Report",
                     }}
                  />
               </Stack>
            </Grid>
         </Grid>

         <CustomerDetailModal
            open={Boolean(selectedCustomerId)}
            onClose={() => setSelectedCustomerId(null)}
            customerId={selectedCustomerId}
         />
      </Stack>
   );
};

export default Customer;
