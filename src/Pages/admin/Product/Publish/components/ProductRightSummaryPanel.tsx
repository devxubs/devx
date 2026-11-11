"use client";

import React from "react";
import {
   Accordion,
   AccordionDetails,
   AccordionSummary,
   Box,
   Chip,
   Divider,
   LinearProgress,
   Stack,
   Typography,
   alpha,
   useTheme,
} from "@mui/material";
import {
   Control,
   Controller,
   UseFormSetValue,
   useWatch,
} from "react-hook-form";

import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import { ProductSchemaType } from "../types";
import {
   calculateProductPricing,
   formatCurrencyBDT,
} from "../helpers/productCalculations";

interface ProductRightSummaryPanelProps {
   formControl: Control<ProductSchemaType>;
   setValue?: UseFormSetValue<ProductSchemaType>;
   isEdit: boolean;
   completedCount: number;
   totalCount: number;
}

const ProductAccordion = ({
   title,
   icon,
   children,
   defaultExpanded = true,
}: {
   title: string;
   icon: string;
   children: React.ReactNode;
   defaultExpanded?: boolean;
}) => {
   const theme = useTheme();

   return (
      <Accordion
         defaultExpanded={defaultExpanded}
         disableGutters
         elevation={0}
         sx={{
            width: "100%",
            minWidth: 0,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "12px !important",
            overflow: "hidden",
            bgcolor: "background.paper",
            "&:before": { display: "none" },
            "&.Mui-expanded": { m: 0, my: 1 },
         }}
      >
         <AccordionSummary
            expandIcon={
               <Icon
                  icon="solar:alt-arrow-down-linear"
                  size="20px"
                  color={theme.palette.text.secondary}
               />
            }
            sx={{
               minHeight: 54,
               px: 2,
               "&.Mui-expanded": { minHeight: 54 },
               "& .MuiAccordionSummary-content": {
                  my: 1.5,
                  alignItems: "center",
               },
               "& .MuiAccordionSummary-content.Mui-expanded": {
                  my: 1.5,
               },
            }}
         >
            <Stack direction="row" spacing={1} alignItems="center">
               <Icon
                  icon={icon}
                  size="19px"
                  color={theme.palette.primary.main}
               />
               <Typography variant="subtitle2" fontWeight={700}>
                  {title}
               </Typography>
            </Stack>
         </AccordionSummary>

         <Divider />

         <AccordionDetails sx={{ p: 2.5 }}>{children}</AccordionDetails>
      </Accordion>
   );
};

export const ProductRightSummaryPanel: React.FC<
   ProductRightSummaryPanelProps
> = ({ formControl }) => {
   const theme = useTheme();

   // Form values
   const productName = useWatch({
      control: formControl,
      name: "productName",
   });

   const category = useWatch({
      control: formControl,
      name: "category",
   });

   const productType =
      useWatch({ control: formControl, name: "productType" }) || "Simple";

   const productSku = useWatch({
      control: formControl,
      name: "productSku",
   });

   const regularPrice = useWatch({
      control: formControl,
      name: "regularPrice",
   });

   const salePrice = useWatch({
      control: formControl,
      name: "salePrice",
   });

   const costPrice = useWatch({
      control: formControl,
      name: "costPrice",
   });

   const taxRate = useWatch({
      control: formControl,
      name: "taxRate",
   });

   const taxMode = useWatch({
      control: formControl,
      name: "taxMode",
   });

   const quantity = useWatch({
      control: formControl,
      name: "quantity",
   });

   const lowStockAlert = useWatch({
      control: formControl,
      name: "lowStockAlert",
   });

   const status =
      useWatch({ control: formControl, name: "status" }) || "ACTIVE";

   const images =
      useWatch({
         control: formControl,
         name: "images",
      }) || [];

   // Pricing calculation
   const pricing = calculateProductPricing({
      regularPrice: Number(regularPrice) || 0,
      salePrice: salePrice ? Number(salePrice) : null,
      costPrice: Number(costPrice) || 0,
      taxRate: Number(taxRate) || 0,
      taxMode: taxMode || "EXCLUSIVE",
   });

   // Stock status
   const stockQty = Number(quantity) || 0;
   const lowAlert = Number(lowStockAlert) || 10;

   let stockBadge: {
      label: string;
      color: "success" | "warning" | "error" | "default";
   } = {
      label: `In Stock (${stockQty})`,
      color: "success",
   };

   if (stockQty <= 0) {
      stockBadge = {
         label: "Out of Stock",
         color: "error",
      };
   } else if (stockQty <= lowAlert) {
      stockBadge = {
         label: `Low Stock (${stockQty})`,
         color: "warning",
      };
   }

   // Completion checklist
   const checklist = [
      {
         label: "Product Name",
         done: Boolean(productName && productName.trim().length >= 2),
      },
      {
         label: "Category",
         done: Boolean(category),
      },
      {
         label: "SKU",
         done: Boolean(productSku),
      },
      {
         label: "Selling Price",
         done: Boolean(regularPrice && Number(regularPrice) > 0),
      },
      {
         label: "Product Image",
         done: images.length > 0,
      },
      {
         label: "Stock Quantity",
         done: stockQty > 0,
      },
   ];

   const percentComplete = Math.round(
      (checklist.filter((item) => item.done).length / checklist.length) * 100,
   );

   const coverImage = images.length > 0 ? images[0] : null;

   return (
      <Box
         sx={{
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            boxSizing: "border-box",
         }}
      >
         <Stack spacing={2}>
            {/* 1. Product Status */}
            <ProductAccordion
               title="Product Status"
               icon="solar:settings-linear"
            >
               <Stack spacing={2}>
                  <Stack
                     direction="row"
                     justifyContent="space-between"
                     alignItems="center"
                  >
                     <Typography variant="body2" color="text.secondary">
                        Current Status
                     </Typography>

                     <Chip
                        size="small"
                        label={status}
                        color={
                           status === "ACTIVE"
                              ? "success"
                              : status === "DRAFT"
                                ? "warning"
                                : "default"
                        }
                        sx={{
                           fontWeight: 700,
                           fontSize: "0.7rem",
                           height: 22,
                        }}
                     />
                  </Stack>

                  <Divider />

                  <Controller
                     name="status"
                     control={formControl}
                     render={({ field }) => (
                        <CustomAutocomplete
                           options={[
                              { label: "Active", value: "ACTIVE" },
                              { label: "Draft", value: "DRAFT" },
                              { label: "Inactive", value: "INACTIVE" },
                           ]}
                           value={
                              [
                                 { label: "Active", value: "ACTIVE" },
                                 { label: "Draft", value: "DRAFT" },
                                 { label: "Inactive", value: "INACTIVE" },
                              ].find(
                                 (option) => option.value === field.value,
                              ) ?? null
                           }
                           onChange={(newValue) => {
                              field.onChange(newValue?.value ?? "");
                           }}
                           label="Product Status"
                           placeholder="Select product status"
                           arrow
                           size="small"
                        />
                     )}
                  />
               </Stack>
            </ProductAccordion>

            {/* 2. Product Preview */}
            <ProductAccordion title="Product Preview" icon="solar:eye-bold">
               <Stack spacing={2}>
                  <Stack
                     direction="row"
                     justifyContent="space-between"
                     alignItems="center"
                  >
                     <Typography variant="caption" color="text.secondary">
                        Product Type
                     </Typography>

                     <Chip
                        size="small"
                        label={productType}
                        variant="outlined"
                     />
                  </Stack>

                  <Divider />

                  {/* Product information */}
                  <Stack direction="row" spacing={2} alignItems="center">
                     <Box
                        sx={{
                           width: 68,
                           height: 68,
                           borderRadius: 1.5,
                           bgcolor: alpha(
                              theme.palette.background.default,
                              0.7,
                           ),
                           border: "1px solid",
                           borderColor: "divider",
                           display: "flex",
                           alignItems: "center",
                           justifyContent: "center",
                           overflow: "hidden",
                           flexShrink: 0,
                        }}
                     >
                        {coverImage ? (
                           <Box
                              component="img"
                              src={coverImage}
                              alt="Product"
                              sx={{
                                 width: "100%",
                                 height: "100%",
                                 objectFit: "cover",
                              }}
                           />
                        ) : (
                           <Icon
                              icon="solar:gallery-wide-linear"
                              size="28px"
                              color={theme.palette.text.disabled}
                           />
                        )}
                     </Box>

                     <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                           variant="body2"
                           fontWeight={700}
                           noWrap
                           title={productName || "Untitled Product"}
                        >
                           {productName || "Untitled Product"}
                        </Typography>

                        <Stack
                           direction="row"
                           spacing={0.5}
                           alignItems="center"
                           flexWrap="wrap"
                           useFlexGap
                        >
                           {category && (
                              <Chip
                                 size="small"
                                 label={category}
                                 variant="outlined"
                                 sx={{ height: 20, fontSize: "0.68rem" }}
                              />
                           )}

                           <Chip
                              size="small"
                              label={stockBadge.label}
                              color={stockBadge.color}
                              sx={{
                                 height: 20,
                                 fontSize: "0.68rem",
                                 fontWeight: 600,
                              }}
                           />
                        </Stack>

                        <Typography
                           variant="caption"
                           color="text.secondary"
                           noWrap
                        >
                           SKU: {productSku || "Auto-generated"}
                        </Typography>
                     </Stack>
                  </Stack>

                  {/* Selling price */}
                  <Box
                     sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.background.default, 0.5),
                        border: "1px solid",
                        borderColor: "divider",
                     }}
                  >
                     <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                     >
                        <Typography
                           variant="caption"
                           color="text.secondary"
                           fontWeight={600}
                        >
                           Selling Price
                        </Typography>

                        <Stack
                           direction="row"
                           spacing={1}
                           alignItems="baseline"
                        >
                           {pricing.hasDiscount && (
                              <Typography
                                 variant="caption"
                                 color="text.disabled"
                                 sx={{ textDecoration: "line-through" }}
                              >
                                 {formatCurrencyBDT(Number(regularPrice) || 0)}
                              </Typography>
                           )}

                           <Typography
                              variant="subtitle1"
                              fontWeight={700}
                              color="primary.main"
                           >
                              {formatCurrencyBDT(pricing.effectivePrice)}
                           </Typography>
                        </Stack>
                     </Stack>
                  </Box>
               </Stack>
            </ProductAccordion>

            {/* 3. Profit Summary */}
            <ProductAccordion
               title="Profit Summary"
               icon="solar:chart-square-linear"
            >
               <Stack spacing={1.5}>
                  <Stack
                     direction="row"
                     justifyContent="space-between"
                     alignItems="center"
                  >
                     <Typography variant="caption" color="text.secondary">
                        Cost Price
                     </Typography>

                     <Typography variant="body2" fontWeight={600}>
                        {formatCurrencyBDT(Number(costPrice) || 0)}
                     </Typography>
                  </Stack>

                  <Divider />

                  <Stack
                     direction="row"
                     justifyContent="space-between"
                     alignItems="center"
                  >
                     <Typography variant="caption" color="text.secondary">
                        Profit Per Unit
                     </Typography>

                     <Typography
                        variant="body2"
                        fontWeight={700}
                        color={
                           pricing.grossProfit >= 0
                              ? "success.main"
                              : "error.main"
                        }
                     >
                        {pricing.grossProfit >= 0 ? "+" : ""}
                        {formatCurrencyBDT(pricing.grossProfit)}
                     </Typography>
                  </Stack>

                  <Stack
                     direction="row"
                     justifyContent="space-between"
                     alignItems="center"
                  >
                     <Typography variant="caption" color="text.secondary">
                        Profit Margin
                     </Typography>

                     <Chip
                        size="small"
                        label={`${pricing.profitMargin.toFixed(1)}%`}
                        color={
                           pricing.profitMargin >= 20
                              ? "success"
                              : pricing.profitMargin > 0
                                ? "warning"
                                : "error"
                        }
                        variant="outlined"
                        sx={{
                           height: 22,
                           fontWeight: 700,
                           fontSize: "0.72rem",
                        }}
                     />
                  </Stack>

                  <Divider />

                  <Stack
                     direction="row"
                     justifyContent="space-between"
                     alignItems="center"
                  >
                     <Typography variant="caption" color="text.secondary">
                        Tax
                     </Typography>

                     <Typography variant="caption" fontWeight={600}>
                        {Number(taxRate) || 0}% ({taxMode || "EXCLUSIVE"})
                     </Typography>
                  </Stack>
               </Stack>
            </ProductAccordion>

            {/* 4. Form Progress */}
            <ProductAccordion
               title="Form Progress"
               icon="solar:clipboard-check-linear"
            >
               <Stack spacing={2}>
                  <Stack
                     direction="row"
                     justifyContent="space-between"
                     alignItems="center"
                  >
                     <Typography variant="body2" color="text.secondary">
                        Completion
                     </Typography>

                     <Typography
                        variant="body2"
                        fontWeight={700}
                        color="primary.main"
                     >
                        {percentComplete}%
                     </Typography>
                  </Stack>

                  <LinearProgress
                     variant="determinate"
                     value={percentComplete}
                     sx={{
                        height: 7,
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                     }}
                  />

                  <Divider />

                  <Stack spacing={1}>
                     {checklist.map((item, index) => (
                        <Stack
                           key={index}
                           direction="row"
                           spacing={1}
                           alignItems="center"
                        >
                           <Icon
                              icon={
                                 item.done
                                    ? "solar:check-circle-bold"
                                    : "solar:round-transfer-vertical-linear"
                              }
                              size="16px"
                              color={
                                 item.done
                                    ? theme.palette.success.main
                                    : theme.palette.text.disabled
                              }
                           />

                           <Typography
                              variant="caption"
                              fontWeight={item.done ? 600 : 400}
                              color={
                                 item.done ? "text.primary" : "text.secondary"
                              }
                           >
                              {item.label}
                           </Typography>
                        </Stack>
                     ))}
                  </Stack>
               </Stack>
            </ProductAccordion>
         </Stack>
      </Box>
   );
};

export default ProductRightSummaryPanel;
