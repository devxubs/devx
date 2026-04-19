"use client";

import { Stack, Grid, Typography } from "@mui/material";
import React from "react";
import YearlySalesChart from "./WeeklySalesChart";
import GenderSalesChart from "./SalesByGender";
import CustomTable from "@src/components/Table";
import DateRange from "@src/components/DateRange";
import { useTheme } from "@mui/material/styles";
import AnalyticsCard from "@cmp/AnalyticsCard";
import AnalyticsGraph from "@cmp/AnalyticsGraph";
import RadialBar from "@cmp/RadialBar";

const mockData = [
   {
      id: "#001",
      courier_submitted_at: "2025-01-01 2:30 PM",
      total_price: 3500,
      shipping_charge: 120,
      total_amount: 3620,
      courier_charge: 80,
      courier_pay_to_you: 3540,
   },
   {
      id: "#002",
      courier_submitted_at: "2025-01-02 4:10 PM",
      total_price: 2200,
      shipping_charge: 100,
      total_amount: 2300,
      courier_charge: 70,
      courier_pay_to_you: 2230,
   },
   {
      id: "#003",
      courier_submitted_at: "2025-01-03 11:20 AM",
      total_price: 5400,
      shipping_charge: 150,
      total_amount: 5550,
      courier_charge: 110,
      courier_pay_to_you: 5440,
   },
   {
      id: "#004",
      courier_submitted_at: "2025-01-04 6:45 PM",
      total_price: 1800,
      shipping_charge: 80,
      total_amount: 1880,
      courier_charge: 60,
      courier_pay_to_you: 1820,
   },
];

const Courier = () => {
   const theme = useTheme();

   const columns = [
      { field: "id", headerName: "ID", width: 100 },
      {
         field: "courier_submitted_at",
         headerName: "Courier Submitted At",
         width: 200,
      },
      { field: "total_price", headerName: "Total Price", width: 150 },
      { field: "shipping_charge", headerName: "Shipping Charge", width: 150 },
      { field: "total_amount", headerName: "Total Amount", width: 150 },
      { field: "courier_charge", headerName: "Courier Charge", width: 150 },
      {
         field: "courier_pay_to_you",
         headerName: "Courier Pay To You",
         width: 150,
      },
   ];

   // ✅ COURIER ANALYTICS
   const courierData = [
      {
         title: "In Courier",
         value: 165,
         percentage: "-1.6%",
         isPositive: false,
         data: [70, 90, 100, 60, 50, 80, 90],
      },
      {
         title: "Delivered",
         value: 950,
         percentage: "+2.6%",
         isPositive: true,
         data: [40, 70, 75, 70, 50, 28, 7],
      },
      {
         title: "Completed",
         value: 765,
         percentage: "+2.6%",
         isPositive: true,
         data: [50, 80, 120, 110, 140, 130, 100],
      },
      {
         title: "Pending Return",
         value: 950,
         percentage: "+2.6%",
         isPositive: true,
         data: [10, 50, 25, 20, 70, 58, 20],
      },
   ];

   return (
      <Stack spacing={2}>
         <Grid container spacing={2}>
            {/* --------------------------------
               ✅ TOP CARDS
            -------------------------------- */}
            {courierData.map((item, index) => (
               <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                  <AnalyticsCard
                     title={item.title}
                     value={item.value}
                     percentage={item.percentage}
                     isPositive={item.isPositive}
                     data={item.data}
                  />
               </Grid>
            ))}

            {/* --------------------------------
               ✅ CHARTS
            -------------------------------- */}
            <Grid size={{ xs: 12, md: 8 }}>
               <AnalyticsGraph
                  title={"Courier Trends"}
                  isPositive={true}
                  data={[
                     { x: "2026-1-01", y: 100 },
                     { x: "2026-1-02", y: 200 },
                     { x: "2026-1-03", y: 150 },
                     { x: "2026-1-04", y: 250 },
                     { x: "2026-1-05", y: 300 },
                  ]}
               />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
               <RadialBar
                  title="Deliveries by Region "
                  data={[
                     {
                        label: "North",
                        value: 40,
                     },
                     {
                        label: "South",
                        value: 30,
                     },
                     {
                        label: "East",
                        value: 20,
                     },
                     // {
                     //    label: "West",
                     //    value: 10,
                     // },
                  ]}
               />
            </Grid>

            {/* --------------------------------
               ✅ TABLE
            -------------------------------- */}
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
                     Courier details
                  </Typography>
                  <CustomTable
                     rows={mockData}
                     columns={columns}
                     filter={(data, onChange) => (
                        <DateRange
                           title="Filter by Courier Submitted Date"
                           onChange={(v: [Date | null, Date | null]) => {
                              onChange({
                                 ...data,
                                 reportData: {
                                    date: v,
                                    report_type: "couriers",
                                 },
                              });
                           }}
                        />
                     )}
                  />
               </Stack>
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Courier;
