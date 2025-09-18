"use client";

import React from "react";
import dynamic from "next/dynamic";

import { Box, Typography, Stack, useTheme } from "@mui/material";
import { ApexOptions } from "apexcharts";
import CustomCard from "@src/components/CustomCard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const GenderSalesChart = () => {
  const theme = useTheme();

  const series = [35, 45, 20];

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
          background: theme.palette.background.paper,
          strokeWidth: "60%",
        },
        dataLabels: {
          name: {
            show: false,
          },
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
              return "2,324";
            },
          },
        },
      },
    },
    labels: ["Mens", "Womens", "Kids"],
    legend: {
      show: false,
    },
    stroke: {
      lineCap: "round", // <--- This adds rounded line edges
    },
  };

  return (
    <CustomCard title="Yearly sales">
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

        <Stack direction="row" spacing={3} mt={5}>
          <Stack alignItems="center">
            <Box width={10} height={10} borderRadius="50%" bgcolor="#30D987" />
            <Typography variant="caption">Mens</Typography>
          </Stack>
          <Stack alignItems="center">
            <Box width={10} height={10} borderRadius="50%" bgcolor="#FFC300" />
            <Typography variant="caption">Womens</Typography>
          </Stack>
          <Stack alignItems="center">
            <Box width={10} height={10} borderRadius="50%" bgcolor="#FF6B6B" />
            <Typography variant="caption">Kids</Typography>
          </Stack>
        </Stack>
      </Box>
    </CustomCard>
  );
};

export default GenderSalesChart;
