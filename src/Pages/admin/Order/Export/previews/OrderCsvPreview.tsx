"use client";

import React, { useMemo } from "react";
import {
   Box,
   Stack,
   Typography,
   Paper,
   Table,
   TableHead,
   TableRow,
   TableCell,
   TableBody,
   Button,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { ExportColumn } from "@src/lib/exportEngine";
import {
   DocumentPreviewTheme,
   NormalizedOrderRow,
} from "../types/export.types";
import {
   formatOrderCsvCellValue,
   generateRawOrderCsvString,
} from "../utils/exportFormatters";

export interface OrderCsvPreviewProps {
   fileName: string;
   columns: ExportColumn[];
   previewRows: NormalizedOrderRow[];
   csvPreviewTab: "raw" | "grid";
   onChangeCsvTab: (tab: "raw" | "grid") => void;
   previewTheme?: DocumentPreviewTheme;
}

export default function OrderCsvPreview({
   fileName,
   columns,
   previewRows,
   csvPreviewTab,
   onChangeCsvTab,
   previewTheme = "light",
}: OrderCsvPreviewProps) {
   const isDark = previewTheme === "dark";

   const rawCsvString = useMemo(() => {
      return generateRawOrderCsvString(columns, previewRows);
   }, [columns, previewRows]);

   const displayName = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;

   // Isolated theme tokens for CSV preview
   const themeTokens = {
      outerBorder: isDark ? "#334155" : "#CBD5E1",
      outerBg: isDark ? "#0F172A" : "#FFFFFF",
      viewportBg: isDark ? "#0F172A" : "#FFFFFF",
      rawBg: isDark ? "#020617" : "#F8FAFC",
      rawText: isDark ? "#38BDF8" : "#0F172A",
      rawBorder: isDark ? "1px solid #1E293B" : "1px solid #CBD5E1",
      gridThBg: isDark ? "#1E293B" : "#F1F5F9",
      gridThText: isDark ? "#F8FAFC" : "#0F172A",
      gridThBorder: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
      gridCellBg: isDark ? "#0F172A" : "#FFFFFF",
      gridCellText: isDark ? "#F8FAFC" : "#0F172A",
      gridCellBorder: isDark ? "1px solid #1E293B" : "1px solid #E2E8F0",
   };

   return (
      <Paper
         variant="outlined"
         sx={{
            borderRadius: 1.5,
            overflow: "hidden",
            border: 1,
            borderColor: themeTokens.outerBorder,
            bgcolor: themeTokens.outerBg,
            transition: "background-color 0.2s ease, border-color 0.2s ease",
         }}
      >
         {/* CSV Window Header Bar */}
         <Box
            sx={{
               bgcolor: "#334155",
               color: "#FFFFFF",
               px: 1.5,
               py: 0.6,
               display: "flex",
               justifyContent: "space-between",
               alignItems: "center",
            }}
         >
            <Stack direction="row" spacing={1} alignItems="center">
               <Icon icon="solar:document-text-bold" size="small" />
               <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{ letterSpacing: 0.5 }}
               >
                  CSV Stream — {displayName}
               </Typography>
            </Stack>

            <Stack direction="row" spacing={0.5}>
               <Button
                  size="small"
                  variant={csvPreviewTab === "raw" ? "contained" : "text"}
                  color="inherit"
                  onClick={() => onChangeCsvTab("raw")}
                  sx={{
                     fontSize: "0.68rem",
                     py: 0.2,
                     px: 1,
                     minWidth: "auto",
                     bgcolor:
                        csvPreviewTab === "raw"
                           ? "rgba(255,255,255,0.2)"
                           : "transparent",
                  }}
               >
                  Raw CSV Stream
               </Button>
               <Button
                  size="small"
                  variant={csvPreviewTab === "grid" ? "contained" : "text"}
                  color="inherit"
                  onClick={() => onChangeCsvTab("grid")}
                  sx={{
                     fontSize: "0.68rem",
                     py: 0.2,
                     px: 1,
                     minWidth: "auto",
                     bgcolor:
                        csvPreviewTab === "grid"
                           ? "rgba(255,255,255,0.2)"
                           : "transparent",
                  }}
               >
                  Plain Grid View
               </Button>
            </Stack>
         </Box>

         {/* CSV Content Viewport */}
         <Box
            sx={{
               p: 1.5,
               maxHeight: 280,
               overflowY: "auto",
               bgcolor: themeTokens.viewportBg,
            }}
         >
            {csvPreviewTab === "raw" ? (
               <Box
                  component="pre"
                  sx={{
                     m: 0,
                     p: 1.5,
                     borderRadius: 1,
                     bgcolor: themeTokens.rawBg,
                     color: themeTokens.rawText,
                     border: themeTokens.rawBorder,
                     fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                     fontSize: "0.72rem",
                     lineHeight: 1.6,
                     overflowX: "auto",
                     whiteSpace: "pre",
                  }}
               >
                  {rawCsvString}
               </Box>
            ) : (
               <Box sx={{ overflowX: "auto" }}>
                  <Table
                     size="small"
                     sx={{
                        borderCollapse: "collapse",
                        bgcolor: themeTokens.gridCellBg,
                        minWidth: Math.max(columns.length * 110, 500),
                     }}
                  >
                     <TableHead>
                        <TableRow sx={{ bgcolor: themeTokens.gridThBg }}>
                           {columns.map((col, idx) => (
                              <TableCell
                                 key={col.field || idx}
                                 sx={{
                                    fontWeight: 700,
                                    fontSize: "0.72rem",
                                    border: themeTokens.gridThBorder,
                                    py: 0.5,
                                    px: 1,
                                    color: themeTokens.gridThText,
                                 }}
                              >
                                 {col.headerName}
                              </TableCell>
                           ))}
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {previewRows.map((row, rIdx) => (
                           <TableRow key={row.id || rIdx}>
                              {columns.map((col, cIdx) => (
                                 <TableCell
                                    key={col.field || cIdx}
                                    sx={{
                                       fontSize: "0.72rem",
                                       border: themeTokens.gridCellBorder,
                                       py: 0.4,
                                       px: 1,
                                       fontFamily:
                                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                       color: themeTokens.gridCellText,
                                       bgcolor: themeTokens.gridCellBg,
                                    }}
                                 >
                                    {col.field
                                       ? formatOrderCsvCellValue(row, col.field as any)
                                       : ""}
                                 </TableCell>
                              ))}
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               </Box>
            )}
         </Box>
      </Paper>
   );
}
