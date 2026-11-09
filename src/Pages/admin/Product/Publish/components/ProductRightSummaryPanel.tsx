"use client";

import React from "react";
import {
   Box,
   Chip,
   Divider,
   FormControlLabel,
   LinearProgress,
   MenuItem,
   Paper,
   Select,
   Stack,
   Switch,
   Tooltip,
   Typography,
   alpha,
   useTheme,
} from "@mui/material";
import { Control, Controller, UseFormSetValue, useWatch } from "react-hook-form";
import Icon from "@src/components/Icon";
import { ProductSchemaType } from "../types";
import { calculateProductPricing, formatCurrencyBDT } from "../helpers/productCalculations";

interface ProductRightSummaryPanelProps {
   formControl: Control<ProductSchemaType>;
   setValue?: UseFormSetValue<ProductSchemaType>;
   isEdit: boolean;
   completedCount: number;
   totalCount: number;
}

const SECTION_JUMP_LINKS = [
   { id: "section-1-basic-info", label: "1. Basic Info", icon: "solar:document-text-linear" },
   { id: "section-2-identification", label: "2. Identification", icon: "solar:qr-code-bold" },
   { id: "section-3-media", label: "3. Media & Images", icon: "solar:gallery-wide-linear" },
   { id: "section-4-variants-specs", label: "4. Variants & Specs", icon: "solar:layers-minimalistic-linear" },
   { id: "section-5-pricing", label: "5. Pricing & Profit", icon: "solar:tag-price-bold" },
   { id: "section-6-units", label: "6. Units & Measure", icon: "solar:scale-linear" },
   { id: "section-7-inventory", label: "7. Inventory", icon: "solar:box-minimalistic-linear" },
   { id: "section-8-stock-supply", label: "8. Stock & Supply", icon: "solar:calendar-date-bold" },
   { id: "section-9-suppliers", label: "9. Suppliers", icon: "solar:users-group-two-rounded-linear" },
   { id: "section-10-extra-settings", label: "10. Extra Settings", icon: "solar:settings-linear" },
];

export const ProductRightSummaryPanel: React.FC<ProductRightSummaryPanelProps> = ({
   formControl,
   setValue,
   isEdit,
   completedCount,
   totalCount,
}) => {
   const theme = useTheme();

   // Live watched form fields
   const productName = useWatch({ control: formControl, name: "productName" });
   const category = useWatch({ control: formControl, name: "category" });
   const productType = useWatch({ control: formControl, name: "productType" }) || "Simple";
   const productSku = useWatch({ control: formControl, name: "productSku" });
   const barcode = useWatch({ control: formControl, name: "barcode" });
   const regularPrice = useWatch({ control: formControl, name: "regularPrice" });
   const salePrice = useWatch({ control: formControl, name: "salePrice" });
   const costPrice = useWatch({ control: formControl, name: "costPrice" });
   const taxRate = useWatch({ control: formControl, name: "taxRate" });
   const taxMode = useWatch({ control: formControl, name: "taxMode" });
   const quantity = useWatch({ control: formControl, name: "quantity" });
   const lowStockAlert = useWatch({ control: formControl, name: "lowStockAlert" });
   const status = useWatch({ control: formControl, name: "status" }) || "ACTIVE";
   const isFeatured = useWatch({ control: formControl, name: "isFeatured" });
   const images = useWatch({ control: formControl, name: "images" }) || [];
   const availableForPos = useWatch({ control: formControl, name: "availableForPos" });
   const availableForOnline = useWatch({ control: formControl, name: "availableForOnline" });

   // Financial metrics
   const pricing = calculateProductPricing({
      regularPrice: Number(regularPrice) || 0,
      salePrice: salePrice ? Number(salePrice) : null,
      costPrice: Number(costPrice) || 0,
      taxRate: Number(taxRate) || 0,
      taxMode: taxMode || "EXCLUSIVE",
   });

   // Stock Status
   const stockQty = Number(quantity) || 0;
   const lowAlert = Number(lowStockAlert) || 10;
   let stockBadge: { label: string; color: "success" | "warning" | "error" | "default" } = {
      label: `In Stock (${stockQty})`,
      color: "success",
   };
   if (stockQty <= 0) {
      stockBadge = { label: "Out of Stock", color: "error" };
   } else if (stockQty <= lowAlert) {
      stockBadge = { label: `Low Stock (${stockQty})`, color: "warning" };
   }

   // Checklist items
   const checklist = [
      { label: "Product Name", done: Boolean(productName && productName.trim().length >= 2) },
      { label: "Category", done: Boolean(category) },
      { label: "SKU / Code", done: Boolean(productSku) },
      { label: "Selling Price", done: Boolean(regularPrice && Number(regularPrice) > 0) },
      { label: "Media Uploaded", done: images.length > 0 },
      { label: "Stock Quantity", done: stockQty > 0 },
   ];

   const percentComplete = Math.round(
      (checklist.filter((c) => c.done).length / checklist.length) * 100,
   );

   const scrollToSection = (id: string) => {
      const el = document.getElementById(id);
      if (el) {
         el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
   };

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
         <Stack spacing={2.5} sx={{ width: "100%", minWidth: 0 }}>
            {/* 1. Status & Publishing Card */}
            <Paper
               variant="outlined"
               sx={{
                  p: 2.5,
                  borderRadius: 1.5,
                  bgcolor: "background.paper",
                  borderColor: "divider",
                  width: "100%",
                  minWidth: 0,
                  maxWidth: "100%",
                  boxSizing: "border-box",
               }}
            >
               <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: "-0.01em" }}>
                        Publishing & Status
                     </Typography>
                     <Chip
                        size="small"
                        label={status}
                        color={status === "ACTIVE" ? "success" : status === "DRAFT" ? "warning" : "default"}
                        sx={{ fontWeight: 700, fontSize: "0.7rem", height: 20 }}
                     />
                  </Stack>

                  <Divider sx={{ borderColor: "divider" }} />

                  {/* Status Dropdown */}
                  <Stack spacing={0.5}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.secondary"
                        sx={{ textTransform: "uppercase", fontSize: "0.7rem" }}
                     >
                        Product Status
                     </Typography>
                     <Controller
                        name="status"
                        control={formControl}
                        render={({ field }) => (
                           <Select
                              {...field}
                              size="small"
                              fullWidth
                              sx={{
                                 bgcolor: alpha(theme.palette.background.default, 0.4),
                                 fontSize: "0.85rem",
                              }}
                           >
                              <MenuItem value="ACTIVE">
                                 <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} />
                                    <Typography variant="body2" fontWeight={600}>
                                       Active (Live in Catalog)
                                    </Typography>
                                 </Stack>
                              </MenuItem>
                              <MenuItem value="DRAFT">
                                 <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main" }} />
                                    <Typography variant="body2" fontWeight={600}>
                                       Draft (In Progress)
                                    </Typography>
                                 </Stack>
                              </MenuItem>
                              <MenuItem value="INACTIVE">
                                 <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "text.disabled" }} />
                                    <Typography variant="body2" fontWeight={600}>
                                       Inactive (Archived)
                                    </Typography>
                                 </Stack>
                              </MenuItem>
                           </Select>
                        )}
                     />
                  </Stack>

                  {/* Featured Product */}
                  <Controller
                     name="isFeatured"
                     control={formControl}
                     render={({ field }) => (
                        <FormControlLabel
                           control={
                              <Switch
                                 checked={Boolean(field.value)}
                                 onChange={(e) => field.onChange(e.target.checked)}
                                 color="primary"
                                 size="small"
                              />
                           }
                           label={
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                 <Icon
                                    icon={field.value ? "solar:star-bold" : "solar:star-linear"}
                                    size="16px"
                                    style={{ color: field.value ? theme.palette.warning.main : theme.palette.text.secondary }}
                                 />
                                 <Typography variant="body2" fontWeight={600}>
                                    Featured Product
                                 </Typography>
                              </Stack>
                           }
                           sx={{ m: 0 }}
                        />
                     )}
                  />

                  {/* Sales Channels Indicators */}
                  <Stack spacing={1} sx={{ pt: 0.5 }}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.secondary"
                        sx={{ textTransform: "uppercase", fontSize: "0.7rem" }}
                     >
                        Active Sales Channels
                     </Typography>
                     <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                           size="small"
                           icon={<Icon icon="solar:shop-bold" size="14px" />}
                           label={availableForPos !== false ? "POS Active" : "POS Hidden"}
                           color={availableForPos !== false ? "primary" : "default"}
                           variant={availableForPos !== false ? "filled" : "outlined"}
                           sx={{ fontSize: "0.72rem" }}
                        />
                        <Chip
                           size="small"
                           icon={<Icon icon="solar:global-bold" size="14px" />}
                           label={availableForOnline !== false ? "Online Active" : "Online Hidden"}
                           color={availableForOnline !== false ? "primary" : "default"}
                           variant={availableForOnline !== false ? "filled" : "outlined"}
                           sx={{ fontSize: "0.72rem" }}
                        />
                     </Stack>
                  </Stack>
               </Stack>
            </Paper>

            {/* 2. Live Product Card Preview */}
            <Paper
               variant="outlined"
               sx={{
                  p: 2.5,
                  borderRadius: 1.5,
                  bgcolor: "background.paper",
                  borderColor: "divider",
                  width: "100%",
                  minWidth: 0,
                  maxWidth: "100%",
                  boxSizing: "border-box",
               }}
            >
               <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Stack direction="row" spacing={1} alignItems="center">
                        <Icon icon="solar:eye-bold" size="16px" style={{ color: theme.palette.primary.main }} />
                        <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: "-0.01em" }}>
                           Live Catalog Preview
                        </Typography>
                     </Stack>
                     <Typography variant="caption" color="text.secondary">
                        {productType}
                     </Typography>
                  </Stack>

                  <Divider sx={{ borderColor: "divider" }} />

                  {/* Thumbnail & Title Box */}
                  <Stack direction="row" spacing={2} alignItems="center">
                     <Box
                        sx={{
                           width: 68,
                           height: 68,
                           borderRadius: 1.5,
                           bgcolor: alpha(theme.palette.background.default, 0.7),
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
                              alt="Cover"
                              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                           />
                        ) : (
                           <Icon
                              icon="solar:gallery-wide-linear"
                              size="28px"
                              style={{ color: theme.palette.text.disabled }}
                           />
                        )}
                     </Box>

                     <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                           variant="body2"
                           fontWeight={700}
                           noWrap
                           title={productName || "Untitled Product"}
                        >
                           {productName || (
                              <Typography component="span" variant="body2" color="text.secondary" fontStyle="italic">
                                 Untitled Product
                              </Typography>
                           )}
                        </Typography>

                        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                           {category && (
                              <Chip
                                 size="small"
                                 label={category}
                                 variant="outlined"
                                 sx={{ height: 18, fontSize: "0.68rem" }}
                              />
                           )}
                           <Chip
                              size="small"
                              label={stockBadge.label}
                              color={stockBadge.color}
                              sx={{ height: 18, fontSize: "0.68rem", fontWeight: 600 }}
                           />
                        </Stack>

                        <Typography variant="caption" color="text.secondary" noWrap>
                           SKU: {productSku || "Auto-generated"}
                        </Typography>
                     </Stack>
                  </Stack>

                  {/* Price Row */}
                  <Box
                     sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.background.default, 0.5),
                        border: "1px solid",
                        borderColor: "divider",
                     }}
                  >
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                           Selling Price
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="baseline">
                           {pricing.hasDiscount && (
                              <Typography
                                 variant="caption"
                                 color="text.disabled"
                                 sx={{ textDecoration: "line-through" }}
                              >
                                 {formatCurrencyBDT(Number(regularPrice) || 0)}
                              </Typography>
                           )}
                           <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                              {formatCurrencyBDT(pricing.effectivePrice)}
                           </Typography>
                        </Stack>
                     </Stack>
                  </Box>
               </Stack>
            </Paper>

            {/* 3. Pricing & Profit Snapshot */}
            <Paper
               variant="outlined"
               sx={{
                  p: 2.5,
                  borderRadius: 1.5,
                  bgcolor: "background.paper",
                  borderColor: "divider",
                  width: "100%",
                  minWidth: 0,
                  maxWidth: "100%",
                  boxSizing: "border-box",
               }}
            >
               <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                     <Icon icon="solar:chart-square-linear" size="16px" style={{ color: theme.palette.text.secondary }} />
                     <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: "-0.01em" }}>
                        Profit & Margin Snapshot
                     </Typography>
                  </Stack>

                  <Divider sx={{ borderColor: "divider" }} />

                  <Stack spacing={1}>
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                           Purchase / Cost Price:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                           {formatCurrencyBDT(Number(costPrice) || 0)}
                        </Typography>
                     </Stack>

                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                           Gross Profit / Unit:
                        </Typography>
                        <Typography
                           variant="body2"
                           fontWeight={700}
                           color={pricing.grossProfit >= 0 ? "success.main" : "error.main"}
                        >
                           {pricing.grossProfit >= 0 ? "+" : ""}
                           {formatCurrencyBDT(pricing.grossProfit)}
                        </Typography>
                     </Stack>

                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                           Gross Margin:
                        </Typography>
                        <Chip
                           size="small"
                           label={`${pricing.profitMargin.toFixed(1)}%`}
                           color={pricing.profitMargin >= 20 ? "success" : pricing.profitMargin > 0 ? "warning" : "error"}
                           variant="outlined"
                           sx={{ height: 20, fontWeight: 700, fontSize: "0.72rem" }}
                        />
                     </Stack>

                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                           Tax Configuration:
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                           {Number(taxRate) || 0}% ({taxMode || "EXCLUSIVE"})
                        </Typography>
                     </Stack>
                  </Stack>
               </Stack>
            </Paper>

            {/* 4. Form Completion & Quick Jump */}
            <Paper
               variant="outlined"
               sx={{
                  p: 2.5,
                  borderRadius: 1.5,
                  bgcolor: "background.paper",
                  borderColor: "divider",
                  width: "100%",
                  minWidth: 0,
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  overflow: "hidden",
               }}
            >
               <Stack spacing={2} sx={{ width: "100%", minWidth: 0 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="subtitle2" fontWeight={700}>
                        Form Completion
                     </Typography>
                     <Typography variant="caption" fontWeight={700} color="primary.main">
                        {percentComplete}%
                     </Typography>
                  </Stack>

                  <LinearProgress
                     variant="determinate"
                     value={percentComplete}
                     sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                     }}
                  />

                  {/* Checklist */}
                  <Stack spacing={0.75} sx={{ width: "100%", minWidth: 0 }}>
                     {checklist.map((item, idx) => (
                        <Stack
                           key={idx}
                           direction="row"
                           spacing={1}
                           alignItems="center"
                           sx={{ minWidth: 0, width: "100%" }}
                        >
                           <Icon
                              icon={item.done ? "solar:check-circle-bold" : "solar:round-transfer-vertical-linear"}
                              size="14px"
                              style={{
                                 color: item.done ? theme.palette.success.main : theme.palette.text.disabled,
                                 flexShrink: 0,
                              }}
                           />
                           <Typography
                              variant="caption"
                              fontWeight={item.done ? 600 : 400}
                              color={item.done ? "text.primary" : "text.secondary"}
                              noWrap
                              sx={{
                                 minWidth: 0,
                                 overflow: "hidden",
                                 textOverflow: "ellipsis",
                              }}
                           >
                              {item.label}
                           </Typography>
                        </Stack>
                     ))}
                  </Stack>

                  <Divider sx={{ borderColor: "divider" }} />

                  {/* Quick Section Navigation */}
                  <Stack spacing={1} sx={{ width: "100%", minWidth: 0 }}>
                     <Typography
                         variant="caption"
                         fontWeight={600}
                         color="text.secondary"
                         sx={{ textTransform: "uppercase", fontSize: "0.7rem" }}
                     >
                         Quick Jump to Section
                     </Typography>

                     <Box
                         sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: 0.75,
                            width: "100%",
                            minWidth: 0,
                         }}
                     >
                         {SECTION_JUMP_LINKS.map((sec) => (
                            <Box
                               key={sec.id}
                               onClick={() => scrollToSection(sec.id)}
                               sx={{
                                  p: 0.75,
                                  px: 1,
                                  minWidth: 0,
                                  borderRadius: 1,
                                  border: "1px solid",
                                  borderColor: "divider",
                                  bgcolor: alpha(theme.palette.background.default, 0.4),
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                  "&:hover": {
                                     bgcolor: alpha(theme.palette.primary.main, 0.08),
                                     borderColor: "primary.main",
                                  },
                               }}
                            >
                               <Typography
                                  variant="caption"
                                  fontWeight={600}
                                  noWrap
                                  display="block"
                                  sx={{
                                     fontSize: "0.72rem",
                                     overflow: "hidden",
                                     textOverflow: "ellipsis",
                                     minWidth: 0,
                                  }}
                               >
                                  {sec.label}
                               </Typography>
                            </Box>
                         ))}
                     </Box>
                  </Stack>
               </Stack>
            </Paper>
         </Stack>
      </Box>
   );
};

export default ProductRightSummaryPanel;
