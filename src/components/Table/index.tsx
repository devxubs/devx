"use client";

import {
   Checkbox,
   Paper,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableContainer,
   TableFooter,
   TableHead,
   TablePagination,
   TableRow,
} from "@mui/material";
import Row from "./Row";
import Filter, { FilterData } from "./Filter";
import OrderTab from "./OrderTab";
import { orderStatuses } from "@src/handler/order_filter";

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

export type ActionItem = {
   label: string;
   onClick?: () => void;
   icon?: React.ReactNode;
};

export type TableRow = {
   [key: string]: string | number | React.ReactNode;
};

export type Type =
   | "order"
   | "rank"
   | "user"
   | "product"
   | "category"
   | "default";

export type Head = "@check" | "@action" | string;
export type TableProps = {
   type: Type;
   head: Head[]; // Dynamic headers, e.g., ["Seller", "Call", "@ID"]
   body: TableRow[]; // Must match the keys in head
   actionMenu?: (row: TableRow) => ActionItem[]; // Optional action menu items
   filter?: (
      data: FilterData,
      onChange: (data: FilterData) => void,
   ) => React.ReactNode;
};

// const inDateRange = (
//    date?: Date | string,
//    range?: [Date | null, Date | null],
// ) => {
//    if (!date || !range) return true;

//    const [start, end] = range;
//    if (!start || !end) return true;

//    const d = new Date(date);
//    d.setHours(0, 0, 0, 0);

//    const s = new Date(start);
//    s.setHours(0, 0, 0, 0);

//    const e = new Date(end);
//    e.setHours(23, 59, 59, 999);

//    return d >= s && d <= e;
// };
// const isEmpty = (value: any) => {
//    if (value == null) return true;
//    if (typeof value === "string") return value.trim() === "";
//    if (Array.isArray(value)) return value.every((v) => v == null || v === "");
//    return false;
// };

// const includesText = (value: any, search?: string) =>
//    !search ||
//    String(value ?? "")
//       .toLowerCase()
//       .includes(search.toLowerCase());

// const sameDay = (a?: Date | string, b?: Date | string) => {
//    if (!a || !b) return true;
//    const d1 = new Date(a);
//    const d2 = new Date(b);
//    return d1.setHours(0, 0, 0, 0) === d2.setHours(0, 0, 0, 0);
// };
// const filterRules = {
//    /* ---------- ROOT ---------- */
//    userRole: (row: any, value: string) => row.role === value,

//    productStock: (row: any, value: string) =>
//       row.stock_value?.toLowerCase() === value.toLowerCase(),

//    searchText: (row: any, value: string) =>
//       Object.values(row).some((v) => includesText(v, value)),

//    /* ---------- ORDER ---------- */
//    employee: (row: any, value: string) => row.employee?.name === value,

//    status: (row: any, value: string) => row.status === value,

//    order_source: (row: any, value: string) => row.orderSource === value,

//    products: (row: any, value: string) =>
//       row.products?.some(
//          (p: any) => includesText(p.name, value) || includesText(p.code, value),
//       ),

//    district: (row: any, value: string) =>
//       includesText(row.customer?.address, value),

//    print_status: (row: any, value: string) => row.print_status === value,

//    order_created_at: (row: any, value) =>
//       inDateRange(row.timestamps?.orderPlaced ?? row.createdAt, value),

//    courier_submitted_at: (row: any, value) =>
//       inDateRange(row.timestamps?.deliveryTime, value),

//    /* ---------- REPORT (✅ REQUIRED) ---------- */
//    report_date: (row: any, value: [Date | null, Date | null]) =>
//       inDateRange(row.createdAt, value),

//    report_product: (row: any, value: string) =>
//       row.products?.some(
//          (p: any) => includesText(p.name, value) || includesText(p.code, value),
//       ),
// } satisfies Record<string, (row: any, value: any) => boolean>;

export default function CustomTable({
   rows,
   columns,
   checkBox = false,
}: DataTableProps) {
   // const [checkedRows, setCheckedRows] = useState<boolean[]>(() =>
   //    body.map(() => false),
   // );
   // const [openRowId, setOpenRowId] = useState<string | number | null>(null);
   const [filterData, setFilterData] = useState<FilterData>({
      userRole: "",
      productStock: "",
      searchText: "",
      orderData: {
         order_created_at: undefined,
         courier_submitted_at: undefined,
         employee: "",
         status: "",
         order_source: "",
         products: "",
         district: "",
         print_status: "",
      },
      reportData: {
         date: undefined,
         product: null,
         report_type: "default",
      },
   });

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
         flex: col.flex ? col.flex : 0.5,
         headerAlign: "left",
         align: "left",
         ...col,
      };
   });

   // const normalizedReportData = filterData.reportData
   //    ? {
   //         report_date: filterData.reportData.date,
   //         report_product: filterData.reportData.product,
   //      }
   //    : {};

   // const filterRow = React.useMemo(() => {
   //    const { userRole, productStock, searchText, orderData } = filterData;

   //    const activeFilters = {
   //       userRole,
   //       productStock,
   //       searchText,
   //       ...orderData,
   //       ...normalizedReportData,
   //    };

   //    return body.filter((row: any) =>
   //       Object.entries(activeFilters).every(([key, value]) => {
   //          if (isEmpty(value)) return true;
   //          return (
   //             filterRules[key as keyof typeof filterRules]?.(row, value) ??
   //             true
   //          );
   //       }),
   //    );
   // }, [body, filterData, normalizedReportData]);

   // useEffect(() => {
   //    setCheckedRows((prev) =>
   //       prev.length === filterRow.length
   //          ? prev
   //          : Array(filterRow.length).fill(false),
   //    );
   // }, [filterRow.length]);

   // const allChecked = checkedRows.length > 0 && checkedRows.every(Boolean);
   // const isIndeterminate =
   //    checkedRows.some(Boolean) && !checkedRows.every(Boolean);

   // const [page, setPage] = useState(0);
   // const [rowsPerPage, setRowsPerPage] = useState(10);

   // const paginatedRows =
   //    rowsPerPage > 0
   //       ? (filterRow || []).slice(
   //            page * rowsPerPage,
   //            page * rowsPerPage + rowsPerPage,
   //         )
   //       : filterRow;

   // const handleAllCheck = (checked: boolean) => {
   //    setCheckedRows(filterRow.map(() => checked));
   // };
   // const handleRowCheck = (index: number, checked: boolean) => {
   //    const updated = [...checkedRows];
   //    updated[index] = checked;
   //    setCheckedRows(updated);
   // };

   return (
      <Stack
         borderRadius={1}
         overflow={"hidden"}
         sx={{
            backgroundColor: theme.palette.background.paper + "!important",
            maxHeight: 600,
         }}
      >
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
                     alpha(theme.palette.grey[700], 0.1) + "!important",
                  ...theme.applyStyles("dark", {
                     backgroundColor: theme.palette.grey[700],
                     // alpha(theme.palette.grey[700], 0.6) + "!important",
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
                     alpha(theme.palette.grey[700], 0.05) + "!important",
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
         />
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
         )}
         {type !== "rank" && (
            <Stack pt={2} px={3}>
               <Filter
                  type={type}
                  onFilterChange={(d) => setFilterData(d)}
                  filterData={filterData}
                  customFilter={filter}
               />
            </Stack>
         )} */}

         {
            // <TableContainer
            //    component={Paper}
            //    sx={{
            //       maxHeight: 500,
            //       overflow: "auto", // single source of truth for scrolling
            //       "&::-webkit-scrollbar": { display: "none!important" },
            //       scrollbarWidth: "none!important",
            //       width: "100%",
            //       borderRadius: type === "rank" ? 1 : 0,
            //    }}
            // >
            //    <Table stickyHeader>
            //       <TableHead
            //          sx={{
            //             "& th": {
            //                py: 1,
            //                px: { xs: 1, md: 1 },
            //                backgroundColor:
            //                   alpha(theme.palette.grey[700], 0.1) +
            //                   "!important",
            //                ...theme.applyStyles("dark", {
            //                   backgroundColor: theme.palette.grey[700],
            //                }),
            //             },
            //          }}
            //       >
            //          <TableRow>
            //             {isIndeterminate || allChecked ? (
            //                <TableCell
            //                   colSpan={10}
            //                   align="left"
            //                   sx={{
            //                      // backgroundColor: alpha(theme.palette.primary.main, 0.09),
            //                      whiteSpace: "nowrap",
            //                   }}
            //                >
            //                   <Stack
            //                      width={"100%"}
            //                      direction="row"
            //                      alignItems="center"
            //                      justifyContent={"space-between"}
            //                   >
            //                      <Checkbox
            //                         checked={allChecked}
            //                         indeterminate={isIndeterminate}
            //                         onChange={(e) =>
            //                            handleAllCheck(e.target.checked)
            //                         }
            //                      />
            //                      <Stack direction={"row"} spacing={1}>
            //                         {type === "order" && (
            //                            <IconButton>
            //                               <Icon icon="solar:printer-minimalistic-bold" />
            //                            </IconButton>
            //                         )}
            //                         <IconButton color="error">
            //                            <Icon
            //                               icon="solar:trash-bin-trash-bold"
            //                               color="error"
            //                            />
            //                         </IconButton>
            //                      </Stack>
            //                   </Stack>
            //                </TableCell>
            //             ) : (
            //                head.map((h, idx) => {
            //                   if (h === "@check") {
            //                      return (
            //                         <TableCell
            //                            key={idx}
            //                            align="left"
            //                            sx={{
            //                               whiteSpace: "nowrap",
            //                               width: "0px",
            //                            }}
            //                         >
            //                            <Checkbox
            //                               checked={allChecked}
            //                               indeterminate={isIndeterminate}
            //                               onChange={(e) =>
            //                                  handleAllCheck(e.target.checked)
            //                               }
            //                            />
            //                         </TableCell>
            //                      );
            //                   } else if (h.includes("@")) {
            //                      return (
            //                         <TableCell
            //                            key={idx}
            //                            sx={{ whiteSpace: "nowrap" }}
            //                         />
            //                      );
            //                   }
            //                   return (
            //                      <TableCell
            //                         key={idx}
            //                         align={"left"}
            //                         sx={{
            //                            p: type === "rank" ? 2 : 1,
            //                            whiteSpace: "nowrap",
            //                         }}
            //                      >
            //                         {h}
            //                      </TableCell>
            //                   );
            //                })
            //             )}
            //          </TableRow>
            //       </TableHead>
            //       <TableBody
            //          sx={{
            //             width: "100%",
            //             overflow: "scroll",
            //             "&::-webkit-scrollbar": {
            //                display: "none", // Hide scrollbar for WebKit browsers
            //             },
            //          }}
            //       >
            //          {(paginatedRows || []).map((row: any, index) => {
            //             return (
            //                <Row
            //                   key={index}
            //                   isOpen={openRowId === (row.id ?? index)} // controlled open state
            //                   onToggle={() =>
            //                      setOpenRowId(
            //                         openRowId === (row.id ?? index)
            //                            ? null
            //                            : (row.id ?? index),
            //                      )
            //                   }
            //                   type={type}
            //                   row={row}
            //                   checked={checkedRows[index]}
            //                   head={head}
            //                   onCheck={(checked: boolean) =>
            //                      handleRowCheck(index, checked)
            //                   }
            //                   actionMenu={actionMenu?.(row) || []}
            //                />
            //             );
            //          })}
            //       </TableBody>
            //       {/* TableFooter with TablePagination inside TableRow */}
            //       <TableFooter>
            //          <TableRow sx={{ borderBottom: "0px!important" }}>
            //             {type !== "rank" && (
            //                <TablePagination
            //                   rowsPerPageOptions={[
            //                      10,
            //                      25,
            //                      50,
            //                      { label: "All", value: -1 },
            //                   ]}
            //                   count={filterRow.length}
            //                   rowsPerPage={rowsPerPage}
            //                   page={page}
            //                   onPageChange={(e, newPage) => setPage(newPage)}
            //                   onRowsPerPageChange={(e) =>
            //                      setRowsPerPage(parseInt(e.target.value, 10))
            //                   }
            //                   colSpan={head.length} // ✅ width control
            //                   sx={{ borderBottom: "0px!important" }}
            //                />
            //             )}
            //          </TableRow>
            //       </TableFooter>
            //    </Table>
            // </TableContainer>
         }
      </Stack>
   );
}
