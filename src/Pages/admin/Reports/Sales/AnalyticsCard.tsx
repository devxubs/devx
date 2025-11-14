"use client";

import React from "react";
import { Stack, Typography, Box, useTheme } from "@mui/material";
import dynamic from "next/dynamic";
import useGlobalState from "@src/handler/globalState";
import moment from "moment";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
   ssr: false,
});

interface AnalyticsCardProps {
   title: string;
   value: number | string;
   isPositive: boolean;
   data: { x: string | number; y: number }[];
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
   title,
   value,
   isPositive,
   data,
}) => {
   const colorState = useGlobalState.get("color");
   const theme = useTheme();

   // ✅ Tooltip style
   const tooltip = {
      shared: true,
      intersect: false,
      theme: theme.palette.mode,
      x: {
         show: true,
         format: "dd MMM yyyy",
      },
      y: {
         formatter: (val: number) => `${val.toLocaleString()}৳`,
         title: {
            formatter: () => "Amount:",
         },
      },
   };

   // ✅ Chart Options
   const chartOptions: any = {
      chart: {
         type: "area",
         height: 150,
         toolbar: { show: false },
         zoom: { enabled: false },
         animations: {
            enabled: true,
            easing: "easeinout",
            speed: 700,
         },
      },
      dataLabels: { enabled: false },
      stroke: {
         curve: "smooth",
         width: 2.5,
         colors: [
            isPositive ? theme.palette.success.main : theme.palette.error.main,
         ],
      },
      colors: [
         isPositive ? theme.palette.success.main : theme.palette.error.main,
      ],
      fill: {
         type: "gradient",
         gradient: {
            shade: theme.palette.mode === "dark" ? "dark" : "light",
            type: "vertical",
            shadeIntensity: 0.6,
            opacityFrom: 0.45,
            opacityTo: 0.05,
            stops: [0, 100],
            colorStops: [],
         },
      },
      grid: {
         show: true,
         borderColor: theme.palette.divider,
         strokeDashArray: 3,
         xaxis: { lines: { show: false } },
      },
      markers: {
         size: 0,
         strokeWidth: 1.5,
         hover: { size: 6 },
      },
      xaxis: {
         type: "datetime",
         labels: {
            show: true,
            style: { colors: theme.palette.text.secondary, fontSize: "11px" },
            formatter: (val: any) => moment(val).format("DD MMM"),
         },
         axisTicks: { show: false },
         axisBorder: { show: false },
      },
      yaxis: {
         labels: {
            style: { colors: theme.palette.text.secondary, fontSize: "11px" },
            formatter: (val: number) => `${(val / 1000).toFixed(1)}k`,
         },
      },
      legend: {
         show: false,
      },
      tooltip,
   };

   return (
      <Stack
         sx={{
            bgcolor: "background.paper",
            p: 3,
            px: 1,
            overflow: "hidden",
            boxShadow: 20,
            borderRadius: 1.5,
         }}
      >
         <Stack spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={700}>
               {title}
            </Typography>
            <Typography
               variant="subtitle1"
               color={isPositive ? "success.main" : "error.main"}
            >
               {value}
            </Typography>

            <Box sx={{ height: 150, width: "100%" }}>
               <ReactApexChart
                  type="area"
                  series={[{ name: "Value", data }]}
                  height={150}
                  options={chartOptions}
               />
            </Box>
         </Stack>
      </Stack>
   );
};

export default AnalyticsCard;
