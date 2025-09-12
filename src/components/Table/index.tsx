"use client";

import * as React from "react";
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
import Filter from "./Filter";
import Icon from "../Icon";
import Scrollbar from "react-browser-scrollbar";

type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Hold"
  | "Cancelled";

const statusColor = {
  Pending: "warning",
  Confirmed: "success",
  Processing: "info",
  Hold: "default",
  Cancelled: "error",
} as const;

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
  const [checkedRows, setCheckedRows] = React.useState<boolean[]>(() =>
    body.map(() => false)
  );

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const paginatedRows =
    rowsPerPage > 0
      ? body.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      : body;

  const handleAllCheck = (checked: boolean) => {
    setCheckedRows(body.map(() => checked));
  };

  const handleRowCheck = (index: number, checked: boolean) => {
    const updated = [...checkedRows];
    updated[index] = checked;
    setCheckedRows(updated);
  };

  const allChecked = checkedRows.length > 0 && checkedRows.every(Boolean);

  const isIndeterminate =
    checkedRows.some(Boolean) && !checkedRows.every(Boolean);

  return (
    <Stack component={Paper} borderRadius={1} overflow={"hidden"}>
      {type !== "rank" && (
        <Stack py={2} px={3}>
          <Filter type={type} />
        </Stack>
      )}

      <TableContainer
        component={Paper}
        sx={{
          maxHeight: 550,
          overflowX: "auto", // ✅ horizontal scroll
          overflowY: "auto", // ✅ vertical scroll
          "&::-webkit-scrollbar": { display: "none" }, // optional: hide scrollbar in Chrome/Safari
          scrollbarWidth: "none!important",
          width: "100%",
        }}
      >
        <Table>
          <TableHead
            sx={{
              backgroundColor:
                alpha(theme.palette.grey[400], 0.1) + "!important",
            }}
          >
            <TableRow>
              {isIndeterminate || allChecked ? (
                <TableCell
                  colSpan={10}
                  align="left"
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                    p: 0,
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

                    <IconButton>
                      <Icon icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Stack>
                </TableCell>
              ) : (
                head.map((h, idx) => {
                  if (h === "@check") {
                    return (
                      <TableCell
                        key={idx}
                        align="left"
                        sx={{ p: 0, px: 1, whiteSpace: "nowrap" }}
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
                      <TableCell key={idx} sx={{ whiteSpace: "nowrap" }} />
                    );
                  }
                  return (
                    <TableCell
                      key={idx}
                      align="left"
                      sx={{ whiteSpace: "nowrap" }}
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
              "&::-webkit-scrollbar": {
                display: "none", // Hide scrollbar for WebKit browsers
              },
            }}
          >
            {paginatedRows.map((row, index) => {
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
                  type={type}
                  row={{
                    ...row,
                    ...arr,
                  }}
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
                  count={body.length}
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
