import React, { useState } from "react";
import {
  Card,
  Stack,
  Typography,
  Box,
  MenuItem,
  Select,
  useTheme,
  alpha,
  Button,
} from "@mui/material";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import CustomBox from "@src/components/CustomBox";
import CustomPopover from "@src/components/CustomPopover";
import Menu from "@src/components/Menu";
import CustomCard from "@src/components/CustomCard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const YearlySalesChart = () => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [year, setYear] = useState("2022");

  const series = [
    {
      name: "Total income",
      data: [40, 35, 30, 25, 80, 90, 75, 160, 120, 100, 80, 70],
    },
    {
      name: "Total expenses",
      data: [50, 20, 10, 15, 90, 100, 110, 80, 100, 110, 95, 85],
    },
  ];

  const tooltip = {
    shared: true,
    intersect: false,
    custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
      const labels = ["Total income", "Total expenses"];
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
              <span>${labels[i]}:</span>
              <span style="marg
              in-left: auto; font-weight: 600;">${val[dataPointIndex]}</span>
            </div>
          `
          )
          .join("")}
    `;
    },
  };

  const options: ApexOptions = {
    chart: {
      type: "line", // ✅ This is now correct
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: [theme.palette.primary.main, theme.palette.secondary.main],
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
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      labels: { style: { colors: theme.palette.text.secondary } },
    },
    yaxis: {
      labels: { style: { colors: theme.palette.text.secondary } },
    },
    legend: { show: false },
    tooltip: tooltip,
  };

  return (
    <CustomCard title="Yearly sales">
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="caption" color="success.main">
          (+43%) than last year
        </Typography>

        <CustomPopover
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Menu
            item={[
              {
                label: "2022",
                onClick: (l) => {
                  setYear(l);
                  setAnchorEl(null);
                },
              },
              {
                label: "2023",
                onClick: (l) => {
                  setYear(l);
                  setAnchorEl(null);
                },
              },
            ]}
            size="small"
          />
        </CustomPopover>
        <Button
          variant="outlined"
          onClick={(e: React.MouseEvent<HTMLElement>) =>
            setAnchorEl(e.currentTarget)
          }
        >
          {year}
        </Button>
      </Stack>

      <Stack direction="row" spacing={4} mb={2}>
        <Stat label="Total income" value="1.23k" color="#30D987" />
        <Stat label="Total expenses" value="6.79k" color="#FFC300" />
      </Stack>

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

export default YearlySalesChart;
