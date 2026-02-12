"use client";

import { IconButton, alpha, useTheme, Chip, Palette } from "@mui/material";
import {
   DataGrid,
   GridCallbackDetails,
   GridColDef,
   GridRenderCellParams,
   GridRowSelectionModel,
   GridRowsProp,
} from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import Icon from "../Icon";
import CustomPopover from "../CustomPopover";
import Menu, { MenuItem } from "../Menu";

export type ColumnConfig = GridColDef & {
   menu?: MenuItem[];
   chip?: boolean;
};

interface DataTableProps {
   rows: GridRowsProp;
   columns: ColumnConfig[];
   checkBox?: boolean;
}

export default function DataTable({
   rows,
   columns,
   checkBox = false,
}: DataTableProps) {
   const theme = useTheme();
   const [mounted, setMounted] = useState(false);
   const [actionMenuOpen, setActionMenuOpen] = useState(
      null as null | HTMLElement,
   );

   const [paginationModel, setPaginationModel] = useState({
      pageSize: 25,
      page: 0,
   });

   useEffect(() => {
      setMounted(true);
   }, []);

   if (!mounted) return null; // or loader

   columns = columns.map((col) => {
      console.log(col);

      // * Action column
      if (col.field === "@actions") {
         return {
            ...col,
            sortable: false,
            filterable: false,
            headerAlign: "right",
            align: "right",

            renderCell: (r) => (
               <>
                  <IconButton
                     size="small"
                     onClick={(e) => setActionMenuOpen(e.currentTarget)}
                  >
                     <Icon size="small" icon="eva:more-vertical-fill" />
                  </IconButton>
                  <CustomPopover
                     anchorEl={actionMenuOpen}
                     onClose={() => setActionMenuOpen(null)}
                     anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                     transformOrigin={{ vertical: "top", horizontal: "right" }}
                  >
                     <Menu
                        item={(col.menu ?? [])?.map((menuItem) => ({
                           ...menuItem,
                           onClick: () => {
                              // menuItem.onClick?.();
                              // setActionMenuOpen(null);
                              console.log(r);
                           },
                        }))}
                        onClose={() => setActionMenuOpen(null)}
                     />
                  </CustomPopover>
               </>
            ),
         };
      }

      // * Chip column
      if (col.chip) {
         return {
            ...col,
            flex: 1,
            headerAlign: "left",
            align: "left",
            renderCell: (params: GridRenderCellParams) => {
               const row = params.row;

               const colorKey =
                  row.color === "default"
                     ? "primary"
                     : (row.color as keyof Palette);
               const paletteColor: any = theme.palette[colorKey] ?? {
                  main: row.color || theme.palette.primary.main,
               };

               return (
                  <Chip
                     label={params.formattedValue}
                     size="small"
                     color={(row.color as any) || "primary"}
                     sx={{
                        borderRadius: 0.5,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        bgcolor: paletteColor?.main
                           ? alpha(paletteColor.main, 0.1)
                           : alpha(theme.palette.primary.main, 0.1),
                        color: paletteColor?.main || theme.palette.primary.main,
                     }}
                  />
               );
            },
         };
      }

      return {
         ...col,
         flex: 1,
         headerAlign: "left",
         align: "left",
      };
   });

   return (
      <div style={{ height: 400, width: "100%" }}>
         <DataGrid
            rows={rows}
            columns={columns}
            density="comfortable"
            showToolbar={false}
            checkboxSelection={checkBox}
            // autoPageSize //* enable this to make Whichever one you show based on the height of the table
            initialState={{
               pagination: { paginationModel: { pageSize: 5 } },
            }}
            pageSizeOptions={[10, 25, 50, { value: -1, label: "All" }]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            //
            disableColumnSorting
            disableColumnMenu
            disableColumnResize
            disableColumnFilter
            disableRowSelectionOnClick
            disableAutosize
            disableVirtualization
            disableColumnSelector
            disableDensitySelector
            slotProps={{
               loadingOverlay: {
                  variant: "skeleton",
                  noRowsVariant: "skeleton",
                  // noRowsOverlay: "", // you can customize no rows overlay here
               },
            }}
            // isRowSelectable={(p) => {
            //    console.log(p);
            //    return true;
            // }}
            onRowSelectionModelChange={(
               { ids }: GridRowSelectionModel,
               details: GridCallbackDetails,
            ) => {
               console.log(ids);

               const selectedIDs = new Set(ids);
               const selectedRows = rows.filter((row) =>
                  selectedIDs.has(row.id),
               );
               console.log(selectedRows);
            }}
            sx={{
               border: "none",

               "& .MuiDataGrid-virtualScroller": {
                  scrollbarWidth: "none!important",
               },

               "& .MuiDataGrid-toolbar": {
                  border: "none!important",
               },

               "& .MuiDataGrid-scrollbar > div": {
                  display: "none",
                  // backgroundColor: "transparent",
               },
               "& .MuiDataGrid-columnHeaders > div": {
                  height: "auto!important",
                  p: 1,
                  py: checkBox ? 1 : 2,
                  pl: 0,
                  backgroundColor:
                     alpha(theme.palette.grey[700], 0.1) + "!important",
                  ...theme.applyStyles("dark", {
                     backgroundColor: alpha(theme.palette.grey[700], 0.6),
                  }),
               },
               "& .MuiDataGrid-columnHeader, & .MuiDataGrid-scrollbarFiller": {
                  backgroundColor: "transparent!important",
                  border: "none!important",
               },
               "& .MuiDataGrid-columnHeader > .MuiDataGrid-columnSeparator": {
                  display: "none",
               },

               "& .MuiDataGrid-columnHeader:focus": {
                  outline: "none",
               },
               "& .MuiDataGrid-columnHeader:focus-within": {
                  outline: "none",
               },

               /* column header title focus (extra safe) */
               "& .MuiDataGrid-columnHeaderTitleContainer:focus": {
                  outline: "none",
               },
               "& .MuiDataGrid-row": {
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  transition: "all 0.2s ease-in-out",
               },
               "& .MuiDataGrid-row:hover": {
                  backgroundColor:
                     alpha(theme.palette.grey[700], 0.1) + "!important",
                  ...theme.applyStyles("dark", {
                     backgroundColor: alpha(theme.palette.grey[700], 0.3),
                  }),
               },
               "& .MuiDataGrid-row.Mui-selected": {
                  backgroundColor:
                     alpha(theme.palette.primary.dark, 0.03) + "!important",
                  ...theme.applyStyles("dark", {
                     backgroundColor:
                        alpha(theme.palette.primary.dark, 0.03) + "!important",
                  }),
               },

               "& .MuiDataGrid-cell": {
                  outline: "none !important",
                  border: 0,
               },

               // FOOTER STYLES
               "& .MuiDataGrid-footerContainer": {
                  borderTop: "none!important",
               },
            }}
         />
      </div>
   );
}
