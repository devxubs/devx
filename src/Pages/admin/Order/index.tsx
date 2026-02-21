"use client";

import {
   Stack,
   Button,
   Typography,
   useTheme,
   Box,
   IconButton,
   Tooltip,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import React, { useState } from "react";
import { orders } from "./data";
import User from "../Customers/CustomerInfo";
import CreateAt from "./CreateAt";
import { OrderType } from "./type";
import NoteModal from "./NoteModal";
import Link from "next/link";
import AlertDialog from "@src/components/AlertDialog";
import { useRouter } from "next/navigation";
import CustomModal from "@src/components/Modal";
import OrderFilterModal from "@src/Pages/admin/Order/OrderFilterModel";
import Scrollbar from "react-browser-scrollbar";
import OrderFilter from "./OrderFilter";
import { MenuItem } from "@src/components/Menu";
import { GridRenderCellParams } from "@mui/x-data-grid";

const statusColor: Record<
   string,
   "default" | "warning" | "success" | "info" | "error"
> = {
   All: "default",
   Pending: "warning",
   Confirmed: "success",
   Processing: "info",
   Shipped: "info",
   "Out for Delivery": "info",
   Delivered: "success",
   Completed: "success",
   Hold: "default",
   Cancelled: "error",
   Failed: "error",
} as const;

// const cOrder = (orders as OrderType[]).map((o, i) => {
// const d = new Date(o.createdAt);
// const dateOnly = d.toLocaleDateString();
// const timeOnly = d.toLocaleTimeString();

//    return {
//       ...o,
//       products: o.products,
//       note: <NoteModal note={o.orderNote || ""} />,
//       order: (
// <Link
//    href={`/order/${encodeURIComponent(o.orderId)}`}
//    style={{ textDecoration: "none" }}
// >
//    <Typography
//       color="textPrimary"
//       sx={{
//          cursor: "pointer",
//          "&:hover": { textDecoration: "underline" },
//       }}
//    >
//       {o.orderId}
//    </Typography>
// </Link>
//       ),
//       customer: (
//          <User
//             name={o.customer.name}
//             email={o.customer.email}
//             number={o.customer.phone}
//          />
//       ),
//       date: <CreateAt date={dateOnly} time={timeOnly} />,
//       address: (
//          <Typography
//             variant="body2"
//             sx={{
//                display: "-webkit-box",
//                WebkitLineClamp: 2, // show max 2 lines
//                WebkitBoxOrient: "vertical",
//                overflow: "hidden",
//                textOverflow: "ellipsis",
//                whiteSpace: "normal", // allow wrapping
//             }}
//          >
//             {o.customer.address}
//          </Typography>
//       ),
//       price: o.pricing.total,
//       status: o.status,
//       chip: "status",
//       color: statusColor[o.status],
//    };
// });

const columns: ColumnConfig[] = [
   { field: "orderId", headerName: "ID", flex: 0.3 },
   {
      field: "note",
      headerName: "Note",
      renderCell: (params) => {
         return (
            <NoteModal
               note={params.row.orderNote ? params.row.orderNote : ""}
            />
         );
      },
      flex: 0.3,
   },
   {
      field: "invoiceNo",
      headerName: "Order",
      flex: 1,
      renderCell: (params) => {
         return (
            <Stack
               spacing={1}
               direction="row"
               alignItems="center"
               height={"100%"}
            >
               <Stack>
                  <Typography variant="body2" color="textPrimary">
                     {params.row.employee.name}
                  </Typography>
                  <Typography
                     variant="body2"
                     fontSize={14}
                     color="textSecondary"
                  >
                     {params.row.orderSource}
                  </Typography>
               </Stack>
            </Stack>
         );
         // (
         // <Link
         //    href={`/order/${encodeURIComponent(params.row.orderId)}`}
         //    style={{
         //       textDecoration: "none",
         //       height: "100%",
         //       display: "flex",
         //       alignItems: "center",
         //    }}
         // >
         //    <Typography
         //       color="textPrimary"
         //       variant="body2"
         //       sx={{
         //          cursor: "pointer",
         //          "&:hover": { textDecoration: "underline" },
         //       }}
         //    >
         //       {params.row.invoiceNo}
         //    </Typography>
         // </Link>
         // ),
      },
   },
   {
      field: "customer",
      headerName: "Customer",
      renderCell: (params) => <User {...params.row.customer} />,
      flex: 1,
   },
   {
      field: "date",
      headerName: "Date",
      renderCell: (params) => {
         const d = new Date(params.row.createdAt);
         const dateOnly = d.toLocaleDateString();
         const timeOnly = d.toLocaleTimeString();

         return <CreateAt date={dateOnly} time={timeOnly} />;
      },
   },
   {
      field: "price",
      headerName: "Price",
      renderCell: (params) => `$${params.row.pricing.total}`,
   },
   {
      field: "status",
      headerName: "Status",
      chip: true,

      flex: 0.5,
   },
   { field: "@actions", headerName: "", flex: 0.1 },
];

const Order = () => {
   const router = useRouter();
   const theme = useTheme();

   // Delete dialog states
   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
   const [productToDelete, setProductToDelete] = useState<any>(null);

   const handleDeleteConfirm = () => {
      console.log("Deleting user:", productToDelete);
      // 👉 Here you can call API or update state
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
   };
   return (
      <>
         <Stack spacing={2} py={2}>
            {/* Header */}
            <Stack direction={"row"} justifyContent={"flex-end"} spacing={2}>
               <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                     <Icon
                        icon="mingcute:add-line"
                        style={{
                           color: theme.palette.text.primary,
                        }}
                     />
                  }
                  onClick={() => router.push("/admin/order/publish")}
               >
                  Create order
               </Button>
            </Stack>
            <Stack width={"100%"} overflow={"hidden"}>
               <CustomTable
                  rows={orders as any}
                  columns={columns}
                  // filter={(data, onChange) => OrderFilter(data, onChange)}
                  checkBox
                  menuItems={[
                     {
                        label: "Print",
                        icon: (
                           <Icon
                              icon="solar:printer-minimalistic-bold"
                              size="small"
                           />
                        ),
                        onClick: () => {},
                     },
                     {
                        label: "edit",
                        icon: <Icon icon="solar:pen-bold" size="small" />,
                        onClick: (params: GridRenderCellParams) => {
                           router.push(
                              `/order/publish?id=${encodeURIComponent(params.row.orderId)}`,
                           );
                        },
                     },
                     {
                        label: "delete",
                        color: "error",
                        icon: (
                           <Icon
                              icon="solar:trash-bin-trash-bold"
                              size="small"
                              color="error"
                           />
                        ),
                        onClick: (params: GridRenderCellParams) => {
                           // setDeleteConform(true);
                           setProductToDelete(params.row);
                           setIsDeleteDialogOpen(true);
                        },
                     },
                  ]}
               />
            </Stack>
         </Stack>
         <AlertDialog
            type="delete"
            open={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            title={productToDelete?.product_name}
            onConfirm={handleDeleteConfirm}
         />
      </>
   );
};

export default Order;
