"use client";

import {
  Stack,
  Button,
  Typography,
  Avatar,
  Box,
  useTheme,
  alpha,
  Container,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import CustomTable, { TableProps, TableRow } from "@src/components/Table";
import React, { useState } from "react";
import Scrollbar from "react-browser-scrollbar";
import LinearProgress, {
  linearProgressClasses,
} from "@mui/material/LinearProgress";
import Modal from "./Modal";

const AllProducts = [
  {
    id: 1,
    name: "Urban Explorer Sneakers",
    category: "Accessories",
    date: "03 Sep 2025",
    time: "5:59 pm",
    stock: "out of stock",
    stockValue: 0,
    price: 83.74,
    image: "/images/product-1.webp",
  },
  {
    id: 2,
    name: "Classic Leather Loafers",
    category: "Shoes",
    date: "02 Sep 2025",
    time: "4:59 pm",
    stock: "72 in stock",
    stockValue: 72,
    price: 97.14,
    image: "/images/product-2.webp",
  },
  {
    id: 3,
    name: "Mountain Trekking Boots",
    category: "Apparel",
    date: "01 Sep 2025",
    time: "3:59 pm",
    stock: "10 low stock",
    stockValue: 10,
    price: 68.71,
    image: "/images/product-3.webp",
  },
  {
    id: 4,
    name: "Elegance Stiletto Heels",
    category: "Shoes",
    date: "31 Aug 2025",
    time: "2:59 pm",
    stock: "72 in stock",
    stockValue: 72,
    price: 85.21,
    image: "/images/product-4.webp",
  },
];

const Stock = ({
  stockValue,
  stock,
}: {
  stockValue: number;
  stock: string;
}) => {
  const theme = useTheme();
  const color =
    stockValue === 0 ? "error" : stockValue <= 10 ? "warning" : "primary";
  return (
    <Stack spacing={1}>
      <LinearProgress
        variant="determinate"
        value={stockValue}
        color={color}
        sx={{
          height: 6,
          borderRadius: 5,
          [`&.MuiLinearProgress-root`]: {
            backgroundColor: theme.palette.grey[200],
            ...theme.applyStyles("dark", {
              backgroundColor: alpha(theme.palette[color].main, 0.2),
            }),
          },
          [`& .${linearProgressClasses.bar}`]: {
            borderRadius: 5,
          },
        }}
      />

      <Typography
        variant="body2"
        fontSize={12}
        fontWeight={600}
        color="textSecondary"
      >
        {stock}
      </Typography>
    </Stack>
  );
};

const CreateAt = ({ date, time }: { date: string; time: string }) => {
  return (
    <Stack spacing={1} direction="row" alignItems="center">
      <Stack>
        <Typography
          variant="body1"
          fontSize={16}
          color="textPrimary"
          sx={{
            "&:hover": {
              cursor: "pointer",
              textDecoration: "underline",
            },
          }}
        >
          {date}
        </Typography>
        <Typography variant="body2" fontSize={14} color="textSecondary">
          {time}
        </Typography>
      </Stack>
    </Stack>
  );
};

const ProductsView = ({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url?: string;
}) => {
  return (
    <Stack spacing={1} direction="row" alignItems="center">
      <Avatar
        variant="rounded"
        src={url}
        sx={{
          width: 70,
          height: 70,
        }}
      />
      <Stack>
        <Typography
          variant="body1"
          fontSize={16}
          color="textPrimary"
          sx={{
            "&:hover": {
              cursor: "pointer",
              textDecoration: "underline",
            },
          }}
        >
          {name}
        </Typography>
        <Typography variant="body2" fontSize={14} color="textSecondary">
          {description}
        </Typography>
      </Stack>
    </Stack>
  );
};

const products: Omit<TableProps, "type"> = {
  head: ["@check", "Product", "Create at", "Stock", "price", "@action"],
  body: AllProducts.map((product) => ({
    id: product.id,
    product: [
      product.name,
      <ProductsView
        key={product.id}
        name={product.name}
        description={product.category}
        url={product.image}
      />,
    ],
    create_at: [
      `${product.date} at ${product.time}`,
      <CreateAt key={product.id} date={product.date} time={product.time} />,
    ],
    stock: [
      product.stockValue,
      <Stock
        key={product.id}
        stockValue={product.stockValue}
        stock={product.stock}
      />,
    ],
    price: `$${product.price}`,
  })),
};

const Product = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState({} as TableRow);
  const actionMenu = (row: any) => [
    {
      label: "edit",
      onClick: () => {
        // setSelectedProduct({ ...row, name: row.name[0] }); // store clicked user
        setMode("edit");
        setIsModalOpen(true);
      },
    },
    {
      label: "delete",
      color: "error",
      onClick: () => {
        // setDeleteConform(true);
        setProductToDelete(row);
        setIsDeleteDialogOpen(true);
      },
    },
  ];

  const [mode, setMode] = useState<"add" | "edit">("edit");

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
    <Scrollbar autoHide thumbSize={6} darkMode>
      <Stack spacing={2}>
        {/* Header */}
        <Stack direction={"row"} justifyContent={"flex-end"} spacing={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Icon icon="solar:user-plus-bold-duotone" />}
            onClick={() => {
              setMode("add");
              setSelectedProduct({});
              setIsModalOpen(true);
            }}
          >
            Add user
          </Button>
        </Stack>
        <Stack>
          <CustomTable
            type={"product"}
            head={products.head}
            body={products.body}
            actionMenu={(row) => actionMenu(row)}
          />
        </Stack>
      </Stack>
      <CustomModal
        sx={{
          width: "100%",
          height: "100vh",
          borderRadius: 0,
          boxShadow: "none!important",
        }}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        // title={mode === "add" ? "Add User" : "Edit User"}
      >
        <Stack
          sx={{
            height: "100%",
            overflowY: "auto",
            scrollbarWidth: "none!important",
            "&::-webkit-scrollbar": { display: "none!important" },
          }}
        >
          <Stack maxWidth={650} mx={"auto"} height={"100%"}>
            <Modal
              mode={mode}
              onClose={() => setIsModalOpen(false)}
              userData={selectedProduct || {}}
              onChange={(d) => {
                setSelectedProduct({ ...selectedProduct, ...d });
              }}
            />
          </Stack>
        </Stack>
      </CustomModal>
      <CustomModal
        // sx={{ width: { xs: "90%", md: 900 } }}
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title={"Delete User"}
      >
        <Stack>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{productToDelete?.email || "this user"}</strong>?
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
            <Button
              onClick={() => setIsDeleteDialogOpen(false)}
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      </CustomModal>
    </Scrollbar>
  );
};

export default Product;
