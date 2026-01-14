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
   percentage?: string;
   isPositive?: boolean;
   data: Data[];
}

const RadialBar = ({
   data,
   isPositive,
   percentage,
   title,
   value,
}: RadialBarProps) => {
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

   const series = data.map((item) => item.value);
   const labels = data.map((item) => item.label);

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
            <Stack direction="row" spacing={3} mt={0}>
               <Stack alignItems="center" spacing={0.5}>
                  <Box
                     width={10}
                     height={10}
                     borderRadius="50%"
                     bgcolor="#30D987"
                  />
                  <Typography variant="caption">{labels[0]}</Typography>
               </Stack>

               <Stack alignItems="center" spacing={0.5}>
                  <Box
                     width={10}
                     height={10}
                     borderRadius="50%"
                     bgcolor="#FFC300"
                  />
                  <Typography variant="caption">{labels[1]}</Typography>
               </Stack>

               <Stack alignItems="center" spacing={0.5}>
                  <Box
                     width={10}
                     height={10}
                     borderRadius="50%"
                     bgcolor="#FF6B6B"
                  />
                  <Typography variant="caption">{labels[2]}</Typography>
               </Stack>
            </Stack>
         </Box>
      </CustomCard>
   );
};

export default RadialBar;
