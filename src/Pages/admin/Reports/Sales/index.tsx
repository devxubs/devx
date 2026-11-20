"use client";
import { Alert, Grid, Stack, Typography } from "@mui/material";
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
import { fetchAllReportRows, reportParams } from "../reportExport";
import { formatCompactNumber } from "@src/lib/utils";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { filterRowsBySearch } from "@src/lib/tableSearch";

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
   const [error, setError] = useState<string | null>(null);
   const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
   const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
   // Phase B4b (P1-5): consume the shared toolbar search. The reports
   // API has no search parameter, so the term filters the displayed
   // order rows client-side (lib/tableSearch) over the table's own
   // fields. The KPI cards / totals keep describing the complete
   // date-filtered dataset — only the table rows filter.
   const { filterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";

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
            setError(null);
         } else {
            setError("Failed to load the sales report. The figures below may be out of date.");
         }
      } catch {
         setError("Failed to load the sales report. The figures below may be out of date.");
      }
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

   // Phase 1: the API's trendData is a real 7-day revenue trend, so the
   // revenue card and the graph may use it — but the invented fallback
   // arrays and percentage labels are removed, and the revenue trend is
   // no longer presented as the "Total orders" trend.
   // KPI cards use the shared compact formatter (lib/utils), like
   // every other Reports tab; the table below keeps exact values.
   // NOTE on the last card's title: the API's cancelledFailedCount
   // counts CANCELLED + FAILED orders (there is no RETURNED order
   // status), so the card is labelled "Cancelled / Failed", not
   // "Returned". (The API also still sends the old `returnedCount`
   // name as a deprecated alias; the frontend reads the honest name
   // and falls back to the alias for older responses.)
   const analyticsCards = [
      {
         title: "Total orders",
         value: formatCompactNumber(report?.totalOrders ?? 0),
         isPositive: true,
      },
      {
         title: "Total revenue",
         value: formatCompactNumber(report?.totalRevenue ?? 0, {
            currencySymbol: settings.currencySymbol || "৳",
         }),
         isPositive: true,
         data: report?.trendData,
      },
      {
         title: "Completed orders",
         value: formatCompactNumber(report?.completedCount ?? 0),
         isPositive: true,
      },
      {
         title: "Cancelled / Failed",
         value: formatCompactNumber(
            report?.cancelledFailedCount ?? report?.returnedCount ?? 0,
         ),
         isPositive: false,
      },
   ];

   // The API's trendData is the 7-day revenue window ending at the
   // selected range's end (or today). The graph is a datetime chart,
   // so each point needs its real date — the previous "Day 1…7"
   // strings parsed as 1 Jan 2001 and the graph's own month filter
   // dropped every point, leaving an always-empty chart.
   const filteredOrders = React.useMemo(
      () =>
         filterRowsBySearch(report?.orders || [], searchText, [
            "id",
            "payment",
            "status",
            "amount",
            (r: any) => r.customer?.name,
            (r: any) => r.customer?.phone,
            (r: any) => r.customer?.email,
         ]),
      [report, searchText],
   );

   const trendEnd =
      dateRange[1] && dateRange[1].getTime() < Date.now() ? dateRange[1] : new Date();
   const trendValues: number[] = report?.trendData || [];
   const graphData = trendValues.map((y: number, idx: number) => {
      const d = new Date(trendEnd);
      d.setDate(d.getDate() - (trendValues.length - 1 - idx));
      return { x: d, y };
   });

   return (
      <Stack spacing={2}>
         {error && <Alert severity="error">{error}</Alert>}
         <Grid container spacing={2}>
            {analyticsCards.map((item, idx) => (
               <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                  <AnalyticsCard {...item} />
               </Grid>
            ))}

            <Grid size={{ xs: 12, md: 4 }}>
               <RadialBar
                  title={"Orders Status Breakdown"}
                  value={String(report?.totalOrders ?? 0)}
                  data={[
                     {
                        label: "Completed",
                        value: report?.completedCount || 0,
                     },
                     {
                        label: "Cancelled / Failed",
                        value:
                           report?.cancelledFailedCount ??
                           report?.returnedCount ??
                           0,
                     },
                     {
                        label: "Other Status",
                        value: Math.max((report?.totalOrders || 0) - (report?.completedCount || 0) - (report?.cancelledFailedCount ?? report?.returnedCount ?? 0), 0),
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
                     rows={filteredOrders}
                     columns={columns}
                     loading={loading}
                     checkBox={true}
                     canExport={true}
                     canPrint={true}
                     exportConfig={{
                        filename: `Sales_Report_Orders_${new Date().toISOString().split("T")[0]}`,
                        title: "DevX POS - Sales Orders Report",
                        // Phase 2 (§2.8): export the complete
                        // date-filtered dataset, not just the page
                        // currently displayed.
                        fetchAllData: () =>
                           fetchAllReportRows(
                              reportParams("sales", dateRange),
                              (d) => d.orders || [],
                           ),
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
