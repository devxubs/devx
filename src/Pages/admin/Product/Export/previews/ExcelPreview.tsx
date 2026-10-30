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
import { ProductExportConfig, NormalizedProduct } from "../types/export.types";
import { formatCellValue } from "../utils/exportFormatters";
import {
   resolveHeaderColors,
   resolveBorderStyles,
   getDocumentThemeStyles,
} from "../utils/exportHelpers";
import { getColField } from "@src/lib/exportEngine";

export interface ExcelPreviewProps {
   config: ProductExportConfig;
   previewData: NormalizedProduct[];
   totalUnits: number;
   totalCount: number;
}

export default function ExcelPreview({
   config,
   previewData,
   totalUnits,
   totalCount,
}: ExcelPreviewProps) {
   const themeStyles = getDocumentThemeStyles(config.documentTheme).excel;
   const headerColors = resolveHeaderColors(config.headerStyle);
   const borderStyles = resolveBorderStyles(config.borderStyle, config.documentTheme);
   const todayStr = new Date().toISOString().split("T")[0];

   return (
      <Paper
         variant="outlined"
         sx={{
            borderRadius: 1.5,
            overflow: "hidden",
            border: 1,
            borderColor: themeStyles.outerBorder,
            bgcolor: themeStyles.outerBg,
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
                  Excel Worksheet — {config.fileName}
               </Typography>
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: "0.7rem" }}>
               Sheet1 • {totalCount} Rows • Grid: ON
            </Typography>
         </Box>

         {/* Excel Scrollable Worksheet Viewport */}
         <Box sx={{ overflowX: "auto", maxHeight: 300 }}>
            <Table
               size="small"
               sx={{
                  borderCollapse: "collapse",
                  fontFamily: "Aptos, Calibri, Arial, sans-serif",
                  fontSize: "0.75rem",
                  bgcolor: themeStyles.tableBg,
               }}
            >
               {/* Excel Coordinate Headers (A, B, C, D...) */}
               <TableHead>
                  <TableRow sx={{ bgcolor: themeStyles.coordinateBg }}>
                     <TableCell
                        sx={{
                           width: 32,
                           p: "4px 8px",
                           textAlign: "center",
                           border: "1px solid",
                           borderColor: themeStyles.coordinateBorder,
                           color: "text.secondary",
                           fontWeight: 700,
                           fontSize: "0.7rem",
                        }}
                     >
                        #
                     </TableCell>
                     {config.columns.map((col, idx) => (
                        <TableCell
                           key={col.field}
                           sx={{
                              p: "4px 8px",
                              textAlign: "center",
                              border: "1px solid",
                              borderColor: themeStyles.coordinateBorder,
                              color: "text.secondary",
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              minWidth: col.width ? col.width * 7 : 80,
                           }}
                        >
                           {String.fromCharCode(65 + idx)} ({col.headerName})
                        </TableCell>
                     ))}
                  </TableRow>
               </TableHead>

               <TableBody>
                  {/* Row 1: Merged Company Name */}
                  {config.includeCompanyName && (
                     <TableRow>
                        <TableCell
                           sx={{
                              textAlign: "center",
                              bgcolor: themeStyles.coordinateBg,
                              border: "1px solid",
                              borderColor: themeStyles.coordinateBorder,
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              color: "text.secondary",
                           }}
                        >
                           1
                        </TableCell>
                        <TableCell
                           colSpan={config.columns.length}
                           sx={{
                              bgcolor: themeStyles.companyBg,
                              color: themeStyles.companyColor,
                              textAlign: "center",
                              fontWeight: 700,
                              fontSize: "0.95rem",
                              py: 0.75,
                              border: `1px solid ${themeStyles.companyBorder}`,
                           }}
                        >
                           {config.storeInfo.name}
                        </TableCell>
                     </TableRow>
                  )}

                  {/* Row 2: Merged Document Title */}
                  <TableRow>
                     <TableCell
                        sx={{
                           textAlign: "center",
                           bgcolor: themeStyles.coordinateBg,
                           border: "1px solid",
                           borderColor: themeStyles.coordinateBorder,
                           fontSize: "0.7rem",
                           fontWeight: 700,
                           color: "text.secondary",
                        }}
                     >
                        {config.includeCompanyName ? 2 : 1}
                     </TableCell>
                     <TableCell
                        colSpan={config.columns.length}
                        sx={{
                           bgcolor: themeStyles.titleBg,
                           color: themeStyles.titleColor,
                           textAlign: "center",
                           fontWeight: 700,
                           fontSize: "0.85rem",
                           py: 0.6,
                           border: `1px solid ${themeStyles.titleBorder}`,
                        }}
                     >
                        {config.documentTitle || "Product Inventory"}
                     </TableCell>
                  </TableRow>

                  {/* Row 3: Subtitle / Contact & Date */}
                  {(config.includeDate || config.includeContact) && (
                     <TableRow>
                        <TableCell
                           sx={{
                              textAlign: "center",
                              bgcolor: themeStyles.coordinateBg,
                              border: "1px solid",
                              borderColor: themeStyles.coordinateBorder,
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              color: "text.secondary",
                           }}
                        >
                           {config.includeCompanyName ? 3 : 2}
                        </TableCell>
                        <TableCell
                           colSpan={config.columns.length}
                           sx={{
                              bgcolor: themeStyles.subtitleBg,
                              color: themeStyles.subtitleColor,
                              textAlign: "center",
                              fontStyle: "italic",
                              fontSize: "0.7rem",
                              py: 0.4,
                              border: `1px solid ${themeStyles.subtitleBorder}`,
                           }}
                        >
                           {[
                              config.includeDate && `Exported on ${todayStr}`,
                              config.includeContact &&
                                 config.storeInfo.phone &&
                                 `Tel: ${config.storeInfo.phone}`,
                              config.includeContact &&
                                 config.storeInfo.email &&
                                 `Email: ${config.storeInfo.email}`,
                              config.includeContact &&
                                 config.storeInfo.address &&
                                 config.storeInfo.address,
                           ]
                              .filter(Boolean)
                              .join(" | ")}
                        </TableCell>
                     </TableRow>
                  )}

                  {/* Column Headers Styled by headerStyle */}
                  <TableRow>
                     <TableCell
                        sx={{
                           textAlign: "center",
                           bgcolor: themeStyles.coordinateBg,
                           border: "1px solid",
                           borderColor: themeStyles.coordinateBorder,
                           fontSize: "0.7rem",
                           fontWeight: 700,
                           color: "text.secondary",
                        }}
                     >
                        H
                     </TableCell>
                     {config.columns.map((col) => (
                        <TableCell
                           key={col.field}
                           sx={{
                              bgcolor: headerColors.bg,
                              color: headerColors.text,
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
                              border: borderStyles.headerBorder,
                           }}
                        >
                           {col.headerName}
                        </TableCell>
                     ))}
                  </TableRow>

                  {/* Actual Product Rows Styled by borderStyle */}
                  {previewData.map((p, rIdx) => {
                     const rowNum =
                        (config.includeCompanyName ? 4 : 3) +
                        (config.includeDate || config.includeContact ? 1 : 0) +
                        rIdx;
                     const isZebra = rIdx % 2 === 1;
                     return (
                        <TableRow
                           key={p.customId || rIdx}
                           sx={{
                              bgcolor: isZebra ? themeStyles.zebraBg : "transparent",
                           }}
                        >
                           <TableCell
                              sx={{
                                 textAlign: "center",
                                 bgcolor: themeStyles.coordinateBg,
                                 border: "1px solid",
                                 borderColor: themeStyles.coordinateBorder,
                                 fontSize: "0.7rem",
                                 fontWeight: 600,
                                 color: "text.secondary",
                              }}
                           >
                              {rowNum}
                           </TableCell>
                           {config.columns.map((col) => {
                              const rawVal = (p as any)[getColField(col)];
                              const formatted = formatCellValue(col, rawVal, p);
                              return (
                                 <TableCell
                                    key={col.field}
                                    sx={{
                                       py: 0.5,
                                       px: 1,
                                       fontSize: "0.73rem",
                                       border: borderStyles.cellBorder,
                                       color: themeStyles.textColor,
                                       fontFamily:
                                          col.field === "customId"
                                             ? "monospace"
                                             : "inherit",
                                       textAlign:
                                          col.type === "currency" ||
                                          col.type === "number"
                                             ? "right"
                                             : col.type === "date"
                                               ? "center"
                                               : "left",
                                       fontWeight:
                                          col.field === "productName"
                                             ? 600
                                             : 400,
                                    }}
                                 >
                                    {col.field === "stockValue" ? (
                                       <Chip
                                          label={formatted}
                                          size="small"
                                          color={
                                             p.quantity === 0
                                                ? "error"
                                                : p.quantity <= 10
                                                  ? "warning"
                                                  : "success"
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

                  {/* Excel Summary Row */}
                  <TableRow>
                     <TableCell
                        sx={{
                           textAlign: "center",
                           bgcolor: themeStyles.coordinateBg,
                           border: "1px solid",
                           borderColor: themeStyles.coordinateBorder,
                           fontSize: "0.7rem",
                           fontWeight: 700,
                           color: "text.secondary",
                        }}
                     >
                        ∑
                     </TableCell>
                     <TableCell
                        colSpan={config.columns.length - 2}
                        sx={{
                           textAlign: "right",
                           fontWeight: 700,
                           fontSize: "0.72rem",
                           py: 0.5,
                           borderTop: `1px solid ${themeStyles.summaryBorder}`,
                           color: themeStyles.textColor,
                        }}
                     >
                        Total Units in Selection:
                     </TableCell>
                     <TableCell
                        colSpan={2}
                        sx={{
                           textAlign: "left",
                           fontWeight: 800,
                           color: themeStyles.totalColor,
                           fontSize: "0.75rem",
                           py: 0.5,
                           borderTop: `1px solid ${themeStyles.summaryBorder}`,
                           borderBottom: `3px double ${themeStyles.totalColor}`,
                        }}
                     >
                        {totalUnits} units ({totalCount} items)
                     </TableCell>
                  </TableRow>
               </TableBody>
            </Table>
         </Box>

         {/* Excel Tab Bar Footer */}
         <Box
            sx={{
               bgcolor: themeStyles.tabBarBg,
               borderTop: 1,
               borderColor: themeStyles.tabBarBorder,
               px: 1.5,
               py: 0.5,
               display: "flex",
               alignItems: "center",
               gap: 1,
            }}
         >
            <Box
               sx={{
                  bgcolor: themeStyles.tabPillBg,
                  border: "1px solid",
                  borderColor: themeStyles.tabPillBorder,
                  borderBottom: "2px solid #107C41",
                  px: 1.5,
                  py: 0.2,
                  borderRadius: "3px 3px 0 0",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  color: themeStyles.textColor,
               }}
            >
               Sheet1
            </Box>
            <Typography
               variant="caption"
               color="text.secondary"
               sx={{ fontSize: "0.68rem" }}
            >
               Ready • 100% Zoom
            </Typography>
         </Box>
      </Paper>
   );
}
