"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Grid, Stack, Typography, Avatar, Box, Chip } from "@mui/material";
import AnalyticsCard from "@src/components/AnalyticsCard";
import SalesByGender from "./SalesByGender";
import YearlySalesChart from "./YearlySalesChart";
import Scrollbar from "react-browser-scrollbar";
import SalesOverview from "./SalesOverview";
import Balance from "./Balance";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { useSettings } from "@src/lib/settingsContext";

export const SellerProFile = ({ name, url, customId }: { name: string; url: string; customId?: string }) => (
   <Stack spacing={1} direction="row" alignItems="center" height={"100%"}>
      <Avatar src={url} />
      <Typography variant="body1">{name}</Typography>
   </Stack>
);

const Dashboard = () => {
   const { formatCurrency } = useSettings();
   const [metrics, setMetrics] = useState<any>(null);
   const [loading, setLoading] = useState(true);

   const loadDashboard = useCallback(async (year?: string) => {
      try {
         const url = year ? `/api/dashboard?year=${year}` : "/api/dashboard";
         const res = await fetch(url);
         if (res.ok) {
            const data = await res.json();
            setMetrics(data);
         }
      } catch {
         // silent
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      loadDashboard();
   }, [loadDashboard]);

   const columns: ColumnConfig[] = [
      {
         field: "seller",
         headerName: "Seller",
         flex: 1,
         renderCell: (params: any) => {
            const row = params.row;
            return (
               <SellerProFile
                  name={row.seller?.name || row.name}
                  url={row.seller?.url || row.avatar}
               />
            );
         },
      },
      { field: "call", headerName: "Call" },
      { field: "conform", headerName: "Conform" },
      { field: "cancel", headerName: "Cancel" },
      {
         field: "rank",
         headerName: "Rank",
         renderCell: (params: any) => {
            const rank = String(params.row.rank || "Top 1");
            const colorMap: Record<string, "primary" | "secondary" | "success" | "warning" | "error" | "default"> = {
               "Top 1": "primary",
               "Top 2": "secondary",
               "Top 3": "success",
               "Top 4": "warning",
               "Top 5": "error",
               "A": "primary",
               "B": "secondary",
               "C": "success",
               "D": "warning",
               "E": "error",
            };
            const chipColor = colorMap[rank] || params.row.color || "primary";

            return (
               <Chip
                  label={rank}
                  color={chipColor}
                  size="small"
                  sx={{
                     fontWeight: 700,
                     borderRadius: 1,
                     minWidth: 62,
                  }}
               />
            );
         },
      },
   ];

   const dynamicAnalytics = [
      {
         title: "Completed Orders",
         value: metrics?.completedOrders ?? 0,
         percentage: "+100%",
         isPositive: true,
         data: [1, 2, 3, 4, 5, 6, metrics?.completedOrders || 0],
      },
      {
         title: "Pending / Processing",
         value: (metrics?.totalOrders || 0) - (metrics?.completedOrders || 0) - (metrics?.cancelledOrders || 0),
         percentage: "Active",
         isPositive: true,
         data: [1, 2, 2, 3, 2, 1, 2],
      },
      {
         title: "Cancelled Orders",
         value: metrics?.cancelledOrders ?? 0,
         percentage: metrics?.cancelledOrders ? "-5%" : "0%",
         isPositive: false,
         data: [0, 0, 0, 1, 0, 0, metrics?.cancelledOrders || 0],
      },
   ];

   const rankedRows = (metrics?.rankedEmployees || []).map((emp: any) => ({
      id: emp.id,
      seller: {
         name: emp.name,
         url: emp.avatar,
      },
      name: emp.name,
      avatar: emp.avatar,
      call: emp.call,
      conform: emp.conform,
      cancel: emp.cancel,
      rank: emp.rank,
      color: emp.color,
   }));

   return (
      <Stack spacing={3} py={1}>
         <Scrollbar autoHide thumbSize={6} darkMode>
            <Grid container spacing={3}>
               {/* 3 Metric Summary Cards */}
               {dynamicAnalytics.map((item, idx) => (
                  <Grid size={{ xs: 12, md: 4 }} key={idx}>
                     <AnalyticsCard {...item} />
                  </Grid>
               ))}

               {/* Inventory Distribution by Category */}
               <Grid size={{ xs: 12, md: 4 }}>
                  <SalesByGender distribution={metrics?.distribution} />
               </Grid>

               {/* Yearly Sales & Expenses Trend */}
               <Grid size={{ xs: 12, md: 8 }}>
                  <YearlySalesChart
                     incomeData={metrics?.monthlyIncome}
                     expenseData={metrics?.monthlyExpenses}
                     onYearChange={(year) => loadDashboard(year)}
                  />
               </Grid>

               {/* Sales & Performance Overview */}
               <Grid size={{ xs: 12, md: 8 }}>
                  <SalesOverview
                     totalRevenue={metrics?.totalRevenue}
                     totalExpenses={metrics?.totalExpenses}
                     netProfit={metrics?.netProfit}
                  />
               </Grid>

               {/* Current Balance & Quick Payout */}
               <Grid size={{ xs: 12, md: 4 }}>
                  <Balance
                     currentBalance={metrics?.currentBalance}
                     orderTotal={metrics?.totalRevenue}
                     earning={metrics?.netProfit}
                     refunded={metrics?.refunded}
                  />
               </Grid>

               {/* Employee Ranking Table */}
               <Grid size={{ xs: 12, md: 12 }}>
                  <CustomTable
                     rows={rankedRows}
                     columns={columns}
                  />
               </Grid>
            </Grid>
         </Scrollbar>
      </Stack>
   );
};

export default Dashboard;
