"use client";

import React, { useState } from "react";
import {
   Box,
   Button,
   CircularProgress,
   Divider,
   Grid,
   IconButton,
   InputAdornment,
   Paper,
   Stack,
   TextField,
   Tooltip,
   Typography,
   useTheme,
} from "@mui/material";
import {
   Control,
   Controller,
   FieldErrors,
   UseFormSetValue,
} from "react-hook-form";
import Icon from "@src/components/Icon";
import { ProductSchemaType } from "../types";
import {
   generateEAN13Barcode,
   generateSuggestedSKU,
} from "../helpers/barcodeGenerator";

interface ProductIdentificationSectionProps {
   formControl: Control<ProductSchemaType>;
   errors: FieldErrors<ProductSchemaType>;
   setValue?: UseFormSetValue<ProductSchemaType>;
   currentProductName?: string;
   currentCategory?: string;
}

export const ProductIdentificationSection: React.FC<
   ProductIdentificationSectionProps
> = ({
   formControl,
   errors,
   setValue,
   currentProductName = "",
   currentCategory = "",
}) => {
   const theme = useTheme();
   const [checkingSku, setCheckingSku] = useState(false);
   const [skuStatus, setSkuStatus] = useState<"available" | "taken" | null>(
      null,
   );
   const [checkingBarcode, setCheckingBarcode] = useState(false);
   const [barcodeStatus, setBarcodeStatus] = useState<
      "available" | "taken" | null
   >(null);

   const handleGenerateSKU = () => {
      const suggested = generateSuggestedSKU(
         currentProductName,
         currentCategory,
      );
      if (setValue) {
         setValue("productSku", suggested, {
            shouldDirty: true,
            shouldValidate: true,
         });
         checkSkuAvailability(suggested);
      }
   };

   const handleGenerateBarcode = () => {
      const ean = generateEAN13Barcode();
      if (setValue) {
         setValue("barcode", ean, { shouldDirty: true, shouldValidate: true });
         checkBarcodeAvailability(ean);
      }
   };

   const checkSkuAvailability = async (sku: string) => {
      if (!sku.trim()) {
         setSkuStatus(null);
         return;
      }
      setCheckingSku(true);
      try {
         const res = await fetch(
            `/api/products/check-availability?sku=${encodeURIComponent(sku.trim())}`,
         );
         if (res.ok) {
            const data = await res.json();
            setSkuStatus(data.skuAvailable ? "available" : "taken");
         }
      } catch {
         setSkuStatus(null);
      } finally {
         setCheckingSku(false);
      }
   };

   const checkBarcodeAvailability = async (code: string) => {
      if (!code.trim()) {
         setBarcodeStatus(null);
         return;
      }
      setCheckingBarcode(true);
      try {
         const res = await fetch(
            `/api/products/check-availability?barcode=${encodeURIComponent(code.trim())}`,
         );
         if (res.ok) {
            const data = await res.json();
            setBarcodeStatus(data.barcodeAvailable ? "available" : "taken");
         }
      } catch {
         setBarcodeStatus(null);
      } finally {
         setCheckingBarcode(false);
      }
   };

   return (
      <Paper
         id="section-2-identification"
         variant="outlined"
         sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 1.5,
            bgcolor: "background.paper",
            borderColor: "divider",
         }}
      >
         <Stack spacing={2.5}>
            {/* Header */}
            <Stack
               direction="row"
               justifyContent="space-between"
               alignItems="center"
            >
               <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                     <Icon
                        icon="solar:barcode-outline"
                        size="18px"
                        style={{ color: theme.palette.text.secondary }}
                     />
                     <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        sx={{ letterSpacing: "-0.01em" }}
                     >
                        2. Product Identification & SKU
                     </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                     SKU codes, barcode standards, and scanner recognition
                  </Typography>
               </Stack>
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            <Grid container spacing={2}>
               {/* Product Code */}
               <Grid size={{ xs: 12 }}>
                  <Stack spacing={1}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.primary"
                        sx={{
                           textTransform: "uppercase",
                           letterSpacing: "0.5px",
                           fontSize: "0.72rem",
                        }}
                     >
                        Product Code / Custom ID
                     </Typography>
                     <Controller
                        name="productCode"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Product Code / Custom ID"
                              placeholder="Enter product code (optional)"
                              error={Boolean(errors.productCode)}
                              helperText={
                                 errors.productCode?.message ||
                                 "Auto-assigned sequential code if left empty"
                              }
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* SKU */}
               <Grid size={{ xs: 12 }}>
                  <Stack spacing={1}>
                     <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                     >
                        <Typography
                           variant="caption"
                           fontWeight={600}
                           color="text.primary"
                           sx={{
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              fontSize: "0.72rem",
                           }}
                        >
                           Stock Keeping Unit (SKU)
                        </Typography>
                        <Button
                           size="small"
                           onClick={handleGenerateSKU}
                           startIcon={
                              <Icon
                                 icon="solar:refresh-linear"
                                 size="14px"
                                 color="primary"
                              />
                           }
                           sx={{
                              fontSize: "0.7rem",
                              py: 0.3,
                              px: 0.8,
                              textTransform: "none",
                           }}
                        >
                           Generate SKU
                        </Button>
                     </Stack>
                     <Controller
                        name="productSku"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Stock Keeping Unit (SKU)"
                              placeholder="Enter product SKU"
                              error={
                                 Boolean(errors.productSku) ||
                                 skuStatus === "taken"
                              }
                              helperText={
                                 errors.productSku?.message ||
                                 (skuStatus === "available"
                                    ? "✓ SKU is unique and available"
                                    : skuStatus === "taken"
                                      ? "✕ SKU is already in use by another product"
                                      : "Unique identifier for warehouse stock tracking")
                              }
                              onChange={(e) => {
                                 field.onChange(e);
                                 checkSkuAvailability(e.target.value);
                              }}
                              InputProps={{
                                 endAdornment: checkingSku ? (
                                    <CircularProgress size={16} />
                                 ) : skuStatus === "available" ? (
                                    <Icon
                                       icon="solar:check-circle-bold"
                                       style={{
                                          color: theme.palette.success.main,
                                       }}
                                    />
                                 ) : skuStatus === "taken" ? (
                                    <Icon
                                       icon="solar:close-circle-bold"
                                       style={{
                                          color: theme.palette.error.main,
                                       }}
                                    />
                                 ) : null,
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Barcode */}
               <Grid size={{ xs: 12 }}>
                  <Stack spacing={1}>
                     <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                     >
                        <Typography
                           variant="caption"
                           fontWeight={600}
                           color="text.primary"
                           sx={{
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              fontSize: "0.72rem",
                           }}
                        >
                           Barcode
                        </Typography>
                        <Button
                           size="small"
                           onClick={handleGenerateBarcode}
                           startIcon={
                              <Icon
                                 icon="solar:refresh-linear"
                                 size="14px"
                                 color="primary"
                              />
                           }
                           sx={{
                              fontSize: "0.7rem",
                              py: 0.3,
                              px: 0.8,
                              textTransform: "none",
                           }}
                        >
                           Generate Barcode
                        </Button>
                     </Stack>
                     <Controller
                        name="barcode"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Barcode"
                              placeholder="Enter barcode"
                              error={
                                 Boolean(errors.barcode) ||
                                 barcodeStatus === "taken"
                              }
                              helperText={
                                 errors.barcode?.message ||
                                 (barcodeStatus === "available"
                                    ? "✓ Barcode is available"
                                    : barcodeStatus === "taken"
                                      ? "✕ Barcode is already registered"
                                      : "Standard optical barcode recognized at register")
                              }
                              onChange={(e) => {
                                 field.onChange(e);
                                 checkBarcodeAvailability(e.target.value);
                              }}
                              InputProps={{
                                 startAdornment: (
                                    <InputAdornment position="start">
                                       <Icon
                                          icon="solar:scanner-linear"
                                          size="18px"
                                       />
                                    </InputAdornment>
                                 ),
                                 endAdornment: checkingBarcode ? (
                                    <CircularProgress size={16} />
                                 ) : barcodeStatus === "available" ? (
                                    <Icon
                                       icon="solar:check-circle-bold"
                                       style={{
                                          color: theme.palette.success.main,
                                       }}
                                    />
                                 ) : barcodeStatus === "taken" ? (
                                    <Icon
                                       icon="solar:close-circle-bold"
                                       style={{
                                          color: theme.palette.error.main,
                                       }}
                                    />
                                 ) : null,
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>
            </Grid>
         </Stack>
      </Paper>
   );
};
