"use client";

import { Stack } from "@mui/material";
import Filter, { FilterData } from "./Filter";
import OrderTab from "../../Pages/admin/Order/OrderTab";
import { orderStatuses } from "@src/handler/order_filter";

import { IconButton, alpha, useTheme, Chip, Palette } from "@mui/material";
import {
   DataGrid,
   GridColDef,
   GridRenderCellParams,
   GridRowsProp,
} from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import Icon from "../Icon";
import CustomPopover from "../CustomPopover";
import Menu, { MenuItem as MenuItemProps } from "../Menu";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { P } from "framer-motion/dist/types.d-BJcRxCew";
import useQueryParams from "@src/handler/useQueryParams";
import delayExecute from "@src/handler/delayExecute";

type MenuItem = Omit<MenuItemProps, "onClick"> & {
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

interface DataTableProps {
   rows: GridRowsProp;
   columns: ColumnConfig[];
   checkBox?: boolean;
   menuItems?: MenuItem[];
   accordionValue?: number[];
   onAccordionChange?: (newIds: number[]) => void;
   filter?: (
      data: FilterData,
      onChange: (data: FilterData) => void,
   ) => React.ReactNode;
}

export default function CustomTable({
   rows,
   columns,
   checkBox = false,
   menuItems,
   filter,
   accordionValue,
   onAccordionChange,
}: DataTableProps) {
   const theme = useTheme();
   const [mounted, setMounted] = useState(false);

   const [actionMenuOpen, setActionMenuOpen] = useState(
      null as null | HTMLElement,
   );
   const [paginationModel, setPaginationModel] = useState({
      pageSize: 10,
      page: 0,
   });
   const [selectedRowParams, setSelectedRowParams] =
      useState<GridRenderCellParams | null>(null);
   const router = useRouter();
   const pathname = usePathname();
   const searchParams = useSearchParams();
   const query = useQueryParams();
   let getFilterData = {};
   if (query.get("filter")) {
      getFilterData = JSON.parse(
         decodeURIComponent(query.get("filter") || "") || "{}",
      ); //decodeURIComponent(JSON.parse(query.get("filter") || ""));
   }

   const [filterData, setFilterData] = useState<FilterData>({
      searchText: searchParams?.get("keyword") || "",
      userRole: searchParams?.get("role") || "",
      productStock: searchParams?.get("stock") || "",
      ...getFilterData,
      // orderData: {
      //    order_created_at: [null, null],
      //    courier_submitted_at: [null, null],
      //    employee: "",
      //    status: "",
      //    order_source: "",
      //    products: "",
      //    district: "",
      //    print_status: "",
      // },
      // reportData: {
      //    report_type: "default",
      //    date: [null, null],
      //    product: null,
      // },
   });

   let data = {
      searchText: searchParams?.get("keyword") || "",
      userRole: searchParams?.get("role") || "",
      productStock: searchParams?.get("stock") || "",
      // orderData: {
      //    order_created_at: [null, null],
      //    courier_submitted_at: [null, null],
      //    employee: "",
      //    status: "",
      //    order_source: "",
      //    products: "",
      //    district: "",
      //    print_status: "",
      // },
      // reportData: {
      //    report_type: "default",
      //    date: [null, null],
      //    product: null,
      // },
   };

   useEffect(() => {
      delayExecute(() => {
         query.set("filter", encodeURIComponent(JSON.stringify(filterData)));
      });
   }, [filterData]);

   // const handleSearch = () => {
   //    const params = new URLSearchParams(searchParams?.toString());

   //    // params.set(JSON.stringify(filterData));

   //    if (filterData.searchText) {
   //       params.set("keyword", filterData.searchText);
   //    } else {
   //       params.delete("keyword");
   //    }

   //    if (filterData.userRole) {
   //       params.set("role", filterData.userRole);
   //    } else {
   //       params.delete("role");
   //    }
   //    if (filterData.productStock) {
   //       params.set("stock", filterData.productStock);
   //    } else {
   //       params.delete("stock");
   //    }
   //    router.push(`${pathname}?${params.toString()}`);
   // };

   columns = columns.map((col) => {
      // * Action column
      if (col.field === "@actions") {
         return {
            ...col,
            sortable: false,
            filterable: false,
            headerAlign: "right",
            align: "right",

            renderCell: (params) => {
               return (
                  <>
                     <IconButton
                        size="small"
                        onClick={(e) => {
                           setSelectedRowParams(params);
                           setActionMenuOpen(e.currentTarget);
                        }}
                     >
                        <Icon size="small" icon="eva:more-vertical-fill" />
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
            flex: 1,
            headerAlign: "left",
            align: "left",
            renderCell: (params: GridRenderCellParams) => {
               const row = params.row;
               const color = col.color ? col.color(params) : "primary";
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
                     label={params.formattedValue}
                     size="small"
                     color={colorKey}
                     onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        // Change event type to HTMLDivElement
                        col.onClick && col.onClick(params, e);
                     }}
                     sx={{
                        borderRadius: 0.5,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        bgcolor: paletteColor.main
                           ? alpha(paletteColor.main, 0.1)
                           : alpha(theme.palette.primary.main, 0.1),
                        color: paletteColor.main,
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

      return {
         flex: col.flex ? col.flex : 0.5,
         headerAlign: "left",
         align: "left",
         ...col,
      };
   });

   useEffect(() => {
      setMounted(true);
   }, []);

   if (!mounted) return null; // or loader

   return (
      <Stack
         borderRadius={1}
         overflow={"hidden"}
         sx={{
            backgroundColor: theme.palette.background.paper + "!important",
            maxHeight: 560,
         }}
      >
         <Filter
            onFilterChange={(d) => {
               setFilterData({ ...filterData, ...d });
            }}
            filterData={filterData as any}
            customFilter={filter}
         />

         <DataGrid
            rows={rows}
            columns={columns}
            density="comfortable"
            checkboxSelection={checkBox}
            // autoPageSize //* enable this to make Whichever one you show based on the height of the table
            pageSizeOptions={[10, 25, 50, { value: -1, label: "All" }]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
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
                  // noRowsOverlay: , no rows
               },
            }}
            initialState={{
               pagination: { paginationModel: { pageSize: 5 } },
            }}
            sx={{
               border: "none",
               borderRadius: 0,

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
               "& .MuiDataGrid-filler": {
                  display: "none",
               },
               "& .MuiDataGrid-columnHeaders > div": {
                  width: "100%",
                  height: "auto!important",
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
                        alpha(theme.palette.primary.dark, 0.05) + "!important",
                  }),
               },

               "& .MuiDataGrid-cell": {
                  outline: "none !important",
                  border: 0,
                  alignItems: "center",
               },

               // FOOTER STYLES
               "& .MuiDataGrid-footerContainer": {
                  borderTop: "none!important",
               },
            }}
            // getDetailPanelContent={({ row }) => (
            //    <Stack p={2} bgcolor="background.default">
            //       {/* 👇 Put whatever you want here */}
            //       <div>Order ID: {row.id}</div>
            //       <div>User: {row.name}</div>
            //       <div>Email: {row.email}</div>
            //    </Stack>
            // )}

            // getDetailPanelHeight={() => 120}
            // detailPanelExpandedRowIds={expandedRowIds}
            // onDetailPanelExpandedRowIdsChange={(newIds) =>
            //    setExpandedRowIds(newIds as number[])
            // }
         />

         {/* //* action menu */}
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

         {/* {type === "order" && (
            <Stack>
               <OrderTab
                  value={
                     orderStatuses.lastIndexOf(
                        filterData.orderData.status || "",
                     ) === -1
                        ? 0
                        : orderStatuses.lastIndexOf(
                             filterData.orderData.status || "",
                          ) + 1
                  }
                  onChange={(s) => {
                     setFilterData((prev) => ({
                        ...prev,
                        orderData: {
                           ...prev.orderData,
                           status: s === "All" ? "" : s,
                        },
                     }));
                  }}
               />
            </Stack>
         */}
      </Stack>
   );
}
