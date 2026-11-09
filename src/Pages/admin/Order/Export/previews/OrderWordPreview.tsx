"use client";

import React from "react";
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
   Grid,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { ExportColumn, SummaryRowItem } from "@src/lib/exportEngine";
import {
   DocumentPreviewTheme,
   NormalizedOrderRow,
   StoreInfo,
} from "../types/export.types";
import { formatOrderCellValue } from "../utils/exportFormatters";

export interface OrderWordPreviewProps {
   fileName: string;
   documentTitle: string;
   columns: ExportColumn[];
   previewRows: NormalizedOrderRow[];
   totalCount: number;
   summaryRows: SummaryRowItem[];
   storeInfo?: StoreInfo;
   previewTheme?: DocumentPreviewTheme;
}

export default function OrderWordPreview({
   fileName,
   documentTitle,
   columns,
   previewRows,
   totalCount,
   summaryRows,
   storeInfo,
   previewTheme = "light",
}: OrderWordPreviewProps) {
   const isDark = previewTheme === "dark";
   const todayStr = new Date().toISOString().split("T")[0];
   const displayName = fileName.endsWith(".docx") ? fileName : `${fileName}.docx`;

   const contactLine = [
      storeInfo?.phone ? `Tel: ${storeInfo.phone}` : null,
      storeInfo?.email ? `Email: ${storeInfo.email}` : null,
      storeInfo?.address ? `Address: ${storeInfo.address}` : null,
   ]
      .filter(Boolean)
      .join(" | ");

   // Isolated theme tokens for Word document preview
   const themeTokens = {
      outerBorder: isDark ? "#334155" : "#CBD5E1",
      outerBg: isDark ? "#0F172A" : "#FFFFFF",
      viewportBg: isDark ? "#0B1120" : "#F8FAFC",
      paperBg: isDark ? "#1E293B" : "#FFFFFF",
      paperBorder: isDark ? "1px solid #334155" : "1px solid #E2E8F0",
      textColor: isDark ? "#F8FAFC" : "#0F172A",
      subTextColor: isDark ? "#94A3B8" : "#64748B",
      tableBorder: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
      headerBg: isDark ? "#0D5E57" : "#0F766E",
      headerBorder: isDark ? "1px solid #115E59" : "1px solid #0D6962",
      evenRowBg: isDark ? "#1E293B" : "#FFFFFF",
      oddRowBg: isDark ? "rgba(255, 255, 255, 0.04)" : "#F8FAFC",
      cellBorder: isDark ? "1px solid #334155" : "1px solid #E2E8F0",
      summaryBorder: isDark ? "#475569" : "#CBD5E1",
      totalColor: isDark ? "#38BDF8" : "#0F766E",
      sigLineColor: isDark ? "#64748B" : "#94A3B8",
      sigTextColor: isDark ? "#F8FAFC" : "#0F172A",
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
         {/* Word Window Header Bar */}
         <Box
            sx={{
               bgcolor: "#2B579A",
               color: "#FFFFFF",
               px: 1.5,
               py: 0.6,
               display: "flex",
               justifyContent: "space-between",
               alignItems: "center",
            }}
         >
            <Stack direction="row" spacing={1} alignItems="center">
               <Icon icon="vscode-icons:file-type-word" size="small" />
               <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{ letterSpacing: 0.5 }}
               >
                  Word Document — {displayName}
               </Typography>
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: "0.7rem" }}>
               A4 Portrait • Margin: 0.5 in • Document Layout
            </Typography>
         </Box>

         {/* Word "Paper Sheet" Viewport */}
         <Box
            sx={{
               p: { xs: 1.5, sm: 2.5 },
               overflowX: "auto",
               maxHeight: 330,
               bgcolor: themeTokens.viewportBg,
               transition: "background-color 0.2s ease",
            }}
         >
            <Paper
               elevation={3}
               sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: 1,
                  bgcolor: themeTokens.paperBg,
                  color: themeTokens.textColor,
                  minWidth: Math.max(columns.length * 90, 560),
                  border: themeTokens.paperBorder,
                  mx: "auto",
                  transition: "background-color 0.2s ease, border-color 0.2s ease",
               }}
            >
               {/* Word Document Header (Branding & Titles) */}
               <Stack spacing={0.5} alignItems="center" mb={2}>
                  {storeInfo?.logoUrl && (
                     <Box
                        component="img"
                        src={storeInfo.logoUrl}
                        alt={storeInfo.name || "Logo"}
                        sx={{
                           maxHeight: 36,
                           maxWidth: 140,
                           mb: 0.5,
                        }}
                     />
                  )}

                  <Typography
                     variant="h6"
                     fontWeight={800}
                     textAlign="center"
                     sx={{ letterSpacing: 0.5, color: themeTokens.textColor }}
                  >
                     {storeInfo?.name || "DevX POS"}
                  </Typography>

                  {contactLine && (
                     <Typography
                        variant="caption"
                        textAlign="center"
                        sx={{ color: themeTokens.subTextColor }}
                     >
                        {contactLine}
                     </Typography>
                  )}

                  <Typography
                     variant="subtitle1"
                     fontWeight={700}
                     textAlign="center"
                     mt={0.5}
                     sx={{ color: themeTokens.textColor }}
                  >
                     {documentTitle || "DevX POS - Orders Export"}
                  </Typography>

                  <Typography
                     variant="caption"
                     fontStyle="italic"
                     textAlign="center"
                     sx={{ color: themeTokens.subTextColor }}
                  >
                     Generated on {todayStr} by DevX POS | Scope: Selected Orders ({totalCount} orders)
                  </Typography>
               </Stack>

               {/* Word Formatted Table */}
               <Table
                  size="small"
                  sx={{
                     border: themeTokens.tableBorder,
                     borderCollapse: "collapse",
                  }}
               >
                  <TableHead>
                     <TableRow>
                        {columns.map((col, idx) => (
                           <TableCell
                              key={col.field || idx}
                              sx={{
                                 bgcolor: themeTokens.headerBg,
                                 color: "#FFFFFF",
                                 fontWeight: 700,
                                 fontSize: "0.72rem",
                                 py: 0.6,
                                 px: 1,
                                 textAlign:
                                    col.type === "currency" || col.type === "number"
                                       ? "right"
                                       : col.type === "date"
                                         ? "center"
                                         : "left",
                                 border: themeTokens.headerBorder,
                              }}
                           >
                              {col.headerName}
                           </TableCell>
                        ))}
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {previewRows.map((row, rIdx) => {
                        const isZebra = rIdx % 2 === 1;
                        return (
                           <TableRow
                              key={row.id || rIdx}
                              sx={{
                                 bgcolor: isZebra
                                    ? themeTokens.oddRowBg
                                    : themeTokens.evenRowBg,
                              }}
                           >
                              {columns.map((col, cIdx) => {
                                 const formatted = formatOrderCellValue(
                                    row,
                                    col.field as any,
                                 );
                                 return (
                                    <TableCell
                                       key={col.field || cIdx}
                                       sx={{
                                          py: 0.5,
                                          px: 1,
                                          fontSize: "0.73rem",
                                          color: themeTokens.textColor,
                                          border: themeTokens.cellBorder,
                                          textAlign:
                                             col.type === "currency" ||
                                             col.type === "number"
                                                ? "right"
                                                : col.type === "date"
                                                  ? "center"
                                                  : "left",
                                       }}
                                    >
                                       {formatted}
                                    </TableCell>
                                 );
                              })}
                           </TableRow>
                        );
                     })}

                     {/* Word Summary Rows */}
                     {summaryRows && summaryRows.length > 0 && (
                        <>
                           {summaryRows.map((s, sIdx) => {
                              return (
                                 <TableRow key={sIdx}>
                                    <TableCell
                                       colSpan={Math.max(1, columns.length - 2)}
                                       sx={{
                                          textAlign: "right",
                                          fontWeight: 700,
                                          fontSize: "0.72rem",
                                          py: 0.6,
                                          px: 1,
                                          color: themeTokens.textColor,
                                          borderTop: `1px solid ${themeTokens.summaryBorder}`,
                                       }}
                                    >
                                       {s.label}
                                    </TableCell>
                                    <TableCell
                                       colSpan={Math.min(2, columns.length)}
                                       sx={{
                                          textAlign: "right",
                                          fontWeight: 800,
                                          color: s.isTotal
                                             ? themeTokens.totalColor
                                             : themeTokens.textColor,
                                          fontSize: "0.75rem",
                                          py: 0.6,
                                          px: 1,
                                          borderTop: `1px solid ${themeTokens.summaryBorder}`,
                                       }}
                                    >
                                       {s.value}
                                    </TableCell>
                                 </TableRow>
                              );
                           })}
                        </>
                     )}
                  </TableBody>
               </Table>

               {/* Word Signatures Preview Section */}
               <Grid container spacing={2} sx={{ mt: 3, pt: 1 }}>
                  <Grid size={{ xs: 6 }}>
                     <Typography
                        variant="caption"
                        sx={{ color: themeTokens.sigLineColor }}
                     >
                        _______________________________
                     </Typography>
                     <Typography
                        variant="caption"
                        fontWeight={700}
                        display="block"
                        sx={{ color: themeTokens.sigTextColor }}
                     >
                        Prepared By / Cashier
                     </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }} sx={{ textAlign: "right" }}>
                     <Typography
                        variant="caption"
                        sx={{ color: themeTokens.sigLineColor }}
                     >
                        _______________________________
                     </Typography>
                     <Typography
                        variant="caption"
                        fontWeight={700}
                        display="block"
                        sx={{ color: themeTokens.sigTextColor }}
                     >
                        Authorized Signature
                     </Typography>
                  </Grid>
               </Grid>
            </Paper>
         </Box>
      </Paper>
   );
}
