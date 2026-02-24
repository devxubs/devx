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
import CustomTable, { ColumnConfig } from "@src/components/Table";
import React, { useState } from "react";
import Scrollbar from "react-browser-scrollbar";
import LinearProgress, {
   linearProgressClasses,
} from "@mui/material/LinearProgress";
import AlertDialog from "@src/components/AlertDialog";
import { useRouter } from "next/navigation";
import CustomAutocomplete from "@src/components/Autocomplete";

export const productsData = [
   {
      id: 1,
      productName: "Elegance Stiletto Heels",
      subDescription: "Stylish high heels for evening wear",
      content:
         "These stiletto heels feature a sleek design, cushioned insole, and durable sole — perfect for parties, events, or formal occasions.",
      images: [
         "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-1.webp",
         "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-2.webp",
      ],
      productCode: "ESH-2025",
      productSku: "SH-0004",
      quantity: "72",
      stockValue: "In Stock",
      category: "Shoes",
      productType: "Heels",
      color: ["Red", "Black", "Nude"],
      size: ["36", "37", "38", "39", "40", "41"],
      regularPrice: "95.21",
      salePrice: "85.21",
      date: "31 Aug 2025",
      time: "2:59 pm",
   },
   {
      id: 2,
      productName: "Classic Leather Handbag",
      subDescription: "Elegant handbag crafted from premium leather",
      content:
         "Designed with spacious compartments and a timeless design, this leather handbag is perfect for daily or formal use.",
      images: [
         "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-10.webp",
         "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-9.webp",
      ],
      productCode: "CLH-2025",
      productSku: "HB-0005",
      quantity: "0",
      stockValue: "Out of Stock",
      category: "Bags",
      productType: "Handbag",
      color: ["Black", "Brown", "Beige"],
      size: ["Medium"],
      regularPrice: "149.99",
      salePrice: "129.99",
      date: "02 Sep 2025",
      time: "11:45 am",
   },
   {
      id: 3,
      productName: "Modern Denim Jacket",
      subDescription: "Casual yet stylish denim jacket",
      content:
         "Crafted from durable denim with a modern fit, this jacket provides comfort and a versatile look.",
      images: ["/images/product-3.webp", "/images/product-3a.webp"],
      productCode: "MDJ-2025",
      productSku: "CJ-0006",
      quantity: "10",
      stockValue: "Low Stock",
      category: "Clothing",
      productType: "Jacket",
      color: ["Blue", "Black", "Light Wash"],
      size: ["S", "M", "L", "XL"],
      regularPrice: "79.99",
      salePrice: "69.50",
      date: "05 Sep 2025",
      time: "4:20 pm",
   },
   {
      id: 4,
      productName: "Smart Fitness Watch",
      subDescription: "Track your fitness and stay connected",
      content:
         "This smartwatch offers fitness tracking, sleep analysis, and notifications, with long-lasting battery and water resistance.",
      images: [
         "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-8.webp",
         "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-7.webp",
      ],
      productCode: "SFW-2025",
      productSku: "AC-0007",
      quantity: "120",
      stockValue: "In Stock",
      category: "Accessories",
      productType: "Smartwatch",
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
      <Stack spacing={1} justifyContent="center" height={"100%"}>
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
      <Stack spacing={1} direction="row" alignItems="center" height={"100%"}>
         <Stack>
            <Typography
               variant="body1"
               fontSize={15}
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
            <Typography variant="body2" fontSize={13} color="textSecondary">
               {time}
            </Typography>
         </Stack>
      </Stack>
   );
};

export const ProductsView = ({
   name,
   description,
   url,
}: {
   name: string;
   description: string;
   url?: string;
}) => {
   return (
      <Stack spacing={1} direction="row" alignItems="center" height={"100%"}>
         <Avatar
            variant="rounded"
            src={url}
            sx={{
               width: 50,
               height: 50,
            }}
         />
         <Stack>
            <Typography
               variant="body1"
               fontSize={15}
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
            <Typography variant="body2" fontSize={13} color="textSecondary">
               {description}
            </Typography>
         </Stack>
      </Stack>
   );
};

const columns: ColumnConfig[] = [
   {
      field: "id",
      headerName: "ID",
   },
   {
      field: "product",
      headerName: "Product",
      flex: 2,
      renderCell: (params: any) => {
         return (
            <ProductsView
               key={params.row.id}
               name={params.row.productName}
               description={params.row.category}
               url={params.row.images[0]}
            />
         );
      },
   },
   {
      field: "createAt",
      headerName: "Create at",
      flex: 1,
      renderCell: (params: any) => {
         return (
            <CreateAt
               key={params.row.id}
               date={params.row.date}
               time={params.row.time}
            />
         );
      },
   },
   {
      field: "stock",
      headerName: "Stock",
      flex: 1,
      renderCell: (params: any) => {
         return (
            <Stock
               key={params.row.id}
               quantity={parseInt(params.row.quantity)}
            />
         );
      },
   },
   {
      field: "price",
      headerName: "Price",
      flex: 1,
      renderCell: (params: any) =>
         `$${params.row.salePrice ? params.row.salePrice : params.row.regularPrice}`,
   },
   {
      field: "@actions",
      headerName: "",
   },
];

const Product = () => {
   const theme = useTheme();
   const router = useRouter();
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
                  onClick={() => router.push("/admin/product/publish")}
               >
                  Add product
               </Button>
            </Stack>
            <Stack>
               <CustomTable
                  rows={productsData}
                  columns={columns}
                  checkBox={true}
                  menuItems={[
                     { label: "Edit", onClick: () => {} },
                     { label: "Delete", color: "error", onClick: () => {} },
                  ]}
                  filter={(data, onChange) => {
                     return (
                        <Stack sx={{ width: "30%" }}>
                           <CustomAutocomplete
                              label="Stock"
                              options={[
                                 "In stock",
                                 "Low stock",
                                 "Out of stock",
                              ]}
                              value={data.productStock || ""}
                              onChange={(val: string) =>
                                 onChange?.({
                                    productStock: val,
                                 })
                              }
                           />
                        </Stack>
                     );
                  }}
               />
            </Stack>
         </Stack>
         <AlertDialog
            type="delete"
            open={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            title={productToDelete?.productName}
            onConfirm={handleDeleteConfirm}
         />
      </Scrollbar>
   );
};

export default Product;
