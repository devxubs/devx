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
import { ProductExportConfig, NormalizedProduct } from "../types/export.types";
import { formatCellValue, generateRawCsvString } from "../utils/exportFormatters";
import { getColField } from "@src/lib/exportEngine";

export interface CsvPreviewProps {
   config: ProductExportConfig;
   previewData: NormalizedProduct[];
   csvPreviewTab: "raw" | "grid";
   onChangeCsvTab: (tab: "raw" | "grid") => void;
}

export default function CsvPreview({
   config,
   previewData,
   csvPreviewTab,
   onChangeCsvTab,
}: CsvPreviewProps) {
   const rawCsvString = useMemo(() => {
      return generateRawCsvString(config.columns, previewData);
   }, [config.columns, previewData]);

   return (
      <Paper
         variant="outlined"
         sx={{
            borderRadius: 1.5,
            overflow: "hidden",
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
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
                  CSV Stream — {config.fileName}
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
                  }}
               >
                  Plain Grid View
               </Button>
            </Stack>
         </Box>

         {/* CSV Content Viewport */}
         <Box sx={{ p: 1.5, maxHeight: 260, overflowY: "auto" }}>
            {csvPreviewTab === "raw" ? (
               <Box
                  component="pre"
                  sx={{
                     m: 0,
                     p: 1.5,
                     borderRadius: 1,
                     bgcolor: "#0F172A",
                     color: "#38BDF8",
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
               <Table
                  size="small"
                  sx={{
                     borderCollapse: "collapse",
                     bgcolor: "background.paper",
                  }}
               >
                  <TableHead>
                     <TableRow>
                        {config.columns.map((col) => (
                           <TableCell
                              key={col.field}
                              sx={{
                                 fontWeight: 700,
                                 fontSize: "0.72rem",
                                 border: "1px solid #CBD5E1",
                                 py: 0.5,
                                 px: 1,
                              }}
                           >
                              {col.headerName}
                           </TableCell>
                        ))}
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {previewData.map((p, rIdx) => (
                        <TableRow key={p.customId || rIdx}>
                           {config.columns.map((col) => (
                              <TableCell
                                 key={col.field}
                                 sx={{
                                    fontSize: "0.72rem",
                                    border: "1px solid #E2E8F0",
                                    py: 0.4,
                                    px: 1,
                                 }}
                              >
                                 {formatCellValue(
                                    col,
                                    (p as any)[getColField(col)],
                                    p,
                                 )}
                              </TableCell>
                           ))}
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
            )}
         </Box>
      </Paper>
   );
}
