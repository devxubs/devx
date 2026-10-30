import { Grid, Stack } from "@mui/material";
import React from "react";
import AnalyticsCard from "@cmp/AnalyticsCard";
import RadialBar from "@cmp/RadialBar";
import AnalyticsGraph from "@cmp/AnalyticsGraph";
import { useSettings } from "@src/lib/settingsContext";

const Summary = () => {
   const { formatCurrency, settings } = useSettings();
   const [report, setReport] = React.useState<any>(null);

   React.useEffect(() => {
      fetch("/api/reports")
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => {
            if (d) setReport(d);
         })
         .catch(() => {});
   }, []);

   const dynamicCards = [
      {
         title: "Total Revenue",
         value: formatCurrency(report?.totalRevenue ?? 0),
         percentage: 0,
         isPositive: true,
         data: [0, 0, 0, 0, 0, 0, Number(report?.totalRevenue || 0)],
      },
      {
         title: "Total Orders",
         value: report?.totalOrders ?? 0,
         percentage: 0,
         isPositive: true,
         data: [0, 0, 0, 0, 0, 0, Number(report?.totalOrders || 0)],
      },
      {
         title: "Total Products",
         value: report?.totalProducts ?? 0,
         percentage: 0,
         isPositive: true,
         data: [0, 0, 0, 0, 0, 0, Number(report?.totalProducts || 0)],
      },
      {
         title: "Total Customers",
         value: report?.totalCustomers ?? 0,
         percentage: 0,
         isPositive: true,
         data: [0, 0, 0, 0, 0, 0, Number(report?.totalCustomers || 0)],
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
                     percentage={`${item.percentage}%`}
                     isPositive={item.isPositive}
                     data={item.data}
                  />
               </Grid>
            ))}
            <Grid size={{ xs: 12, sm: 4 }}>
               <RadialBar
                  title="Orders Status Breakdown"
                  data={dynamicBreakdown}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
               <AnalyticsGraph
                  title={"Revenue Analysis"}
                  isPositive={true}
                  currency={settings.currencySymbol || "৳"}
                  data={[
                     {
                        x: "2026-03-01",
                        y: 2000,
                     },
                     {
                        x: "2026-03-02",
                        y: 3000,
                     },
                     {
                        x: "2026-03-03",
                        y: 2500,
                     },
                     {
                        x: "2026-03-04",
                        y: 4000,
                     },
                     {
                        x: "2026-03-05",
                        y: 3500,
                     },
                     {
                        x: "2026-03-06",
                        y: 4500,
                     },
                     {
                        x: "2026-03-07",
                        y: 5000,
                     },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
               <AnalyticsGraph
                  title={"Order Analysis"}
                  isPositive={true}
                  data={[
                     {
                        x: "2026-03-01",
                        y: 2000,
                     },
                     {
                        x: "2026-03-02",
                        y: 3000,
                     },
                     {
                        x: "2026-03-03",
                        y: 2500,
                     },
                     {
                        x: "2026-03-04",
                        y: 4000,
                     },
                     {
                        x: "2026-03-05",
                        y: 3500,
                     },
                     {
                        x: "2026-03-06",
                        y: 4500,
                     },
                     {
                        x: "2026-03-07",
                        y: 5000,
                     },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <RadialBar
                  title="Deliveries by Region"
                  data={[
                     { label: "North", value: 80 },
                     { label: "South", value: 15 },
                     { label: "East", value: 5 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <RadialBar
                  title="Inventory Overview"
                  data={[
                     { label: "In Stock", value: 80 },
                     { label: "Low Stock", value: 15 },
                     { label: "Out of Stock", value: 5 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
               <AnalyticsGraph
                  title={"Customer Growth"}
                  isPositive={true}
                  data={[
                     {
                        x: "2026-03-01",
                        y: 1000,
                     },
                     {
                        x: "2026-03-02",
                        y: 4000,
                     },
                     {
                        x: "2026-03-03",
                        y: 1500,
                     },
                     {
                        x: "2026-03-04",
                        y: 6000,
                     },
                     {
                        x: "2026-03-05",
                        y: 2500,
                     },
                     {
                        x: "2026-03-06",
                        y: 5500,
                     },
                     {
                        x: "2026-03-07",
                        y: 6000,
                     },
                  ]}
               />
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Summary;
