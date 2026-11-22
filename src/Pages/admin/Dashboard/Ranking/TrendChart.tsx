"use client";

import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import CustomCard from "@src/components/CustomCard";
import type { TrendBucket } from "./types";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
   ssr: false,
});

const MAX_SERIES = 5;

/**
 * Weekly final-score trend for the live ranking range. One series
 * per employee appearing in the buckets, capped at the top 5 by
 * latest-bucket score. With fewer than 2 buckets there is nothing
 * to trend — a placeholder is shown instead of an empty chart.
 * Rendered only in live mode (finalized periods are viewed through
 * the History panel).
 */
export default function TrendChart({ buckets }: { buckets?: TrendBucket[] }) {
   const theme = useTheme();

   const { series, labels } = useMemo(() => {
      const safe = buckets || [];
      const byEmployee = new Map<string, { name: string; latest: number; points: (number | null)[] }>();

      safe.forEach((bucket, bucketIdx) => {
         bucket.scores.forEach((s) => {
            if (!byEmployee.has(s.employeeId)) {
               byEmployee.set(s.employeeId, {
                  name: s.employeeName,
                  latest: s.finalScore,
                  points: new Array(safe.length).fill(null),
               });
            }
            const entry = byEmployee.get(s.employeeId)!;
            entry.points[bucketIdx] = s.finalScore;
            // Buckets iterate chronologically, so the last write is
            // the employee's most recent score.
            entry.latest = s.finalScore;
         });
      });

      const top = Array.from(byEmployee.values())
         .sort((a, b) => b.latest - a.latest)
         .slice(0, MAX_SERIES);

      return {
         series: top.map((e) => ({ name: e.name, data: e.points })),
         labels: safe.map((b) => b.label),
      };
   }, [buckets]);

   if (!buckets || buckets.length < 2) {
      return (
         <CustomCard title="Score trend" subtitle="Weekly final scores in the selected range">
            <Box py={4} textAlign="center">
               <Typography variant="body2" color="text.secondary">
                  Not enough periods yet for a trend.
               </Typography>
            </Box>
         </CustomCard>
      );
   }

   const options: ApexOptions = {
      chart: { toolbar: { show: false }, zoom: { enabled: false } },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2.5 },
      xaxis: {
         categories: labels,
         axisBorder: { show: false },
         axisTicks: { show: false },
         labels: { style: { colors: theme.palette.text.secondary } },
      },
      yaxis: {
         min: 0,
         max: 100,
         labels: { style: { colors: theme.palette.text.secondary } },
      },
      grid: { strokeDashArray: 3, borderColor: theme.palette.divider },
      legend: { position: "top" },
      tooltip: { shared: true, intersect: false },
   };

   return (
      <CustomCard title="Score trend" subtitle="Weekly final scores in the selected range">
         <Box height={260}>
            <ReactApexChart options={options} series={series} type="line" height={260} />
         </Box>
      </CustomCard>
   );
}
