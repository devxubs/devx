"use client";

import { Stack, Button, Typography } from "@mui/material";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import CustomTable, { TableRow } from "@src/components/Table";
import React, { useState } from "react";
import DeleteDialog from "@src/components/DeleteDialog";
import { orders } from "./data";
import User from "./User";
import CreateAt from "./CreateAt";
import { OrderType } from "./type";
import NoteModal from "./NoteModal";

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

const cOrder = (orders as OrderType[]).map((o, i) => {
  return {
    ...o,
    products: o.products,
    note: <NoteModal note={o.note} />,
    order: o.orderId,
    customer: (
      <User
        name={o.customer.name}
        email={o.customer.email}
        number={o.customer.phone}
      />
    ),
    date: <CreateAt date={o.date} time={o.time} />,
    address: (
      <Typography
        variant="body2"
        sx={{
          display: "-webkit-box",
          WebkitLineClamp: 2, // show max 2 lines
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "normal", // allow wrapping
        }}
      >
        {o.customer.address}
      </Typography>
    ),
    price: o.pricing.total,
    status: o.status,
    chip: "status",
    color: statusColor[o.status],
  };
});

const OrderItem = {
  head: [
    "@check",
    "Note",
    "Order",
    "Customer",
    "Date",
    "Price",
    "Address",
    "Status",
    "@action",
  ],
  body: cOrder,
};

const Order = () => {
  const actionMenu = (row: any) => [
    {
      label: "Print",
      icon: <Icon icon="solar:printer-minimalistic-bold" size="small" />,
      onClick: () => {},
    },
    {
      label: "edit",
      icon: <Icon icon="solar:pen-bold" size="small" />,
      onClick: () => {},
    },
    {
      label: "delete",
      color: "error",
      icon: (
        <Icon icon="solar:trash-bin-trash-bold" size="small" color="error" />
      ),
      onClick: () => {
        // setDeleteConform(true);
        setProductToDelete(row);
        setIsDeleteDialogOpen(true);
      },
    },
  ];

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
            startIcon={<Icon icon="solar:user-plus-bold-duotone" />}
            onClick={() => {}}
          >
            Create order
          </Button>
        </Stack>
        <Stack width={"100%"} overflow={"hidden"}>
          <CustomTable
            type={"order"}
            head={OrderItem.head}
            body={OrderItem.body as any}
            actionMenu={(row) => actionMenu(row)}
          />
        </Stack>
      </Stack>
      <DeleteDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title={productToDelete?.product_name}
        onDelete={handleDeleteConfirm}
      />
    </>
  );
};

export default Order;
