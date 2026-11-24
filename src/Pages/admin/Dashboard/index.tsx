"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Grid, Stack, Typography, Avatar, Button } from "@mui/material";
import Icon from "@src/components/Icon";
import AnalyticsCard from "@src/components/AnalyticsCard";
import { DashboardSkeleton } from "@src/components/SkeletonLoader";
import SalesByGender from "./SalesByGender";
import YearlySalesChart from "./YearlySalesChart";
import Scrollbar from "react-browser-scrollbar";
import SalesOverview from "./SalesOverview";
import Balance from "./Balance";
import { useSettings } from "@src/lib/settingsContext";
import { useSnackbar } from "@src/lib/snackbarContext";
import DashboardRangeButton from "./components/DashboardRangeButton";
import EmployeeRanking from "./EmployeeRanking";

const fmtLocalDate = (d: Date) =>
   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
   ).padStart(2, "0")}`;

export const SellerProFile = ({ name, url, customId }: { name: string; url: string; customId?: string }) => (
   <Stack spacing={1} direction="row" alignItems="center" height={"100%"}>
      <Avatar src={url} />
      <Typography variant="body1">{name}</Typography>
   </Stack>
);

const Dashboard = () => {
   const { formatCurrency } = useSettings();
   const { showSnackbar } = useSnackbar();
   const [metrics, setMetrics] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [loadError, setLoadError] = useState(false);
   // Date filter (owner revision 2026-11-22): a single Date Range
   // Picker control — no preset menu. The default range is This
   // Month (1st of the current month → today). The picker commits
   // only on Apply; the applied range drives every Dashboard
   // figure and the employee ranking via the same startDate /
   // endDate params as before (browser-local YYYY-MM-DD).
   const [range, setRange] = useState<[Date | null, Date | null]>(() => {
      const now = new Date();
      return [new Date(now.getFullYear(), now.getMonth(), 1), now];
   });

   const rangeParams = useCallback((): { startDate: string; endDate: string } | null => {
      const [s, e] = range;
      return s && e
         ? { startDate: fmtLocalDate(s), endDate: fmtLocalDate(e) }
         : null;
   }, [range]);

   const currentRange = rangeParams();

   const loadDashboard = useCallback(async () => {
      const rp = rangeParams();
      if (!rp) return; // custom range not fully picked yet — keep current data
      setLoading(true);
      try {
         const res = await fetch(
            `/api/dashboard?startDate=${rp.startDate}&endDate=${rp.endDate}`,
         );
         if (res.ok) {
            const data = await res.json();
            setMetrics(data);
            setLoadError(false);
         } else {
            setLoadError(true);
            showSnackbar(
               metrics
                  ? "Couldn't refresh dashboard data — figures may be out of date."
                  : "Couldn't load dashboard data. Please check connection and try again.",
               metrics ? "warning" : "error",
            );
         }
      } catch {
         setLoadError(true);
         showSnackbar(
            metrics
               ? "Couldn't refresh dashboard data — figures may be out of date."
               : "Couldn't load dashboard data. Please check connection and try again.",
            metrics ? "warning" : "error",
         );
      } finally {
         setLoading(false);
      }
   }, [rangeParams, metrics, showSnackbar]);

   useEffect(() => {
      loadDashboard();
   }, [loadDashboard]);

   const rangeLabel = metrics?.range
      ? `${new Date(metrics.range.startDate).toLocaleDateString("en-US", {
           month: "short",
           day: "numeric",
           year: "numeric",
        })} – ${new Date(metrics.range.endDate).toLocaleDateString("en-US", {
           month: "short",
           day: "numeric",
           year: "numeric",
        })}`
      : "";

   // Phase 1 (NEW-04): values only — the hard-coded percentage labels
   // ("+100%", "-5%") and invented sparkline arrays have been removed.
   // The API does not provide a per-card trend series, so the cards
   // render without sparklines rather than with fabricated ones.
   const dynamicAnalytics = [
      {
         title: "Completed Orders",
         value: metrics?.completedOrders ?? 0,
         isPositive: true,
         tone: "success" as const,
      },
      {
         // P3-7: this remainder is total − completed − cancelled,
         // which is NOT just pending/processing orders — it also
         // counts DELIVERED, HOLD, FAILED and every other status.
         // The old "Pending / Processing" label described arithmetic
         // the value does not perform; the value itself is unchanged.
         title: "Other Orders",
         value: (metrics?.totalOrders || 0) - (metrics?.completedOrders || 0) - (metrics?.cancelledOrders || 0),
         isPositive: true,
         tone: "secondary" as const,
      },
      {
         title: "Cancelled Orders",
         value: metrics?.cancelledOrders ?? 0,
         isPositive: false,
         tone: "error" as const,
      },
      {
         title: "Low Stock Alerts",
         value: metrics?.lowStockCount ?? 0,
         isPositive: false,
         tone: "warning" as const,
      },
   ];

   // Phase 3B (3.9): owner KPIs from the API — current-state figures
   // (pending orders, today's orders, total customer due) plus the
   // range's order count. All real aggregates; no estimates.
   const kpiCards = [
      {
         title: "Pending Orders",
         value: metrics?.kpis?.pendingOrders ?? 0,
         isPositive: true,
         tone: "info" as const,
      },
      {
         title: "Today's Orders",
         value: metrics?.kpis?.todaysOrders ?? 0,
         isPositive: true,
         tone: "primary" as const,
      },
      {
         title: "Customer Due (Total)",
         value: formatCurrency(metrics?.kpis?.totalCustomerDue ?? 0),
         isPositive: false,
         tone: "error" as const,
      },
      {
         title: "Orders in Range",
         value: metrics?.totalOrders ?? 0,
         isPositive: true,
         tone: "info" as const,
      },
   ];

   if (loading && !metrics) {
      return <DashboardSkeleton />;
   }

   if (loadError && !metrics) {
      return (
         <Stack
            alignItems="center"
            justifyContent="center"
            spacing={2}
            sx={{ py: 10, textAlign: "center" }}
         >
            <Typography variant="body1" color="text.secondary">
               Couldn&apos;t load dashboard data.
            </Typography>
            <Button
               variant="outlined"
               size="small"
               startIcon={<Icon icon="solar:restart-bold" size="16px" />}
               onClick={() => loadDashboard()}
            >
               Retry
            </Button>
         </Stack>
      );
   }

   return (
      <Stack spacing={3} py={1}>
         {/* Date filter: one control — the Date Range Picker
             itself. Clicking it opens the picker directly (Start /
             End selection, Apply / Cancel); no preset menu. */}
         <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <DashboardRangeButton value={range} onApply={setRange} />
            {rangeLabel && (
               <Typography variant="caption" color="text.secondary">
                  Showing: {rangeLabel}
               </Typography>
            )}
         </Stack>
         <Scrollbar autoHide thumbSize={6} darkMode>
            <Grid container spacing={3}>
               {/* 4 Metric Summary Cards */}
               {dynamicAnalytics.map((item, idx) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                     <AnalyticsCard {...item} />
                  </Grid>
               ))}

               {/* Phase 3B owner KPIs */}
               {kpiCards.map((item, idx) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={`kpi-${idx}`}>
                     <AnalyticsCard {...item} />
                  </Grid>
               ))}

               {/* Inventory Distribution by Category */}
               <Grid size={{ xs: 12, md: 4 }}>
                  <SalesByGender distribution={metrics?.distribution} />
               </Grid>

               {/* Sales & Expenses Trend (range-bucketed, Phase 3B) */}
               <Grid size={{ xs: 12, md: 8 }}>
                  <YearlySalesChart
                     incomeData={metrics?.monthlyIncome}
                     expenseData={metrics?.monthlyExpenses}
                     labels={metrics?.seriesLabels}
                     rangeLabel={rangeLabel}
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

               {/* Employee Ranking (restored simple system): Top 3
                   + full ranking table, fed by the Dashboard API's
                   rankedEmployees for the same selected range. */}
               <Grid size={{ xs: 12, md: 12 }}>
                  <EmployeeRanking employees={metrics?.rankedEmployees || []} />
               </Grid>
            </Grid>
         </Scrollbar>
      </Stack>
   );
};

export default Dashboard;
