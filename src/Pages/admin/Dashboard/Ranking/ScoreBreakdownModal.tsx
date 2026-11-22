"use client";

import React from "react";
import {
   Box,
   Button,
   Chip,
   Divider,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableRow,
   Typography,
} from "@mui/material";
import CustomModal from "@src/components/Modal";
import { useSettings } from "@src/lib/settingsContext";
import type { RankingSettings } from "@src/lib/rankingSettings";
import type { RankingRow } from "./types";
import { METRICS, fmtScore } from "./types";

interface ScoreBreakdownModalProps {
   row: RankingRow | null;
   settings: RankingSettings | null;
   onClose: () => void;
   onViewDetails?: (row: RankingRow) => void;
}

/**
 * "Explain this score": per metric — raw figure → score → weight →
 * weighted points (score × weight / 100) — plus the final total,
 * zero-denominator notes, and the evidence counts behind the
 * attribution (so a score never claims more than the data proves).
 */
export default function ScoreBreakdownModal({
   row,
   settings,
   onClose,
   onViewDetails,
}: ScoreBreakdownModalProps) {
   const { formatCurrency } = useSettings();

   if (!row) return null;

   const weights = settings?.weights;
   const rawFor = (key: string): string => {
      switch (key) {
         case "completedSales":
            return `${row.raw.completedSales} orders`;
         case "netRevenue":
            return formatCurrency(row.raw.netRevenue);
         case "confirmationRate":
            return `${row.raw.confirmations} / ${row.raw.confirmationDecisions} decisions`;
         case "handlingQuality":
            return `${row.raw.slaOnTime} / ${row.raw.slaEvaluated} within SLA`;
         case "cancellationControl":
            return `${row.raw.attributableCancellations} attributable cancellations`;
         default:
            return "—";
      }
   };

   const notes: string[] = [];
   if (row.raw.confirmationDecisions === 0) {
      notes.push("No confirmation decisions in period — confirmation rate scored 0.");
   }
   if (row.raw.slaEvaluated === 0) {
      notes.push("No SLA-evaluated confirmations in period — handling quality scored 0.");
   }

   return (
      <CustomModal
         open={Boolean(row)}
         onClose={onClose}
         title="Score Breakdown"
         closeIcon
         size="md"
         sx={{ maxHeight: "90vh", overflowY: "auto" }}
      >
         <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
               <Typography variant="h6" fontWeight={700}>
                  {row.employeeName}
               </Typography>
               <Typography variant="body2" color="text.secondary">
                  {row.employeeCustomId || "—"}
                  {row.roleName ? ` · ${row.roleName}` : ""}
               </Typography>
               {row.provisional ? (
                  <Chip label="Provisional" color="warning" size="small" variant="outlined" />
               ) : (
                  <Chip label={`Rank #${row.rank ?? "—"}`} color="primary" size="small" />
               )}
               <Box flexGrow={1} />
               <Typography variant="h5" fontWeight={800}>
                  {fmtScore(row.finalScore)}
               </Typography>
            </Stack>

            <Table size="small">
               <TableHead>
                  <TableRow>
                     <TableCell sx={{ fontWeight: 700 }}>Metric</TableCell>
                     <TableCell sx={{ fontWeight: 700 }}>Raw</TableCell>
                     <TableCell sx={{ fontWeight: 700 }} align="right">Score</TableCell>
                     <TableCell sx={{ fontWeight: 700 }} align="right">Weight</TableCell>
                     <TableCell sx={{ fontWeight: 700 }} align="right">Points</TableCell>
                  </TableRow>
               </TableHead>
               <TableBody>
                  {METRICS.map((m) => {
                     const weight = weights ? weights[m.key] : 0;
                     const score = row.scores[m.key];
                     return (
                        <TableRow key={m.key}>
                           <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                 {m.short} · {m.label}
                              </Typography>
                           </TableCell>
                           <TableCell>{rawFor(m.key)}</TableCell>
                           <TableCell align="right">{fmtScore(score)}</TableCell>
                           <TableCell align="right">{weight}%</TableCell>
                           <TableCell align="right">
                              {fmtScore((score * weight) / 100)}
                           </TableCell>
                        </TableRow>
                     );
                  })}
                  <TableRow>
                     <TableCell colSpan={4}>
                        <Typography variant="body2" fontWeight={700}>
                           Final score
                        </Typography>
                     </TableCell>
                     <TableCell align="right">
                        <Typography variant="body2" fontWeight={800}>
                           {fmtScore(row.finalScore)}
                        </Typography>
                     </TableCell>
                  </TableRow>
               </TableBody>
            </Table>

            {notes.map((note) => (
               <Typography key={note} variant="caption" color="text.secondary">
                  {note}
               </Typography>
            ))}

            <Divider />
            <Typography variant="caption" color="text.secondary">
               Evidence: {row.evidence.auditLogTransitions} AuditLog transitions ·{" "}
               {row.evidence.auditHistoryTransitions} order-history transitions ·{" "}
               {row.evidence.impliedTransitions} implied (created in final status) ·{" "}
               {row.evidence.unattributedOrders} unattributed orders in period ·{" "}
               {row.raw.handledOrders} orders handled
            </Typography>

            {onViewDetails && (
               <Stack direction="row" justifyContent="flex-end">
                  <Button variant="outlined" size="small" onClick={() => onViewDetails(row)}>
                     View employee details
                  </Button>
               </Stack>
            )}
         </Stack>
      </CustomModal>
   );
}
