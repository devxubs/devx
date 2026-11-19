import { Grid, Stack } from "@mui/material";
import React from "react";
import AnalyticsCard from "@cmp/AnalyticsCard";
import RadialBar from "@cmp/RadialBar";
import { useSettings } from "@src/lib/settingsContext";

const Summary = () => {
   const { formatCurrency } = useSettings();
   const [report, setReport] = React.useState<any>(null);

   React.useEffect(() => {
      fetch("/api/reports")
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => {
            if (d) setReport(d);
         })
         .catch(() => {});
   }, []);

   // Phase 1 (NEW-04/NEW-05): every figure on this tab comes from the
   // reports API. The previous version rendered invented trend
   // sparklines on the KPI cards and fully hard-coded "Revenue
   // Analysis", "Order Analysis", "Customer Growth", "Deliveries by
   // Region" (80/15/5) and "Inventory Overview" (80/15/5) panels —
   // those panels are removed rather than decorated with fake data.
   // Real per-tab detail lives in the Sales / Products / Courier tabs.
   const dynamicCards = [
      {
         title: "Total Revenue",
         value: formatCurrency(report?.totalRevenue ?? 0),
         isPositive: true,
      },
      {
         title: "Total Orders",
         value: report?.totalOrders ?? 0,
         isPositive: true,
      },
      {
         title: "Total Products",
         value: report?.totalProducts ?? 0,
         isPositive: true,
      },
      {
         title: "Total Customers",
         value: report?.totalCustomers ?? 0,
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
               />
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Summary;
