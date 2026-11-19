import { Alert, Grid, Stack } from "@mui/material";
import React from "react";
import AnalyticsCard from "@cmp/AnalyticsCard";
import RadialBar from "@cmp/RadialBar";
import { useSettings } from "@src/lib/settingsContext";
import { formatCompactNumber } from "@src/lib/utils";

const Summary = () => {
   const { settings } = useSettings();
   const [report, setReport] = React.useState<any>(null);
   const [error, setError] = React.useState<string | null>(null);

   React.useEffect(() => {
      fetch("/api/reports")
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
   }, []);

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
