"use client";

import React from "react";
import { Stack, Typography, Box, useTheme } from "@mui/material";
import dynamic from "next/dynamic";
import useGlobalState from "@src/handler/globalState";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
   ssr: false,
});

interface CourierCardProps {
   title: string;
   value: number | string;
   percentage: string;
   isPositive: boolean;
   data: number[]; // Should have 7 values (Mon → Sun)
}

const CourierCard: React.FC<CourierCardProps> = ({
   title,
   value,
   percentage,
   isPositive,
   data,
}) => {
   const colorState = useGlobalState.get("color");
   const theme = useTheme();

   // ✅ Daily labels (Mon - Sun)
   const dailyLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

   const tooltip = {
      custom: function ({ series, dataPointIndex }: any) {
         return `
            <div style="
              padding:8px 12px;
              background:${theme.palette.background.paper};
              border-radius:6px;
              font-size:13px;
              font-weight:500;
            ">
              <strong>${dailyLabels[dataPointIndex]}</strong><br/>
              Value: <strong>${series[0][dataPointIndex]}</strong>
            </div>
         `;
      },
   };

   const chartOptions: ApexCharts.ApexOptions = {
      chart: {
         type: "line",
         sparkline: { enabled: true },
      },
      xaxis: {
         categories: dailyLabels,
      },
      stroke: {
         width: 2,
         curve: "smooth",
      },
      colors:
         isPositive && colorState !== "success"
            ? [theme.palette.success.main]
            : isPositive && colorState === "success"
            ? [theme.palette.primary.main]
            : colorState === "error"
            ? [theme.palette.primary.main]
            : [theme.palette.error.main],

      tooltip,
   };

   return (
      <Stack
         sx={{
            bgcolor: "background.paper",
            p: 2.5,
            boxShadow: 20,
            borderRadius: 1.5,
         }}
      >
         <Stack
            spacing={1}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
         >
            <Stack spacing={1} flexGrow={1}>
               <Typography variant="subtitle2" color="text.secondary">
                  {title}
               </Typography>

               <Typography variant="h4" fontWeight={700}>
                  {value}
               </Typography>

               <Typography
                  variant="caption"
                  color={isPositive ? "success.main" : "error.main"}
               >
                  {percentage}
               </Typography>
            </Stack>

            <Box sx={{ height: 66, width: 80 }}>
               <ReactApexChart
                  type="line"
                  series={[{ name: "Value", data }]}
                  options={chartOptions}
               />
            </Box>
         </Stack>
      </Stack>
   );
};

export default CourierCard;
