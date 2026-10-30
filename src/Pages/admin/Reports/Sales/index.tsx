"use client";
import { Grid, Stack, Typography } from "@mui/material";
import React, { useState, useEffect, useCallback } from "react";
import AnalyticsCard from "@cmp/AnalyticsCard";
import AnalyticsGraph from "@cmp/AnalyticsGraph";
import RadialBar from "@cmp/RadialBar";
import CustomTable from "@src/components/Table";
import CustomerInfo from "../../Customers/CustomerInfo";
import { GridCellParams } from "@mui/x-data-grid";
import DateRangePickerCustom from "@src/components/DateRange";
import { useSettings } from "@src/lib/settingsContext";
import { OrderDetailModal } from "@src/components/EntityDetailModals/EntityModals";

const statusColor: Record<
   string,
   "default" | "warning" | "success" | "info" | "error"
> = {
   All: "default",
   PENDING: "warning",
   Pending: "warning",
   CONFIRMED: "success",
   Confirmed: "success",
   PROCESSING: "info",
   Processing: "info",
   SHIPPED: "info",
   Shipped: "info",
   DELIVERED: "success",
   Delivered: "success",
   COMPLETED: "success",
   Completed: "success",
   CANCELLED: "error",
   Cancelled: "error",
   FAILED: "error",
   Failed: "error",
} as const;

const Sales = () => {
   const { formatCurrency, settings } = useSettings();
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
   const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

   const loadSalesReport = useCallback(async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams();
         params.set("tab", "sales");
         if (dateRange[0]) params.set("startDate", dateRange[0].toISOString());
         if (dateRange[1]) params.set("endDate", dateRange[1].toISOString());

         const res = await fetch(`/api/reports?${params.toString()}`);
         if (res.ok) {
            const data = await res.json();
            setReport(data);
         }
      } catch {}
      setLoading(false);
   }, [dateRange]);

   useEffect(() => {
      loadSalesReport();
   }, [loadSalesReport]);

   const columns = [
      {
         field: "id",
         headerName: "Order ID",
         width: 150,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setDetailOrderId(params.row.id)}
            >
               {params.row.id}
            </Typography>
         ),
      },
      {
         field: "customer",
         headerName: "Customer",
         width: 200,
         renderCell: (params: GridCellParams) => (
            <CustomerInfo {...(params.row.customer as any)} />
         ),
      },
      {
         field: "createdAt",
         headerName: "Created At",
         width: 200,
         renderCell: (params: any) => {
            const d = params.row.createdAt ? new Date(params.row.createdAt) : new Date();
            return d.toLocaleString();
         },
      },
      {
         field: "amount",
         headerName: "Amount",
         width: 150,
         renderCell: (params: any) => formatCurrency(params.row.amount),
      },
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

   const analyticsCards = [
      {
         title: "Total orders",
         value: report?.totalOrders ?? 0,
         isPositive: true,
         percentage: "100%",
         data: report?.trendData || [10, 20, 30, 40, 50, 60, 70],
      },
      {
         title: "Total revenue",
         value: formatCurrency(report?.totalRevenue ?? 0),
         isPositive: true,
         percentage: "+15%",
         data: report?.trendData || [50, 60, 70, 80, 90, 100, 110],
      },
      {
         title: "Completed orders",
         value: report?.completedCount ?? 0,
         isPositive: true,
         percentage: "+12%",
         data: [1, 2, 4, 6, 8, 10, 12],
      },
      {
         title: "Returned / Failed",
         value: report?.returnedCount ?? 0,
         isPositive: false,
         percentage: "-2%",
         data: [2, 1, 3, 2, 1, 2, 1],
      },
   ];

   const graphData = (report?.trendData || [100, 200, 300, 400, 500, 600, 700]).map((y: number, idx: number) => ({
      x: `Day ${idx + 1}`,
      y,
   }));

   return (
      <Stack>
         <Grid container spacing={2}>
            {analyticsCards.map((item, idx) => (
               <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                  <AnalyticsCard {...item} />
               </Grid>
            ))}

            <Grid size={{ xs: 12, md: 4 }}>
               <RadialBar
                  title={"Orders Status Breakdown"}
                  data={[
                     {
                        label: "Completed",
                        value: report?.completedCount || 0,
                     },
                     {
                        label: "Returned / Failed",
                        value: report?.returnedCount || 0,
                     },
                     {
                        label: "Other Status",
                        value: Math.max((report?.totalOrders || 0) - (report?.completedCount || 0) - (report?.returnedCount || 0), 0),
                     },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
               <AnalyticsGraph
                  type="day"
                  title="Revenue Analytics"
                  isPositive={true}
                  currency={settings.currencySymbol || "৳"}
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
                     Orders Table
                  </Typography>
                  <CustomTable
                     rows={report?.orders || []}
                     columns={columns}
                     checkBox={true}
                     canExport={true}
                     canPrint={true}
                     exportConfig={{
                        filename: `Sales_Report_Orders_${new Date().toISOString().split("T")[0]}`,
                        title: "DevX POS - Sales Orders Report",
                     }}
                     printConfig={{
                        title: "DevX POS - Sales Orders Report",
                     }}
                     filter={(data, onChange) => (
                        <DateRangePickerCustom
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

         <OrderDetailModal
            open={Boolean(detailOrderId)}
            onClose={() => setDetailOrderId(null)}
            orderId={detailOrderId}
         />
      </Stack>
   );
};

export default Sales;
