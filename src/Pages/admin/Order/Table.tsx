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
import AlertDialog from "@src/components/AlertDialog";

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

const OrderStatus = ["All", ...orderStatuses];

const OrderTable = () => {
   const router = useRouter();
   const [status, setStatus] = useState<{
      orderRow: OrderType;
      anchorEl: HTMLElement | null;
   }>(
      {} as {
         orderRow: OrderType;
         anchorEl: HTMLElement | null;
      },
   );
   const [orderRows, setOrderRows] = useState(orders);

   // note info
   const [noteModal, setNoteModal] = useState<OrderType | null>(null);
   const [note, setNote] = useState(noteModal?.orderNote || "");

   // quick edit info
   const [editModal, setEditModal] = useState<OrderType | null>(null);

   // delete dialog
   const [deleteDialog, setDeleteDialog] = useState<{
      open: boolean;
      orderRow: OrderType;
   }>({} as { open: boolean; orderRow: OrderType });

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
            setStatus({ orderRow: params.row, anchorEl: e.currentTarget });
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
                     onClick={() => setEditModal(params.row)}
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
               status={OrderStatus}
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
            rows={orderRows as OrderType[]}
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
                     setDeleteDialog({ open: true, orderRow: params.row });
                  },
               },
            ]}
         />

         {/* status Changing */}
         <CustomPopover
            anchorEl={status.anchorEl}
            onClose={() => setStatus((prev) => ({ ...prev, anchorEl: null }))}
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
                  orderStatuses?.map((s) => ({
                     label: s,
                     onClick: (l) => {
                        setOrderRows((prev) =>
                           prev.map((or) =>
                              or.orderId === status.orderRow.orderId
                                 ? { ...or, status: l }
                                 : or,
                           ),
                        );
                        setStatus((prev) => ({ ...prev, anchorEl: null }));
                     },
                  })) ?? []
               }
               onClose={() =>
                  setStatus((prev) => ({ ...prev, anchorEl: null }))
               }
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
                     onClick={() => {
                        if (noteModal === null) return;

                        setOrderRows((prev) =>
                           prev.map((or) =>
                              or.orderId === noteModal.orderId
                                 ? { ...or, orderNote: note }
                                 : or,
                           ),
                        );
                        setNoteModal(null);
                     }}
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
            sx={{
               width: {
                  xs: "90%",
                  sm: 650,
               },
            }}
            title="Quick Edit"
         >
            <QuickEditModal
               products={editModal?.products || []}
               onClose={() => setEditModal(null)}
               onUpdate={(p) => {
                  if (!editModal) return;
                  setOrderRows((prev) =>
                     prev.map((or) =>
                        or.orderId === editModal.orderId
                           ? { ...or, products: p }
                           : or,
                     ),
                  );
               }}
            />
         </CustomModal>

         <AlertDialog
            open={deleteDialog.open}
            type={"delete"}
            title={`Are you sure you want to delete <b>${deleteDialog.orderRow?.orderId || "this"}</b> order?`}
            onClose={() => {
               setDeleteDialog((prev) => ({ ...prev, open: false }));
            }}
            onConfirm={() => {
               if (!deleteDialog.orderRow) return;

               setOrderRows((prev) =>
                  prev.filter(
                     (or) => or.orderId !== deleteDialog.orderRow.orderId,
                  ),
               );
               setDeleteDialog({
                  open: false,
                  orderRow: {} as OrderType,
               });
            }}
         />
      </Stack>
   );
};

export default OrderTable;
