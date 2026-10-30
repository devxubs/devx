"use client";

import { Stack, Grid, Typography } from "@mui/material";
import React, { useState, useEffect, useCallback } from "react";
import CustomTable from "@src/components/Table";
import DateRange from "@src/components/DateRange";
import { useTheme } from "@mui/material/styles";
import AnalyticsCard from "@cmp/AnalyticsCard";
import AnalyticsGraph from "@cmp/AnalyticsGraph";
import RadialBar from "@cmp/RadialBar";
import { useSettings } from "@src/lib/settingsContext";
import { OrderDetailModal } from "@src/components/EntityDetailModals/EntityModals";

const Courier = () => {
   const theme = useTheme();
   const { formatCurrency } = useSettings();
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
   const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

   const loadCourierReport = useCallback(async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams();
         params.set("tab", "courier");
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
      loadCourierReport();
   }, [loadCourierReport]);

   const columns = [
      {
         field: "id",
         headerName: "Order ID",
         width: 120,
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
         field: "courier_submitted_at",
         headerName: "Courier Submitted At",
         width: 200,
      },
      {
         field: "total_price",
         headerName: "Total Price",
         width: 150,
         renderCell: (params: any) => formatCurrency(params.row.total_price),
      },
      {
         field: "shipping_charge",
         headerName: "Shipping Charge",
         width: 150,
         renderCell: (params: any) => formatCurrency(params.row.shipping_charge),
      },
      {
         field: "total_amount",
         headerName: "Total Amount",
         width: 150,
         renderCell: (params: any) => formatCurrency(params.row.total_amount),
      },
      {
         field: "courier_charge",
         headerName: "Courier Charge",
         width: 150,
         renderCell: (params: any) => formatCurrency(params.row.courier_charge),
      },
      {
         field: "courier_pay_to_you",
         headerName: "Courier Pay To You",
         width: 170,
         renderCell: (params: any) => formatCurrency(params.row.courier_pay_to_you),
      },
   ];

   const rows = report?.rows || [];
   const totalSubmitted = rows.length;
   const totalPaidToYou = rows.reduce((s: number, r: any) => s + Number(r.courier_pay_to_you || 0), 0);
   const totalCharges = rows.reduce((s: number, r: any) => s + Number(r.courier_charge || 0), 0);

   const courierData = [
      {
         title: "Total In Courier",
         value: totalSubmitted,
         percentage: "+5%",
         isPositive: true,
         data: [10, 20, 30, 25, 35, 45, 50],
      },
      {
         title: "Courier Net Payout",
         value: formatCurrency(totalPaidToYou),
         percentage: "+8%",
         isPositive: true,
         data: [500, 1000, 1500, 2000, 2500, 3000, 3500],
      },
      {
         title: "Total Courier Fees",
         value: formatCurrency(totalCharges),
         percentage: "-2%",
         isPositive: false,
         data: [80, 160, 240, 320, 400, 480, 560],
      },
      {
         title: "Courier Success Rate",
         value: totalSubmitted > 0 ? "96%" : "100%",
         percentage: "+1.2%",
         isPositive: true,
         data: [90, 92, 94, 95, 96, 96, 96],
      },
   ];

   const distribution = report?.distribution?.length
      ? report.distribution
      : [
           { label: "Steadfast", value: 0 },
           { label: "Pathao", value: 0 },
           { label: "RedX", value: 0 },
        ];

   return (
      <Stack spacing={2}>
         <Grid container spacing={2}>
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

            <Grid size={{ xs: 12, md: 8 }}>
               <AnalyticsGraph
                  title={"Courier Payout Trends"}
                  isPositive={true}
                  data={[
                     { x: "Week 1", y: 1200 },
                     { x: "Week 2", y: 1800 },
                     { x: "Week 3", y: 1600 },
                     { x: "Week 4", y: 2400 },
                  ]}
               />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
               <RadialBar
                  title="Deliveries by Courier Partner"
                  data={distribution}
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
                     Courier details
                  </Typography>
                  <CustomTable
                     rows={rows}
                     columns={columns}
                     checkBox={true}
                     canExport={true}
                     canPrint={true}
                     exportConfig={{
                        filename: `Couriers_Report_${new Date().toISOString().split("T")[0]}`,
                        title: "DevX POS - Couriers Performance Report",
                     }}
                     printConfig={{
                        title: "DevX POS - Couriers Performance Report",
                     }}
                     filter={(data, onChange) => (
                        <DateRange
                           title="Filter by Courier Submitted Date"
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

export default Courier;
