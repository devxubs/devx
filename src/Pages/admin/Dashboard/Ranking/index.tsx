"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
   Alert,
   Box,
   Button,
   Chip,
   Skeleton,
   Stack,
   Typography,
} from "@mui/material";
import Icon from "@src/components/Icon";
import SummaryCards from "./SummaryCards";
import Leaderboard from "./Leaderboard";
import RankingTable from "./RankingTable";
import ScoreBreakdownModal from "./ScoreBreakdownModal";
import EmployeeDetailsModal from "./EmployeeDetailsModal";
import TrendChart from "./TrendChart";
import HistoryPanel from "./HistoryPanel";
import type { RankingResponse, RankingRow } from "./types";

interface RankingSectionProps {
   startDate: string | null;
   endDate: string | null;
}

/**
 * Employee Performance Ranking section (plan §8 Step 5). Fetches the
 * live ranking for the Dashboard's selected range; the History panel
 * covers finalized-month snapshots. LIVE vs FINALIZED is always
 * badged — the two are never mixed in one table.
 */
export default function RankingSection({ startDate, endDate }: RankingSectionProps) {
   const [data, setData] = useState<RankingResponse | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [historyOpen, setHistoryOpen] = useState(false);
   const [breakdownRow, setBreakdownRow] = useState<RankingRow | null>(null);
   const [detailsRow, setDetailsRow] = useState<RankingRow | null>(null);

   const load = useCallback(async () => {
      if (!startDate || !endDate) return; // custom range not fully picked yet
      setLoading(true);
      try {
         const res = await fetch(
            `/api/employees/ranking?startDate=${startDate}&endDate=${endDate}`,
         );
         const payload = await res.json().catch(() => null);
         if (!res.ok) {
            // Keep any earlier data on screen (flagged stale by the
            // error alert below) rather than blanking the section.
            setError(
               payload?.error || payload?.message || `Couldn't load the ranking (${res.status}).`,
            );
            return;
         }
         setData(payload as RankingResponse);
         setError(null);
      } catch {
         setError("Couldn't load the ranking — check the connection and try again.");
      } finally {
         setLoading(false);
      }
   }, [startDate, endDate]);

   useEffect(() => {
      load();
   }, [load]);

   const isFinalized = data?.mode === "finalized";
   const finalizedAt = data?.finalizedAt || data?.finalizedMeta?.finalizedAt;
   const finalizedByLabel = data?.finalizedByLabel || data?.finalizedMeta?.finalizedByLabel;

   return (
      <Stack spacing={2.5}>
         <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
            spacing={1.5}
         >
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
               <Typography variant="h6" fontWeight={700}>
                  Employee Performance Ranking
               </Typography>
               {data &&
                  (isFinalized ? (
                     <Chip label="FINALIZED" color="success" size="small" sx={{ fontWeight: 700 }} />
                  ) : (
                     <Chip label="LIVE" color="primary" size="small" sx={{ fontWeight: 700 }} />
                  ))}
               {isFinalized && finalizedAt && (
                  <Typography variant="caption" color="text.secondary">
                     Finalized {new Date(finalizedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                     })}
                     {finalizedByLabel ? ` by ${finalizedByLabel}` : ""}
                  </Typography>
               )}
            </Stack>
            <Button
               variant="outlined"
               size="small"
               onClick={() => setHistoryOpen(true)}
               startIcon={<Icon icon="solar:history-bold" size="small" />}
               sx={{ whiteSpace: "nowrap" }}
            >
               History
            </Button>
         </Stack>

         {loading && !data ? (
            <Stack spacing={2}>
               <Skeleton variant="rounded" height={110} />
               <Skeleton variant="rounded" height={120} />
               <Skeleton variant="rounded" height={280} />
            </Stack>
         ) : error && !data ? (
            <Alert
               severity="error"
               action={
                  <Button color="inherit" size="small" onClick={load}>
                     Retry
                  </Button>
               }
            >
               {error}
            </Alert>
         ) : !data || data.rows.length === 0 ? (
            <Box
               sx={{
                  py: 5,
                  textAlign: "center",
                  borderRadius: 1.5,
                  border: (theme) => `1px dashed ${theme.palette.divider}`,
               }}
            >
               <Typography variant="body1" fontWeight={600}>
                  No ranking data for this range
               </Typography>
               <Typography variant="body2" color="text.secondary">
                  No employee handled orders with attributable actions in the
                  selected period.
               </Typography>
            </Box>
         ) : (
            <>
               {error && (
                  <Alert
                     severity="error"
                     action={
                        <Button color="inherit" size="small" onClick={load}>
                           Retry
                        </Button>
                     }
                  >
                     Couldn&apos;t refresh the ranking — the figures below may be out of date.
                  </Alert>
               )}
               <SummaryCards summary={data.summary} />
               <Leaderboard top3={data.top3} />
               <RankingTable rows={data.rows} onRowClick={(row) => setBreakdownRow(row)} />
               {!isFinalized && <TrendChart buckets={data.trend?.buckets} />}
            </>
         )}

         <ScoreBreakdownModal
            row={breakdownRow}
            settings={data?.settings ?? null}
            onClose={() => setBreakdownRow(null)}
            onViewDetails={(row) => {
               setBreakdownRow(null);
               setDetailsRow(row);
            }}
         />
         <EmployeeDetailsModal row={detailsRow} onClose={() => setDetailsRow(null)} />
         <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
      </Stack>
   );
}
