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
import { ProductExportConfig, NormalizedProduct } from "../types/export.types";
import { formatCellValue } from "../utils/exportFormatters";
import {
   resolveHeaderColors,
   resolveBorderStyles,
   getDocumentThemeStyles,
} from "../utils/exportHelpers";
import { getColField } from "@src/lib/exportEngine";

export interface WordPreviewProps {
   config: ProductExportConfig;
   previewData: NormalizedProduct[];
   totalUnits: number;
   totalCount: number;
}

export default function WordPreview({
   config,
   previewData,
   totalUnits,
   totalCount,
}: WordPreviewProps) {
   const themeStyles = getDocumentThemeStyles(config.documentTheme).word;
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
                  Word Document — {config.fileName}
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
               maxHeight: 320,
            }}
         >
            <Paper
               elevation={3}
               sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: 1,
                  bgcolor: themeStyles.paperBg,
                  color: themeStyles.textColor,
                  minWidth: 540,
               }}
            >
               {/* Word Document Header (Branding & Titles) */}
               <Stack spacing={0.5} alignItems="center" mb={2}>
                  {config.includeLogo && config.storeInfo.logoUrl && (
                     <Box
                        component="img"
                        src={config.storeInfo.logoUrl}
                        alt={config.storeInfo.name}
                        sx={{
                           maxHeight: 36,
                           maxWidth: 140,
                           mb: 0.5,
                        }}
                     />
                  )}

                  {config.includeCompanyName && (
                     <Typography
                        variant="h6"
                        fontWeight={800}
                        textAlign="center"
                        sx={{ letterSpacing: 0.5, color: themeStyles.textColor }}
                     >
                        {config.storeInfo.name}
                     </Typography>
                  )}

                  {config.includeContact && (
                     <Typography
                        variant="caption"
                        textAlign="center"
                        sx={{ color: themeStyles.secondaryTextColor }}
                     >
                        {[
                           config.storeInfo.phone && `Tel: ${config.storeInfo.phone}`,
                           config.storeInfo.email && `Email: ${config.storeInfo.email}`,
                           config.storeInfo.address && config.storeInfo.address,
                        ]
                           .filter(Boolean)
                           .join(" | ")}
                     </Typography>
                  )}

                  <Typography
                     variant="subtitle1"
                     fontWeight={700}
                     textAlign="center"
                     mt={0.5}
                     sx={{ color: themeStyles.textColor }}
                  >
                     {config.documentTitle || "Product Inventory"}
                  </Typography>

                  <Typography
                     variant="caption"
                     fontStyle="italic"
                     textAlign="center"
                     sx={{ color: themeStyles.secondaryTextColor }}
                  >
                     {config.includeDate
                        ? `Generated on ${todayStr} by DevX POS | Scope: Selected Products (${totalCount} items)`
                        : `Scope: Selected Products (${totalCount} items)`}
                  </Typography>
               </Stack>

               {/* Word Formatted Table */}
               <Table
                  size="small"
                  sx={{
                     border: borderStyles.tableBorder,
                     borderCollapse: "collapse",
                  }}
               >
                  <TableHead>
                     <TableRow>
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
                  </TableHead>
                  <TableBody>
                     {previewData.map((p, rIdx) => {
                        const isZebra = rIdx % 2 === 1;
                        return (
                           <TableRow
                              key={p.customId || rIdx}
                              sx={{
                                 bgcolor: isZebra ? themeStyles.zebraBg : "transparent",
                              }}
                           >
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
                                          color: themeStyles.textColor,
                                          border: borderStyles.cellBorder,
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

                     {/* Word Totals Row */}
                     <TableRow>
                        <TableCell
                           colSpan={config.columns.length - 2}
                           sx={{
                              textAlign: "right",
                              fontWeight: 700,
                              fontSize: "0.72rem",
                              py: 0.75,
                              color: themeStyles.textColor,
                              borderTop: `1px solid ${themeStyles.summaryBorder}`,
                           }}
                        >
                           Total Units in Selection:
                        </TableCell>
                        <TableCell
                           colSpan={2}
                           sx={{
                              textAlign: "left",
                              fontWeight: 800,
                              color: "primary.main",
                              fontSize: "0.75rem",
                              py: 0.75,
                              borderTop: `1px solid ${themeStyles.summaryBorder}`,
                           }}
                        >
                           {totalUnits} units
                        </TableCell>
                     </TableRow>
                  </TableBody>
               </Table>

               {/* Word Signatures Preview Section */}
               <Grid container spacing={2} sx={{ mt: 3, pt: 1 }}>
                  <Grid size={{ xs: 6 }}>
                     <Typography
                        variant="caption"
                        sx={{ color: themeStyles.secondaryTextColor }}
                     >
                        _______________________________
                     </Typography>
                     <Typography
                        variant="caption"
                        fontWeight={700}
                        display="block"
                        sx={{ color: themeStyles.textColor }}
                     >
                        Prepared By / Inventory Officer
                     </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }} sx={{ textAlign: "right" }}>
                     <Typography
                        variant="caption"
                        sx={{ color: themeStyles.secondaryTextColor }}
                     >
                        _______________________________
                     </Typography>
                     <Typography
                        variant="caption"
                        fontWeight={700}
                        display="block"
                        sx={{ color: themeStyles.textColor }}
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
