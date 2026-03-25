import { Grid, Stack } from "@mui/material";
import React from "react";
import AnalyticsCard from "../components/AnalyticsCard";
import { formatCompactNumber } from "@src/handler";
import RadialBar from "../components/RadialBar";
import AnalyticsGraph from "../components/AnalyticsGraph";

const summaryData = [
   {
      title: "Total Revenue",
      value: "25000",
      currency: "$",
      percentage: 15,
      isPositive: true,
      data: [2000, 3000, 2500, 4000, 3500, 4500, 5000],
   },
   {
      title: "Total Orders",
      value: 1200,
      percentage: -5,
      isPositive: false,
      data: [150, 200, 180, 220, 210, 190, 250],
   },
   {
      title: "Total Products",
      value: "20",
      percentage: 10,
      isPositive: true,
      data: [18, 20, 19, 22, 21, 20, 23],
   },
   {
      title: "Total Customers",
      value: "7350",
      percentage: 5,
      isPositive: true,
      data: [70, 72, 74, 75, 76, 78, 80],
   },
];

const Summary = () => {
   return (
      <Stack spacing={2}>
         <Grid container spacing={2}>
            {summaryData.map((item, index) => (
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
                  title="Order Overview"
                  data={[
                     { label: "Completed", value: 70 },
                     { label: "Cancelled", value: 5 },
                     { label: "Returned", value: 15 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
               <AnalyticsGraph
                  title={"Revenue Analysis"}
                  isPositive={true}
                  currency="$"
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
                  title="Inventory Overview"
                  data={[
                     { label: "In Stock", value: 80 },
                     { label: "Low Stock", value: 15 },
                     { label: "Out of Stock", value: 5 },
                  ]}
               />
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Summary;
