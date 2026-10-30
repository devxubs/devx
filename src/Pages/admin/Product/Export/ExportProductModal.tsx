"use client";

import React from "react";
import { Stack, Alert, Box, Typography, Paper } from "@mui/material";
import CustomModal from "@src/components/Modal";
import { ExportProductModalProps } from "./types/export.types";
import { useProductExport } from "./hooks/useProductExport";
import ExportHeader from "./components/ExportHeader";
import ExportFormatSelector from "./components/ExportFormatSelector";
import ExportFileNameField from "./components/ExportFileNameField";
import ExportDesignSettings from "./components/ExportDesignSettings";
import ExportBrandingSettings from "./components/ExportBrandingSettings";
import ExportActions from "./components/ExportActions";
import ProductExportPreview from "./previews/ProductExportPreview";

export default function ExportProductModal({
   open,
   onClose,
   selectedProducts = [],
}: ExportProductModalProps) {
   const {
      format,
      setFormat,
      fileName,
      handleFileNameChange,
      finalFileName,
      documentTheme,
      toggleDocumentTheme,
      documentTitle,
      setDocumentTitle,
      headerStyle,
      setHeaderStyle,
      borderStyle,
      setBorderStyle,
      includeLogo,
      setIncludeLogo,
      includeCompanyName,
      setIncludeCompanyName,
      includeContact,
      setIncludeContact,
      includeDate,
      setIncludeDate,
      csvPreviewTab,
      setCsvPreviewTab,
      normalizedProducts,
      totalUnitsInSelection,
      previewSubset,
      remainingCount,
      config,
      isExporting,
      errorMsg,
      successMsg,
      handleExport,
   } = useProductExport({ open, onClose, selectedProducts });

   return (
      <CustomModal
         open={open}
         onClose={onClose}
         title="Export Products"
         closeIcon={true}
         sx={{
            width: "95%",
            maxWidth: 840,
            maxHeight: "92vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
         }}
      >
         <Stack
            spacing={2.5}
            sx={{
               minHeight: 0,
               maxHeight: "calc(92vh - 100px)",
               overflowY: "auto",
               overflowX: "hidden",
               scrollbarWidth: "none!important",
               overscrollBehavior: "contain",

               "&::-webkit-scrollbar": {
                  width: "6px",
               },
               "&::-webkit-scrollbar-thumb": {
                  borderRadius: "8px",
                  backgroundColor: "action.disabled",
               },
            }}
         >
            {/* Feedback Alerts */}
            {errorMsg && (
               <Alert severity="error" variant="filled">
                  {errorMsg}
               </Alert>
            )}
            {successMsg && (
               <Alert severity="success" variant="filled">
                  {successMsg}
               </Alert>
            )}

            {/* A. Header */}
            <ExportHeader selectedCount={normalizedProducts.length} />

            {/* B. File Format Selector */}
            <ExportFormatSelector format={format} onSelectFormat={setFormat} />

            {/* C. File Name Configuration */}
            <ExportFileNameField
               fileName={fileName}
               finalFileName={finalFileName}
               onChangeFileName={handleFileNameChange}
            />

            {/* D. Document Design & Branding */}
            <Box>
               <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Document Design & Branding
               </Typography>

               {format === "csv" ? (
                  <Alert severity="info">
                     <Typography variant="body2" fontWeight={600}>
                        CSV Plain Tabular Format
                     </Typography>
                     <Typography variant="caption">
                        CSV is a raw text tabular format and cannot embed logos,
                        colors, fonts, or cell borders. All product records will
                        be exported directly as structured comma-separated
                        values with formula injection protection.
                     </Typography>
                  </Alert>
               ) : (
                  <Box>
                     <ExportDesignSettings
                        documentTitle={documentTitle}
                        onChangeDocumentTitle={setDocumentTitle}
                        documentTheme={documentTheme}
                        onToggleDocumentTheme={toggleDocumentTheme}
                        headerStyle={headerStyle}
                        onChangeHeaderStyle={setHeaderStyle}
                        borderStyle={borderStyle}
                        onChangeBorderStyle={setBorderStyle}
                     />
                     <ExportBrandingSettings
                        includeLogo={includeLogo}
                        onChangeIncludeLogo={setIncludeLogo}
                        includeCompanyName={includeCompanyName}
                        onChangeIncludeCompanyName={setIncludeCompanyName}
                        includeContact={includeContact}
                        onChangeIncludeContact={setIncludeContact}
                        includeDate={includeDate}
                        onChangeIncludeDate={setIncludeDate}
                     />
                  </Box>
               )}
            </Box>

            {/* E. Faithful Document Preview */}
            <ProductExportPreview
               config={config}
               previewData={previewSubset}
               totalUnits={totalUnitsInSelection}
               totalCount={normalizedProducts.length}
               remainingCount={remainingCount}
               csvPreviewTab={csvPreviewTab}
               onChangeCsvTab={setCsvPreviewTab}
            />

            {/* F. Export & Cancel Actions */}
            <ExportActions
               selectedCount={normalizedProducts.length}
               isExporting={isExporting}
               onClose={onClose}
               onExport={handleExport}
            />
         </Stack>
      </CustomModal>
   );
}
