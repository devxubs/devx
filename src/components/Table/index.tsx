"use client";

import React, { useState } from "react";
import {
  alpha,
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
  useTheme,
  IconButton,
} from "@mui/material";
import Row from "./Row";
import Filter, { FilterData } from "./Filter";
import Icon from "../Icon";
import OrderTab from "./OrderTab";
import { orderStatuses } from "@src/handler/order_filter";

export type ActionItem = {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
};

export type TableRow = {
  [key: string]: string | number | React.ReactNode;
};

export type Type = "order" | "rank" | "user" | "product" | "category";

export type TableProps = {
  type: Type;
  head: string[]; // Dynamic headers, e.g., ["Seller", "Call", "@ID"]
  body: TableRow[]; // Must match the keys in head
  actionMenu?: (row: TableRow) => ActionItem[]; // Optional action menu items
};

export default function CustomTable({
  type,
  head,
  body,
  actionMenu,
}: TableProps) {
  const theme = useTheme();
  const [checkedRows, setCheckedRows] = useState<boolean[]>(() =>
    body.map(() => false)
  );
  const [openRowId, setOpenRowId] = useState<string | number | null>(null);
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
  });

  const filterRow = React.useMemo(() => {
    return body.filter((row: any) => {
      const { userRole, productStock, orderData } = filterData;
      console.log(productStock);

      // --- Search text filter
      if (
        filterData.searchText &&
        !Object.values(row).some((val) =>
          String(val)
            .toLowerCase()
            .includes(filterData.searchText.toLowerCase())
        )
      ) {
        return false;
      }

      // --- User role
      if (userRole && userRole !== row.role) return false;

      // --- Product stock
      if (
        productStock &&
        productStock.toLowerCase() !== row.stock_value.toLowerCase()
      )
        return false;

      // --- Status filter
      if (orderData.status && row.status !== orderData.status) return false;

      // --- Employee filter (maps to customer name)
      if (orderData.employee && row.employee.name !== orderData.employee) {
        return false;
      }

      // --- Order Source filter
      if (
        orderData.order_source &&
        row.orderSource !== orderData.order_source
      ) {
        return false;
      }

      // --- Product filter (by name or code)
      if (
        orderData.products &&
        !row.products.some(
          (prod: any) =>
            prod.name
              .toLowerCase()
              .includes(orderData.products?.toLowerCase()) ||
            prod.code.toLowerCase().includes(orderData.products?.toLowerCase())
        )
      ) {
        return false;
      }

      // --- District filter (maps to address)
      if (
        orderData.district &&
        !row.customer.address
          ?.toLowerCase()
          .includes(orderData.district.toLowerCase())
      ) {
        return false;
      }

      // --- Print status filter (maps to note here)
      if (
        orderData.print_status &&
        row.print_status !== orderData.print_status
      ) {
        return false;
      }

      // --- Order created date filter
      if (orderData.order_created_at) {
        const orderDate = new Date(row.timestamps.orderPlaced);
        const filterDate = new Date(orderData.order_created_at as any);

        // Compare only the date part (ignore time)
        const orderDay = orderDate.setHours(0, 0, 0, 0);
        const filterDay = filterDate.setHours(0, 0, 0, 0);

        if (orderDay !== filterDay) return false;
      }

      // --- Courier submitted date filter
      if (orderData.courier_submitted_at && row.timestamps.deliveryTime) {
        const courierDate = new Date(row.timestamps.deliveryTime);
        const filterDate = new Date(orderData.courier_submitted_at as any);

        // Compare only the date part (ignore time)
        const courierDay = courierDate.setHours(0, 0, 0, 0);
        const filterDay = filterDate.setHours(0, 0, 0, 0);

        if (courierDay !== filterDay) return false;
      }
      return true;
    });
  }, [filterData, body]);

  const allChecked = checkedRows.length > 0 && checkedRows.every(Boolean);
  const isIndeterminate =
    checkedRows.some(Boolean) && !checkedRows.every(Boolean);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const paginatedRows =
    rowsPerPage > 0
      ? (filterRow || []).slice(
          page * rowsPerPage,
          page * rowsPerPage + rowsPerPage
        )
      : filterRow;

  const handleAllCheck = (checked: boolean) => {
    setCheckedRows(filterRow.map(() => checked));
  };
  const handleRowCheck = (index: number, checked: boolean) => {
    const updated = [...checkedRows];
    updated[index] = checked;
    setCheckedRows(updated);
  };

  return (
    <Stack
      borderRadius={1}
      overflow={"hidden"}
      sx={{
        backgroundColor: theme.palette.background.paper + "!important",
      }}
    >
      {type === "order" && (
        <Stack>
          <OrderTab
            value={
              orderStatuses.lastIndexOf(filterData.orderData.status || "") ===
              -1
                ? 0
                : orderStatuses.lastIndexOf(filterData.orderData.status || "") +
                  1
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
          />
        </Stack>
      )}

      <TableContainer
        component={Paper}
        sx={{
          maxHeight: 550,
          overflow: "auto", // single source of truth for scrolling
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
          width: "100%",
          borderRadius: type === "rank" ? 1 : 0,
        }}
      >
        <Table stickyHeader>
          <TableHead
            sx={{
              "& th": {
                backgroundColor:
                  alpha(theme.palette.grey[700], 0.1) + "!important",
                ...theme.applyStyles("dark", {
                  backgroundColor: theme.palette.grey[700],
                }),
              },
            }}
          >
            <TableRow>
              {isIndeterminate || allChecked ? (
                <TableCell
                  colSpan={10}
                  align="left"
                  sx={{
                    // backgroundColor: alpha(theme.palette.primary.main, 0.09),
                    p: 1,
                    px: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Stack
                    width={"100%"}
                    direction="row"
                    alignItems="center"
                    justifyContent={"space-between"}
                  >
                    <Checkbox
                      checked={allChecked}
                      indeterminate={isIndeterminate}
                      onChange={(e) => handleAllCheck(e.target.checked)}
                    />

                    <Stack direction={"row"} spacing={1}>
                      {type === "order" && (
                        <IconButton>
                          <Icon icon="solar:printer-minimalistic-bold" />
                        </IconButton>
                      )}
                      <IconButton color="error">
                        <Icon icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </TableCell>
              ) : (
                head.map((h, idx) => {
                  if (h === "@check") {
                    return (
                      <TableCell
                        key={idx}
                        align="left"
                        sx={{ p: 1, whiteSpace: "nowrap", width: "0px" }}
                      >
                        <Checkbox
                          checked={allChecked}
                          indeterminate={isIndeterminate}
                          onChange={(e) => handleAllCheck(e.target.checked)}
                        />
                      </TableCell>
                    );
                  } else if (h.includes("@")) {
                    return (
                      <TableCell
                        key={idx}
                        sx={{ p: 1, whiteSpace: "nowrap" }}
                      />
                    );
                  }
                  return (
                    <TableCell
                      key={idx}
                      align="left"
                      sx={{ p: type === "rank" ? 2 : 1, whiteSpace: "nowrap" }}
                    >
                      {h}
                    </TableCell>
                  );
                })
              )}
            </TableRow>
          </TableHead>

          <TableBody
            sx={{
              width: "100%",
              overflow: "scroll",
              "&::-webkit-scrollbar": {
                display: "none", // Hide scrollbar for WebKit browsers
              },
            }}
          >
            {(paginatedRows || []).map((row: any, index) => {
              let arr: Record<string, any> = {};

              for (const key in row) {
                if (Array.isArray(row[key])) {
                  // If it's an array, for example take 1st or 2nd item
                  arr[key] = row[key][1] ?? row[key][0];
                } else {
                  arr[key] = row[key];
                }
              }

              return (
                <Row
                  key={index}
                  isOpen={openRowId === (row.id ?? index)} // controlled open state
                  onToggle={() =>
                    setOpenRowId(
                      openRowId === (row.id ?? index) ? null : row.id ?? index
                    )
                  }
                  type={type}
                  row={row}
                  checked={checkedRows[index]}
                  head={head}
                  onCheck={(checked: boolean) => handleRowCheck(index, checked)}
                  actionMenu={actionMenu?.(row) || []}
                />
              );
            })}
          </TableBody>

          {/* TableFooter with TablePagination inside TableRow */}
          <TableFooter>
            <TableRow sx={{ borderBottom: "0px!important" }}>
              {type !== "rank" && (
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, { label: "All", value: -1 }]}
                  count={filterRow.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) =>
                    setRowsPerPage(parseInt(e.target.value, 10))
                  }
                  colSpan={head.length} // ✅ width control
                  sx={{ borderBottom: "0px!important" }}
                />
              )}
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Stack>
  );
}
