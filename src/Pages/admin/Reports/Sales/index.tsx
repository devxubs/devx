"use client";
import { Grid, Stack } from "@mui/material";
import React from "react";
import AnalyticsCard from "./AnalyticsCard";

const analyticsItem = [
   {
      title: "Daily Sales Report",
      value: 765,
      isPositive: true,
      data: [50, 80, 120, 110, 140, 130, 100],
   },
   {
      title: "Monthly Sales Summary",
      value: 165,
      isPositive: true,
      data: [70, 90, 100, 60, 50, 80, 90],
   },
   {
      title: "Sales by Products",
      value: 950,
      isPositive: true,
      data: [40, 70, 75, 70, 50, 28, 7, 64].reverse(),
   },
   {
      title: "Sales by Employee",
      value: 950,
      isPositive: true,
      data: [4, 7, 15, 30, 40, 30, 20, 12, 7, 4],
   },
];

const Sales = () => {
   return (
      <Stack>
         <Grid container spacing={3}>
            {analyticsItem.map((item, idx) => {
               return (
                  <Grid size={{ xs: 12, md: 6 }} key={idx}>
                     <AnalyticsCard
                        {...item}
                        data={[
                           { x: "2025-01-01", y: 10000 },
                           { x: "2025-01-05", y: 20000 },
                           { x: "2025-01-10", y: 18000 },
                           { x: "2025-01-15", y: 26000 },
                           { x: "2025-01-20", y: 30000 },
                        ]}
                     />
                  </Grid>
               );
            })}
         </Grid>
      </Stack>
   );
};

export default Sales;
