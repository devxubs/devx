"use client";

import React from "react";
import { Card, Stack, Typography, Box, useTheme } from "@mui/material";
import dynamic from "next/dynamic"; // If you're using Next.js
import Icon from "@src/components/Icon"; // Use your wrapper
import useGlobalState from "@src/handler/globalState";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface AnalyticsCardProps {
  title: string;
  value: number | string;
  percentage: string;
  isPositive: boolean;
  data: number[];
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  percentage,
  isPositive,
  data,
}) => {
  const colorState = useGlobalState.get("color");
  const theme = useTheme();

  const tooltip = {
    shared: true,
    intersect: false,
    custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
      const colors = [
        theme.palette.success.main, // income
        theme.palette.warning.main, // expenses
      ];
      const name = w.globals.categoryLabels[dataPointIndex]; // x-axis label like "Mar"

      return `
     
        <div style="
            font-weight: 600; 
            padding: 5px 0; 
            text-align: center;
            background-color: ${theme.palette.background.paper}
            "
        >
            ${name}
        </div>
        ${series
          .map(
            (val: { [x: string]: any }, i: any) => `
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
                background: ${colors[i]};
                border-radius: 50%;
                display: inline-block;
              "></span>
              
              <span style="marg
              in-left: auto; font-weight: 600;">${val[dataPointIndex]}</span>
            </div>
          `
          )
          .join("")}
    `;
    },
  };

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      sparkline: { enabled: true },
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
    tooltip: tooltip,
  };

  return (
    <Card
      sx={{
        bgcolor: "background.paper",
        p: 3,
        boxShadow: 20,
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

          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              component="span"
              sx={{
                display: "flex",
                alignItems: "center",
                fontWeight: 600,
                fontSize: 14,
                color:
                  isPositive && colorState !== "success"
                    ? "success.main"
                    : isPositive && colorState === "success"
                    ? "primary.main"
                    : colorState === "error"
                    ? "primary.main"
                    : "error.main",
              }}
            >
              <Icon
                icon={
                  isPositive
                    ? "solar:graph-up-bold-duotone"
                    : "solar:graph-down-bold-duotone"
                }
              />
              {percentage}
            </Box>
            <Typography variant="caption" color="text.secondary">
              last week
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ height: 66, width: 100 }}>
          <ReactApexChart
            type="line"
            series={[{ name: "Value", data }]}
            options={chartOptions}
          />
        </Box>
      </Stack>
    </Card>
  );
};

export default AnalyticsCard;
