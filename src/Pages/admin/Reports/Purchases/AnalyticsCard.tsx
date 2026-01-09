"use client";

import React from "react";
import { Stack, Typography, Box, useTheme } from "@mui/material";
import dynamic from "next/dynamic";
import moment from "moment";
import DateRangePickerCustom from "@src/components/DateRange";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
   ssr: false,
});

/* ---------------- TYPES ---------------- */

interface AnalyticsDataItem {
   x: string | Date;
   y: number;
}

type AnalyticsType = "category" | "day" | "week" | "month";

interface AnalyticsCardProps {
   title: string;
   isPositive: boolean;
   data: AnalyticsDataItem[];
   type?: AnalyticsType;
   filter?: boolean;
}

/* ---------------- WEEK GROUPING ---------------- */

const groupInto4Weeks = (
   data: AnalyticsDataItem[],
   month: Date
): AnalyticsDataItem[] => {
   const year = month.getFullYear();
   const m = month.getMonth();

   const weeks = [
      { x: "Week 1", y: 0 },
      { x: "Week 2", y: 0 },
      { x: "Week 3", y: 0 },
      { x: "Week 4", y: 0 },
   ];

   data.forEach((item) => {
      if (!(item.x instanceof Date)) return;

      if (item.x.getFullYear() !== year || item.x.getMonth() !== m) return;

      const d = item.x.getDate();
      const index = d <= 7 ? 0 : d <= 14 ? 1 : d <= 21 ? 2 : 3;
      weeks[index].y += item.y;
   });

   return weeks;
};

/* ---------------- COMPONENT ---------------- */

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
   title,
   isPositive,
   data,
   type = "day",
   filter = true,
}) => {
   const theme = useTheme();

   /* -------- DATE RANGE -------- */
   const [dateRange, setDateRange] = React.useState<[Date | null, Date | null]>(
      [null, null]
   );

   /* -------- FILTERED DATA -------- */
   const filteredData = React.useMemo(() => {
      if (type === "category") return data;

      if (type === "week") {
         const baseMonth =
            dateRange[0] ??
            (data[0]?.x instanceof Date ? data[0].x : new Date());

         return groupInto4Weeks(data, baseMonth);
      }

      const [start, end] = dateRange;
      if (!start || !end) return data;

      return data.filter((item) => {
         if (!(item.x instanceof Date)) return false;
         return item.x >= start && item.x <= end;
      });
   }, [data, dateRange, type]);

   /* -------- TOTAL -------- */
   const totalValue = React.useMemo(
      () => filteredData.reduce((sum, item) => sum + item.y, 0),
      [filteredData]
   );

   /* -------- FORMATTERS -------- */
   const xLabelFormatter = (val: any) => {
      if (type === "category" || type === "week") return val;
      if (type === "month") return moment(val).format("MMM YYYY");
      return moment(val).format("DD MMM");
   };

   const tooltipXFormatter = (val: any) => {
      if (type === "category" || type === "week") return val;
      if (type === "month") return moment(val).format("MMMM YYYY");
      return moment(val).format("DD MMM YYYY");
   };

   /* -------- CHART OPTIONS -------- */
   const chartOptions: any = {
      chart: {
         type: "area",
         height: 150,
         toolbar: { show: false },
         zoom: { enabled: false },
         animations: { enabled: true, easing: "easeinout", speed: 700 },
      },
      dataLabels: { enabled: false },
      stroke: {
         curve: "smooth",
         width: 2.5,
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
         x: { formatter: tooltipXFormatter },
         y: {
            formatter: (val: number) => `${val.toLocaleString()}৳`,
            title: { formatter: () => "Amount:" },
         },
      },
      legend: { show: false },
   };

   /* -------- RENDER -------- */
   return (
      <Stack
         sx={{
            bgcolor: "background.paper",
            p: 3,
            px: 1,
            overflow: "hidden",
            boxShadow: 20,
            borderRadius: 1.5,
         }}
      >
         <Stack spacing={1}>
            {/* HEADER */}
            <Stack direction="row" px={2}>
               <Stack flex={0.6}>
                  <Typography variant="h5" fontWeight={700}>
                     {title}
                  </Typography>

                  <Typography
                     variant="subtitle1"
                     color={isPositive ? "success.main" : "error.main"}
                  >
                     {totalValue.toLocaleString()}
                     {type !== "category" && "৳"}
                  </Typography>
               </Stack>

               <Stack flex={0.4}>
                  {filter && type !== "category" && (
                     <DateRangePickerCustom
                        size="small"
                        type="month-year"
                        title="Select Month"
                        onChange={setDateRange}
                     />
                  )}
               </Stack>
            </Stack>

            {/* CHART */}
            <Box sx={{ height: 150, width: "100%" }}>
               <ReactApexChart
                  type="area"
                  height={150}
                  series={[{ name: "Value", data: filteredData }]}
                  options={chartOptions}
               />
            </Box>
         </Stack>
      </Stack>
   );
};

export default AnalyticsCard;
