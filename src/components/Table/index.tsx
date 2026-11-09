"use client";

import { Stack } from "@mui/material";
import Filter, { FilterData, ExportTableConfig } from "./Filter";

import { IconButton, alpha, useTheme, Chip, Palette } from "@mui/material";
import {
   DataGrid,
   GridColDef,
   GridRenderCellParams,
   GridRowsProp,
   GridRowSelectionModel,
   GridRowId,
} from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Icon from "../Icon";
import CustomPopover from "../CustomPopover";
import Menu, { MenuItem as MenuItemProps } from "../Menu";
import NoRows from "./NoRows";

export type MenuItem = Omit<MenuItemProps, "onClick"> & {
   onClick?: (params: GridRenderCellParams) => void;
};

export type ColumnConfig = GridColDef & {
   chip?: boolean;
   color?: (params: GridRenderCellParams) => string;
   onClick?: (
      params: GridRenderCellParams,
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
   ) => void;
};

export interface TablePrintConfig {
   title?: string;
   isInvoiceModule?: boolean;
   metadata?: { label: string; value: string }[];
}

interface DataTableProps {
   rows: GridRowsProp;
   columns: ColumnConfig[];
   checkBox?: boolean;
   menuItems?: MenuItem[];
   filter?: (
      data: FilterData,
      onChange: (data: FilterData) => void,
   ) => React.ReactNode;
   onFilterChange?: (
      data: FilterData,
      setData: (f: FilterData) => void,
   ) => void;
   exportConfig?: ExportTableConfig;
   canPrint?: boolean;
   canExport?: boolean;
   printConfig?: TablePrintConfig;
   onSelectionChange?: (selectedRows: any[]) => void;
   hideSelectionToolbar?: boolean;
   showSelectionIndicators?: boolean;
   hideFooterSelectedRowCount?: boolean;
   hideSelectionActions?: boolean;
   customSelectionToolbar?: (
      selectedRows: any[],
      onClearSelection?: () => void,
   ) => React.ReactNode;
}

export default function CustomTable({
   rows,
   columns,
   checkBox = false,
   menuItems,
   filter,
   exportConfig,
   canPrint,
   canExport,
   printConfig,
   onSelectionChange,
   hideSelectionToolbar = false,
   showSelectionIndicators = true,
   hideFooterSelectedRowCount = false,
   hideSelectionActions = false,
   customSelectionToolbar,
}: DataTableProps) {
   const theme = useTheme();

   const [actionMenuOpen, setActionMenuOpen] = useState(
      null as null | HTMLElement,
   );
   const [paginationModel, setPaginationModel] = useState({
      pageSize: 10,
      page: 0,
   });
   const [selectedRowParams, setSelectedRowParams] =
      useState<GridRenderCellParams | null>(null);

   const [rowSelectionModel, setRowSelectionModel] =
      useState<GridRowSelectionModel>({
         type: "include",
         ids: new Set<GridRowId>(),
      });

   const selectedRows = useMemo(() => {
      if (!checkBox || !rowSelectionModel) return [];
      const rowsList = (rows || []) as any[];
      if (Array.isArray(rowSelectionModel)) {
         const idSet = new Set(rowSelectionModel);
         return rowsList.filter((r) => idSet.has(r.id));
      }
      if (rowSelectionModel.type === "include") {
         return rowsList.filter((r) => rowSelectionModel.ids.has(r.id));
      } else {
         return rowsList.filter((r) => !rowSelectionModel.ids.has(r.id));
      }
   }, [rows, rowSelectionModel, checkBox]);

   useEffect(() => {
      onSelectionChange?.(selectedRows);
   }, [selectedRows, onSelectionChange]);

   useEffect(() => {
      const currentRowIds = new Set((rows as any[]).map((r) => r.id));
      if (Array.isArray(rowSelectionModel)) {
         const validIds = rowSelectionModel.filter((id) =>
            currentRowIds.has(id),
         );
         if (validIds.length !== rowSelectionModel.length) {
            setRowSelectionModel({
               type: "include",
               ids: new Set<GridRowId>(validIds),
            });
         }
      } else if (
         rowSelectionModel?.type === "include" &&
         rowSelectionModel?.ids?.size > 0
      ) {
         const validIds = new Set<GridRowId>();
         rowSelectionModel.ids.forEach((id) => {
            if (currentRowIds.has(id)) {
               validIds.add(id);
            }
         });
         if (validIds.size !== rowSelectionModel.ids.size) {
            setRowSelectionModel({ type: "include", ids: validIds });
         }
      }
   }, [rows]);

   const handlePaginationChange = useCallback((model: any) => {
      setPaginationModel(model);
   }, []);

   const processedColumns = useMemo(() => {
      return columns.map((col) => {
         // * Action column
         if (col.field === "@actions") {
            return {
               ...col,
               headerName: "",
               sortable: false,
               filterable: false,
               headerAlign: "right",
               align: "right",
               flex: 0,
               width: 10,

               renderCell: (params: GridRenderCellParams) => {
                  return (
                     <>
                        <IconButton
                           size="small"
                           onClick={(e) => {
                              setSelectedRowParams(params);
                              setActionMenuOpen(e.currentTarget);
                           }}
                        >
                           <Icon
                              size="small"
                              icon="eva:more-vertical-fill"
                              style={{
                                 color: theme.palette.text.primary,
                              }}
                           />
                        </IconButton>
                     </>
                  );
               },
            };
         }

         // * Chip column
         if (col.chip) {
            return {
               ...col,
               // flex: col.flex ? col.flex : 0.5,
               headerAlign: "left",
               align: "left",
               renderCell: (params: GridRenderCellParams) => {
                  const row = params.row;
                  const color = col.color
                     ? col.color(params)
                     : row.color || "primary";
                  const validChipColors = [
                     "primary",
                     "secondary",
                     "error",
                     "warning",
                     "info",
                     "success",
                  ];
                  const colorKey = validChipColors.includes(color)
                     ? (color as any)
                     : "primary";
                  const paletteColor: any = theme.palette[
                     colorKey as keyof Palette
                  ] ?? {
                     main: row.color || theme.palette.primary.main,
                  };

                  return (
                     <Chip
                        component="div" // Add this line
                        label={params.formattedValue ?? params.value}
                        size="small"
                        color={colorKey}
                        {...(col.onClick
                           ? {
                                onClick: (
                                   e: React.MouseEvent<HTMLDivElement>,
                                ) => {
                                   // Change event type to HTMLDivElement
                                   col.onClick && col.onClick(params, e);
                                },
                             }
                           : {})}
                        sx={{
                           borderRadius: 0.5,
                           fontWeight: 700,
                           fontSize: "0.75rem",
                           bgcolor: paletteColor.main
                              ? alpha(paletteColor.main, 0.1)
                              : alpha(theme.palette.primary.main, 0.1),
                           color: paletteColor.main,
                           userSelect: "none",
                           "&:hover": {
                              bgcolor: paletteColor.main
                                 ? alpha(paletteColor.main, 0.2)
                                 : alpha(theme.palette.primary.main, 0.2),
                           },
                        }}
                     />
                  );
               },
            };
         }

         const isIdColumn =
            col.field === "id" ||
            col.field === "customId" ||
            col.field === "orderId" ||
            col.field === "invoice" ||
            Boolean(
               col.headerName && col.headerName.toLowerCase().endsWith("id"),
            ) ||
            col.headerName?.toLowerCase() === "id" ||
            col.headerName?.toLowerCase() === "order id" ||
            col.headerName?.toLowerCase() === "purchase id" ||
            col.headerName?.toLowerCase() === "invoice";

         return {
            headerAlign: isIdColumn ? "center" : col.headerAlign || "left",
            align: isIdColumn ? "center" : col.align || "left",
            ...col,
            ...(isIdColumn ? { headerAlign: "center", align: "center" } : {}),
         };
      });
   }, [columns]);

   const [mount, setMount] = useState(false);
   const tableBoxRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      setMount(true);
   }, []);

   useEffect(() => {
      if (tableBoxRef.current) {
         tableBoxRef.current.scrollLeft = 0;
         const scroller = tableBoxRef.current.querySelector(
            ".MuiDataGrid-virtualScroller",
         );
         if (scroller) {
            scroller.scrollLeft = 0;
         }
      }
   }, [rows]);

   if (!mount) return null;

   return (
      <Stack
         ref={tableBoxRef}
         borderRadius={1}
         overflow={"hidden"}
         sx={{
            backgroundColor: theme.palette.background.paper + "!important",
            height: rows.length ? "100%" : 560,
            width: "100%",
            overflow: "auto",
         }}
      >
         <Filter
            customFilter={filter}
            rows={rows as any[]}
            columns={processedColumns as any[]}
            exportConfig={exportConfig}
            canPrint={canPrint}
            canExport={canExport}
            printConfig={printConfig}
            hideSelectionToolbar={hideSelectionToolbar}
            showSelectionIndicators={showSelectionIndicators}
            hideSelectionActions={hideSelectionActions}
            customSelectionToolbar={customSelectionToolbar}
            selectedRows={selectedRows}
            onClearSelection={() =>
               setRowSelectionModel({
                  type: "include",
                  ids: new Set<GridRowId>(),
               })
            }
            onToggleSelectAll={() => {
               if (selectedRows.length >= rows.length && rows.length > 0) {
                  setRowSelectionModel({
                     type: "include",
                     ids: new Set<GridRowId>(),
                  });
               } else {
                  setRowSelectionModel({
                     type: "include",
                     ids: new Set<GridRowId>((rows as any[]).map((r) => r.id)),
                  });
               }
            }}
            isAllSelected={
               rows.length > 0 && selectedRows.length === rows.length
            }
         />

         <Stack
            sx={{
               maxHeight: 560,
               height: "100%",
            }}
         >
            <DataGrid
               rows={rows}
               columns={processedColumns as GridColDef[]}
               density="comfortable"
               checkboxSelection={checkBox}
               hideFooterSelectedRowCount={hideFooterSelectedRowCount}
               rowSelectionModel={rowSelectionModel}
               onRowSelectionModelChange={(newModel) =>
                  setRowSelectionModel(newModel)
               }
               // autoPageSize //* enable this to make Whichever one you show based on the height of the table
               pageSizeOptions={[10, 25, 50, { value: -1, label: "All" }]}
               paginationModel={paginationModel}
               onPaginationModelChange={handlePaginationChange}
               disableColumnSorting
               disableColumnMenu
               disableColumnResize
               disableColumnFilter
               disableRowSelectionOnClick
               disableAutosize
               disableVirtualization
               disableColumnSelector
               disableDensitySelector
               slots={{
                  noRowsOverlay: NoRows, //no rows
                  noColumnsOverlay: NoRows,
               }}
               slotProps={{
                  loadingOverlay: {
                     variant: "skeleton",
                     noRowsVariant: "skeleton",
                  },
               }}
               initialState={{
                  pagination: { paginationModel: { pageSize: 5 } },
                  scroll: { top: 1000, left: 1000 },
               }}
               sx={{
                  border: "none",
                  borderRadius: 0,
                  bgcolor: "background.paper",

                  "& .MuiDataGrid-virtualScroller": {
                     overflowX: "auto",
                     scrollbarWidth: "none!important", // Firefox

                     "&::-webkit-scrollbar": {
                        width: "0px!important", // Chrome
                     },
                  },

                  "& .MuiDataGrid-toolbar": {
                     border: "none!important",
                  },

                  "& .MuiDataGrid-scrollbar > div": {
                     display: "none",
                     backgroundColor: "transparent",
                  },
                  "& .MuiDataGrid-filler": {
                     display: "none",
                  },
                  "& .MuiDataGrid-columnHeaders > div": {
                     width: "100%",
                     height: "60px!important",
                     p: 1,
                     py: checkBox ? 1 : 2,
                     pl: 0,
                     backgroundColor:
                        alpha(theme.palette.grey[600], 0.1) + "!important",
                     ...theme.applyStyles("dark", {
                        backgroundColor:
                           alpha(theme.palette.grey[700], 0.5) + "!important",
                     }),
                  },
                  "& .MuiDataGrid-columnHeader, & .MuiDataGrid-scrollbarFiller":
                     {
                        backgroundColor: "transparent!important",
                        border: "none!important",
                     },
                  "& .MuiDataGrid-columnHeader > .MuiDataGrid-columnSeparator":
                     {
                        display: "none",
                     },

                  "& .MuiDataGrid-columnHeader:focus": {
                     outline: "none",
                  },
                  "& .MuiDataGrid-columnHeader:focus-within": {
                     outline: "none",
                  },

                  /* column header  */
                  "& .MuiDataGrid-columnHeaderTitleContainer:focus": {
                     outline: "none",
                  },
                  "& .MuiDataGrid-row": {
                     borderBottom: "1px solid",
                     borderColor: "divider",
                     transition: "all 0.2s ease-in-out",
                     height: "fit-content !important",
                  },
                  "& .MuiDataGrid-row:hover": {
                     backgroundColor:
                        alpha(theme.palette.grey[700], 0.03) + "!important",
                     ...theme.applyStyles("dark", {
                        backgroundColor:
                           alpha(theme.palette.grey[700], 0.3) + "!important",
                     }),
                  },
                  "& .MuiDataGrid-row.Mui-selected": {
                     backgroundColor:
                        alpha(theme.palette.primary.dark, 0.05) + "!important",
                     ...theme.applyStyles("dark", {
                        backgroundColor:
                           alpha(theme.palette.primary.dark, 0.05) +
                           "!important",
                     }),
                  },

                  "& .MuiDataGrid-cell": {
                     outline: "none !important",
                     border: 0,
                     alignItems: "center",
                     display: "flex",
                  },

                  // FOOTER STYLES
                  "& .MuiDataGrid-footerContainer": {
                     borderTop: "none!important",
                  },
               }}
            />
         </Stack>

         {/* action menu */}
         <CustomPopover
            anchorEl={actionMenuOpen}
            onClose={() => setActionMenuOpen(null)}
            anchorOrigin={{
               vertical: "bottom",
               horizontal: "right",
            }}
            transformOrigin={{
               vertical: "top",
               horizontal: "right",
            }}
         >
            <Menu
               item={
                  menuItems?.map((menuItem) => ({
                     ...menuItem,
                     onClick: () => {
                        menuItem.onClick?.(selectedRowParams!);
                        setActionMenuOpen(null);
                     },
                  })) ?? []
               }
               onClose={() => setActionMenuOpen(null)}
            />
         </CustomPopover>
      </Stack>
   );
}
