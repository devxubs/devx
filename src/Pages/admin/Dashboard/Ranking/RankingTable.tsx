"use client";

import React from "react";
import {
   Box,
   Chip,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableContainer,
   TableHead,
   TableRow,
   Typography,
   useTheme,
   alpha,
} from "@mui/material";
import type { RankingRow } from "./types";
import { METRICS, fmtScore } from "./types";

interface RankingTableProps {
   rows: RankingRow[];
   onRowClick?: (row: RankingRow) => void;
   readOnly?: boolean;
}

/**
 * Ranking table. The API already orders rows (ranked first by the
 * deterministic tie-break chain, then the provisional group); this
 * component renders them in that order and visually separates the
 * provisional group with a labelled divider row.
 */
export default function RankingTable({ rows, onRowClick, readOnly = false }: RankingTableProps) {
   const theme = useTheme();
   const firstProvisionalIdx = rows.findIndex((r) => r.provisional);

   return (
      <TableContainer
         sx={{
            borderRadius: 1.5,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: "background.paper",
            overflowX: "auto",
         }}
      >
         <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
               <TableRow sx={{ bgcolor: alpha(theme.palette.grey[600], 0.08) }}>
                  <TableCell sx={{ fontWeight: 700 }}>Rank</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                     Final Score
                  </TableCell>
                  {METRICS.map((m) => (
                     <TableCell key={m.key} sx={{ fontWeight: 700 }} align="right">
                        <Stack alignItems="flex-end" spacing={0}>
                           <Typography variant="caption" fontWeight={700}>
                              {m.short}
                           </Typography>
                           <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                              {m.label}
                           </Typography>
                        </Stack>
                     </TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                     Handled
                  </TableCell>
               </TableRow>
            </TableHead>
            <TableBody>
               {rows.map((row, idx) => (
                  <React.Fragment key={row.employeeId}>
                     {idx === firstProvisionalIdx && firstProvisionalIdx !== -1 && (
                        <TableRow>
                           <TableCell colSpan={4 + METRICS.length} sx={{ py: 1, bgcolor: alpha(theme.palette.warning.main, 0.06) }}>
                              <Typography variant="caption" fontWeight={700} color="warning.main">
                                 PROVISIONAL — fewer handled orders than the minimum eligibility threshold; scored but not ranked
                              </Typography>
                           </TableCell>
                        </TableRow>
                     )}
                     <TableRow
                        hover={!readOnly}
                        onClick={readOnly ? undefined : () => onRowClick?.(row)}
                        sx={readOnly ? undefined : { cursor: "pointer" }}
                     >
                        <TableCell>
                           {row.provisional ? (
                              <Chip label="Provisional" color="warning" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                           ) : (
                              <Chip
                                 label={`#${row.rank ?? idx + 1}`}
                                 color={row.rank === 1 ? "warning" : row.rank === 2 ? "info" : row.rank === 3 ? "secondary" : "default"}
                                 size="small"
                                 sx={{ fontWeight: 700, minWidth: 44 }}
                              />
                           )}
                        </TableCell>
                        <TableCell>
                           <Stack spacing={0}>
                              <Typography variant="body2" fontWeight={600}>
                                 {row.employeeName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 {row.employeeCustomId || "—"}
                                 {row.roleName ? ` · ${row.roleName}` : ""}
                              </Typography>
                           </Stack>
                        </TableCell>
                        <TableCell align="right">
                           <Typography variant="body2" fontWeight={800}>
                              {fmtScore(row.finalScore)}
                           </Typography>
                        </TableCell>
                        {METRICS.map((m) => (
                           <TableCell key={m.key} align="right">
                              {fmtScore(row.scores[m.key])}
                           </TableCell>
                        ))}
                        <TableCell align="right">{row.raw.handledOrders}</TableCell>
                     </TableRow>
                  </React.Fragment>
               ))}
               {rows.length === 0 && (
                  <TableRow>
                     <TableCell colSpan={4 + METRICS.length}>
                        <Box py={3} textAlign="center">
                           <Typography variant="body2" color="text.secondary">
                              No employees to rank in this period.
                           </Typography>
                        </Box>
                     </TableCell>
                  </TableRow>
               )}
            </TableBody>
         </Table>
      </TableContainer>
   );
}
