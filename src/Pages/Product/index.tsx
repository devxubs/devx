"use client";

import {
  Stack,
  Button,
  Typography,
  Avatar,
  Box,
  useTheme,
  alpha,
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
    product_name: "Elegance Stiletto Heels",
    sub_description: "Stylish high heels for evening wear",
    content:
      "These stiletto heels feature a sleek design, cushioned insole, and durable sole — perfect for parties, events, or formal occasions.",
    images: [
      "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-1.webp",
      "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-2.webp",
    ],
    product_code: "ESH-2025",
    product_sku: "SH-0004",
    quantity: "72",
    category: "Shoes",
    product_type: "Heels",
    color: ["Red", "Black", "Nude"],
    size: ["36", "37", "38", "39", "40", "41"],
    regularPrice: "95.21",
    salePrice: "85.21",
    date: "31 Aug 2025",
    time: "2:59 pm",
  },
  {
    id: 2,
    product_name: "Classic Leather Handbag",
    sub_description: "Elegant handbag crafted from premium leather",
    content:
      "Designed with spacious compartments and a timeless design, this leather handbag is perfect for daily or formal use.",
    images: [
      "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-10.webp",
      "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-9.webp",
    ],
    product_code: "CLH-2025",
    product_sku: "HB-0005",
    quantity: "0",
    category: "Bags",
    product_type: "Handbag",
    color: ["Black", "Brown", "Beige"],
    size: ["Medium"],
    regularPrice: "149.99",
    salePrice: "129.99",
    date: "02 Sep 2025",
    time: "11:45 am",
  },
  {
    id: 3,
    product_name: "Modern Denim Jacket",
    sub_description: "Casual yet stylish denim jacket",
    content:
      "Crafted from durable denim with a modern fit, this jacket provides comfort and a versatile look.",
    images: ["/images/product-3.webp", "/images/product-3a.webp"],
    product_code: "MDJ-2025",
    product_sku: "CJ-0006",
    quantity: "10",
    category: "Clothing",
    product_type: "Jacket",
    color: ["Blue", "Black", "Light Wash"],
    size: ["S", "M", "L", "XL"],
    regularPrice: "79.99",
    salePrice: "69.50",
    date: "05 Sep 2025",
    time: "4:20 pm",
  },
  {
    id: 4,
    product_name: "Smart Fitness Watch",
    sub_description: "Track your fitness and stay connected",
    content:
      "This smartwatch offers fitness tracking, sleep analysis, and notifications, with long-lasting battery and water resistance.",
    images: [
      "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-8.webp",
      "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-7.webp",
    ],
    product_code: "SFW-2025",
    product_sku: "AC-0007",
    quantity: "120",
    category: "Accessories",
    product_type: "Smartwatch",
    color: ["Black", "Silver", "Rose Gold"],
    size: ["One Size"],
    regularPrice: "229.00",
    salePrice: "199.00",
    date: "08 Sep 2025",
    time: "9:10 am",
  },
];

const Stock = ({ quantity }: { quantity: number }) => {
  const theme = useTheme();
  const color =
    quantity === 0 ? "error" : quantity <= 10 ? "warning" : "primary";
  return (
    <Stack spacing={1}>
      <LinearProgress
        variant="determinate"
        value={Math.min(quantity, 80)}
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
        {quantity === 0
          ? "out of stock"
          : quantity <= 10
          ? quantity + " low stock"
          : quantity + " in stock"}
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
      product.product_name,
      <ProductsView
        key={product.id}
        name={product.product_name}
        description={product.category}
        url={product.images[0]}
      />,
    ],
    create_at: [
      `${product.date} at ${product.time}`,
      <CreateAt key={product.id} date={product.date} time={product.time} />,
    ],
    stock: [
      product.quantity,
      <Stock key={product.id} quantity={parseInt(product.quantity)} />,
    ],
    price: `$${product.salePrice ? product.salePrice : product.regularPrice}`,

    product_name: product.product_name,
    sub_description: product.sub_description,
    content: product.content,
    images: product.images,
    product_code: product.product_code,
    product_sku: product.product_sku,
    quantity: product.quantity,
    category: product.category,
    product_type: product.product_type,
    color: product.color,
    size: product.size,
    regularPrice: product.regularPrice,
    salePrice: product.salePrice,
  })),
};

const Product = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState({} as TableRow);

  const actionMenu = (row: any) => [
    {
      label: "edit",
      onClick: () => {
        setSelectedProduct(row); // store clicked user
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
              data={selectedProduct || {}}
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
