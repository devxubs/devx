"use client";

import {
   Stack,
   Chip,
   FormControl,
   InputAdornment,
   TextField,
   Typography,
   alpha,
   useTheme,
   Button,
   useMediaQuery,
   IconButton,
   Tooltip,
   Menu,
   MenuItem,
   ListItemIcon,
   ListItemText,
} from "@mui/material";

import React, { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import ExportButton from "../ExportButton";
import { ExportColumn, SummaryRowItem } from "@src/lib/exportEngine";
import dayjs from "dayjs";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { usePrint } from "../TablePrintDocument/PrintPortal";
import { useSettings } from "@src/lib/settingsContext";
import { TablePrintConfig } from "./index";

export type OrderFilter = {
   order_created_at?: [Date | null, Date | null];
   courier_submitted_at?: [Date | null, Date | null];
   status_added_at?: [Date | null, Date | null];
   employee?: string;
   employeeAction?: string;
   status?: string;
   excludeStatus?: boolean;
   order_source?: string;
   excludeOrderSource?: boolean;
   orderTag?: string;
   customerTag?: string;
   customerType?: string;
   courier?: string;
   excludeCourier?: boolean;
   courierStatus?: string;
   excludeCourierStatus?: boolean;
   courierPerformance?: string;
   courierCharged?: string;
   deliveryCharge?: string;
   codChanged?: string;
   category?: string;
   excludeCategory?: boolean;
   products?: string;
   excludeProduct?: boolean;
   district?: string;
   excludeDistrict?: boolean;
   paymentStatus?: string;
   orderType?: string;
   stockAvailability?: string;
   website?: string;
   print_status?: string;
   courierMark?: string;
   pathaoCity?: string;
   pathaoZone?: string;
   cancelReason?: string;
   emailStatus?: string;
   bdMobileNumber?: string;
   utmSource?: string;
   excludeUtmSource?: boolean;
   minPrice?: string;
   maxPrice?: string;
   itemQty?: string;
   itemQtyOp?: string;
   urlUtm?: string;
   referenceId?: string;
   discountAmount?: string;
   discountOp?: string;
   note?: string;
   duplicateOrders?: boolean;
};

export type FilterData = {
   userRole?: string;
   productStock?: string;
   searchText?: string;
   orderData?: OrderFilter;
   reportData?: {
      report_type?:
         | "default"
         | "sales"
         | "couriers"
         | "purchases"
         | "inventory"
         | "customers"
         | "expenses"
         | "suppliers"
         | "employees"
         | "products";
      date?: [Date | null, Date | null];
      product?: null | string;
   };
};

export type ExportTableConfig = {
   filename?: string;
   title?: string;
   fetchAllData?: () => Promise<any[]>;
   totalMatchingCount?: number;
   summaryRows?: (data: any[]) => SummaryRowItem[];
};

type FilterProps = {
   customFilter?: (
      data: FilterData,
      onChange: (data: FilterData) => void,
   ) => React.ReactNode;
   rows?: any[];
   columns?: any[];
   exportConfig?: ExportTableConfig;
   canPrint?: boolean;
   canExport?: boolean;
   printConfig?: TablePrintConfig;
   selectedRows?: any[];
   onClearSelection?: () => void;
   onToggleSelectAll?: () => void;
   isAllSelected?: boolean;
   hideSelectionToolbar?: boolean;
   showSelectionIndicators?: boolean;
   customSelectionToolbar?: (
      selectedRows: any[],
      onClearSelection?: () => void,
   ) => React.ReactNode;
};

const Filter: React.FC<FilterProps> = ({
   customFilter,
   rows,
   columns,
   exportConfig,
   canPrint = false,
   canExport,
   printConfig,
   selectedRows = [],
   onClearSelection,
   onToggleSelectAll,
   isAllSelected = false,
   hideSelectionToolbar = false,
   showSelectionIndicators = true,
   customSelectionToolbar,
}) => {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
   const { filterQueryData, setFilterQueryData } = useFilterQuery();
   const { printDocument } = usePrint();
   const { settings } = useSettings();
   const [searchText, setSearchText] = useState("");
   const [printMenuAnchor, setPrintMenuAnchor] = useState<HTMLElement | null>(null);

   const showSelection = showSelectionIndicators !== false && !hideSelectionToolbar;
   const isSelectionActive = showSelection && Boolean(selectedRows && selectedRows.length > 0);
   const resolvedCanExport = canExport !== false && (Boolean(exportConfig) || canExport === true);
   const resolvedCanPrint = Boolean(canPrint);

   const exportColumns: ExportColumn[] = useMemo(() => {
      if (!columns || !Array.isArray(columns)) return [];
      return columns
         .filter((c: any) => c.field && !c.field.startsWith("@") && c.field !== "__check__" && c.field !== "__quick_edit__")
         .map((c: any) => ({
            field: c.field,
            headerName: c.headerName || c.field,
            width: c.width || 20,
            type: (typeof c.field === "string" && (c.field.toLowerCase().includes("total") || c.field.toLowerCase().includes("price") || c.field.toLowerCase().includes("amount") || c.field.toLowerCase().includes("salary") || c.field.toLowerCase().includes("subtotal") || c.field.toLowerCase().includes("charge") || c.field.toLowerCase().includes("cost"))) ? "currency" : undefined,
         }));
   }, [columns]);

   const handlePrintSelected = (mode?: "invoices" | "register") => {
      if (!selectedRows || selectedRows.length === 0) return;

      const evaluatedSummary = exportConfig?.summaryRows
         ? typeof exportConfig.summaryRows === "function"
            ? exportConfig.summaryRows(selectedRows)
            : exportConfig.summaryRows
         : undefined;

      if (printConfig?.isInvoiceModule && mode !== "register") {
         // Batch Invoices Mode
         const invoiceOrders = selectedRows.map((r: any) => {
            const prods = Array.isArray(r.products) ? r.products : [];
            return {
               id: String(r.id || ""),
               orderId: String(r.orderId || r.customId || r.id || ""),
               createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
               customerName: r.customer?.name || r.customerName || "Walk-in Customer",
               customerPhone: r.customer?.phone || r.customerPhone || "-",
               customerEmail: r.customer?.email || r.customerEmail || "",
               customerAddress: r.customer?.address || r.customerAddress || "-",
               items: prods.length > 0 ? prods.map((p: any) => ({
                  name: p.title || p.name || p.productName || "Product Item",
                  sku: p.sku || p.productSku || "-",
                  quantity: Number(p.quantity || 1),
                  price: Number(p.price || 0),
                  subtotal: Number(p.price || 0) * Number(p.quantity || 1),
               })) : [
                  {
                     name: `Order #${r.orderId || r.customId || r.id}`,
                     sku: "-",
                     quantity: 1,
                     price: Number(r.subtotal || r.total || 0),
                     subtotal: Number(r.subtotal || r.total || 0),
                  }
               ],
               subtotal: Number(r.subtotal || 0),
               deliveryCharge: Number(r.deliveryCharge || 0),
               discount: Number(r.discount || 0),
               tax: Number(r.tax || 0),
               total: Number(r.total || 0),
               paid: Number(r.paid || 0),
               due: Number(r.due || 0),
               paymentMethod: r.paymentMethod || "Cash On Delivery",
               status: r.status || "COMPLETED",
               notes: r.orderNote || r.notes || "",
            };
         });

         printDocument({
            title: printConfig?.title || "DevX POS - Batch Invoices",
            selectedRecords: selectedRows,
            columns: exportColumns,
            settings,
            isInvoiceBatch: true,
            invoiceOrders,
            metadata: printConfig?.metadata,
         });
      } else {
         // Tabular Register Mode
         printDocument({
            title: printConfig?.title || (exportConfig?.title || "DevX POS - Selected Records Report"),
            selectedRecords: selectedRows,
            columns: exportColumns,
            settings,
            summaryRows: evaluatedSummary,
            metadata: printConfig?.metadata,
         });
      }
   };

   useEffect(() => {
      setSearchText(filterQueryData.searchText || "");
   }, [filterQueryData.searchText]);

   const reportData = Object.entries(filterQueryData.reportData || {});

   const isActive = (val: any) => {
      if (val === undefined || val === null || val === false) return false;
      if (Array.isArray(val)) return !!(val[0] && val[1]); // Active if date range is full
      return val !== "" && val !== "All" && val !== "Any";
   };

   const activeOrderFilters = Object.entries(
      filterQueryData.orderData || {},
   ).filter(([_, v]) => isActive(v));

   const activeReportFilters = Object.entries(
      filterQueryData.reportData || {},
   ).filter(([key, value]) => key !== "report_type" && isActive(value));

   const hasAnyFilter = useMemo(() => {
      return (
         isActive(filterQueryData.searchText) ||
         isActive(filterQueryData.userRole) ||
         isActive(filterQueryData.productStock) ||
         activeOrderFilters.length > 0 ||
         activeReportFilters.length > 0
      );
   }, [filterQueryData, activeOrderFilters, activeReportFilters]);

   const handleClearAll = () => {
      setFilterQueryData({
         searchText: "",
         userRole: "",
         productStock: "",
         orderData: {},
         reportData: {
            report_type: "default",
            date: [null, null],
            product: null,
         },
      });
   };

   const renderSelectionToolbar = () => {
      if (!isSelectionActive) return null;
      if (customSelectionToolbar) {
         return customSelectionToolbar(selectedRows, onClearSelection);
      }
      return (
         <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ flexWrap: "wrap", gap: 1 }}
         >
            {/* Selection State Badge */}
            <Chip
               size="small"
               color="primary"
               label={`${selectedRows.length} selected`}
               sx={{ fontWeight: 700, borderRadius: 1 }}
            />

            {/* Deselect All Action */}
            {onClearSelection && (
               <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  onClick={onClearSelection}
                  sx={{
                     fontSize: "0.8125rem",
                     textTransform: "none",
                     whiteSpace: "nowrap",
                     fontWeight: 600,
                     "&:hover": { bgcolor: "action.hover" },
                  }}
               >
                  Deselect All
               </Button>
            )}

            {/* Export Selected (ONLY if resolvedCanExport) */}
            {resolvedCanExport && exportColumns.length > 0 && (
               <ExportButton
                  variant="button"
                  size="small"
                  label="Export selected"
                  selectedData={selectedRows}
                  defaultScope="selected"
                  filename={
                     exportConfig?.filename
                        ? `${exportConfig.filename}_Selected`
                        : `Export_Selected`
                  }
                  title={
                     exportConfig?.title
                        ? `${exportConfig.title} (Selected)`
                        : "DevX POS - Selected Records"
                  }
                  columns={exportColumns}
                  currentPageData={rows}
                  fetchAllData={exportConfig?.fetchAllData}
                  totalMatchingCount={exportConfig?.totalMatchingCount}
                  summaryRows={exportConfig?.summaryRows}
                  sx={{ textTransform: "none", fontWeight: 600 }}
               />
            )}

            {/* Print Selected (ONLY if resolvedCanPrint) */}
            {resolvedCanPrint && (
               <>
                  <Button
                     size="small"
                     variant="outlined"
                     color="primary"
                     startIcon={
                        <Icon icon="solar:printer-minimalistic-bold" size="small" />
                     }
                     endIcon={
                        printConfig?.isInvoiceModule ? (
                           <Icon icon="eva:chevron-down-fill" size="small" />
                        ) : undefined
                     }
                     onClick={(e) => {
                        if (printConfig?.isInvoiceModule) {
                           setPrintMenuAnchor(e.currentTarget);
                        } else {
                           handlePrintSelected();
                        }
                     }}
                     sx={{
                        whiteSpace: "nowrap",
                        textTransform: "none",
                        fontWeight: 600,
                     }}
                  >
                     Print selected
                  </Button>
                  {printConfig?.isInvoiceModule && (
                     <Menu
                        anchorEl={printMenuAnchor}
                        open={Boolean(printMenuAnchor)}
                        onClose={() => setPrintMenuAnchor(null)}
                     >
                        <MenuItem
                           onClick={() => {
                              setPrintMenuAnchor(null);
                              handlePrintSelected("invoices");
                           }}
                        >
                           <ListItemIcon>
                              <Icon icon="solar:document-bold" size="small" />
                           </ListItemIcon>
                           <ListItemText
                              primary={`Print Invoices (${selectedRows.length})`}
                              secondary="Formatted multi-page customer receipts"
                           />
                        </MenuItem>
                        <MenuItem
                           onClick={() => {
                              setPrintMenuAnchor(null);
                              handlePrintSelected("register");
                           }}
                        >
                           <ListItemIcon>
                              <Icon icon="solar:list-bold" size="small" />
                           </ListItemIcon>
                           <ListItemText
                              primary={`Print Orders Register (${selectedRows.length})`}
                              secondary="Summary data table with totals"
                           />
                        </MenuItem>
                     </Menu>
                  )}
               </>
            )}

            {/* Clear Selection Button */}
            {onClearSelection && (
               <Tooltip title="Clear selection">
                  <IconButton size="small" onClick={onClearSelection} color="default">
                     <Icon icon="solar:close-circle-bold" size="small" />
                  </IconButton>
               </Tooltip>
            )}
         </Stack>
      );
   };

   return (
      <Stack
         spacing={2}
         bgcolor={"background.paper"}
         borderBottom={1}
         borderColor="divider"
      >
         <Stack spacing={2} p={2} bgcolor={"background.paper"}>
            {/* TOP SEARCH + ACTIONS / SELECTION TOOLBAR */}
            <Stack
               spacing={2}
               direction="row"
               alignItems="center"
               justifyContent="space-between"
            >
               {/* Search Box */}
               <FormControl
                  variant="outlined"
                  sx={{ flex: !isMobile ? 0.35 : 1 }}
               >
                  <TextField
                     fullWidth
                     placeholder="Search"
                     size={isMobile ? "small" : "medium"}
                     value={searchText}
                     onChange={(e) => {
                        setFilterQueryData({
                           searchText: e.target.value,
                        });
                        setSearchText(e.target.value);
                     }}
                     InputProps={{
                        startAdornment: (
                           <InputAdornment position="start">
                              <Icon icon="eva:search-fill" />
                           </InputAdornment>
                        ),
                     }}
                  />
               </FormControl>

               {/* Right Side: Compact Selection Toolbar when selected, OR Normal Actions when none selected */}
               {isSelectionActive ? (
                  renderSelectionToolbar()
               ) : (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                     {/* Standard Header Actions (When 0 rows selected) */}
                     {customFilter &&
                        (customFilter(filterQueryData, (updated) => {
                           setFilterQueryData(updated);
                        }) as React.ReactElement)}
                     {resolvedCanExport && rows && rows.length > 0 && exportColumns.length > 0 && (
                        <ExportButton
                           variant="button"
                           size="small"
                           label="Export"
                           tooltip="Export Table (Excel, Word, CSV)"
                           filename={exportConfig?.filename || "DevX_Export"}
                           title={exportConfig?.title || "DevX POS - Export"}
                           columns={exportColumns}
                           currentPageData={rows}
                           fetchAllData={exportConfig?.fetchAllData}
                           totalMatchingCount={exportConfig?.totalMatchingCount}
                           summaryRows={exportConfig?.summaryRows}
                           sx={{ textTransform: "none", fontWeight: 600 }}
                        />
                     )}
                  </Stack>
               )}
            </Stack>

            {/* ACTIVE FILTER CHIPS */}
            <Stack
               direction="row"
               alignItems="flex-start"
               flexWrap="wrap"
               gap={1}
            >
               {/* Search Text */}
               {isActive(filterQueryData.searchText) && (
                  <FilterChipWrapper title="Keyword">
                     <Chip
                        label={filterQueryData.searchText}
                        size="small"
                        onDelete={() =>
                           setFilterQueryData({
                              searchText: "",
                           })
                        }
                        sx={chipStyle(theme)}
                     />
                  </FilterChipWrapper>
               )}

               {/* Product Stock */}
               {isActive(filterQueryData.productStock) && (
                  <FilterChipWrapper title="Stock">
                     <Chip
                        label={filterQueryData.productStock}
                        size="small"
                        onDelete={() =>
                           setFilterQueryData({
                              productStock: "",
                           })
                        }
                        sx={chipStyle(theme)}
                     />
                  </FilterChipWrapper>
               )}

               {/* Category Filter */}
               {isActive((filterQueryData as any).category) && (
                  <FilterChipWrapper title="Category">
                     <Chip
                        label={(filterQueryData as any).category}
                        size="small"
                        onDelete={() =>
                           setFilterQueryData({
                              category: "",
                           } as any)
                        }
                        sx={chipStyle(theme)}
                     />
                  </FilterChipWrapper>
               )}

               {/* User Role */}
               {isActive(filterQueryData.userRole) && (
                  <FilterChipWrapper title="Role">
                     <Chip
                        label={filterQueryData.userRole}
                        size="small"
                        onDelete={() =>
                           setFilterQueryData({
                              userRole: "",
                           })
                        }
                        sx={chipStyle(theme)}
                     />
                  </FilterChipWrapper>
               )}

               {/* Reports */}
               {activeReportFilters && (
                  <>
                     {reportData.map(([key], idx) => {
                        const value =
                           filterQueryData.reportData?.[
                              key as keyof typeof filterQueryData.reportData
                           ];

                        if (
                           key === "report_type" ||
                           value == null || // null or undefined
                           (Array.isArray(value) && (!value[0] || !value[1]))
                        ) {
                           return null;
                        }

                        const label =
                           key === "date" &&
                           Array.isArray(value) &&
                           value[0] !== null &&
                           value[1] !== null
                              ? `${dayjs(value[0]).format("YYYY-MM-DD")} → ${dayjs(
                                   value[1],
                                ).format("YYYY-MM-DD")}`
                              : String(value ?? "");

                        const title =
                           filterQueryData.reportData &&
                           (!filterQueryData.reportData.report_type ||
                           filterQueryData.reportData.report_type === "default"
                              ? key
                              : `${key !== "product" ? filterQueryData.reportData.report_type?.toUpperCase() + " " + key.toUpperCase() : key.toUpperCase()}`);

                        return (
                           filterQueryData.reportData && (
                              <FilterChipWrapper
                                 key={idx}
                                 title={title || key.toUpperCase()}
                              >
                                 <Chip
                                    label={label}
                                    size="small"
                                    onDelete={() =>
                                       setFilterQueryData({
                                          reportData: {
                                             ...filterQueryData.reportData,
                                             [key]:
                                                key === "date"
                                                   ? [null, null]
                                                   : undefined,
                                             report_type: "default",
                                          },
                                       })
                                    }
                                    sx={chipStyle(theme)}
                                 />
                              </FilterChipWrapper>
                           )
                        );
                     })}
                  </>
               )}

               {/* Order */}
               {activeOrderFilters.map(([key, value]) => (
                  <FilterChipWrapper key={key} title={formatLabel(key)}>
                     <Chip
                        label={
                           Array.isArray(value) && value[0] && value[1]
                              ? `${dayjs(value[0]).format("YYYY-MM-DD")} → ${dayjs(
                                   value[1],
                                ).format("YYYY-MM-DD")}`
                              : String(value)
                        }
                        size="small"
                        onDelete={() =>
                           setFilterQueryData({
                              orderData: {
                                 ...filterQueryData.orderData,
                                 [key]: Array.isArray(value) ? undefined : "",
                              },
                           })
                        }
                        sx={chipStyle(theme)}
                     />
                  </FilterChipWrapper>
               ))}

               {/* CLEAR ALL BUTTON */}
               {hasAnyFilter && (
                  <Button
                     variant="text"
                     color="error"
                     startIcon={
                        <Icon
                           size="small"
                           icon="solar:trash-bin-trash-bold"
                           color="error"
                        />
                     }
                     onClick={handleClearAll}
                  >
                     Clear
                  </Button>
               )}
            </Stack>
         </Stack>
      </Stack>
   );
};

export default Filter;

// ======================================================================
// SMALL UTILITY COMPONENTS
// ======================================================================

const FilterChipWrapper = ({
   title,
   children,
}: {
   title: string;
   children: React.ReactNode;
}) => (
   <Stack
      spacing={1}
      direction="row"
      alignItems="center"
      border={1}
      borderColor="divider"
      borderRadius={0.5}
      p={1}
      sx={{ borderStyle: "dashed" }}
   >
      <Typography variant="subtitle2">{title.toUpperCase()}: </Typography>
      {children}
   </Stack>
);

const chipStyle = (theme: any) => ({
   borderRadius: 0.5,
   fontWeight: 700,
   fontSize: "0.75rem",
   bgcolor: alpha(theme.palette.grey[300], 0.1),
   color:
      theme.mode === "dark" ? theme.palette.grey[300] : theme.palette.grey[600],
});

// Convert snake_case → Normal Label
const formatLabel = (str: string) =>
   str
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
