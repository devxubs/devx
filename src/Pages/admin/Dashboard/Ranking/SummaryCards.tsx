"use client";

import React from "react";
import { Grid } from "@mui/material";
import AnalyticsCard from "@src/components/AnalyticsCard";
import { useSettings } from "@src/lib/settingsContext";
import type { RankingSummary } from "./types";
import { fmtScore } from "./types";

export default function SummaryCards({ summary }: { summary: RankingSummary }) {
   const { formatCurrency } = useSettings();

   const cards = [
      {
         title: "Employees Ranked",
         value: summary.employeesRanked ?? 0,
         tone: "primary" as const,
      },
      {
         title: "Top Score",
         value: fmtScore(summary.topScore),
         tone: "success" as const,
      },
      {
         title: "Completed Sales",
         value: summary.totalCompletedSales ?? 0,
         tone: "info" as const,
      },
      {
         title: "Net Revenue",
         value: formatCurrency(summary.totalNetRevenue ?? 0),
         tone: "success" as const,
      },
      {
         title: "Provisional",
         value: summary.provisionalCount ?? 0,
         tone: "warning" as const,
      },
      {
         // Evidence honesty: orders in the period whose later-stage
         // actions could not be attributed to any employee are shown,
         // never silently folded into someone's score.
         title: "Unattributed Orders",
         value: summary.unattributedOrders ?? 0,
         tone: "neutral" as const,
      },
   ];

   return (
      <Grid container spacing={2}>
         {cards.map((card) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={card.title}>
               <AnalyticsCard title={card.title} value={card.value} tone={card.tone} />
            </Grid>
         ))}
      </Grid>
   );
}
