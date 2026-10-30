import React, { useState } from "react";
import { Stack, Typography, Box, useTheme, Button } from "@mui/material";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import CustomPopover from "@src/components/CustomPopover";
import Menu from "@src/components/Menu";
import CustomCard from "@src/components/CustomCard";
import { useSettings } from "@src/lib/settingsContext";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
   ssr: false,
});

interface YearlySalesChartProps {
   incomeData?: number[];
   expenseData?: number[];
   onYearChange?: (year: string) => void;
}

const YearlySalesChart = ({
   incomeData,
   expenseData,
   onYearChange,
}: YearlySalesChartProps) => {
   const theme = useTheme();
   const { formatCurrency } = useSettings();
   const currentYear = new Date().getFullYear().toString();
   const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
   const [year, setYear] = useState(currentYear);

   const defaultIncome = incomeData && incomeData.length === 12
      ? incomeData
      : [400, 350, 300, 250, 800, 900, 750, 1600, 1200, 1000, 800, 700];

   const defaultExpenses = expenseData && expenseData.length === 12
      ? expenseData
      : [250, 200, 100, 150, 400, 500, 350, 400, 300, 250, 200, 180];

   const series = [
      {
         name: "Total income",
         data: defaultIncome,
      },
      {
         name: "Total expenses",
         data: defaultExpenses,
      },
   ];

   const totalIncomeSum = defaultIncome.reduce((a, b) => a + b, 0);
   const totalExpenseSum = defaultExpenses.reduce((a, b) => a + b, 0);

   const tooltip = {
      shared: true,
      intersect: false,
      custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
         const labels = ["Total income", "Total expenses"];
         const colors = [
            theme.palette.success.main,
            theme.palette.warning.main,
         ];
         const name = w.globals.categoryLabels[dataPointIndex];

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
                padding: 8px 12px;
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
              <span style="margin-left: auto; font-weight: 600;">৳ ${Number(val[dataPointIndex]).toFixed(2)}</span>
            </div>
            `,
           )
           .join("")}
      `;
      },
   };

   const options: ApexOptions = {
      chart: {
         toolbar: { show: false },
         zoom: { enabled: false },
      },
      colors: [theme.palette.success.main, theme.palette.warning.main],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2.5 },
      xaxis: {
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
         axisBorder: { show: false },
         axisTicks: { show: false },
         labels: {
            style: {
               colors: theme.palette.text.secondary,
            },
         },
      },
      yaxis: {
         labels: {
            formatter: (v) => `${(v / 1000).toFixed(1)}k`,
            style: {
               colors: theme.palette.text.secondary,
            },
         },
      },
      grid: {
         strokeDashArray: 3,
         borderColor: theme.palette.divider,
      },
      tooltip: tooltip,
      legend: { show: false },
   };

   const handleSelectYear = (selectedYear: string) => {
      setYear(selectedYear);
      setAnchorEl(null);
      if (onYearChange) {
         onYearChange(selectedYear);
      }
   };

   return (
      <CustomCard title="Yearly sales & expenses" subtitle="Monthly revenue trends">
         <Stack direction="row" justifyContent="flex-end" mb={1}>
            <CustomPopover
               anchorEl={anchorEl}
               onClose={() => setAnchorEl(null)}
               anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
               transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
               <Menu
                  item={[
                     {
                        label: currentYear,
                        onClick: () => handleSelectYear(currentYear),
                     },
                     {
                        label: (parseInt(currentYear) - 1).toString(),
                        onClick: () => handleSelectYear((parseInt(currentYear) - 1).toString()),
                     },
                     {
                        label: (parseInt(currentYear) - 2).toString(),
                        onClick: () => handleSelectYear((parseInt(currentYear) - 2).toString()),
                     },
                  ]}
                  size="small"
               />
            </CustomPopover>
            <Button
               variant="outlined"
               size="small"
               onClick={(e: React.MouseEvent<HTMLElement>) =>
                  setAnchorEl(e.currentTarget)
               }
            >
               Year: {year}
            </Button>
         </Stack>

         <Stack direction="row" spacing={4} mb={2}>
            <Stat label="Total income" value={formatCurrency(totalIncomeSum)} color="#30D987" />
            <Stat label="Total expenses" value={formatCurrency(totalExpenseSum)} color="#FFC300" />
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
      <Typography fontSize={18} fontWeight={700}>
         {value}
      </Typography>
   </Stack>
);

export default YearlySalesChart;
