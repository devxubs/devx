"use client";

import { Stack, Grid, Typography } from "@mui/material";
import React, { useState, useEffect, useCallback } from "react";
import AnalyticsCard from "@cmp/AnalyticsCard";
import CustomTable from "@src/components/Table";
import DateRangePickerCustom from "@src/components/DateRange";
import { useSettings } from "@src/lib/settingsContext";
import { PurchaseDetailModal } from "@src/components/EntityDetailModals/EntityModals";
import { fetchAllReportRows, reportParams } from "../reportExport";

const Purchases = () => {
   const { formatCurrency } = useSettings();
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
   const [detailPurchaseId, setDetailPurchaseId] = useState<string | null>(null);

   const loadPurchasesReport = useCallback(async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams();
         params.set("tab", "purchases");
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
      loadPurchasesReport();
   }, [loadPurchasesReport]);

   const columns = [
      {
         field: "id",
         headerName: "Purchase ID",
         width: 150,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setDetailPurchaseId(params.row.id)}
            >
               {params.row.id}
            </Typography>
         ),
      },
      { field: "supplier", headerName: "Supplier", width: 200 },
      { field: "date", headerName: "Date", width: 150 },
      {
         field: "totalAmount",
         headerName: "Total Amount",
         width: 150,
         renderCell: (params: any) => formatCurrency(Number(params.row.totalAmount || 0)),
      },
      { field: "status", headerName: "Status", width: 150 },
   ];

   const rows = report?.rows || [];
   const totalAmount = report?.totalAmount || 0;
   const totalCount = report?.totalCount || rows.length;

   return (
      <Stack spacing={3}>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Purchases"}
                  isPositive={true}
                  value={totalCount}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Spending"}
                  isPositive={true}
                  value={formatCurrency(totalAmount)}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Suppliers Active"}
                  isPositive={true}
                  value={new Set(rows.map((r: any) => r.supplier)).size}
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
                     Purchases Report
                  </Typography>

                  <CustomTable
                     rows={rows}
                     columns={columns}
                     checkBox={true}
                     canExport={true}
                     canPrint={true}
                     exportConfig={{
                        filename: `Purchases_Report_${new Date().toISOString().split("T")[0]}`,
                        title: "DevX POS - Purchases Report",
                        fetchAllData: () =>
                           fetchAllReportRows(
                              reportParams("purchases", dateRange),
                              (d) => d.rows || [],
                           ),
                     }}
                     printConfig={{
                        title: "DevX POS - Purchases Report",
                     }}
                     filter={(d, onChange) => (
                        <DateRangePickerCustom
                           type={"range"}
                           title="Select Date"
                           value={dateRange}
                           onChange={(date: [Date | null, Date | null]) => {
                              setDateRange(date);
                           }}
                        />
                     )}
                  />
               </Stack>
            </Grid>
         </Grid>

         <PurchaseDetailModal
            open={Boolean(detailPurchaseId)}
            onClose={() => setDetailPurchaseId(null)}
            purchaseId={detailPurchaseId}
         />
      </Stack>
   );
};

export default Purchases;
