"use client";

import React, { useState, useMemo } from "react";
import { Stack, Typography, Box, useTheme } from "@mui/material";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import CustomCard from "@src/components/CustomCard";
import DateRangePickerCustom from "@src/components/DateRange";
import { differenceInCalendarDays, format } from "date-fns";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
   ssr: false,
});

const ExpenseChart = () => {
   const theme = useTheme();

   // Example sales data per day of the week
   const fullData = [
      { day: "Mon", date: new Date(2025, 11, 15), expense: 12 },
      { day: "Tue", date: new Date(2025, 11, 16), expense: 18 },
      { day: "Wed", date: new Date(2025, 11, 17), expense: 15 },
      { day: "Thu", date: new Date(2025, 11, 18), expense: 22 },
      { day: "Fri", date: new Date(2025, 11, 19), expense: 30 },
      { day: "Sat", date: new Date(2025, 11, 20), expense: 25 },
      { day: "Sun", date: new Date(2025, 11, 21), expense: 28 },
   ];

   // State for selected date range
   const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
      null,
      null,
   ]);

   // Filtered data based on selected date range
   const filteredData = useMemo(() => {
      const [start, end] = dateRange;
      if (!start || !end) return fullData;

      return fullData.filter((d) => d.date >= start && d.date <= end);
   }, [dateRange]);

   // Chart series
   const series = [
      {
         name: "Total Expense",
         data: filteredData.map((d) => d.expense),
      },
   ];

   const categories = filteredData.map((d) => d.day);

   // Weekly Tooltip
   const tooltip = {
      shared: true,
      intersect: false,
      custom: function ({ series, dataPointIndex, w }: any) {
         const labels = ["Total Expense"];
         const colors = [theme.palette.success.main];

         const dataPoint = filteredData[dataPointIndex]; // get actual data object
         if (!dataPoint) return "";

         const dayName = dataPoint.day; // Mon, Tue...
         const fullDate = format(dataPoint.date, "dd MMM yyyy"); // 17 Dec 2025
         const expense = dataPoint.expense;

         return `
      <div style="
         font-weight: 600; 
         padding: 5px 0; 
         text-align: center;
         background-color: ${theme.palette.background.paper}
      ">
         ${dayName} - ${fullDate}
      </div>
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
            background: ${colors[0]};
            border-radius: 50%;
         "></span>
         <span>${labels[0]}:</span>
         <span style="margin-left: auto; font-weight: 600;">
            ${expense}
         </span>
      </div>`;
      },
   };

   const options: ApexOptions = {
      chart: {
         type: "area",
         toolbar: { show: false },
         zoom: { enabled: false },
      },
      colors: [theme.palette.primary.main],
      fill: {
         type: "gradient",
         gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0 },
      },
      stroke: { curve: "smooth", width: 2 },
      xaxis: {
         type: "category",
         categories,
         labels: { style: { colors: theme.palette.text.secondary } },
      },
      yaxis: { labels: { style: { colors: theme.palette.text.secondary } } },
      legend: { show: false },
      tooltip: tooltip,
   };

   // Stats (total expense in selected range)
   const totalExpense = filteredData.reduce(
      (acc, curr) => acc + curr.expense,
      0
   );

   return (
      <CustomCard>
         {/* Header */}
         <Stack direction="row" justifyContent="space-between" mb={2}>
            <Typography variant="h6">Expense report</Typography>

            {/* DateRangePicker */}
            <DateRangePickerCustom
               value={dateRange}
               onChange={(newRange) => setDateRange(newRange)}
            />
         </Stack>

         {/* Stats */}
         <Stack direction="row" spacing={4} mb={2}>
            <Stat
               label="Total Expense"
               value={totalExpense.toString()}
               color="#30D987"
            />
         </Stack>

         {/* Chart */}
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

export default ExpenseChart;
