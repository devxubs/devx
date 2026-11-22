"use client";

import React from "react";
import {
   Avatar,
   Chip,
   Divider,
   Grid,
   Stack,
   Typography,
} from "@mui/material";
import CustomModal from "@src/components/Modal";
import { useSettings } from "@src/lib/settingsContext";
import type { RankingRow } from "./types";
import { METRICS, fmtScore } from "./types";

interface EmployeeDetailsModalProps {
   row: RankingRow | null;
   onClose: () => void;
}

/**
 * Employee detail view for one ranking row. Everything renders from
 * the already-fetched row — no extra API call.
 */
export default function EmployeeDetailsModal({ row, onClose }: EmployeeDetailsModalProps) {
   const { formatCurrency } = useSettings();

   if (!row) return null;

   const figures: { label: string; value: string }[] = [
      { label: "Completed sales", value: String(row.raw.completedSales) },
      { label: "Net revenue", value: formatCurrency(row.raw.netRevenue) },
      { label: "Confirmations", value: String(row.raw.confirmations) },
      { label: "Confirmation decisions", value: String(row.raw.confirmationDecisions) },
      { label: "Within SLA", value: `${row.raw.slaOnTime} / ${row.raw.slaEvaluated}` },
      { label: "Orders handled", value: String(row.raw.handledOrders) },
      { label: "Attributable cancellations", value: String(row.raw.attributableCancellations) },
   ];

   return (
      <CustomModal
         open={Boolean(row)}
         onClose={onClose}
         title="Employee Details"
         closeIcon
         size="md"
         sx={{ maxHeight: "90vh", overflowY: "auto" }}
      >
         <Stack spacing={2.5}>
            <Stack direction="row" spacing={2} alignItems="center">
               <Avatar sx={{ width: 52, height: 52, fontWeight: 700 }}>
                  {(row.employeeName || "?").charAt(0).toUpperCase()}
               </Avatar>
               <Stack spacing={0.25}>
                  <Typography variant="h6" fontWeight={700}>
                     {row.employeeName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     {row.employeeCustomId || "—"}
                     {row.roleName ? ` · ${row.roleName}` : ""}
                  </Typography>
               </Stack>
               {row.provisional ? (
                  <Chip label="Provisional" color="warning" size="small" variant="outlined" />
               ) : (
                  <Chip label={`Rank #${row.rank ?? "—"}`} color="primary" size="small" />
               )}
            </Stack>

            <Stack direction="row" spacing={1} alignItems="baseline">
               <Typography variant="h4" fontWeight={800}>
                  {fmtScore(row.finalScore)}
               </Typography>
               <Typography variant="body2" color="text.secondary">
                  final score this period
               </Typography>
            </Stack>

            <Divider />
            <Typography variant="subtitle2" fontWeight={700}>
               Period figures
            </Typography>
            <Grid container spacing={1.5}>
               {figures.map((f) => (
                  <Grid size={{ xs: 6, sm: 4 }} key={f.label}>
                     <Typography variant="caption" color="text.secondary">
                        {f.label}
                     </Typography>
                     <Typography variant="body1" fontWeight={600}>
                        {f.value}
                     </Typography>
                  </Grid>
               ))}
            </Grid>

            <Divider />
            <Typography variant="subtitle2" fontWeight={700}>
               Metric scores
            </Typography>
            <Grid container spacing={1.5}>
               {METRICS.map((m) => (
                  <Grid size={{ xs: 6, sm: 4 }} key={m.key}>
                     <Typography variant="caption" color="text.secondary">
                        {m.short} · {m.label}
                     </Typography>
                     <Typography variant="body1" fontWeight={600}>
                        {fmtScore(row.scores[m.key])}
                     </Typography>
                  </Grid>
               ))}
            </Grid>

            <Divider />
            <Typography variant="caption" color="text.secondary">
               Evidence: {row.evidence.auditLogTransitions} AuditLog transitions ·{" "}
               {row.evidence.auditHistoryTransitions} order-history transitions ·{" "}
               {row.evidence.impliedTransitions} implied transitions ·{" "}
               {row.evidence.unattributedOrders} unattributed orders in period
            </Typography>
         </Stack>
      </CustomModal>
   );
}
