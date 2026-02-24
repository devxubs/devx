"use client";

import { Stack, IconButton, Tooltip, TextField, Button } from "@mui/material";
import { GridRenderCellParams } from "@mui/x-data-grid";
import Icon from "@src/components/Icon";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import React, { useState } from "react";
import { orders } from "./data";
import CreateAt from "./CreateAt";
import User from "../Customers/CustomerInfo";
import OrderFilter from "./OrderFilter";
import OrderTab from "./OrderTab";
import { useRouter } from "next/navigation";
import CustomPopover from "@src/components/CustomPopover";
import Menu from "@src/components/Menu";
import { orderStatuses } from "@src/handler/order_filter";
import CustomModal from "@src/components/Modal";
import { OrderType, ProductType } from "./type";
import QuickEditModal from "./QuickEditModal";

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

const status = ["All", ...orderStatuses];

const OrderTable = () => {
   const router = useRouter();
   const [statusAnchorEl, setStatusAnchorEl] = useState<HTMLElement | null>(
      null,
   );

   // note info
   const [noteModal, setNoteModal] = useState<OrderType | null>(null);
   const [note, setNote] = useState(noteModal?.orderNote || "");

   // quick edit info
   const [editModal, setEditModal] = useState<ProductType[] | null>(null);

   const columns: ColumnConfig[] = [
      { field: "orderId", headerName: "ID", flex: 0.3 },
      {
         field: "note",
         headerName: "Note",
         renderCell: (params) => {
            return (
               <>
                  <Tooltip title={params.row.orderNote} disableInteractive>
                     <IconButton
                        onClick={() => {
                           setNoteModal(params.row);
                           setNote(params.row.orderNote);
                        }}
                     >
                        <Icon icon="solar:add-square-broken" size="small" />
                     </IconButton>
                  </Tooltip>
               </>
            );
         },
         flex: 0.3,
      },
      {
         field: "customer",
         headerName: "Customer",
         renderCell: (params) => {
            return <User {...params.row.customer} />;
         },
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
         field: "orderSource",
         headerName: "Source",
      },
      {
         field: "price",
         headerName: "Price",
         renderCell: (params) => `$${params.row.pricing.total}`,
      },
      {
         field: "status",
         headerName: "Status",
         flex: 0.5,
         chip: true,
         color: (params) => {
            return statusColor[params.row.status] || "default";
         },
         onClick: (params, e) => {
            setStatusAnchorEl(e.currentTarget);
         },
      },
      {
         field: "__quick_edit__",
         headerName: "",
         align: "right",
         flex: 0.1,
         sortable: false,
         filterable: false,
         disableColumnMenu: true,
         renderCell: (params) => {
            return (
               <Tooltip title={"Quick Edit"} disableInteractive>
                  <IconButton
                     size="small"
                     onClick={() => setEditModal(params.row.products)}
                  >
                     <Icon icon="solar:pen-bold" size="small" />
                  </IconButton>
               </Tooltip>
            );
         },
      },
      { field: "@actions", headerName: "", flex: 0.1 },
   ];

   return (
      <Stack
         bgcolor={"background.paper"}
         sx={{
            borderRadius: 1,
            overflow: "hidden",
         }}
      >
         {/* Order tab */}
         <Stack>
            <OrderTab
               status={status}
               // value={
               //    orderStatuses.lastIndexOf(
               //       filterData.orderData.status || "",
               //    ) === -1
               //       ? 0
               //       : orderStatuses.lastIndexOf(
               //            filterData.orderData.status || "",
               //         ) + 1
               // }
               // onChange={(s) => {
               //    setFilterData((prev) => ({
               //       ...prev,
               //       orderData: {
               //          ...prev.orderData,
               //          status: s === "All" ? "" : s,
               //       },
               //    }));
               // }}
            />
         </Stack>
         <CustomTable
            rows={orders as any}
            columns={columns}
            filter={(data, onChange) => OrderFilter(data, onChange)}
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
                        `/admin/order/publish?id=${encodeURIComponent(params.row.orderId)}`,
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
                     // setProductToDelete(params.row);
                     // setIsDeleteDialogOpen(true);
                  },
               },
            ]}
         />

         {/* status Changing */}
         <CustomPopover
            anchorEl={statusAnchorEl}
            onClose={() => setStatusAnchorEl(null)}
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
                  orderStatuses?.map((status) => ({
                     label: status,
                     onClick: () => {
                        setStatusAnchorEl(null);
                     },
                  })) ?? []
               }
               onClose={() => setStatusAnchorEl(null)}
            />
         </CustomPopover>

         {/* note modal */}
         <CustomModal
            open={Boolean(noteModal)}
            onClose={() => setNoteModal(null)}
            sx={{ borderRadius: 1, width: 400 }}
            title="Note"
         >
            <Stack spacing={2}>
               <TextField
                  label="Note"
                  variant="outlined"
                  required
                  value={note}
                  onChange={(e) => {
                     setNote(e.target.value);
                  }}
               />
               <Stack
                  spacing={2}
                  direction={"row"}
                  alignItems={"center"}
                  justifyContent={"flex-end"}
               >
                  <Button
                     variant="text"
                     color="inherit"
                     onClick={() => {
                        setNoteModal(null);
                     }}
                  >
                     Cancel
                  </Button>
                  <Button
                     variant="contained"
                     color="primary"
                     type="submit"
                     disabled={note.length === 0}
                     // onClick={}
                  >
                     {noteModal?.orderNote.length ? "Update note" : "Add note"}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>

         {/* quick edit modal */}
         <CustomModal
            open={Boolean(editModal)}
            onClose={() => setEditModal(null)}
            sx={{ width: 500 }}
            title="Note"
         >
            <QuickEditModal
               products={editModal || []}
               onClose={() => setEditModal(null)}
            />
         </CustomModal>
      </Stack>
   );
};

export default OrderTable;
