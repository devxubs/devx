"use client";

import React, { useEffect } from "react";
import { Stack, Typography, Box, useTheme } from "@mui/material";
import dynamic from "next/dynamic";
import moment from "moment";
import DateRangePickerCustom from "@src/components/DateRange";
import CustomCard from "@src/components/CustomCard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
   ssr: false,
});

/* ---------------- TYPES ---------------- */

interface AnalyticsDataItem {
   x: string | Date;
   y: number;
}

type AnalyticsType = "category" | "day" | "week" | "month";

interface AnalyticsGraphProps {
   title: string;
   isPositive: boolean;
   data: AnalyticsDataItem[];
   type?: AnalyticsType;
   filter?: boolean;
   currency?: string;
}

/* ---------------- WEEK GROUPING ---------------- */
const groupInto7Days = (data: AnalyticsDataItem[], weekStart: Date) => {
   const days: { x: Date; y: number }[] = [];

   for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);

      days.push({
         x: d,
         y: 0,
      });
   }

   data.forEach((item) => {
      const itemDate = new Date(item.x);

      days.forEach((day) => {
         if (
            itemDate.getFullYear() === day.x.getFullYear() &&
            itemDate.getMonth() === day.x.getMonth() &&
            itemDate.getDate() === day.x.getDate()
         ) {
            day.y += item.y;
         }
      });
   });

   return days;
};

/* ---------------- GET LAST DAY OF CURRENT MONTH ---------------- */

function getLastDayOfCurrentMonth() {
   const today = new Date();
   const currentYear = today.getFullYear();
   const currentMonth = today.getMonth();
   const firstDayOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
   firstDayOfNextMonth.setDate(0);
   return firstDayOfNextMonth;
}

/* ---------------- COMPONENT ---------------- */

const AnalyticsGraph: React.FC<AnalyticsGraphProps> = ({
   title,
   isPositive,
   data,
   type = "day",
   filter = true,
   currency = "",
}) => {
   const theme = useTheme();

   /* -------- DATE RANGE -------- */
   const startOfToday = new Date();
   startOfToday.setHours(0, 0, 0, 0);

   const endOfToday = new Date();
   endOfToday.setHours(23, 59, 59, 999);

   const [dateRange, setDateRange] = React.useState<[Date | null, Date | null]>(
      [startOfToday, endOfToday],
   );

   useEffect(() => {
      const now = new Date();

      if (type === "category") {
         setDateRange([null, null]);
      }
      if (type === "week") {
         setDateRange([null, null]);
      }
      if (type === "month") {
         const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
         const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
         setDateRange([firstDay, lastDay]);
      }
      if (type === "day") {
         const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
         const lastDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            getLastDayOfCurrentMonth().getDate(),
         );

         setDateRange([firstDay, lastDay]);
      }
   }, []);

   /* -------- FILTERED DATA -------- */
   const filteredData = React.useMemo(() => {
      if (type === "category") return data;

      const [start, end] = dateRange;

      // WEEK VIEW (4 weeks in selected month)
      if (type === "week") {
         const today = start ?? new Date();

         const startOfWeek = new Date(today);
         const day = startOfWeek.getDay();
         const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday start
         startOfWeek.setDate(diff);
         startOfWeek.setHours(0, 0, 0, 0);

         return groupInto7Days(data, startOfWeek);
      }

      // DAY / MONTH FILTER
      if (!start || !end) return data;

      return data.filter((item) => {
         const date = new Date(item.x);
         if (isNaN(date.getTime())) return false;

         return date >= start && date <= end;
      });
   }, [data, dateRange, type]);

   /* -------- TOTAL -------- */
   const totalValue = React.useMemo(
      () => filteredData.reduce((sum, item) => sum + item.y, 0),
      [filteredData],
   );

   /* -------- FORMATTERS -------- */
   const xLabelFormatter = (val: any) => {
      if (type === "category") return val;
      if (type === "week") return moment(val).format("ddd");
      if (type === "month") return moment(val).format("MMM YYYY");
      return moment(val).format("DD MMM");
   };

   /* -------- CHART OPTIONS -------- */
   const chartOptions: any = {
      chart: {
         type: "area",
         toolbar: { show: false },
         zoom: { enabled: false },
         animations: { enabled: true, easing: "easeinout", speed: 700 },
      },
      dataLabels: { enabled: false },
      stroke: {
         curve: "smooth",
         width: 2,
         colors: [
            isPositive ? theme.palette.success.main : theme.palette.error.main,
         ],
      },
      colors: [
         isPositive ? theme.palette.success.main : theme.palette.error.main,
      ],
      fill: {
         type: "gradient",
         gradient: {
            shade: theme.palette.mode === "dark" ? "dark" : "light",
            type: "vertical",
            opacityFrom: 0.45,
            opacityTo: 0.05,
            stops: [0, 100],
         },
      },
      grid: {
         borderColor: theme.palette.divider,
         strokeDashArray: 3,
      },
      markers: { size: 0, hover: { size: 6 } },
      xaxis: {
         type: type === "category" || type === "week" ? "category" : "datetime",
         labels: {
            formatter: xLabelFormatter,
            style: {
               colors: theme.palette.text.secondary,
               fontSize: "11px",
            },
         },
         axisBorder: { show: false },
         axisTicks: { show: false },
      },
      yaxis: {
         labels: {
            formatter: (val: number) => val.toLocaleString(),
            style: {
               colors: theme.palette.text.secondary,
               fontSize: "11px",
            },
         },
      },
      tooltip: {
         shared: true,
         intersect: false,
         theme: theme.palette.mode,
         y: {
            formatter: (val: number) => `${currency}${val.toLocaleString()}`,
            title: {
               formatter: () =>
                  currency.length !== 0 ? "Amount: " : "Value: ",
            },
         },
      },
      legend: { show: false },
   };

   /* -------- RENDER -------- */
   return (
      <CustomCard sx={{ p: 1, pb: 2 }}>
         <Stack spacing={1}>
            {/* HEADER */}
            <Stack
               direction="row"
               px={2}
               justifyContent="space-between"
               // alignItems="center"
            >
               <Stack>
                  <Typography variant="h5" fontWeight={700}>
                     {title}
                  </Typography>

                  <Typography
                     variant="subtitle1"
                     color={isPositive ? "success.main" : "error.main"}
                  >
                     {currency && currency}
                     {totalValue.toLocaleString()}
                  </Typography>
               </Stack>

               <Stack>
                  {filter && type !== "category" && (
                     <DateRangePickerCustom
                        size="small"
                        type={
                           type === "week"
                              ? "range"
                              : type === "day"
                                ? "range"
                                : type === "month"
                                  ? "month-year"
                                  : "range"
                        }
                        title="Select Month"
                        value={dateRange}
                        onChange={setDateRange}
                     />
                  )}
               </Stack>
            </Stack>

            {/* CHART */}
            <Box sx={{ height: 280, width: "100%" }}>
               <ReactApexChart
                  type="area"
                  height={280}
                  series={[{ name: "Value", data: filteredData }]}
                  options={chartOptions}
               />
            </Box>
         </Stack>
      </CustomCard>
   );
};

export default AnalyticsGraph;
