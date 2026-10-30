"use client";

import React, { useState } from "react";
import {
   Button,
   IconButton,
   Tooltip,
   Menu,
   MenuItem,
   ListItemIcon,
   ListItemText,
   Dialog,
   DialogTitle,
   DialogContent,
   DialogActions,
   RadioGroup,
   FormControlLabel,
   Radio,
   Stack,
   Typography,
   Box,
   CircularProgress,
   Divider,
   Paper,
} from "@mui/material";
import Icon from "./Icon";
import CustomModal from "./Modal";
import {
   exportToExcel,
   exportToWord,
   exportToCsv,
   ExportColumn,
   SummaryRowItem,
} from "@src/lib/exportEngine";
import { useSettings } from "@src/lib/settingsContext";

export interface ExportButtonProps {
   entityName?: string;
   filename?: string;
   title?: string;
   columns: ExportColumn[];
   getCurrentPageData?: () => any[];
   currentPageData?: any[];
   selectedData?: any[];
   defaultScope?: "selected" | "page" | "all";
   fetchAllData?: () => Promise<any[]>;
   totalMatchingCount?: number;
   variant?: "button" | "icon" | "outlined" | "contained";
   color?: "primary" | "inherit" | "secondary" | "info";
   size?: "small" | "medium";
   label?: string;
   tooltip?: string;
   subtitle?: string;
   summaryRows?: SummaryRowItem[] | ((data: any[]) => SummaryRowItem[]);
   sx?: any;
}

export default function ExportButton({
   entityName,
   filename: customFilename,
   title: customTitle,
   columns,
   getCurrentPageData,
   currentPageData,
   selectedData,
   defaultScope,
   fetchAllData,
   totalMatchingCount,
   variant = "outlined",
   color = "inherit",
   size = "small",
   label = "Export",
   tooltip = "Export Data (Excel, Word, CSV)",
   subtitle,
   summaryRows,
   sx,
}: ExportButtonProps) {
   const { settings } = useSettings();
   const [modalOpen, setModalOpen] = useState(false);
   const [format, setFormat] = useState<"xlsx" | "docx" | "csv">("xlsx");
   const initialScope = defaultScope || (selectedData && selectedData.length > 0 ? "selected" : "page");
   const [scope, setScope] = useState<"selected" | "page" | "all">(initialScope);
   const [isExporting, setIsExporting] = useState(false);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);

   const currentPageRows = currentPageData || (getCurrentPageData ? getCurrentPageData() : []);
   const canExportAll = Boolean(fetchAllData);
   const hasSelectedData = Boolean(selectedData && selectedData.length > 0);
   const resolvedEntityName = entityName || customFilename || customTitle || "Data";

   const handleOpenModal = () => {
      setErrorMsg(null);
      if (selectedData && selectedData.length > 0) {
         setScope("selected");
      } else if (scope === "selected") {
         setScope("page");
      }
      setModalOpen(true);
   };

   const handleExecuteExport = async () => {
      setIsExporting(true);
      setErrorMsg(null);
      try {
         let dataset: any[] = [];
         if (scope === "selected") {
            if (!selectedData || selectedData.length === 0) {
               setErrorMsg("Please select records from the table to export selected.");
               setIsExporting(false);
               return;
            }
            dataset = selectedData;
         } else if (scope === "all" && fetchAllData) {
            dataset = await fetchAllData();
         } else {
            dataset = currentPageRows;
         }

         if (!dataset || dataset.length === 0) {
            setErrorMsg("No records available to export for the selected scope.");
            setIsExporting(false);
            return;
         }

         const dateStr = new Date().toISOString().split("T")[0];
         const scopeTag = scope === "selected" ? "Selected" : scope === "all" ? "All" : "Page";
         const filename = customFilename ? `${customFilename}_${scopeTag}` : `${resolvedEntityName}_${scopeTag}_${dateStr}`;
         const exportTitle = customTitle || `${resolvedEntityName} Data Export`;
         const scopeDesc = scope === "selected" ? `Selected Records (${dataset.length} records)` : scope === "all" ? `All Matching Records (${dataset.length} records)` : `Current Page (${dataset.length} records)`;
         const exportSubtitle = subtitle || `Generated on ${new Date().toLocaleString()} | Scope: ${scopeDesc}`;
         const evaluatedSummary = typeof summaryRows === "function" ? summaryRows(dataset) : summaryRows;

         const companyInfo = {
            name: settings?.storeName,
            phone: settings?.phone,
            email: settings?.email,
            address: settings?.address,
            logoUrl: settings?.logoUrl,
         };

         if (format === "xlsx") {
            await exportToExcel({
               filename,
               title: exportTitle,
               subtitle: exportSubtitle,
               columns,
               data: dataset,
               summaryRows: evaluatedSummary,
               companyInfo,
            });
         } else if (format === "docx") {
            await exportToWord({
               filename,
               title: exportTitle,
               subtitle: exportSubtitle,
               columns,
               data: dataset,
               summaryRows: evaluatedSummary,
               companyInfo,
            });
         } else if (format === "csv") {
            exportToCsv({
               filename,
               columns,
               data: dataset,
            });
         }

         setModalOpen(false);
      } catch (err: any) {
         setErrorMsg(err.message || "Failed to generate export file.");
      } finally {
         setIsExporting(false);
      }
   };

   return (
      <>
         {variant === "icon" ? (
            <Tooltip title={tooltip} disableInteractive>
               <IconButton
                  size={size}
                  color={color as any}
                  onClick={handleOpenModal}
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, ...sx }}
               >
                  <Icon icon="solar:download-square-bold-duotone" size={size === "small" ? "small" : "medium"} />
               </IconButton>
            </Tooltip>
         ) : (
            <Button
               variant={variant === "button" ? "outlined" : variant}
               color={color as any}
               size={size}
               startIcon={<Icon icon="solar:download-square-bold-duotone" size="small" />}
               onClick={handleOpenModal}
               sx={{ whiteSpace: "nowrap", ...sx }}
            >
               {label}
            </Button>
         )}

         {/* Export Configuration Modal */}
         <CustomModal
            open={modalOpen}
            onClose={() => !isExporting && setModalOpen(false)}
            title={`Export ${resolvedEntityName} Records`}
            sx={{ width: { xs: "90%", sm: 480 }, p: 0, borderRadius: 2 }}
         >
            <Stack spacing={2.5} sx={{ p: 2.5 }}>
               {/* 1. Format Selection */}
               <Box>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                     1. Choose File Format:
                  </Typography>
                  <Stack direction="row" spacing={1.5} mt={1}>
                     {[
                        {
                           type: "xlsx" as const,
                           title: "Excel",
                           ext: ".xlsx",
                           icon: "vscode-icons:file-type-excel",
                           desc: "Full Spreadsheet",
                        },
                        {
                           type: "docx" as const,
                           title: "Word",
                           ext: ".docx",
                           icon: "vscode-icons:file-type-word",
                           desc: "Editable Document",
                        },
                        {
                           type: "csv" as const,
                           title: "CSV",
                           ext: ".csv",
                           icon: "solar:document-text-bold",
                           desc: "Standard Tabular",
                        },
                     ].map((fmt) => (
                        <Paper
                           key={fmt.type}
                           variant="outlined"
                           onClick={() => setFormat(fmt.type)}
                           sx={{
                              flex: 1,
                              p: 1.5,
                              cursor: "pointer",
                              textAlign: "center",
                              borderRadius: 2,
                              transition: "all 0.2s",
                              borderColor: format === fmt.type ? "primary.main" : "divider",
                              bgcolor: format === fmt.type ? "action.selected" : "background.paper",
                              borderWidth: format === fmt.type ? 2 : 1,
                           }}
                        >
                           <Icon icon={fmt.icon} size="large" />
                           <Typography variant="body2" fontWeight={700} mt={0.5}>
                              {fmt.title}
                           </Typography>
                           <Typography variant="caption" color="text.secondary">
                              {fmt.ext}
                           </Typography>
                        </Paper>
                     ))}
                  </Stack>
               </Box>

               <Divider />

               {/* 2. Scope Selection */}
               <Box>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                     2. Select Records Scope:
                  </Typography>
                  <RadioGroup value={scope} onChange={(e) => setScope(e.target.value as any)}>
                     {hasSelectedData && (
                        <Paper
                           variant="outlined"
                           sx={{
                              p: 1.5,
                              mb: 1,
                              borderRadius: 1.5,
                              borderColor: scope === "selected" ? "primary.main" : "divider",
                              bgcolor: scope === "selected" ? "action.hover" : "transparent",
                           }}
                        >
                           <FormControlLabel
                              value="selected"
                              control={<Radio size="small" />}
                              label={
                                 <Box>
                                    <Typography variant="body2" fontWeight={600} color="primary.main">
                                       Export Selected Records Only ({selectedData?.length} selected)
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                       Downloads strictly the {selectedData?.length} checked rows from the table
                                    </Typography>
                                 </Box>
                              }
                           />
                        </Paper>
                     )}

                     <Paper
                        variant="outlined"
                        sx={{
                           p: 1.5,
                           mb: 1,
                           borderRadius: 1.5,
                           borderColor: scope === "page" ? "primary.main" : "divider",
                        }}
                     >
                        <FormControlLabel
                           value="page"
                           control={<Radio size="small" />}
                           label={
                              <Box>
                                 <Typography variant="body2" fontWeight={600}>
                                    Export Current Page Only
                                 </Typography>
                                 <Typography variant="caption" color="text.secondary">
                                    Downloads the currently visible {currentPageRows.length} records
                                 </Typography>
                              </Box>
                           }
                        />
                     </Paper>

                     {canExportAll && (
                        <Paper
                           variant="outlined"
                           sx={{
                              p: 1.5,
                              borderRadius: 1.5,
                              borderColor: scope === "all" ? "primary.main" : "divider",
                           }}
                        >
                           <FormControlLabel
                              value="all"
                              control={<Radio size="small" />}
                              label={
                                 <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                       Export All Matching Records
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                       Downloads all authorized records matching active filters {totalMatchingCount ? `(approx ${totalMatchingCount.toLocaleString()} total)` : ""}
                                    </Typography>
                                 </Box>
                              }
                           />
                        </Paper>
                     )}
                  </RadioGroup>
               </Box>

               {errorMsg && (
                  <Typography variant="caption" color="error" fontWeight={600}>
                     {errorMsg}
                  </Typography>
               )}

               <Divider />

               {/* Actions */}
               <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button onClick={() => setModalOpen(false)} disabled={isExporting} color="inherit">
                     Cancel
                  </Button>
                  <Button
                     variant="contained"
                     color="primary"
                     onClick={handleExecuteExport}
                     disabled={isExporting}
                     startIcon={isExporting ? <CircularProgress size={16} color="inherit" /> : <Icon icon="solar:download-square-bold-duotone" size="small" />}
                  >
                     {isExporting ? "Generating..." : `Download .${format.toUpperCase()}`}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>
      </>
   );
}
