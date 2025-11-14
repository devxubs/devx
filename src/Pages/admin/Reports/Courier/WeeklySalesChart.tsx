import React from "react";
import { Stack, Typography, Box, useTheme } from "@mui/material";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import CustomCard from "@src/components/CustomCard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
   ssr: false,
});

const WeeklySalesChart = () => {
   const theme = useTheme();

   const series = [
      {
         name: "Total Completed Orders",
         data: [12, 18, 15, 22, 30, 25, 28],
      },
   ];

   // ✅ Weekly Tooltip
   const tooltip = {
      shared: true,
      intersect: false,
      custom: function ({ series, dataPointIndex, w }: any) {
         const labels = ["Total Completed Orders"];
         const colors = [theme.palette.success.main];

         const name = w.globals.categoryLabels[dataPointIndex]; // Mon, Tue ...

         return `
        <div style="
            font-weight: 600; 
            padding: 5px 0; 
            text-align: center;
            background-color: ${theme.palette.background.paper}
        ">
            ${name}
        </div>

        <div style="
            display: flex; 
            align-items: center; 
            gap: 6px;
            padding: 10px 12px;
            background-color: ${theme.palette.background.default}
        ">
            <span style="
                width: 8px;
                height: 8px;
                background: ${colors[0]};
                border-radius: 50%;
            "></span>
            <span>${labels[0]}:</span>
            <span style="margin-left: auto; font-weight: 600;">
               ${series[0][dataPointIndex]}
            </span>
        </div>`;
      },
   };

   // ✅ WEEKLY CATEGORIES
   const options: ApexOptions = {
      chart: {
         type: "area",
         toolbar: { show: false },
         zoom: { enabled: false },
      },
      colors: [theme.palette.primary.main],
      fill: {
         type: "gradient",
         gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.4,
            opacityTo: 0,
         },
      },
      stroke: {
         curve: "smooth",
         width: 2,
      },
      xaxis: {
         type: "category",
         categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
         labels: { style: { colors: theme.palette.text.secondary } },
      },
      yaxis: {
         labels: { style: { colors: theme.palette.text.secondary } },
      },
      legend: { show: false },
      tooltip: tooltip,
   };

   return (
      <CustomCard>
         {/* Header */}
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
         >
            <Typography variant="h6">This Week Sales</Typography>
            <Typography variant="caption" color="success.main">
               (+12%) than last week
            </Typography>
         </Stack>

         {/* Stats */}
         <Stack direction="row" spacing={4} mb={2}>
            <Stat
               label="Total Completed Orders"
               value="12.3k"
               color="#30D987"
            />
         </Stack>

         {/* Chart */}
         <Box height={260}>
            <ReactApexChart
               options={options}
               series={series}
               type="area"
               height={260}
            />
         </Box>
      </CustomCard>
   );
};

const Stat = ({
   label,
   value,
   color,
}: {
   label: string;
   value: string;
   color: string;
}) => (
   <Stack spacing={0.5}>
      <Typography fontSize={13} fontWeight={500} color={color}>
         {label}
      </Typography>
      <Typography fontSize={18} fontWeight={600}>
         {value}
      </Typography>
   </Stack>
);

export default WeeklySalesChart;
