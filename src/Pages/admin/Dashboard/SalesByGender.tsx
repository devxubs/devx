"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Box, Typography, Stack, useTheme } from "@mui/material";
import { ApexOptions } from "apexcharts";
import CustomCard from "@src/components/CustomCard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
   ssr: false,
});

interface GenderSalesChartProps {
   distribution?: {
      labels: string[];
      series: number[];
   };
}

const GenderSalesChart = ({ distribution }: GenderSalesChartProps) => {
   const theme = useTheme();

   const labels = distribution?.labels?.length ? distribution.labels : ["Beverages", "Snacks", "Electronics"];
   const rawSeries = distribution?.series?.length ? distribution.series : [45, 35, 20];
   const totalSum = rawSeries.reduce((a, b) => a + b, 0);

   // Normalize to percentages for radialBar
   const series = rawSeries.map((val) =>
      totalSum > 0 ? Math.round((val / totalSum) * 100) : 0,
   );

   const colors = [
      theme.palette.primary.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.error.main,
   ];

   const options: ApexOptions = {
      chart: {
         type: "radialBar",
      },
      colors: colors.slice(0, labels.length),
      plotOptions: {
         radialBar: {
            hollow: {
               size: "35%",
            },
            track: {
               background: theme.palette.background.default,
               strokeWidth: "60%",
            },
            dataLabels: {
               name: {
                  show: false,
               },
               value: {
                  fontSize: "18px",
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  offsetY: 8,
               },
               total: {
                  show: true,
                  label: "Total Units",
                  fontSize: "13px",
                  formatter: function () {
                     return `${totalSum}`;
                  },
               },
            },
         },
      },
      labels: labels,
      legend: {
         show: false,
      },
      stroke: {
         lineCap: "round",
      },
   };

   return (
      <CustomCard title="Category inventory distribution" subtitle="Product stock breakdown">
         <Box
            height={260}
            display="flex"
            alignItems="center"
            justifyContent="center"
         >
            <ReactApexChart
               options={options}
               series={series}
               type="radialBar"
               height={250}
            />
         </Box>
         <Box>
            <Stack
               direction="row"
               justifyContent="center"
               spacing={2}
               flexWrap="wrap"
               mt={1}
            >
               {labels.map((lbl, idx) => (
                  <Stack key={lbl} direction="row" alignItems="center" spacing={0.8}>
                     <Box
                        width={10}
                        height={10}
                        borderRadius="50%"
                        bgcolor={colors[idx % colors.length]}
                     />
                     <Typography variant="caption" fontWeight={600}>
                        {lbl} ({rawSeries[idx]} units)
                     </Typography>
                  </Stack>
               ))}
            </Stack>
         </Box>
      </CustomCard>
   );
};

export default GenderSalesChart;
