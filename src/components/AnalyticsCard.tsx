"use client";

import React from "react";
import { Stack, Typography, Box, useTheme, alpha } from "@mui/material";
import dynamic from "next/dynamic";
import useGlobalState from "@src/handler/globalState";
import { formatCompactNumber } from "@src/lib/utils";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
   ssr: false,
});

// Premium summary-card tone system: each metric gets a soft tinted
// surface derived from its palette tone — a low-alpha background, a
// faint tone-tinted border, and a slim inset accent bar on the left.
// Alpha-based, so it composites correctly over both dark and light
// theme backgrounds. Assign by metric meaning: money in / positive
// outcomes → success, headline totals → primary, secondary counts →
// info, pending / money out / attention → warning, negative outcomes
// → error, loyalty/special → secondary, plain neutral → neutral.
export type StatTone =
   | "primary"
   | "secondary"
   | "info"
   | "success"
   | "warning"
   | "error"
   | "neutral";

interface AnalyticsCardProps {
   title: string;
   value: number | string;
   percentage?: string;
   isPositive?: boolean;
   tone?: StatTone;
   // Optional real trend series (7 values, Mon → Sun). Phase 1: when no
   // real series exists, omit this prop — the card renders without a
   // sparkline instead of drawing invented trend data.
   data?: number[];
   currency?: string;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
   title,
   value,
   percentage = 0,
   isPositive = true,
   data,
   currency,
   tone = "primary",
}) => {
   const colorState = useGlobalState.get("color");
   const theme = useTheme();

   const toneColor =
      tone === "neutral"
         ? theme.palette.text.primary
         : theme.palette[tone].main;
   const isDark = theme.palette.mode === "dark";

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

      tooltip: {
         enabled: false,
      },
   };

   return (
      <Stack
         sx={{
            bgcolor: alpha(toneColor, isDark ? 0.09 : 0.05),
            p: 2.5,
            border: `1px solid ${alpha(toneColor, isDark ? 0.28 : 0.22)}`,
            boxShadow: `inset 3px 0 0 ${alpha(toneColor, 0.9)}, ${theme.shadows[20]}`,
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
                  {(() => {
                     if (typeof value === "string") {
                        if (/[^0-9.-]/.test(value.trim())) return value;
                        const num = Number(value);
                        if (!isNaN(num)) {
                           return currency ? `${currency}${formatCompactNumber(num)}` : formatCompactNumber(num);
                        }
                        return value;
                     }
                     const num = typeof value === "number" && !isNaN(value) ? value : 0;
                     return currency ? `${currency}${formatCompactNumber(num)}` : formatCompactNumber(num);
                  })()}
               </Typography>

               <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography
                     variant="caption"
                     color={isPositive ? "success.main" : "error.main"}
                     sx={{
                        visibility: !percentage ? "hidden" : "visible",
                     }}
                  >
                     {percentage}
                  </Typography>
                  <Typography
                     variant="caption"
                     fontSize={11}
                     fontWeight={500}
                     color={isPositive ? "success.main" : "error.main"}
                     sx={{
                        visibility: !percentage ? "hidden" : "visible",
                     }}
                  >
                     (Last 7 Days)
                  </Typography>
               </Stack>
            </Stack>

            {Array.isArray(data) && data.length > 0 && (
               <Box sx={{ height: 66, width: 80 }}>
                  <ReactApexChart
                     type="line"
                     series={[{ name: "Value", data: data.map((v) => Number(v) || 0) }]}
                     options={chartOptions}
                  />
               </Box>
            )}
         </Stack>
      </Stack>
   );
};

export default AnalyticsCard;
