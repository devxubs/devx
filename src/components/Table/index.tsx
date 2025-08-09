"use client";

import * as React from "react";
import {
  alpha,
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
} from "@mui/material";
import Row from "./Row";
import Filter from "./Filter";

type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Hold"
  | "Cancelled";

export type ActionItem = {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
};

export type TableRow = {
  [key: string]: string | number | React.ReactNode;
};

export type TableProps = {
  type: "order" | "rank" | "user";
  head: string[]; // Dynamic headers, e.g., ["Seller", "Call", "@ID"]
  body: TableRow[]; // Must match the keys in head
};

interface RowData {
  orderId: number;
  customer: {
    name: string;
    phone: string;
  };
  status: OrderStatus;
  address: string;
  createdAt: string; // or `Date` if you prefer actual date objects
  orderItems?: {
    name: string;
    quantity: number;
    price: number;
  }[];
}
const rows: RowData[] = [
  {
    orderId: 5678,
    customer: { name: "John Doe", phone: "01325584606" },
    status: "Pending",
    address: "123 Main St, Dhaka",
    createdAt: "2025-07-22T10:15:00",
    orderItems: [
      { name: "Baby oil", quantity: 2, price: 950 },
      { name: "Diapers", quantity: 5, price: 1200 },
      { name: "Baby wipes", quantity: 3, price: 450 },
    ],
  },
  {
    orderId: 4567,
    customer: { name: "Alice Smith", phone: "01756647896" },
    status: "Confirmed",
    address: "456 Lake Rd, Sylhet",
    createdAt: "2025-07-21T14:30:00",
    orderItems: [
      { name: "Baby lotion", quantity: 1, price: 620 },
      { name: "Diapers", quantity: 2, price: 1200 },
    ],
  },
  {
    orderId: 8765,
    customer: { name: "Bob Lee", phone: "01698564798" },
    status: "Processing",
    address: "789 Green Ave, Chittagong",
    createdAt: "2025-07-20T08:45:00",
    orderItems: [
      { name: "Feeding bottle", quantity: 2, price: 550 },
      { name: "Baby shampoo", quantity: 1, price: 400 },
    ],
  },
  {
    orderId: 6787,
    customer: { name: "Sara Khan", phone: "01548657896" },
    status: "Hold",
    address: "102 Red St, Barisal",
    createdAt: "2025-07-19T17:00:00",
    orderItems: [
      { name: "Pacifier", quantity: 2, price: 180 },
      { name: "Diapers", quantity: 3, price: 1200 },
    ],
  },
  {
    orderId: 9090,
    customer: { name: "Tom Parker", phone: "01478523658" },
    status: "Cancelled",
    address: "204 Blue Rd, Rajshahi",
    createdAt: "2025-07-18T11:20:00",
    orderItems: [
      { name: "Baby powder", quantity: 1, price: 300 },
      { name: "Baby wipes", quantity: 2, price: 450 },
    ],
  },
];

const statusColor = {
  Pending: "warning",
  Confirmed: "success",
  Processing: "info",
  Hold: "default",
  Cancelled: "error",
} as const;

// function Row({ row }: { row: (typeof rows)[number] }) {
//   const [open, setOpen] = React.useState(false);
//   const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

//   const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
//     setAnchorEl(event.currentTarget);
//   };

//   const handleMenuClose = () => {
//     setAnchorEl(null);
//   };

//   return (
//     <>
//       <TableRow
//         hover
//         sx={{
//           "& .MuiTableCell-root": { p: 1 },
//           "&:last-child td, &:last-child th": { border: 0 },
//         }}
//       >
//         <TableCell align="left">
//           <IconButton size="small" onClick={() => setOpen(!open)}>
//             {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
//           </IconButton>
//         </TableCell>
//         <TableCell align="left" sx={{ textDecoration: "underline" }}>
//           #{row.orderId}
//         </TableCell>
//         <TableCell align="left">
//           <Box>
//             <Typography variant="body1">{row.customer.name}</Typography>
//             <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
//               {row.customer.phone}
//             </Typography>
//           </Box>
//         </TableCell>
//         <TableCell align="left">
//           {new Date(row.createdAt).toLocaleString()}
//         </TableCell>
//         <TableCell align="left">
//           <Chip
//             label={row.status}
//             color={statusColor[row.status]}
//             size="small"
//           />
//         </TableCell>
//         <TableCell align="left">{row.address}</TableCell>
//         <TableCell align="left">
//           <IconButton onClick={handleMenuOpen}>
//             <MoreVertIcon fontSize="small" />
//           </IconButton>
//           <CustomPopover
//             anchorEl={anchorEl}
//             onClose={() => setAnchorEl(null)}
//             anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
//             transformOrigin={{ vertical: "top", horizontal: "right" }}
//           >
//             <Menu />
//           </CustomPopover>
//         </TableCell>
//       </TableRow>

//       <TableRow
//         sx={{
//           "& .MuiTableCell-root": { p: 1 },
//           "&:last-child td, &:last-child th": { border: 0 },
//         }}
//       >
//         <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
//           <Collapse in={open} timeout="auto" unmountOnExit>
//             <Paper
//               sx={{
//                 m: 2,
//                 py: 2,
//                 borderRadius: 1,
//                 border: 1,
//                 borderColor: "divider",
//               }}
//             >
//               <Typography variant="h4" fontSize={20} p={2} pt={0}>
//                 Order details
//               </Typography>
//               <Info orders={row.orderItems || []} />
//             </Paper>
//           </Collapse>
//         </TableCell>
//       </TableRow>
//     </>
//   );
// }

export default function CustomTable({ type, head, body }: TableProps) {
  const theme = useTheme();

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const filterText = "";

  const filteredBody = body.filter((row) => {
    return head.some((key) => {
      if (key.includes("@")) return false; // Skip hidden or action columns
      const value = row[key];
      return String(value).toLowerCase().includes(filterText.toLowerCase());
    });
  });

  const paginatedRows =
    rowsPerPage > 0
      ? body.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      : body;

  return (
    <Stack component={Paper} borderRadius={1} overflow={"hidden"}>
      {/* filter */}
      {type !== "rank" && (
        <Stack py={2} px={3}>
          <Filter type={type} />
        </Stack>
      )}
      <TableContainer>
        <Table sx={{ minWidth: 750 }} aria-label="enhanced collapsible table">
          <TableHead
            sx={{
              backgroundColor: alpha(theme.palette.grey[400], 0.1),
            }}
          >
            <TableRow>
              {head.map((h, idx) => {
                if (h.includes("@")) {
                  return <TableCell key={idx} />;
                }

                return (
                  <TableCell key={idx} align="left">
                    {h}
                  </TableCell>
                );
              })}
              {/* 
            <TableCell align="left">Order</TableCell>
            <TableCell align="left">Customer</TableCell>
            <TableCell align="left">Date</TableCell>
            <TableCell align="left">Status</TableCell>
            <TableCell align="left">Address</TableCell>
            <TableCell align="left" /> */}
            </TableRow>
          </TableHead>
          <TableBody
            sx={{
              "& > tr:last-child td": {
                borderBottom: 0,
              },
            }}
          >
            {paginatedRows.map((row, index) => {
              return (
                <Row
                  key={index}
                  type={type}
                  row={{ ...row, rank: "Top" + index }}
                  head={head}
                />
              );
            })}
          </TableBody>
        </Table>
        <TableFooter
          sx={{
            "& .MuiTableCell-root": {
              borderBottom: "none",
            },
          }}
        >
          <TableRow>
            <TableRow>
              {type !== "rank" && (
                <TablePagination
                  rowsPerPageOptions={[
                    { label: "All", value: -1 },
                    10,
                    25,
                    50,
                    100,
                    200,
                    500,
                    1000,
                    2000,
                  ]}
                  count={filteredBody.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(event, newPage) => {
                    setPage(newPage);
                  }}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                  }}
                  sx={{
                    display: "flex",
                    justifyContent: "flex-start",
                    p: 1,
                    px: 0.5,
                    "& .MuiTablePagination-selectLabel": {
                      fontWeight: "bold",
                    },
                  }}
                />
              )}
            </TableRow>
          </TableRow>
        </TableFooter>
      </TableContainer>
    </Stack>
  );
}
