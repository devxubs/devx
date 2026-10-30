"use client";

import React from "react";
import dynamic from "next/dynamic";

import { Box, Typography, Stack, useTheme } from "@mui/material";
import { ApexOptions } from "apexcharts";
import CustomCard from "@src/components/CustomCard";
import { formatCompactNumber } from "@src/handler";

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

   const options: ApexOptions = {
      chart: {
         type: "radialBar",
      },
      colors: [
         theme.palette.primary.main,
         theme.palette.warning.main,
         theme.palette.error.main,
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
                  formatter: function (val) {
                     return (val || 0) + "%";
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
   const series = safeData.map((item) => Number(item?.value) || 0);
   const labels = safeData.map((item) => item?.label || "");
   const colors = [
      theme.palette.primary.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.info.main,
      theme.palette.secondary.main,
   ];

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
                  </Stack>
               ))}
            </Stack>
         </Box>
      </CustomCard>
   );
};

export default RadialBar;
