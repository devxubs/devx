"use client";

import { Stack, Grid, Typography } from "@mui/material";
import React, { useState, useEffect, useCallback } from "react";
import CustomTable from "@src/components/Table";
import DateRange from "@src/components/DateRange";
import { useTheme } from "@mui/material/styles";
import AnalyticsCard from "@cmp/AnalyticsCard";
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

   // Phase 1: card values are computed from the fetched report rows.
   // The invented percentage changes, sparkline arrays, and the
   // hard-coded "Courier Success Rate" (96%/100% — no delivery-outcome
   // data backs it) have been removed.
   const courierData = [
      {
         title: "Total In Courier",
         value: totalSubmitted,
         isPositive: true,
      },
      {
         title: "Courier Net Payout",
         value: formatCurrency(totalPaidToYou),
         isPositive: true,
      },
      {
         title: "Total Courier Fees",
         value: formatCurrency(totalCharges),
         isPositive: false,
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
                     isPositive={item.isPositive}
                  />
               </Grid>
            ))}

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
