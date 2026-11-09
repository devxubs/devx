"use client";

import {
   Stack,
   Button,
   Typography,
   Avatar,
   Box,
   useTheme,
   useMediaQuery,
   alpha,
   Chip,
   Grid,
   Divider,
   CircularProgress,
   IconButton,
   Tooltip,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { TableSkeleton } from "@src/components/SkeletonLoader";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Scrollbar from "react-browser-scrollbar";
import LinearProgress, {
   linearProgressClasses,
} from "@mui/material/LinearProgress";
import AlertDialog from "@src/components/AlertDialog";
import { useRouter } from "next/navigation";
import CustomAutocomplete from "@src/components/Autocomplete";
import CustomModal from "@src/components/Modal";
import { useSettings } from "@src/lib/settingsContext";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import ExportProductModal from "./ExportProductModal";

export type ProductType = {
   id: string;
   customId?: string;
   product?: string;
   productName: string;
   subDescription: string;
   content: string;
   images: string[];
   productCode: string;
   productSku: string;
   quantity: number;
   stock?: number;
   stockValue: string;
   category: string;
   productType: string;
   color: string[];
   size: string[];
   price?: number;
   regularPrice: number;
   salePrice?: number;
   createAt?: string;
   date: string;
   time: string;
};

export const productsData: ProductType[] = [];

export const Stock = ({
   quantity,
   lowAlert,
}: {
   quantity: number;
   lowAlert?: number;
}) => {
   const theme = useTheme();
   const color =
      quantity === 0
         ? "error"
         : quantity <= (lowAlert || 0)
           ? "warning"
           : "primary";
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
               ? "Out of stock"
               : quantity <= (lowAlert || 0)
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
            <Typography variant="body1" fontSize={15} color="textPrimary">
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
   onClick,
}: {
   name: string;
   description: string;
   url?: string;
   onClick?: () => void;
}) => {
   return (
      <Stack
         spacing={1}
         direction="row"
         alignItems="center"
         height={"100%"}
         onClick={onClick}
         sx={{ cursor: onClick ? "pointer" : "default" }}
      >
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
                     textDecoration: onClick ? "underline" : "none",
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

const Product = () => {
   const theme = useTheme();
   const router = useRouter();
   const { formatCurrency } = useSettings();
   const { filterQueryData } = useFilterQuery();

   const [products, setProducts] = useState<ProductType[]>([]);
   const [initialLoading, setInitialLoading] = useState(true);
   const [isFetching, setIsFetching] = useState(false);
   const [selectedProductId, setSelectedProductId] = useState<string | null>(
      null,
   );
   const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
   const [exportModalOpen, setExportModalOpen] = useState(false);
   const [categories, setCategories] = useState<string[]>([]);
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
   const [viewProduct, setViewProduct] = useState<any>(null);
   const [loadingDetail, setLoadingDetail] = useState(false);

   useEffect(() => {
      if (!selectedProductId) {
         setViewProduct(null);
         return;
      }
      setLoadingDetail(true);
      fetch(`/api/products/${selectedProductId}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => setViewProduct(d))
         .catch(() => {})
         .finally(() => setLoadingDetail(false));
   }, [selectedProductId]);

   useEffect(() => {
      fetch("/api/categories")
         .then((r) => (r.ok ? r.json() : []))
         .then((data) => {
            const list = Array.isArray(data) ? data : data.categories || [];
            setCategories(list.map((c: any) => c.name));
         })
         .catch(() => {});
   }, []);

   const columns: ColumnConfig[] = useMemo(
      () => [
         {
            field: "customId",
            headerName: "ID",
            width: 110,
            renderCell: (params: any) => (
               <Typography
                  variant="body2"
                  fontWeight={600}
                  color="primary.main"
                  sx={{
                     cursor: "pointer",
                     "&:hover": { textDecoration: "underline" },
                  }}
                  onClick={() =>
                     setSelectedProductId(params.row.customId || params.row.id)
                  }
               >
                  {params.row.customId ||
                     params.row.productCode ||
                     params.row.id}
               </Typography>
            ),
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
                     onClick={() =>
                        setSelectedProductId(
                           params.row.customId || params.row.id,
                        )
                     }
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
               formatCurrency(params.row.salePrice || params.row.regularPrice),
         },
         {
            field: "@actions",
            headerName: "",
         },
      ],
      [formatCurrency],
   );

   const loadProducts = useCallback(async () => {
      setIsFetching(true);
      try {
         const params = new URLSearchParams();
         params.set("limit", "100");
         if (filterQueryData.searchText) {
            params.set("search", filterQueryData.searchText);
         }
         if (filterQueryData.productStock) {
            params.set("stockStatus", filterQueryData.productStock);
         }
         const anyData = filterQueryData as any;
         if (anyData.category) {
            params.set("category", anyData.category);
         }
         if (anyData.minPrice) {
            params.set("minPrice", anyData.minPrice);
         }
         if (anyData.maxPrice) {
            params.set("maxPrice", anyData.maxPrice);
         }

         const res = await fetch(`/api/products?${params.toString()}`);
         if (res.ok) {
            const data = await res.json();
            const mapped = (data.products || []).map((p: any) => {
               const imgs = Array.isArray(p.images)
                  ? p.images
                  : typeof p.images === "string"
                    ? JSON.parse(p.images)
                    : [];
               const createdAtDate = p.createdAt
                  ? new Date(p.createdAt)
                  : new Date();
               let stockValue = "In Stock";
               if (p.quantity === 0) stockValue = "Out of Stock";
               else if (p.quantity <= (p.lowStockAlert || 10))
                  stockValue = "Low Stock";

               return {
                  id: p.id,
                  customId: p.customId || p.productCode,
                  product: p.productName || "-",
                  productName: p.productName,
                  subDescription: p.subDescription || "",
                  content: p.content || "",
                  images:
                     imgs.length > 0
                        ? imgs
                        : [
                             "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-1.webp",
                          ],
                  productCode: p.productCode,
                  productSku: p.productSku,
                  stock: p.quantity,
                  quantity: p.quantity,
                  stockValue,
                  category: p.category?.name || "General",
                  productType: p.productType || "Standard",
                  color: Array.isArray(p.colors) ? p.colors : [],
                  size: Array.isArray(p.sizes) ? p.sizes : [],
                  price: Number(p.salePrice || p.regularPrice || 0),
                  regularPrice: Number(p.regularPrice),
                  salePrice: p.salePrice ? Number(p.salePrice) : undefined,
                  createAt: `${createdAtDate.toLocaleDateString()} ${createdAtDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
                  date: createdAtDate.toLocaleDateString(),
                  time: createdAtDate.toLocaleTimeString([], {
                     hour: "2-digit",
                     minute: "2-digit",
                  }),
               };
            });
            setProducts(mapped);
         }
      } catch {
         // fallback
      } finally {
         setIsFetching(false);
         setInitialLoading(false);
      }
   }, [filterQueryData]);

   useEffect(() => {
      loadProducts();
   }, [loadProducts]);

   // delete dialog
   const [deleteDialog, setDeleteDialog] = useState<ProductType | null>(null);

   const handleDeleteConfirm = async () => {
      if (!deleteDialog) return;
      try {
         await fetch(`/api/products/${deleteDialog.id}`, { method: "DELETE" });
         setProducts((prev) => prev.filter((p) => p.id !== deleteDialog.id));
      } catch {
         // silent
      }
      setDeleteDialog(null);
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
               {initialLoading ? (
                  <TableSkeleton rows={5} cols={6} />
               ) : (
                  <CustomTable
                     rows={products}
                     columns={columns}
                     checkBox={true}
                     canPrint={false}
                     canExport={false}
                     onSelectionChange={(selected) =>
                        setSelectedProducts(selected)
                     }
                     customSelectionToolbar={() => (
                        <Stack direction="row" spacing={1} alignItems="center">
                           <Tooltip
                              title="Export selected products"
                              disableInteractive
                           >
                              <IconButton
                                 onClick={() => setExportModalOpen(true)}
                              >
                                 <Icon
                                    icon="solar:download-square-bold-duotone"
                                    size="small"
                                 />
                              </IconButton>
                           </Tooltip>
                        </Stack>
                     )}
                     menuItems={[
                        {
                           label: "View Details",
                           onClick: (params) =>
                              setSelectedProductId(
                                 params.row.customId || params.row.id,
                              ),
                        },
                        {
                           label: "Edit",
                           onClick: (params) =>
                              router.push(
                                 "/admin/product/publish?id=" + params.id,
                              ),
                        },
                        {
                           label: "Delete",
                           color: "error",
                           onClick: (params) => setDeleteDialog(params.row),
                        },
                     ]}
                     filter={(data, onChange) => {
                        const anyData = data as any;
                        return (
                           <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1.5}
                              alignItems="center"
                              sx={{ width: { xs: "100%", sm: "auto" } }}
                           >
                              <Box
                                 sx={{
                                    width: { xs: "100%", sm: 220, md: 240 },
                                    minWidth: { xs: 180, sm: 200, md: 220 },
                                 }}
                              >
                                 <CustomAutocomplete
                                    label="Category"
                                    placeholder="Select Category"
                                    arrow={true}
                                    options={["All", ...categories]}
                                    value={anyData.category || "All"}
                                    size={isMobile ? "small" : "medium"}
                                    onChange={(val: any) => {
                                       const selected =
                                          typeof val === "string"
                                             ? val
                                             : val?.value || val?.label || "";
                                       onChange?.({
                                          ...data,
                                          category:
                                             selected === "All" || !selected
                                                ? ""
                                                : selected,
                                       } as any);
                                    }}
                                 />
                              </Box>
                              <Box
                                 sx={{
                                    width: { xs: "100%", sm: 220, md: 240 },
                                    minWidth: { xs: 180, sm: 200, md: 220 },
                                 }}
                              >
                                 <CustomAutocomplete
                                    label="Stock"
                                    placeholder="Select Stock"
                                    arrow={true}
                                    options={[
                                       "All",
                                       "In stock",
                                       "Low stock",
                                       "Out of stock",
                                    ]}
                                    value={data.productStock || "All"}
                                    size={isMobile ? "small" : "medium"}
                                    onChange={(val: any) => {
                                       const selected =
                                          typeof val === "string"
                                             ? val
                                             : val?.value || val?.label || "";
                                       onChange?.({
                                          ...data,
                                          productStock:
                                             selected === "All" || !selected
                                                ? ""
                                                : selected,
                                       });
                                    }}
                                 />
                              </Box>
                           </Stack>
                        );
                     }}
                  />
               )}
            </Stack>
         </Stack>

         {/* Product Details View Modal */}
         <CustomModal
            open={Boolean(selectedProductId)}
            onClose={() => setSelectedProductId(null)}
            title="Product Details"
            closeIcon={true}
            sx={{
               width: { xs: "92%", sm: 540 },
               maxHeight: "90vh",
               overflowY: "auto",
               p: { xs: 2, sm: 3 },
            }}
         >
            {loadingDetail ? (
               <Stack alignItems="center" py={5}>
                  <CircularProgress />
               </Stack>
            ) : viewProduct ? (
               <Stack spacing={2.5}>
                  <Stack
                     direction="row"
                     justifyContent="space-between"
                     alignItems="center"
                  >
                     <Typography variant="h6" fontWeight={700}>
                        {viewProduct.productName}
                     </Typography>
                     <Chip
                        label={
                           viewProduct.customId ||
                           viewProduct.productCode ||
                           "PROD"
                        }
                        color="primary"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 700 }}
                     />
                  </Stack>
                  <Divider />
                  <Grid container spacing={2}>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           SKU Code
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                           {viewProduct.productSku || "N/A"}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Category
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                           {viewProduct.category?.name ||
                              viewProduct.category ||
                              "General"}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Regular Price
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                           {formatCurrency(
                              Number(viewProduct.regularPrice || 0),
                           )}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Current Stock
                        </Typography>
                        <Typography
                           variant="body2"
                           fontWeight={700}
                           color={
                              viewProduct.quantity <= 10
                                 ? "warning.main"
                                 : "success.main"
                           }
                        >
                           {viewProduct.quantity} units{" "}
                           {viewProduct.quantity <= 10 && "(Low Stock)"}
                        </Typography>
                     </Grid>
                  </Grid>
               </Stack>
            ) : (
               <Typography variant="body2" color="text.secondary">
                  Product not found.
               </Typography>
            )}
         </CustomModal>

         <AlertDialog
            type="delete"
            open={Boolean(deleteDialog)}
            onClose={() => setDeleteDialog(null)}
            title={`Are you sure want to delete <b> ${deleteDialog?.productName || ""} </b>`}
            onConfirm={handleDeleteConfirm}
         />

         {/* Advanced Product Export Configuration Modal */}
         <ExportProductModal
            open={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            selectedProducts={selectedProducts}
         />
      </Scrollbar>
   );
};

export default Product;
