"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
   Alert,
   Button,
   Chip,
   CircularProgress,
   List,
   ListItemButton,
   ListItemText,
   Stack,
   Typography,
} from "@mui/material";
import CustomModal from "@src/components/Modal";
import Icon from "@src/components/Icon";
import SummaryCards from "./SummaryCards";
import Leaderboard from "./Leaderboard";
import RankingTable from "./RankingTable";
import type { HistoryPeriod, RankingResponse } from "./types";

interface HistoryPanelProps {
   open: boolean;
   onClose: () => void;
}

/** Most recent fully-ended calendar month, as a periodKey "YYYY-MM". */
const lastEndedMonthKey = (): string => {
   const now = new Date();
   const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const lastEndedMonthLabel = (): string => {
   const now = new Date();
   const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
   return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const fmtDateTime = (iso?: string | null): string =>
   iso
      ? new Date(iso).toLocaleDateString("en-US", {
           month: "short",
           day: "numeric",
           year: "numeric",
        })
      : "—";

/**
 * Finalized-period history: lists snapshot periods, loads one
 * snapshot read-only, and offers the manual "Finalize <last month>"
 * action. The finalize button is always shown — permission is
 * enforced by the API (403), whose message is surfaced verbatim,
 * as are 409 (already finalized) and pre-db-push errors.
 */
export default function HistoryPanel({ open, onClose }: HistoryPanelProps) {
   const [periods, setPeriods] = useState<HistoryPeriod[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [notice, setNotice] = useState<string | null>(null);
   const [snapshot, setSnapshot] = useState<RankingResponse | null>(null);
   const [snapshotLoading, setSnapshotLoading] = useState(false);
   const [finalizing, setFinalizing] = useState(false);

   const loadPeriods = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const res = await fetch("/api/employees/ranking/history");
         const data = await res.json().catch(() => null);
         if (!res.ok) {
            setError(data?.error || data?.message || `Failed to load finalized periods (${res.status}).`);
            setPeriods([]);
            return;
         }
         setPeriods(data?.periods || []);
      } catch {
         setError("Failed to load finalized periods — check the connection and try again.");
         setPeriods([]);
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      if (open) {
         setSnapshot(null);
         setNotice(null);
         loadPeriods();
      }
   }, [open, loadPeriods]);

   const loadSnapshot = async (periodKey: string) => {
      setSnapshotLoading(true);
      setError(null);
      try {
         const res = await fetch(
            `/api/employees/ranking/history?period=${encodeURIComponent(periodKey)}`,
         );
         const data = await res.json().catch(() => null);
         if (!res.ok) {
            setError(data?.error || data?.message || `Failed to load the ${periodKey} snapshot (${res.status}).`);
            return;
         }
         setSnapshot(data as RankingResponse);
      } catch {
         setError("Failed to load the snapshot — check the connection and try again.");
      } finally {
         setSnapshotLoading(false);
      }
   };

   const handleFinalize = async () => {
      const periodKey = lastEndedMonthKey();
      setFinalizing(true);
      setError(null);
      setNotice(null);
      try {
         const res = await fetch("/api/employees/ranking/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ periodKey }),
         });
         const data = await res.json().catch(() => null);
         if (res.status === 201) {
            setNotice(`${lastEndedMonthLabel()} finalized successfully.`);
            await loadPeriods();
            return;
         }
         if (res.status === 409) {
            setNotice(
               data?.error || data?.message || `${lastEndedMonthLabel()} is already finalized.`,
            );
            await loadPeriods();
            return;
         }
         // 400 / 403 / pre-db-push failures: surface the server's
         // message verbatim rather than paraphrasing it away.
         setError(
            data?.error || data?.message || `Finalize failed (${res.status}).`,
         );
      } catch {
         setError("Finalize failed — check the connection and try again.");
      } finally {
         setFinalizing(false);
      }
   };

   return (
      <CustomModal
         open={open}
         onClose={onClose}
         title="Ranking History"
         closeIcon
         size="lg"
         sx={{ maxHeight: "90vh", overflowY: "auto" }}
      >
         <Stack spacing={2}>
            {error && (
               <Alert severity="error" onClose={() => setError(null)}>
                  {error}
               </Alert>
            )}
            {notice && (
               <Alert severity="info" onClose={() => setNotice(null)}>
                  {notice}
               </Alert>
            )}

            <Stack
               direction={{ xs: "column", sm: "row" }}
               justifyContent="space-between"
               alignItems={{ sm: "center" }}
               spacing={1.5}
            >
               <Typography variant="body2" color="text.secondary">
                  Finalized months are immutable snapshots — later setting
                  changes never alter them.
               </Typography>
               <Button
                  variant="contained"
                  size="small"
                  disabled={finalizing}
                  onClick={handleFinalize}
                  startIcon={
                     finalizing ? (
                        <CircularProgress size={16} color="inherit" />
                     ) : (
                        <Icon icon="solar:check-circle-bold" size="small" />
                     )
                  }
                  sx={{ whiteSpace: "nowrap" }}
               >
                  {finalizing ? "Finalizing…" : `Finalize ${lastEndedMonthLabel()}`}
               </Button>
            </Stack>

            {snapshot ? (
               <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                     <Button size="small" onClick={() => setSnapshot(null)}>
                        ← All periods
                     </Button>
                     <Typography variant="h6" fontWeight={700}>
                        Finalized — {snapshot.periodKey || snapshot.finalizedMeta?.periodKey || ""}
                     </Typography>
                     <Chip label="FINALIZED" color="success" size="small" sx={{ fontWeight: 700 }} />
                     <Typography variant="caption" color="text.secondary">
                        Finalized {fmtDateTime(snapshot.finalizedAt || snapshot.finalizedMeta?.finalizedAt)}
                        {(snapshot.finalizedByLabel || snapshot.finalizedMeta?.finalizedByLabel)
                           ? ` by ${snapshot.finalizedByLabel || snapshot.finalizedMeta?.finalizedByLabel}`
                           : ""}
                     </Typography>
                  </Stack>
                  {snapshotLoading ? (
                     <Stack alignItems="center" py={4}>
                        <CircularProgress />
                     </Stack>
                  ) : (
                     <>
                        <SummaryCards summary={snapshot.summary} />
                        <Leaderboard top3={snapshot.top3} />
                        <RankingTable rows={snapshot.rows} readOnly />
                     </>
                  )}
               </Stack>
            ) : loading || snapshotLoading ? (
               <Stack alignItems="center" py={4}>
                  <CircularProgress />
               </Stack>
            ) : periods.length === 0 ? (
               <Typography variant="body2" color="text.secondary" py={2}>
                  No months have been finalized yet. Finalize last month to
                  create the first snapshot.
               </Typography>
            ) : (
               <List disablePadding>
                  {periods.map((p) => (
                     <ListItemButton
                        key={p.periodKey}
                        onClick={() => loadSnapshot(p.periodKey)}
                        sx={{ borderRadius: 1 }}
                     >
                        <ListItemText
                           primary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                 <Typography variant="body1" fontWeight={600}>
                                    {p.periodKey}
                                 </Typography>
                                 <Chip label="FINALIZED" color="success" size="small" sx={{ fontWeight: 700 }} />
                              </Stack>
                           }
                           secondary={`Finalized ${fmtDateTime(p.finalizedAt)}${p.finalizedByLabel ? ` by ${p.finalizedByLabel}` : ""} · ${p.entryCount} entries`}
                        />
                     </ListItemButton>
                  ))}
               </List>
            )}
         </Stack>
      </CustomModal>
   );
}
