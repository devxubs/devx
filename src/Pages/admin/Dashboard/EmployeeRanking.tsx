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
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { useSettings } from "@src/lib/settingsContext";

/**
 * Employee Ranking (restored simple system, owner decision
 * 2026-11-22 — replaces the short-lived Phase 2 weighted-score
 * ranking section). Data comes from the Dashboard API's
 * `rankedEmployees` payload for the selected Dashboard range:
 * orders attributed via Order.employeeId, "completed sales" =
 * COMPLETED + DELIVERED order count, "revenue" = the summed
 * totals of those orders. Display: a Top 3 strip plus the full
 * ranking table (name, completed sales, revenue, rank).
 */

export interface RankedEmployeeRow {
   id: string;
   name: string;
   avatar?: string;
   seller?: { name: string; url: string };
   call: number;
   conform: number;
   cancel: number;
   totalSales: number;
   rank: string;
   rankNumber: number;
   color?: string;
}

// Top-3 card tones, matching the Dashboard's AnalyticsCard tone
// treatment (soft alpha tint, faint border, 2px inset accent).
const TOP3_TONES = ["warning", "info", "secondary"] as const;

const EmployeeRanking = ({
   employees,
}: {
   employees: RankedEmployeeRow[];
}) => {
   const theme = useTheme();
   const { formatCurrency } = useSettings();
   const isDark = theme.palette.mode === "dark";

   const columns: ColumnConfig[] = [
      {
         field: "seller",
         headerName: "Seller",
         flex: 1,
         renderCell: (params: any) => {
            const row = params.row;
            return (
               <Stack
                  spacing={1}
                  direction="row"
                  alignItems="center"
                  height={"100%"}
               >
                  <Avatar src={row.seller?.url || row.avatar} />
                  <Typography variant="body1">
                     {row.seller?.name || row.name}
                  </Typography>
               </Stack>
            );
         },
      },
      { field: "conform", headerName: "Completed Sales" },
      {
         field: "totalSales",
         headerName: "Revenue",
         renderCell: (params: any) => (
            <Typography variant="body2" fontWeight={600}>
               {formatCurrency(Number(params.row.totalSales || 0))}
            </Typography>
         ),
      },
      {
         field: "rank",
         headerName: "Rank",
         renderCell: (params: any) => {
            const rank = String(params.row.rank || "Top 1");
            const colorMap: Record<
               string,
               "primary" | "secondary" | "success" | "warning" | "error" | "default"
            > = {
               "Top 1": "primary",
               "Top 2": "secondary",
               "Top 3": "success",
               "Top 4": "warning",
               "Top 5": "error",
               A: "primary",
               B: "secondary",
               C: "success",
               D: "warning",
               E: "error",
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

   const rows = (employees || []).map((emp) => ({
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
      totalSales: emp.totalSales,
      rank: emp.rank,
      color: emp.color,
   }));

   const top3 = rows.slice(0, 3);

   return (
      <Stack spacing={2}>
         <Typography variant="h6" fontWeight={700}>
            Employee Ranking
         </Typography>

         {top3.length > 0 && (
            <Grid container spacing={2}>
               {top3.map((row, idx) => {
                  const tone = TOP3_TONES[idx] || TOP3_TONES[2];
                  const toneColor = (theme.palette as any)[tone].main as string;
                  return (
                     <Grid size={{ xs: 12, sm: 6, md: 4 }} key={row.id}>
                        <Box
                           sx={{
                              p: 2.5,
                              borderRadius: 1.5,
                              bgcolor: alpha(toneColor, isDark ? 0.055 : 0.05),
                              border: `1px solid ${alpha(toneColor, isDark ? 0.18 : 0.16)}`,
                              boxShadow: `inset 2px 0 0 ${alpha(toneColor, 0.9)}`,
                              height: "100%",
                           }}
                        >
                           <Stack spacing={1.5}>
                              <Stack
                                 direction="row"
                                 spacing={1.5}
                                 alignItems="center"
                              >
                                 <Avatar src={row.avatar} />
                                 <Typography
                                    variant="subtitle1"
                                    fontWeight={700}
                                    noWrap
                                 >
                                    {row.name}
                                 </Typography>
                                 <Box flexGrow={1} />
                                 <Chip
                                    label={row.rank}
                                    size="small"
                                    color={
                                       idx === 0
                                          ? "primary"
                                          : idx === 1
                                            ? "secondary"
                                            : "success"
                                    }
                                    sx={{ fontWeight: 700, borderRadius: 1 }}
                                 />
                              </Stack>
                              <Stack direction="row" spacing={3}>
                                 <Box>
                                    <Typography
                                       variant="caption"
                                       color="text.secondary"
                                    >
                                       Completed Sales
                                    </Typography>
                                    <Typography variant="h6" fontWeight={700}>
                                       {row.conform}
                                    </Typography>
                                 </Box>
                                 <Box>
                                    <Typography
                                       variant="caption"
                                       color="text.secondary"
                                    >
                                       Revenue
                                    </Typography>
                                    <Typography variant="h6" fontWeight={700}>
                                       {formatCurrency(
                                          Number(row.totalSales || 0),
                                       )}
                                    </Typography>
                                 </Box>
                              </Stack>
                           </Stack>
                        </Box>
                     </Grid>
                  );
               })}
            </Grid>
         )}

         {/* The toolbar search is suppressed here (hideSearch): this
             is a small ranked leaderboard, not a record list — text
             search over a ranking is meaningless. */}
         <CustomTable rows={rows} columns={columns} hideSearch />
      </Stack>
   );
};

export default EmployeeRanking;
