"use client";

import { Stack, Grid, useMediaQuery } from "@mui/material";
import React from "react";
import { Dayjs } from "dayjs";
import CourierCard from "./CourierCard";
import YearlySalesChart from "./WeeklySalesChart";
import GenderSalesChart from "./SalesByGender";
import CustomTable from "@src/components/Table";
import DateRange from "@src/components/DateRange";
import { useTheme } from "@mui/material/styles";

const Courier = () => {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
   // -------------------------------
   // ✅ FILTER STATE
   // -------------------------------
   const [filterValue, setFilterValue] = React.useState<{
      order_created_at: Dayjs | null;
   }>({
      order_created_at: null,
   });

   const onChange = (updated: { order_created_at: Dayjs | null }) => {
      setFilterValue(updated);
   };

   // -------------------------------
   // ✅ TABLE DATA
   // -------------------------------
   const tableData = {
      head: [
         "ID",
         "Courier Submitted At",
         "Total Price",
         "Shipping Charge",
         "Total Amount",
         "Courier Charge",
         "Courier Pay To You",
      ],

      body: [
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
      ],
   };

   // -------------------------------
   // ✅ COURIER ANALYTICS
   // -------------------------------
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
                  <CourierCard
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
               <YearlySalesChart />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
               <GenderSalesChart />
            </Grid>

            {/* --------------------------------
               ✅ TABLE
            -------------------------------- */}
            <Grid size={{ xs: 12 }}>
               <CustomTable
                  type="default"
                  head={tableData.head}
                  body={tableData.body}
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
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Courier;
