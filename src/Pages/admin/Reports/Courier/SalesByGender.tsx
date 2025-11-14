"use client";

import React from "react";
import dynamic from "next/dynamic";

import { Box, Typography, Stack, useTheme } from "@mui/material";
import { ApexOptions } from "apexcharts";
import CustomCard from "@src/components/CustomCard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
   ssr: false,
});

const SalesByRegionChart = () => {
   const theme = useTheme();

   // ✅ Sales by Region
   const series = [55, 30, 15]; // Dhaka, Chattogram, Sylhet

   const options: ApexOptions = {
      chart: {
         type: "radialBar",
      },
      colors: [
         theme.palette.primary.main, // Dhaka
         theme.palette.warning.main, // Chattogram
         theme.palette.error.main, // Sylhet
      ],
      plotOptions: {
         radialBar: {
            hollow: {
               size: "35%",
               imageClipped: true,
            },
            track: {
               background: theme.palette.background.default,
               strokeWidth: "60%",
            },
            dataLabels: {
               name: { show: false },
               value: {
                  fontSize: "18px",
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  offsetY: 10,
               },
               total: {
                  show: true,
                  label: "Total",
                  fontSize: "16px",
                  formatter: function () {
                     return "12,540"; // Total Sales
                  },
               },
            },
         },
      },
      labels: ["Dhaka", "Chattogram", "Sylhet"],
      legend: { show: false },
      stroke: {
         lineCap: "round",
      },
   };

   return (
      <CustomCard title="Sales by Region">
         <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="space-between"
         >
            <ReactApexChart
               options={options}
               series={series}
               type="radialBar"
               height={260}
            />

            {/* Legend */}
            <Stack direction="row" spacing={3} mt={5}>
               <Stack alignItems="center">
                  <Box
                     width={10}
                     height={10}
                     borderRadius="50%"
                     bgcolor="#30D987"
                  />
                  <Typography variant="caption">Dhaka</Typography>
               </Stack>

               <Stack alignItems="center">
                  <Box
                     width={10}
                     height={10}
                     borderRadius="50%"
                     bgcolor="#FFC300"
                  />
                  <Typography variant="caption">Chattogram</Typography>
               </Stack>

               <Stack alignItems="center">
                  <Box
                     width={10}
                     height={10}
                     borderRadius="50%"
                     bgcolor="#FF6B6B"
                  />
                  <Typography variant="caption">Sylhet</Typography>
               </Stack>
            </Stack>
         </Box>
      </CustomCard>
   );
};

export default SalesByRegionChart;
