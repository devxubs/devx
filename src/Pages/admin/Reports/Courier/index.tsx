"use client";

import { Alert, Stack, Grid, Typography } from "@mui/material";
import React, { useState, useEffect, useCallback } from "react";
import CustomTable from "@src/components/Table";
import DateRange from "@src/components/DateRange";
import { useTheme } from "@mui/material/styles";
import AnalyticsCard from "@cmp/AnalyticsCard";
import RadialBar from "@cmp/RadialBar";
import { useSettings } from "@src/lib/settingsContext";
import { OrderDetailModal } from "@src/components/EntityDetailModals/EntityModals";
import { fetchAllReportRows, reportParams } from "../reportExport";
import { formatCompactNumber } from "@src/lib/utils";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { filterRowsBySearch } from "@src/lib/tableSearch";

const Courier = () => {
   const theme = useTheme();
   const { formatCurrency, settings } = useSettings();
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   // KPI totals over the COMPLETE filtered dataset (see loader).
   const [cardTotals, setCardTotals] = useState<{
      count: number;
      payout: number;
      fees: number;
   } | null>(null);
   const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
   const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
   // Phase B4b (P1-5): consume the shared toolbar search on the
   // Courier details table below (client-side over the displayed
   // rows — the reports API has no search parameter). The
   // Performance-by-courier table above it is a per-courier
   // aggregate, so its search is suppressed via hideSearch instead:
   // both tables share this page's filter store, and the aggregate
   // must never show a Keyword chip for a term it does not consume.
   const { filterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";

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
            setError(null);
            // The main fetch returns one page (100 rows), so card
            // totals summed from it silently described only that
            // page. Page through the complete filtered row set with
            // the same loader the exports use; if that fails, the
            // cards fall back to the displayed page (previous
            // behaviour) rather than showing nothing.
            try {
               const allRows = await fetchAllReportRows(
                  reportParams("courier", dateRange),
                  (d) => d.rows || [],
               );
               if (allRows.length > 0 || (data.rows || []).length === 0) {
                  setCardTotals({
                     count: allRows.length,
                     payout: allRows.reduce(
                        (s: number, r: any) => s + Number(r.courier_pay_to_you || 0),
                        0,
                     ),
                     fees: allRows.reduce(
                        (s: number, r: any) => s + Number(r.courier_charge || 0),
                        0,
                     ),
                  });
               } else {
                  setCardTotals(null);
               }
            } catch {
               setCardTotals(null);
            }
         } else {
            setError("Failed to load the courier report. The figures below may be out of date.");
         }
      } catch {
         setError("Failed to load the courier report. The figures below may be out of date.");
      }
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
         // The API's total_price is the order SUBTOTAL (before the
         // shipping charge shown in the next column) — label it so.
         headerName: "Subtotal",
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
   const filteredRows: any[] = React.useMemo(
      () =>
         filterRowsBySearch(report?.rows || [], searchText, [
            "id",
            "source",
            "courier_submitted_at",
         ]),
      [report, searchText],
   );
   // Card totals come from the complete filtered dataset (cardTotals,
   // loaded above); the displayed-page sums remain only as a fallback
   // if the complete fetch failed. NOTE on the first card's title:
   // the courier report's rows cover ALL orders in the period —
   // including direct/walk-in orders with no courier (see the
   // distribution chart's "Direct" segment) — so the count is
   // labelled "Total Orders", not "Total In Courier".
   const totalSubmitted = cardTotals?.count ?? rows.length;
   const totalPaidToYou =
      cardTotals?.payout ??
      rows.reduce((s: number, r: any) => s + Number(r.courier_pay_to_you || 0), 0);
   const totalCharges =
      cardTotals?.fees ??
      rows.reduce((s: number, r: any) => s + Number(r.courier_charge || 0), 0);

   // Phase 1: card values are computed from the fetched report rows.
   // The invented percentage changes, sparkline arrays, and the
   // hard-coded "Courier Success Rate" (96%/100% — no delivery-outcome
   // data backs it) have been removed.
   // KPI cards use the shared compact formatter (lib/utils); the
   // tables below keep exact values.
   const currencySymbol = settings.currencySymbol || "৳";
   const courierData = [
      {
         title: "Total Orders",
         value: formatCompactNumber(totalSubmitted),
         isPositive: true,
      },
      {
         title: "Courier Net Payout",
         value: formatCompactNumber(totalPaidToYou, { currencySymbol }),
         isPositive: true,
      },
      {
         title: "Total Courier Fees",
         value: formatCompactNumber(totalCharges, { currencySymbol }),
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

   // Phase 3B (3.4): per-courier performance from the API's
   // courierStats aggregates (complete filtered dataset, not just
   // the displayed page). Definitions live in the reports route:
   // dispatched = handed to courier, delivered = DELIVERED/COMPLETED,
   // returned = courierStatus "Returned" or cancelled after dispatch,
   // COD collected = delivered order totals, COD pending = dues of
   // orders still in flight.
   const courierStatRows = (report?.courierStats || []).map((s: any) => ({
      id: s.courier,
      ...s,
   }));
   const courierStatColumns = [
      { field: "courier", headerName: "Courier", width: 160 },
      { field: "orders", headerName: "Orders", width: 90 },
      { field: "dispatched", headerName: "Dispatched", width: 110 },
      { field: "delivered", headerName: "Delivered", width: 100 },
      {
         field: "deliveredPct",
         headerName: "Delivered %",
         width: 110,
         renderCell: (p: any) => `${p.row.deliveredPct}%`,
      },
      { field: "returned", headerName: "Returned", width: 100 },
      {
         field: "returnedPct",
         headerName: "Returned %",
         width: 110,
         renderCell: (p: any) => `${p.row.returnedPct}%`,
      },
      {
         field: "codCollected",
         headerName: "COD Collected",
         width: 140,
         renderCell: (p: any) => formatCurrency(p.row.codCollected),
      },
      {
         field: "codPending",
         headerName: "COD Pending",
         width: 130,
         renderCell: (p: any) => formatCurrency(p.row.codPending),
      },
      {
         field: "courierCharges",
         headerName: "Courier Charges",
         width: 140,
         renderCell: (p: any) => formatCurrency(p.row.courierCharges),
      },
   ];

   return (
      <Stack spacing={2}>
         {error && <Alert severity="error">{error}</Alert>}
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
                  value={String(
                     distribution.reduce(
                        (s: number, d: any) => s + Number(d.value || 0),
                        0,
                     ),
                  )}
               />
            </Grid>

            <Grid size={{ xs: 12 }}>
               <Stack
                  spacing={2}
                  bgcolor={"background.paper"}
                  sx={{ borderRadius: 1.5 }}
               >
                  <Typography
                     variant="h5"
                     fontWeight={700}
                     sx={{ px: 3, pt: 2, pb: 0 }}
                  >
                     Performance by courier
                  </Typography>
                  {courierStatRows.length === 0 && !loading ? (
                     <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 3 }}>
                        No courier orders in this period yet.
                     </Typography>
                  ) : (
                     <CustomTable
                        rows={courierStatRows}
                        columns={courierStatColumns}
                        hideSearch
                        loading={loading}
                        checkBox={true}
                        canExport={true}
                        exportConfig={{
                           filename: `Courier_Performance_${new Date().toISOString().split("T")[0]}`,
                           title: "DevX POS - Courier Performance by Partner",
                           fetchAllData: () =>
                              fetchAllReportRows(
                                 reportParams("courier", dateRange),
                                 (d) =>
                                    (d.courierStats || []).map((s: any) => ({
                                       id: s.courier,
                                       ...s,
                                    })),
                              ),
                        }}
                     />
                  )}
               </Stack>
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
                     rows={filteredRows}
                     columns={columns}
                     loading={loading}
                     checkBox={true}
                     canExport={true}
                     canPrint={true}
                     exportConfig={{
                        filename: `Couriers_Report_${new Date().toISOString().split("T")[0]}`,
                        title: "DevX POS - Couriers Performance Report",
                        fetchAllData: () =>
                           fetchAllReportRows(
                              reportParams("courier", dateRange),
                              (d) => d.rows || [],
                           ),
                     }}
                     printConfig={{
                        title: "DevX POS - Couriers Performance Report",
                     }}
                     filter={(data, onChange) => (
                        <DateRange
                           // The range filters orders by their ORDER
                           // (creation) date — the API's where clause
                           // is on Order.createdAt. The previous title
                           // claimed it filtered by courier submission
                           // date, which it never did.
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

export default Courier;
