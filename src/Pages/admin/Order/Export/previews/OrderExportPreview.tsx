"use client";

import React, { useState, useMemo } from "react";
import {
   Box,
   Stack,
   Typography,
   Chip,
   IconButton,
   Tooltip,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { ExportColumn, SummaryRowItem } from "@src/lib/exportEngine";
import {
   DocumentPreviewTheme,
   ExportFormat,
   NormalizedOrderRow,
   StoreInfo,
} from "../types/export.types";
import OrderExcelPreview from "./OrderExcelPreview";
import OrderCsvPreview from "./OrderCsvPreview";
import OrderWordPreview from "./OrderWordPreview";

export interface OrderExportPreviewProps {
   format: ExportFormat;
   fileName: string;
   documentTitle?: string;
   columns: ExportColumn[];
   data: NormalizedOrderRow[];
   summaryRows: SummaryRowItem[];
   storeInfo?: StoreInfo;
}

export const OrderExportPreview: React.FC<OrderExportPreviewProps> = ({
   format,
   fileName,
   documentTitle = "DevX POS - Orders Export",
   columns,
   data,
   summaryRows,
   storeInfo,
}) => {
   const [csvPreviewTab, setCsvPreviewTab] = useState<"raw" | "grid">("raw");
   const [previewTheme, setPreviewTheme] = useState<DocumentPreviewTheme>("light");

   const previewRows = useMemo(() => data.slice(0, 5), [data]);
   const remainingCount = Math.max(0, data.length - previewRows.length);

   if (columns.length === 0) {
      return (
         <Stack
            alignItems="center"
            justifyContent="center"
            height={200}
            spacing={1}
            border={1}
            borderColor="divider"
            borderRadius={1}
            bgcolor="background.default"
         >
            <Icon icon="solar:danger-circle-bold" size="medium" color="warning" />
            <Typography variant="body2" color="text.secondary">
               No fields selected. Please select at least one field to preview.
            </Typography>
         </Stack>
      );
   }

   return (
      <Stack spacing={1}>
         {/* Live Preview Header Toolbar */}
         <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
            flexWrap="wrap"
         >
            <Stack direction="row" alignItems="center" spacing={1}>
               <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  Live Preview ({columns.length} columns · {data.length} records)
               </Typography>
               <Chip
                  size="small"
                  label={`Showing ${previewRows.length} of ${data.length}`}
                  variant="outlined"
                  sx={{ fontSize: "0.75rem", height: 22 }}
               />
            </Stack>

            {/* Light / Dark Preview Theme Toggle */}
            <Stack direction="row" spacing={0.75} alignItems="center">
               <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, display: { xs: "none", sm: "inline" } }}
               >
                  Theme:
               </Typography>
               <Box
                  sx={{
                     display: "inline-flex",
                     alignItems: "center",
                     p: 0.3,
                     borderRadius: 1.25,
                     bgcolor: "action.hover",
                     border: 1,
                     borderColor: "divider",
                     gap: 0.25,
                  }}
                  role="radiogroup"
                  aria-label="Preview Theme"
               >
                  <Tooltip title="Preview Light Theme" arrow>
                     <IconButton
                        size="small"
                        role="radio"
                        aria-checked={previewTheme === "light"}
                        aria-label="Preview Light Theme"
                        onClick={() => setPreviewTheme("light")}
                        sx={{
                           p: 0.5,
                           borderRadius: 1,
                           bgcolor:
                              previewTheme === "light"
                                 ? "background.paper"
                                 : "transparent",
                           color:
                              previewTheme === "light"
                                 ? "warning.main"
                                 : "text.secondary",
                           boxShadow:
                              previewTheme === "light"
                                 ? "0 1px 3px rgba(0,0,0,0.12)"
                                 : "none",
                           transition: "all 0.15s ease",
                           "&:hover": {
                              bgcolor:
                                 previewTheme === "light"
                                    ? "background.paper"
                                    : "action.selected",
                           },
                        }}
                     >
                        <Icon icon="solar:sun-bold" size="small" />
                     </IconButton>
                  </Tooltip>

                  <Tooltip title="Preview Dark Theme" arrow>
                     <IconButton
                        size="small"
                        role="radio"
                        aria-checked={previewTheme === "dark"}
                        aria-label="Preview Dark Theme"
                        onClick={() => setPreviewTheme("dark")}
                        sx={{
                           p: 0.5,
                           borderRadius: 1,
                           bgcolor:
                              previewTheme === "dark"
                                 ? "background.paper"
                                 : "transparent",
                           color:
                              previewTheme === "dark"
                                 ? "primary.main"
                                 : "text.secondary",
                           boxShadow:
                              previewTheme === "dark"
                                 ? "0 1px 3px rgba(0,0,0,0.12)"
                                 : "none",
                           transition: "all 0.15s ease",
                           "&:hover": {
                              bgcolor:
                                 previewTheme === "dark"
                                    ? "background.paper"
                                    : "action.selected",
                           },
                        }}
                     >
                        <Icon icon="solar:moon-bold" size="small" />
                     </IconButton>
                  </Tooltip>
               </Box>
            </Stack>
         </Stack>

         {/* Format-Specific Visual Preview */}
         <Box sx={{ width: "100%", minWidth: 0 }}>
            {format === "excel" && (
               <OrderExcelPreview
                  fileName={fileName}
                  documentTitle={documentTitle}
                  columns={columns}
                  previewRows={previewRows}
                  totalCount={data.length}
                  summaryRows={summaryRows}
                  storeInfo={storeInfo}
                  previewTheme={previewTheme}
               />
            )}

            {format === "csv" && (
               <OrderCsvPreview
                  fileName={fileName}
                  columns={columns}
                  previewRows={previewRows}
                  csvPreviewTab={csvPreviewTab}
                  onChangeCsvTab={setCsvPreviewTab}
                  previewTheme={previewTheme}
               />
            )}

            {format === "word" && (
               <OrderWordPreview
                  fileName={fileName}
                  documentTitle={documentTitle}
                  columns={columns}
                  previewRows={previewRows}
                  totalCount={data.length}
                  summaryRows={summaryRows}
                  storeInfo={storeInfo}
                  previewTheme={previewTheme}
               />
            )}
         </Box>

         {remainingCount > 0 && (
            <Typography
               variant="caption"
               color="text.secondary"
               sx={{ display: "block", mt: 0.5, textAlign: "right" }}
            >
               + {remainingCount} more selected order
               {remainingCount > 1 ? "s" : ""} will be included in the final downloaded file
            </Typography>
         )}
      </Stack>
   );
};

export default OrderExportPreview;
