"use client";

import React from "react";
import { Box, Stack, Typography, Chip } from "@mui/material";
import { ProductExportConfig, NormalizedProduct } from "../types/export.types";
import ExcelPreview from "./ExcelPreview";
import WordPreview from "./WordPreview";
import CsvPreview from "./CsvPreview";

export interface ProductExportPreviewProps {
   config: ProductExportConfig;
   previewData: NormalizedProduct[];
   totalUnits: number;
   totalCount: number;
   remainingCount: number;
   csvPreviewTab: "raw" | "grid";
   onChangeCsvTab: (tab: "raw" | "grid") => void;
}

export default function ProductExportPreview({
   config,
   previewData,
   totalUnits,
   totalCount,
   remainingCount,
   csvPreviewTab,
   onChangeCsvTab,
}: ProductExportPreviewProps) {
   return (
      <Box>
         {/* Format-Specific Visual Preview */}
         {config.format === "xlsx" && (
            <ExcelPreview
               config={config}
               previewData={previewData}
               totalUnits={totalUnits}
               totalCount={totalCount}
            />
         )}

         {config.format === "docx" && (
            <WordPreview
               config={config}
               previewData={previewData}
               totalUnits={totalUnits}
               totalCount={totalCount}
            />
         )}

         {config.format === "csv" && (
            <CsvPreview
               config={config}
               previewData={previewData}
               csvPreviewTab={csvPreviewTab}
               onChangeCsvTab={onChangeCsvTab}
            />
         )}

         {remainingCount > 0 && (
            <Typography
               variant="caption"
               color="text.secondary"
               sx={{ display: "block", mt: 0.75, textAlign: "right" }}
            >
               + {remainingCount} more selected product
               {remainingCount > 1 ? "s" : ""} will be included in the final downloaded file
            </Typography>
         )}
      </Box>
   );
}
