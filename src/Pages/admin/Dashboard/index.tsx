"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Grid, Stack, Typography, Avatar, Box, Chip, Alert, Button } from "@mui/material";
import AnalyticsCard from "@src/components/AnalyticsCard";
import { DashboardSkeleton } from "@src/components/SkeletonLoader";
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
   const [loadError, setLoadError] = useState(false);

   const loadDashboard = useCallback(async (year?: string) => {
      try {
         const url = year ? `/api/dashboard?year=${year}` : "/api/dashboard";
         const res = await fetch(url);
         if (res.ok) {
            const data = await res.json();
            setMetrics(data);
            setLoadError(false);
         } else {
            // Phase 1: a failed load must look like a failure — the
            // previous silent catch rendered an all-zero dashboard that
            // was indistinguishable from a zero-sales day.
            setLoadError(true);
         }
      } catch {
         setLoadError(true);
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
      // The API's "call" is the count of orders the employee handled —
      // labelled honestly instead of implying phone calls.
      { field: "call", headerName: "Orders Handled" },
      { field: "conform", headerName: "Confirmed" },
      { field: "cancel", headerName: "Cancelled" },
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

   // Phase 1 (NEW-04): values only — the hard-coded percentage labels
   // ("+100%", "-5%") and invented sparkline arrays have been removed.
   // The API does not provide a per-card trend series, so the cards
   // render without sparklines rather than with fabricated ones.
   const dynamicAnalytics = [
      {
         title: "Completed Orders",
         value: metrics?.completedOrders ?? 0,
         isPositive: true,
      },
      {
         title: "Pending / Processing",
         value: (metrics?.totalOrders || 0) - (metrics?.completedOrders || 0) - (metrics?.cancelledOrders || 0),
         isPositive: true,
      },
      {
         title: "Cancelled Orders",
         value: metrics?.cancelledOrders ?? 0,
         isPositive: false,
      },
      {
         title: "Low Stock Alerts",
         value: metrics?.lowStockCount ?? 0,
         isPositive: false,
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

   if (loading && !metrics) {
      return <DashboardSkeleton />;
   }

   if (loadError && !metrics) {
      return (
         <Stack spacing={3} py={1}>
            <Alert
               severity="error"
               action={
                  <Button color="inherit" size="small" onClick={() => loadDashboard()}>
                     Retry
                  </Button>
               }
            >
               Couldn&apos;t load dashboard data. No figures are shown rather than
               incorrect ones — check the connection and try again.
            </Alert>
         </Stack>
      );
   }

   return (
      <Stack spacing={3} py={1}>
         <Scrollbar autoHide thumbSize={6} darkMode>
            <Grid container spacing={3}>
               {/* 4 Metric Summary Cards */}
               {dynamicAnalytics.map((item, idx) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
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
