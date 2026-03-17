"use client";
import { Grid, Stack, Typography } from "@mui/material";
import React from "react";
import AnalyticsCard from "../components/AnalyticsCard";
import AnalyticsGraph from "../components/AnalyticsGraph";
import RadialBar from "../components/RadialBar";
import CustomTable from "@src/components/Table";

const analyticsItem = [
   {
      title: "Total orders",
      value: 765,
      isPositive: false,
      percentage: "5%",
      data: [50, 80, 120, 110, 140, 130, 100],
   },
   {
      title: "Total revenue",
      value: "$165",
      isPositive: true,
      percentage: "10%",
      data: [70, 90, 100, 60, 50, 80, 90],
   },
   {
      title: "Completed orders",
      value: 950,
      isPositive: true,
      percentage: "15%",
      data: [40, 70, 75, 70, 50, 28, 7, 64].reverse(),
   },
   {
      title: "Returned orders",
      value: 50,
      isPositive: false,
      percentage: "5%",
      data: [4, 7, 15, 30, 40, 30, 20, 12, 7, 4],
   },
];

const Sales = () => {
   return (
      <Stack>
         <Grid container spacing={2}>
            {analyticsItem.map((item, idx) => {
               return (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                     <AnalyticsCard
                        {...item}
                        data={[...item.data].reverse()} // Reverse the data for better visualization
                     />
                  </Grid>
               );
            })}

            <Grid size={{ xs: 12, md: 4 }}>
               <RadialBar
                  title={"Orders Status Breakdown"}
                  data={[
                     {
                        label: "Product A",
                        value: 75,
                     },
                     {
                        label: "Product B",
                        value: 25,
                     },
                     {
                        label: "Product C",
                        value: 10,
                     },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
               <AnalyticsGraph
                  type="day"
                  title="Revenue Analytics"
                  isPositive={true}
                  currency="$"
                  data={[
                     { x: "2026-03-01", y: 50 },
                     { x: "2026-03-02", y: 60 },
                     { x: "2026-03-03", y: 55 },
                     { x: "2026-03-04", y: 70 },
                     { x: "2026-03-05", y: 65 },
                     { x: "2026-03-06", y: 80 },
                  ]}
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
                  <CustomTable rows={[]} columns={[]} />
               </Stack>
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Sales;
