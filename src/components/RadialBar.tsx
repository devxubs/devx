"use client";

import React from "react";
import dynamic from "next/dynamic";

import { Box, Typography, Stack, useTheme } from "@mui/material";
import { ApexOptions } from "apexcharts";
import CustomCard from "@src/components/CustomCard";
import { formatCompactNumber } from "@src/lib/utils";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
   ssr: false,
});

interface Data {
   label: string;
   value: number;
}

interface RadialBarProps {
   title?: string;
   value?: string;
   data: Data[];
}

const RadialBar = ({ data, title, value }: RadialBarProps) => {
   const theme = useTheme();

   const segmentColors = [
      theme.palette.primary.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.info.main,
      theme.palette.secondary.main,
   ];

   const options: ApexOptions = {
      chart: {
         type: "radialBar",
      },
      colors: segmentColors,
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
                  formatter: function (val) {
                     // val is the segment's percentage share (see the
                     // series computation below), never a raw count.
                     const pct = Math.round((Number(val) || 0) * 10) / 10;
                     return `${pct}%`;
                  },
               },
               total: {
                  show: true,
                  label: "Total",
                  fontSize: "16px",

                  formatter: function (w) {
                     return formatCompactNumber(parseInt(value || "0"));
                  },
               },
            },
         },
      },
      legend: { show: false },
      stroke: {
         lineCap: "round",
      },
   };

   const safeData = data || [];
   // ApexCharts radialBar series are PERCENTAGES (0–100) of a full
   // ring. Callers pass raw COUNTS (orders by status, orders by
   // courier, products by availability), so each segment is converted
   // to its share of the total here — previously the raw counts were
   // fed straight in, so a count of 250 rendered as a "250%" ring and
   // the data label printed the count with a "%" sign. The raw counts
   // remain visible in the legend below.
   const totalValue = safeData.reduce(
      (sum, item) => sum + (Number(item?.value) || 0),
      0,
   );
   const series = safeData.map((item) => {
      const v = Number(item?.value) || 0;
      return totalValue > 0 ? Math.round((v / totalValue) * 1000) / 10 : 0;
   });
   const labels = safeData.map((item) => item?.label || "");
   const colors = segmentColors;

   return (
      <CustomCard title={title || "No title"}>
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
            />

            {/* Legend */}
            <Stack direction="row" spacing={2} mt={0} flexWrap="wrap" justifyContent="center">
               {safeData.map((item, i) => (
                  <Stack key={item.label || i} alignItems="center" spacing={0.5}>
                     <Box
                        width={10}
                        height={10}
                        borderRadius="50%"
                        bgcolor={colors[i % colors.length]}
                     />
                     <Typography variant="caption">{item.label || `Item ${i + 1}`}</Typography>
                     <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {formatCompactNumber(Number(item?.value) || 0)}
                     </Typography>
                  </Stack>
               ))}
            </Stack>
         </Box>
      </CustomCard>
   );
};

export default RadialBar;
