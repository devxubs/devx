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
   Chip,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { ExportColumn, SummaryRowItem } from "@src/lib/exportEngine";
import {
   DocumentPreviewTheme,
   NormalizedOrderRow,
   StoreInfo,
} from "../types/export.types";
import { formatOrderCellValue } from "../utils/exportFormatters";

export interface OrderExcelPreviewProps {
   fileName: string;
   documentTitle: string;
   columns: ExportColumn[];
   previewRows: NormalizedOrderRow[];
   totalCount: number;
   summaryRows: SummaryRowItem[];
   storeInfo?: StoreInfo;
   previewTheme?: DocumentPreviewTheme;
}

export default function OrderExcelPreview({
   fileName,
   documentTitle,
   columns,
   previewRows,
   totalCount,
   summaryRows,
   storeInfo,
   previewTheme = "light",
}: OrderExcelPreviewProps) {
   const isDark = previewTheme === "dark";
   const todayStr = new Date().toISOString().split("T")[0];
   const displayName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;

   const subtitleParts = [
      storeInfo?.phone ? `Tel: ${storeInfo.phone}` : null,
      storeInfo?.email ? `Email: ${storeInfo.email}` : null,
      storeInfo?.address ? `Address: ${storeInfo.address}` : null,
      `Exported: ${todayStr}`,
   ].filter(Boolean);

   // Isolated preview theme tokens
   const themeTokens = {
      outerBorder: isDark ? "#334155" : "#CBD5E1",
      outerBg: isDark ? "#0F172A" : "#FFFFFF",
      tableBg: isDark ? "#1E293B" : "#FFFFFF",
      textColor: isDark ? "#F8FAFC" : "#0F172A",
      subTextColor: isDark ? "#94A3B8" : "#64748B",
      coordBg: isDark ? "#0F172A" : "#F1F5F9",
      coordBorder: isDark ? "#334155" : "#CBD5E1",
      coordText: isDark ? "#94A3B8" : "#64748B",
      row1Bg: isDark ? "#0F172A" : "#F1F5F9",
      row1Color: isDark ? "#F8FAFC" : "#0F172A",
      row1Border: isDark ? "#334155" : "#CBD5E1",
      row2Bg: isDark ? "#1E293B" : "#FFFFFF",
      row2Color: isDark ? "#F8FAFC" : "#0F172A",
      row2Border: isDark ? "#334155" : "#CBD5E1",
      row3Bg: isDark ? "#0F172A" : "#FFFFFF",
      row3Color: isDark ? "#94A3B8" : "#64748B",
      row3Border: isDark ? "#334155" : "#CBD5E1",
      headerBg: isDark ? "#0D5E57" : "#0F766E",
      headerBorder: isDark ? "#115E59" : "#0D6962",
      evenRowBg: isDark ? "#1E293B" : "#FFFFFF",
      oddRowBg: isDark ? "#111827" : "#F8FAFC",
      cellBorder: isDark ? "#334155" : "#E2E8F0",
      summaryBorder: isDark ? "#334155" : "#CBD5E1",
      totalColor: isDark ? "#38BDF8" : "#0F766E",
      tabBarBg: isDark ? "#0F172A" : "#F8FAFC",
      tabBarBorder: isDark ? "#334155" : "#E2E8F0",
      tabPillBg: isDark ? "#1E293B" : "#FFFFFF",
      tabPillBorder: isDark ? "#334155" : "#CBD5E1",
      tabPillText: isDark ? "#F8FAFC" : "#0F172A",
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
         {/* Excel Window Header Bar */}
         <Box
            sx={{
               bgcolor: "#107C41",
               color: "#FFFFFF",
               px: 1.5,
               py: 0.6,
               display: "flex",
               justifyContent: "space-between",
               alignItems: "center",
            }}
         >
            <Stack direction="row" spacing={1} alignItems="center">
               <Icon icon="vscode-icons:file-type-excel" size="small" />
               <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{ letterSpacing: 0.5 }}
               >
                  Excel Worksheet — {displayName}
               </Typography>
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: "0.7rem" }}>
               Sheet1 • {totalCount} Rows • Grid: ON
            </Typography>
         </Box>

         {/* Excel Scrollable Worksheet Viewport */}
         <Box sx={{ overflowX: "auto", maxHeight: 320 }}>
            <Table
               size="small"
               sx={{
                  borderCollapse: "collapse",
                  fontFamily: "Aptos, Calibri, Arial, sans-serif",
                  fontSize: "0.75rem",
                  bgcolor: themeTokens.tableBg,
                  minWidth: Math.max(columns.length * 110, 600),
               }}
            >
               {/* Excel Coordinate Headers (A, B, C, D...) */}
               <TableHead>
                  <TableRow sx={{ bgcolor: themeTokens.coordBg }}>
                     <TableCell
                        sx={{
                           width: 38,
                           p: "4px 8px",
                           textAlign: "center",
                           border: `1px solid ${themeTokens.coordBorder}`,
                           color: themeTokens.coordText,
                           fontWeight: 700,
                           fontSize: "0.7rem",
                        }}
                     >
                        #
                     </TableCell>
                     {columns.map((col, idx) => (
                        <TableCell
                           key={col.field || idx}
                           sx={{
                              p: "4px 8px",
                              textAlign: "center",
                              border: `1px solid ${themeTokens.coordBorder}`,
                              color: themeTokens.coordText,
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              minWidth: col.width ? col.width * 6 : 95,
                           }}
                        >
                           {String.fromCharCode(65 + (idx % 26))} ({col.headerName})
                        </TableCell>
                     ))}
                  </TableRow>
               </TableHead>

               <TableBody>
                  {/* Row 1: Merged Company Name */}
                  <TableRow>
                     <TableCell
                        sx={{
                           textAlign: "center",
                           bgcolor: themeTokens.coordBg,
                           border: `1px solid ${themeTokens.coordBorder}`,
                           fontSize: "0.7rem",
                           fontWeight: 700,
                           color: themeTokens.coordText,
                        }}
                     >
                        1
                     </TableCell>
                     <TableCell
                        colSpan={columns.length}
                        sx={{
                           bgcolor: themeTokens.row1Bg,
                           color: themeTokens.row1Color,
                           textAlign: "center",
                           fontWeight: 700,
                           fontSize: "0.95rem",
                           py: 0.75,
                           border: `1px solid ${themeTokens.row1Border}`,
                        }}
                     >
                        {storeInfo?.name || "DevX POS"}
                     </TableCell>
                  </TableRow>

                  {/* Row 2: Merged Document Title */}
                  <TableRow>
                     <TableCell
                        sx={{
                           textAlign: "center",
                           bgcolor: themeTokens.coordBg,
                           border: `1px solid ${themeTokens.coordBorder}`,
                           fontSize: "0.7rem",
                           fontWeight: 700,
                           color: themeTokens.coordText,
                        }}
                     >
                        2
                     </TableCell>
                     <TableCell
                        colSpan={columns.length}
                        sx={{
                           bgcolor: themeTokens.row2Bg,
                           color: themeTokens.row2Color,
                           textAlign: "center",
                           fontWeight: 700,
                           fontSize: "0.85rem",
                           py: 0.6,
                           border: `1px solid ${themeTokens.row2Border}`,
                        }}
                     >
                        {documentTitle || "DevX POS - Orders Export"}
                     </TableCell>
                  </TableRow>

                  {/* Row 3: Subtitle / Contact & Date */}
                  <TableRow>
                     <TableCell
                        sx={{
                           textAlign: "center",
                           bgcolor: themeTokens.coordBg,
                           border: `1px solid ${themeTokens.coordBorder}`,
                           fontSize: "0.7rem",
                           fontWeight: 700,
                           color: themeTokens.coordText,
                        }}
                     >
                        3
                     </TableCell>
                     <TableCell
                        colSpan={columns.length}
                        sx={{
                           bgcolor: themeTokens.row3Bg,
                           color: themeTokens.row3Color,
                           textAlign: "center",
                           fontStyle: "italic",
                           fontSize: "0.7rem",
                           py: 0.4,
                           border: `1px solid ${themeTokens.row3Border}`,
                        }}
                     >
                        {subtitleParts.join(" | ")}
                     </TableCell>
                  </TableRow>

                  {/* Column Headers Styled by Document Theme */}
                  <TableRow>
                     <TableCell
                        sx={{
                           textAlign: "center",
                           bgcolor: themeTokens.coordBg,
                           border: `1px solid ${themeTokens.coordBorder}`,
                           fontSize: "0.7rem",
                           fontWeight: 700,
                           color: themeTokens.coordText,
                        }}
                     >
                        H
                     </TableCell>
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
                              border: `1px solid ${themeTokens.headerBorder}`,
                           }}
                        >
                           {col.headerName}
                        </TableCell>
                     ))}
                  </TableRow>

                  {/* Actual Data Rows */}
                  {previewRows.map((row, rIdx) => {
                     const isZebra = rIdx % 2 === 1;
                     const rowNum = 5 + rIdx;

                     return (
                        <TableRow
                           key={row.id || rIdx}
                           sx={{
                              bgcolor: isZebra
                                 ? themeTokens.oddRowBg
                                 : themeTokens.evenRowBg,
                           }}
                        >
                           <TableCell
                              sx={{
                                 textAlign: "center",
                                 bgcolor: themeTokens.coordBg,
                                 border: `1px solid ${themeTokens.coordBorder}`,
                                 fontSize: "0.7rem",
                                 fontWeight: 600,
                                 color: themeTokens.coordText,
                              }}
                           >
                              {rowNum}
                           </TableCell>
                           {columns.map((col, cIdx) => {
                              const formatted = formatOrderCellValue(
                                 row,
                                 col.field as any,
                              );
                              const isIdCol =
                                 col.field === "orderId" ||
                                 col.field === "invoiceNo";

                              return (
                                 <TableCell
                                    key={col.field || cIdx}
                                    sx={{
                                       py: 0.5,
                                       px: 1,
                                       fontSize: "0.73rem",
                                       border: `1px solid ${themeTokens.cellBorder}`,
                                       color: themeTokens.textColor,
                                       fontFamily: isIdCol ? "monospace" : "inherit",
                                       textAlign:
                                          col.type === "currency" ||
                                          col.type === "number"
                                             ? "right"
                                             : col.type === "date"
                                               ? "center"
                                               : "left",
                                       fontWeight: isIdCol ? 600 : 400,
                                    }}
                                 >
                                    {col.field === "status" ? (
                                       <Chip
                                          label={String(formatted)}
                                          size="small"
                                          color={
                                             formatted === "Delivered" ||
                                             formatted === "Completed"
                                                ? "success"
                                                : formatted === "Cancelled" ||
                                                    formatted === "Returned"
                                                  ? "error"
                                                  : formatted === "Processing" ||
                                                      formatted === "Shipped"
                                                    ? "primary"
                                                    : "default"
                                          }
                                          sx={{
                                             fontSize: "0.65rem",
                                             height: 18,
                                          }}
                                       />
                                    ) : col.field === "paymentStatus" ? (
                                       <Chip
                                          label={String(formatted)}
                                          size="small"
                                          color={
                                             formatted === "Paid"
                                                ? "success"
                                                : formatted === "Partial"
                                                  ? "warning"
                                                  : "error"
                                          }
                                          sx={{
                                             fontSize: "0.65rem",
                                             height: 18,
                                          }}
                                       />
                                    ) : (
                                       formatted
                                    )}
                                 </TableCell>
                              );
                           })}
                        </TableRow>
                     );
                  })}

                  {/* Excel Summary Rows */}
                  {summaryRows && summaryRows.length > 0 && (
                     <>
                        {summaryRows.map((s, sIdx) => {
                           const isLast = sIdx === summaryRows.length - 1;
                           return (
                              <TableRow key={sIdx}>
                                 <TableCell
                                    sx={{
                                       textAlign: "center",
                                       bgcolor: themeTokens.coordBg,
                                       border: `1px solid ${themeTokens.coordBorder}`,
                                       fontSize: "0.7rem",
                                       fontWeight: 700,
                                       color: themeTokens.coordText,
                                    }}
                                 >
                                    {sIdx === 0 ? "∑" : ""}
                                 </TableCell>
                                 <TableCell
                                    colSpan={Math.max(1, columns.length - 2)}
                                    sx={{
                                       textAlign: "right",
                                       fontWeight: 700,
                                       fontSize: "0.72rem",
                                       py: 0.5,
                                       px: 1,
                                       borderTop: `1px solid ${themeTokens.summaryBorder}`,
                                       borderBottom: isLast
                                          ? `1px solid ${themeTokens.summaryBorder}`
                                          : undefined,
                                       color: themeTokens.textColor,
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
                                       py: 0.5,
                                       px: 1,
                                       borderTop: `1px solid ${themeTokens.summaryBorder}`,
                                       borderBottom: s.isTotal
                                          ? `3px double ${themeTokens.totalColor}`
                                          : isLast
                                            ? `1px solid ${themeTokens.summaryBorder}`
                                            : undefined,
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
         </Box>

         {/* Excel Tab Bar Footer */}
         <Box
            sx={{
               bgcolor: themeTokens.tabBarBg,
               borderTop: 1,
               borderColor: themeTokens.tabBarBorder,
               px: 1.5,
               py: 0.5,
               display: "flex",
               alignItems: "center",
               gap: 1,
            }}
         >
            <Box
               sx={{
                  bgcolor: themeTokens.tabPillBg,
                  border: "1px solid",
                  borderColor: themeTokens.tabPillBorder,
                  borderBottom: "2px solid #107C41",
                  px: 1.5,
                  py: 0.2,
                  borderRadius: "3px 3px 0 0",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  color: themeTokens.tabPillText,
               }}
            >
               Sheet1
            </Box>
            <Typography
               variant="caption"
               sx={{ fontSize: "0.68rem", color: themeTokens.subTextColor }}
            >
               Ready • 100% Zoom
            </Typography>
         </Box>
      </Paper>
   );
}
