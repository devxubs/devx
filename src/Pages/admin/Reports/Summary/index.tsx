import { Alert, Grid, Stack, Typography } from "@mui/material";
import React from "react";
import AnalyticsCard from "@cmp/AnalyticsCard";
import RadialBar from "@cmp/RadialBar";
import DateRangePickerCustom from "@src/components/DateRange";
import { useSettings } from "@src/lib/settingsContext";
import { formatCompactNumber } from "@src/lib/utils";
import { reportParams } from "../reportExport";

const Summary = () => {
   const { settings } = useSettings();
   const [report, setReport] = React.useState<any>(null);
   const [error, setError] = React.useState<string | null>(null);
   const [dateRange, setDateRange] = React.useState<[Date | null, Date | null]>([null, null]);

   React.useEffect(() => {
      const params = reportParams("summary", dateRange);
      fetch(`/api/reports?${params.toString()}`)
         .then((r) => {
            if (!r.ok) throw new Error("Failed to load summary report");
            return r.json();
         })
         .then((d) => {
            if (d) setReport(d);
         })
         // A failed load must not silently render as all-zero figures.
         .catch(() =>
            setError(
               "Failed to load the summary report. The figures below may be missing or out of date.",
            ),
         );
   }, [dateRange]);

   const hasRange = Boolean(dateRange[0] || dateRange[1]);

   // Phase 1 (NEW-04/NEW-05): every figure on this tab comes from the
   // reports API. The previous version rendered invented trend
   // sparklines on the KPI cards and fully hard-coded "Revenue
   // Analysis", "Order Analysis", "Customer Growth", "Deliveries by
   // Region" (80/15/5) and "Inventory Overview" (80/15/5) panels —
   // those panels are removed rather than decorated with fake data.
   // Real per-tab detail lives in the Sales / Products / Courier tabs.
   // KPI cards use the shared compact formatter (lib/utils) — the
   // same treatment as every other Reports tab's cards; exact values
   // stay in the per-tab tables.
   const currencySymbol = settings.currencySymbol || "৳";
   const dynamicCards = [
      {
         title: "Total Revenue",
         value: formatCompactNumber(report?.totalRevenue ?? 0, { currencySymbol }),
         isPositive: true,
      },
      {
         title: "Total Orders",
         value: formatCompactNumber(report?.totalOrders ?? 0),
         isPositive: true,
      },
      {
         title: "Total Products",
         value: formatCompactNumber(report?.totalProducts ?? 0),
         isPositive: true,
      },
      {
         title: "Total Customers",
         value: formatCompactNumber(report?.totalCustomers ?? 0),
         isPositive: true,
      },
   ];

   const dynamicBreakdown = report?.ordersByStatus?.length
      ? report.ordersByStatus.map((s: any) => ({
           label: s.status,
           value: s.count,
        }))
      : [
           { label: "Completed", value: 0 },
           { label: "Pending", value: 0 },
           { label: "Cancelled", value: 0 },
        ];

   return (
      <Stack spacing={2}>
         {error && <Alert severity="error">{error}</Alert>}
         <Stack direction="row" justifyContent="flex-end">
            <DateRangePickerCustom
               title="Filter by Date"
               value={dateRange}
               onChange={(v: [Date | null, Date | null]) => setDateRange(v)}
            />
         </Stack>
         {/* Honest scope caption: period flows (revenue, orders,
             status breakdown) follow the selected range; the product
             and customer totals are current all-time counts and do
             not change with the range. */}
         <Typography variant="caption" color="text.secondary">
            {hasRange
               ? "Revenue, orders and the status breakdown cover the selected period. Total Products and Total Customers are current all-time counts."
               : "All figures are all-time totals. Pick a date range to view a specific period — product and customer totals always stay current."}
         </Typography>
         <Grid container spacing={2}>
            {dynamicCards.map((item, index) => (
               <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                  <AnalyticsCard
                     title={item.title}
                     value={item.value}
                     isPositive={item.isPositive}
                  />
               </Grid>
            ))}
            <Grid size={{ xs: 12, sm: 4 }}>
               <RadialBar
                  title="Orders Status Breakdown"
                  data={dynamicBreakdown}
                  // RadialBar's centre "Total" reads this prop — without
                  // it the chart always showed a total of 0.
                  value={String(report?.totalOrders ?? 0)}
               />
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Summary;
