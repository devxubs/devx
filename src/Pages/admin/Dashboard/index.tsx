"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Grid, Stack, Typography, Avatar, Box, Chip, Alert, Button } from "@mui/material";
import AnalyticsCard from "@src/components/AnalyticsCard";
import DateRangePickerCustom from "@src/components/DateRange";
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

// Phase 3B (3.9): dashboard range presets. Every period figure on
// the page honours the selected range; the API aggregates are
// bounded by it server-side.
const RANGE_PRESETS = [
   { key: "today", label: "Today" },
   { key: "7d", label: "Last 7 days" },
   { key: "30d", label: "Last 30 days" },
   { key: "month", label: "This month" },
   { key: "custom", label: "Custom" },
] as const;
type RangePresetKey = (typeof RANGE_PRESETS)[number]["key"];

const fmtLocalDate = (d: Date) =>
   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
   ).padStart(2, "0")}`;

const Dashboard = () => {
   const { formatCurrency } = useSettings();
   const [metrics, setMetrics] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [loadError, setLoadError] = useState(false);
   const [preset, setPreset] = useState<RangePresetKey>("30d");
   const [customRange, setCustomRange] = useState<[Date | null, Date | null]>([
      null,
      null,
   ]);

   const rangeParams = useCallback((): { startDate: string; endDate: string } | null => {
      const now = new Date();
      switch (preset) {
         case "today":
            return { startDate: fmtLocalDate(now), endDate: fmtLocalDate(now) };
         case "7d": {
            const s = new Date(now);
            s.setDate(s.getDate() - 6);
            return { startDate: fmtLocalDate(s), endDate: fmtLocalDate(now) };
         }
         case "month": {
            const s = new Date(now.getFullYear(), now.getMonth(), 1);
            return { startDate: fmtLocalDate(s), endDate: fmtLocalDate(now) };
         }
         case "custom": {
            const [s, e] = customRange;
            return s && e
               ? { startDate: fmtLocalDate(s), endDate: fmtLocalDate(e) }
               : null;
         }
         default: {
            const s = new Date(now);
            s.setDate(s.getDate() - 29);
            return { startDate: fmtLocalDate(s), endDate: fmtLocalDate(now) };
         }
      }
   }, [preset, customRange]);

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
         {/* Phase 3B (3.9): range selector — presets + custom range
             via the shared DateRange component. */}
         <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            {RANGE_PRESETS.map((p) => (
               <Chip
                  key={p.key}
                  label={p.label}
                  color={preset === p.key ? "primary" : "default"}
                  variant={preset === p.key ? "filled" : "outlined"}
                  clickable
                  onClick={() => setPreset(p.key)}
               />
            ))}
            {preset === "custom" && (
               <DateRangePickerCustom
                  title="Date range"
                  size="small"
                  value={customRange}
                  onChange={(v) => setCustomRange(v)}
               />
            )}
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

               {/* Employee Ranking Table — Phase B4b (P1-5): the
                   toolbar search is suppressed here (hideSearch).
                   This is a small ranked leaderboard, not a record
                   list: text search over a ranking is meaningless,
                   and the term was previously accepted, chipped as
                   "Keyword", and silently ignored. */}
               <Grid size={{ xs: 12, md: 12 }}>
                  <CustomTable
                     rows={rankedRows}
                     columns={columns}
                     hideSearch
                  />
               </Grid>
            </Grid>
         </Scrollbar>
      </Stack>
   );
};

export default Dashboard;
