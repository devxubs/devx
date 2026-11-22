"use client";

import React from "react";
import {
   Grid,
   Stack,
   Typography,
   Avatar,
   Chip,
   Box,
   useTheme,
   alpha,
} from "@mui/material";
import { useSettings } from "@src/lib/settingsContext";
import type { RankingRow } from "./types";
import { fmtScore } from "./types";

const RANK_STYLES: { label: string; color: "warning" | "info" | "secondary" }[] = [
   { label: "#1", color: "warning" },
   { label: "#2", color: "info" },
   { label: "#3", color: "secondary" },
];

export default function Leaderboard({ top3 }: { top3: RankingRow[] }) {
   const theme = useTheme();
   const { formatCurrency } = useSettings();

   // top3 only ever contains ranked (non-provisional) employees.
   if (!top3 || top3.length < 1) return null;

   return (
      <Grid container spacing={2}>
         {top3.slice(0, 3).map((row, idx) => {
            const style = RANK_STYLES[idx] || RANK_STYLES[2];
            const toneColor = theme.palette[style.color].main;
            return (
               <Grid size={{ xs: 12, sm: 6, md: 4 }} key={row.employeeId}>
                  <Box
                     sx={{
                        p: 2.5,
                        borderRadius: 1.5,
                        bgcolor: alpha(toneColor, theme.palette.mode === "dark" ? 0.055 : 0.05),
                        border: `1px solid ${alpha(toneColor, 0.18)}`,
                        boxShadow: `inset 2px 0 0 ${alpha(toneColor, 0.9)}`,
                        height: "100%",
                     }}
                  >
                     <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: toneColor, fontWeight: 700 }}>
                           {(row.employeeName || "?").charAt(0).toUpperCase()}
                        </Avatar>
                        <Stack spacing={0.25} flexGrow={1} minWidth={0}>
                           <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle1" fontWeight={700} noWrap>
                                 {row.employeeName}
                              </Typography>
                              <Chip
                                 label={style.label}
                                 color={style.color}
                                 size="small"
                                 sx={{ fontWeight: 700, borderRadius: 1 }}
                              />
                           </Stack>
                           <Typography variant="caption" color="text.secondary">
                              {row.employeeCustomId || "—"}
                              {row.roleName ? ` · ${row.roleName}` : ""}
                           </Typography>
                           <Typography variant="body2" color="text.secondary">
                              {row.raw.completedSales} completed ·{" "}
                              {formatCurrency(row.raw.netRevenue)}
                           </Typography>
                        </Stack>
                        <Stack alignItems="flex-end">
                           <Typography variant="h5" fontWeight={800}>
                              {fmtScore(row.finalScore)}
                           </Typography>
                           <Typography variant="caption" color="text.secondary">
                              Final score
                           </Typography>
                        </Stack>
                     </Stack>
                  </Box>
               </Grid>
            );
         })}
      </Grid>
   );
}
