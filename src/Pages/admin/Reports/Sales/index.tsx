"use client";
import { Grid, Stack, Typography } from "@mui/material";
import React from "react";
import AnalyticsCard from "../components/AnalyticsCard";
import AnalyticsGraph from "../components/AnalyticsGraph";
import RadialBar from "../components/RadialBar";
import CustomTable from "@src/components/Table";
import { orders } from "../../Order/data";
import CustomerInfo from "../../Customers/CustomerInfo";
import { GridCellParams } from "@mui/x-data-grid";
import DateRangePickerCustom from "@src/components/DateRange";

const analyticsItem = [
   {
      title: "Total orders",
      value: 765,
      isPositive: false,
      percentage: "5%",
      data: [50, 80, 120, 110, 140, 130, 100],
   },
   {
      title: "Total revenue",
      value: "165",
      currency: "$",
      isPositive: true,
      percentage: "10%",
      data: [70, 90, 100, 60, 50, 80, 90],
   },
   {
      title: "Completed orders",
      value: 950,
      isPositive: true,
      percentage: "15%",
      data: [40, 70, 75, 70, 50, 28, 7, 64],
   },
   {
      title: "Returned orders",
      value: 50,
      isPositive: false,
      percentage: "5%",
      data: [4, 7, 15, 30, 40, 30, 20, 12, 7, 4],
   },
];

const statusColor: Record<
   string,
   "default" | "warning" | "success" | "info" | "error"
> = {
   All: "default",
   Pending: "warning",
   Confirmed: "success",
   Processing: "info",
   Shipped: "info",
   "Out for Delivery": "info",
   Delivered: "success",
   Completed: "success",
   Hold: "default",
   Cancelled: "error",
   Failed: "error",
} as const;

const Sales = () => {
   const orderRows = orders.map((order) => ({
      id: order.id,
      customer: order.customer,
      createdAt: order.createdAt,
      amount: order.pricing.total,
      payment:
         order.status === "completed" || order.status === "Delivered"
            ? "Paid"
            : order.pricing.paymentMethod,
      status: order.status,
   }));

   const columns = [
      { field: "id", headerName: "Order ID", width: 150 },
      {
         field: "customer",
         headerName: "Customer",
         width: 200,
         renderCell: (params: GridCellParams) => (
            <CustomerInfo {...params.row.customer} />
         ),
      },
      { field: "createdAt", headerName: "Created At", width: 200 },
      { field: "amount", headerName: "Amount", width: 150 },
      { field: "payment", headerName: "Payment Method", width: 200 },
      {
         field: "status",
         headerName: "Status",
         width: 150,
         chip: true,
         color: (params: GridCellParams) =>
            statusColor[params.row.status] || "default",
      },
   ];

   return (
      <Stack>
         <Grid container spacing={2}>
            {analyticsItem.map((item, idx) => {
               return (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                     <AnalyticsCard
                        {...item}
                        data={[...item.data].reverse()} // Reverse the data for better visualization
                     />
                  </Grid>
               );
            })}

            <Grid size={{ xs: 12, md: 4 }}>
               <RadialBar
                  title={"Orders Status Breakdown"}
                  data={[
                     {
                        label: "Completed",
                        value: 75,
                     },
                     {
                        label: "Cancelled ",
                        value: 25,
                     },
                     {
                        label: "Returned",
                        value: 10,
                     },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
               <AnalyticsGraph
                  type="day"
                  title="Revenue Analytics"
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
                     Orders Table
                  </Typography>
                  <CustomTable
                     rows={orderRows}
                     columns={columns}
                     filter={(data, onChange) => (
                        <DateRangePickerCustom
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

export default Sales;
