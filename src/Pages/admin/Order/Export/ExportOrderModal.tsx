import React from "react";
import { Stack, Divider, Box } from "@mui/material";
import CustomModal from "@src/components/Modal";
import { ExportOrderModalProps } from "./types/export.types";
import { useOrderExport } from "./hooks/useOrderExport";
import { ExportHeader } from "./components/ExportHeader";
import { ExportFormatSelector } from "./components/ExportFormatSelector";
import { ExportFileNameField } from "./components/ExportFileNameField";
import { ExportFieldSelector } from "./components/ExportFieldSelector";
import { OrderExportPreview } from "./previews/OrderExportPreview";
import { ExportActions } from "./components/ExportActions";

export const ExportOrderModal: React.FC<ExportOrderModalProps> = ({
   open,
   onClose,
   selectedOrders,
   onSuccess,
}) => {
   const {
      format,
      setFormat,
      fileName,
      setFileName,
      documentTitle,
      selectedFields,
      toggleField,
      selectAllFields,
      deselectAllFields,
      toggleGroup,
      isGroupAllSelected,
      isGroupIndeterminate,
      normalizedData,
      exportColumns,
      summaryRows,
      storeInfo,
      isExporting,
      errorMessage,
      executeExport,
   } = useOrderExport(selectedOrders, () => {
      onSuccess?.();
      onClose();
   });

   return (
      <CustomModal
         open={open}
         onClose={onClose}
         title="Export Selected Orders"
         closeIcon
         sx={{
            width: {
               xs: "calc(100% - 24px)",
               sm: "90%",
               md: 920,
            },
            maxWidth: "920px",
            height: "90dvh",
            maxHeight: "900px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
         }}
      >
         <Box
            sx={{
               height: "100%",
               minHeight: 0,
               overflowY: "auto",
               overflowX: "hidden",
               overscrollBehavior: "contain",
               WebkitOverflowScrolling: "touch",
               scrollbarWidth: "none!important",
            }}
         >
            <Stack
               spacing={{ xs: 2.5, sm: 3 }}
               sx={{
                  p: { xs: 2, sm: 2.5, md: 3 },
                  minWidth: 0,
               }}
            >
               {/* Export Header */}
               <ExportHeader selectedCount={selectedOrders.length} />

               {/* Format Selection */}
               <ExportFormatSelector
                  format={format}
                  onFormatChange={setFormat}
               />

               {/* File Name */}
               <ExportFileNameField
                  fileName={fileName}
                  format={format}
                  onFileNameChange={setFileName}
               />

               {/* Grouped Field Selection */}
               <ExportFieldSelector
                  selectedFields={selectedFields}
                  onToggleField={toggleField}
                  onToggleGroup={toggleGroup}
                  onSelectAll={selectAllFields}
                  onDeselectAll={deselectAllFields}
                  isGroupAllSelected={isGroupAllSelected}
                  isGroupIndeterminate={isGroupIndeterminate}
               />

               {/* Live Data Preview */}
               <Box
                  sx={{
                     width: "100%",
                     minWidth: 0,
                     overflowX: "auto",
                  }}
               >
                  <OrderExportPreview
                     format={format}
                     fileName={fileName}
                     documentTitle={documentTitle}
                     columns={exportColumns}
                     data={normalizedData}
                     summaryRows={summaryRows}
                     storeInfo={storeInfo}
                  />
               </Box>

               {/* Export Actions */}
               <ExportActions
                  format={format}
                  isExporting={isExporting}
                  errorMessage={errorMessage}
                  onCancel={onClose}
                  onExport={executeExport}
               />
            </Stack>
         </Box>
      </CustomModal>
   );
};

export default ExportOrderModal;
