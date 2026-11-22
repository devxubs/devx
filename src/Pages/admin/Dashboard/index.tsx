"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Grid, Stack, Typography, Avatar, Alert, Button } from "@mui/material";
import AnalyticsCard from "@src/components/AnalyticsCard";
import { DashboardSkeleton } from "@src/components/SkeletonLoader";
import SalesByGender from "./SalesByGender";
import YearlySalesChart from "./YearlySalesChart";
import Scrollbar from "react-browser-scrollbar";
import SalesOverview from "./SalesOverview";
import Balance from "./Balance";
import { useSettings } from "@src/lib/settingsContext";
import {
   PRESET_OPTIONS,
   presetRange,
   fmtLocalDate,
   type DatePresetKey,
} from "@src/lib/dateRanges";
import DashboardRangeButton from "./components/DashboardRangeButton";
import RankingSection from "./Ranking";

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
   // Part 1 (plan §5): single-button date filter. Default preset
   // is This Month (decision D8). Range math lives in the shared
   // src/lib/dateRanges.ts helper (Monday-start weeks, browser-local
   // YYYY-MM-DD exactly as before).
   const [preset, setPreset] = useState<DatePresetKey>("thisMonth");
   const [customRange, setCustomRange] = useState<[Date | null, Date | null]>([
      null,
      null,
   ]);

   const rangeParams = useCallback((): { startDate: string; endDate: string } | null => {
      if (preset === "custom") {
         const [s, e] = customRange;
         return s && e
            ? { startDate: fmtLocalDate(s), endDate: fmtLocalDate(e) }
            : null;
      }
      return presetRange(preset);
   }, [preset, customRange]);

   // Button label: the preset name for single-day presets, otherwise
   // the formatted range (e.g. "1 Nov – 30 Nov 2026"); Custom
   // shows its own dates.
   const currentRange = rangeParams();
   const fmtRangeDay = (iso: string, withYear: boolean) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
         day: "numeric",
         month: "short",
         ...(withYear ? { year: "numeric" as const } : {}),
      });
   const rangeButtonLabel = (() => {
      if (preset === "today" || preset === "yesterday") {
         return (
            PRESET_OPTIONS.find((o) => o.key === preset)?.label || preset
         );
      }
      if (!currentRange) return "Custom Date Range";
      return `${fmtRangeDay(currentRange.startDate, false)} – ${fmtRangeDay(currentRange.endDate, true)}`;
   })();

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
   }, [rangeParams]);

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
         {/* Part 1 (plan §5): single-button date filter \u2014 one
             button + popover replaces the preset Chip row and the
             inline custom picker. */}
         <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <DashboardRangeButton
               preset={preset}
               label={rangeButtonLabel}
               customRange={customRange}
               onPresetChange={(key) => setPreset(key)}
               onCustomApply={(range) => {
                  setCustomRange(range);
                  setPreset("custom");
               }}
            />
            {rangeLabel && (
               <Typography variant="caption" color="text.secondary">
                  Showing: {rangeLabel}
               </Typography>
            )}
         </Stack>
         {/* P3-5: when a reload fails but earlier data is on screen,
             keep the figures AND show the failure with a Retry —
             previously the error only rendered when there was no
             data at all, so stale figures looked fresh. */}
         {loadError && metrics && (
            <Alert
               severity="error"
               action={
                  <Button color="inherit" size="small" onClick={() => loadDashboard()}>
                     Retry
                  </Button>
               }
            >
               Couldn&apos;t refresh dashboard data — the figures below may be
               out of date.
            </Alert>
         )}
         {metrics && metrics.totalOrders === 0 && (
            <Alert severity="info">
               No orders were recorded in the selected range — the period
               figures below are zero for that reason.
            </Alert>
         )}
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

               {/* Employee Performance Ranking (plan §8 Step 5):
                   the legacy creator-based ranking table is replaced
                   by the new ranking section, fed by the ranking API
                   for the same Dashboard range. */}
               <Grid size={{ xs: 12, md: 12 }}>
                  <RankingSection
                     startDate={currentRange?.startDate ?? null}
                     endDate={currentRange?.endDate ?? null}
                  />
               </Grid>
            </Grid>
         </Scrollbar>
      </Stack>
   );
};

export default Dashboard;
