"use client";

import React from "react";
import {
   Box,
   Divider,
   Grid,
   Paper,
   Stack,
   TextField,
   Typography,
   useTheme,
   alpha,
} from "@mui/material";
import { Control, Controller, FieldErrors, useWatch } from "react-hook-form";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import { ProductSchemaType } from "../types";
import {
   calculateProductPricing,
   formatCurrencyBDT,
} from "../helpers/productCalculations";

interface ProductPricingSectionProps {
   formControl: Control<ProductSchemaType>;
   errors: FieldErrors<ProductSchemaType>;
}

export const ProductPricingSection: React.FC<ProductPricingSectionProps> = ({
   formControl,
   errors,
}) => {
   const theme = useTheme();

   const regularPrice = useWatch({
      control: formControl,
      name: "regularPrice",
   });
   const salePrice = useWatch({ control: formControl, name: "salePrice" });
   const costPrice = useWatch({ control: formControl, name: "costPrice" });
   const taxRate = useWatch({ control: formControl, name: "taxRate" });
   const taxMode = useWatch({ control: formControl, name: "taxMode" });

   const pricingOutput = calculateProductPricing({
      regularPrice: Number(regularPrice) || 0,
      salePrice: salePrice ? Number(salePrice) : null,
      costPrice: Number(costPrice) || 0,
      taxRate: Number(taxRate) || 0,
      taxMode: taxMode || "EXCLUSIVE",
   });

   return (
      <Paper
         id="section-5-pricing"
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
                        icon="solar:tag-price-linear"
                        size="18px"
                        style={{ color: theme.palette.text.secondary }}
                     />
                     <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        sx={{ letterSpacing: "-0.01em" }}
                     >
                        5. Pricing & Profit Analysis
                     </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                     Customer retail pricing, dealer tiers, taxation mode and
                     real-time margin breakdown
                  </Typography>
               </Stack>
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            {/* Row 1: Regular Price & Sale Price */}
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6 }}>
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
                        Regular Price{" "}
                        <Box component="span" sx={{ color: "error.main" }}>
                           *
                        </Box>
                     </Typography>
                     <Controller
                        name="regularPrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              type="number"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Regular Price"
                              placeholder="Enter regular price"
                              error={Boolean(errors.regularPrice)}
                              helperText={errors.regularPrice?.message}
                              sx={{
                                 "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                    {
                                       display: "none",
                                    },
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, sm: 6 }}>
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
                        Sale Price
                     </Typography>
                     <Controller
                        name="salePrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              type="number"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Sale Price"
                              placeholder="Enter promotional price"
                              error={Boolean(errors.salePrice)}
                              helperText={errors.salePrice?.message}
                              sx={{
                                 "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                    {
                                       display: "none",
                                    },
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>
            </Grid>

            {/* Row 2: Cost Price, Wholesale Price & Dealer Price */}
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 4 }}>
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
                        Cost / Purchase Price
                     </Typography>
                     <Controller
                        name="costPrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              type="number"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Cost Price"
                              placeholder="Enter purchase cost"
                              error={Boolean(errors.costPrice)}
                              helperText={errors.costPrice?.message}
                              sx={{
                                 "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                    {
                                       display: "none",
                                    },
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, sm: 4 }}>
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
                        Wholesale Price
                     </Typography>
                     <Controller
                        name="wholesalePrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              type="number"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Wholesale Price"
                              placeholder="Enter wholesale rate"
                              error={Boolean(errors.wholesalePrice)}
                              helperText={errors.wholesalePrice?.message}
                              sx={{
                                 "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                    {
                                       display: "none",
                                    },
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, sm: 4 }}>
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
                        Dealer / Partner Price
                     </Typography>
                     <Controller
                        name="dealerPrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              type="number"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Dealer / Partner Price"
                              placeholder="Enter Dealer / Partner Price"
                              error={Boolean(errors.dealerPrice)}
                              helperText={errors.dealerPrice?.message}
                              sx={{
                                 "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                    {
                                       display: "none",
                                    },
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>
            </Grid>

            {/* Row 3: Tax Rate, Tax Mode & Discount % */}
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 4 }}>
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
                        VAT / Tax Rate (%)
                     </Typography>
                     <Controller
                        name="taxRate"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              type="number"
                              value={field.value ?? 0}
                              size="small"
                              fullWidth
                              label="Tax Rate"
                              placeholder="Enter tax"
                              error={Boolean(errors.taxRate)}
                              helperText={errors.taxRate?.message}
                              sx={{
                                 "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                    {
                                       display: "none",
                                    },
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, sm: 4 }}>
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
                        Tax Application Mode
                     </Typography>
                     <Controller
                        name="taxMode"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              size="small"
                              value={field.value || "EXCLUSIVE"}
                              onChange={(val: any) =>
                                 field.onChange(val || "EXCLUSIVE")
                              }
                              error={Boolean(errors.taxMode)}
                              helperText={errors.taxMode?.message}
                              arrow
                              label="Tax Mode"
                              placeholder="Select tax mode"
                              options={["EXCLUSIVE", "INCLUSIVE"]}
                              getOptionLabel={(option) =>
                                 option === "EXCLUSIVE"
                                    ? "Exclusive (Added to price)"
                                    : "Inclusive (Included in price)"
                              }
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, sm: 4 }}>
                  <Stack spacing={0.75}>
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
                        Discount Percentage (%)
                     </Typography>
                     <Controller
                        name="discountPercentage"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              type="number"
                              value={field.value ?? 0}
                              size="small"
                              fullWidth
                              label="Discount"
                              placeholder="Enter discount "
                              error={Boolean(errors.discountPercentage)}
                              helperText={errors.discountPercentage?.message}
                              sx={{
                                 "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                    {
                                       display: "none",
                                    },
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>
            </Grid>

            {/* Real-time Profit & Margin Analytics Card */}
            <Paper
               variant="outlined"
               sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                  borderColor: "divider",
               }}
            >
               <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 6, sm: 3 }}>
                     <Stack spacing={0.25}>
                        <Typography variant="caption" color="text.secondary">
                           Selling Price
                        </Typography>
                        <Typography variant="subtitle2" fontWeight={700}>
                           {formatCurrencyBDT(pricingOutput.effectivePrice)}
                        </Typography>
                     </Stack>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                     <Stack spacing={0.25}>
                        <Typography variant="caption" color="text.secondary">
                           Cost Price
                        </Typography>
                        <Typography variant="subtitle2" fontWeight={700}>
                           {formatCurrencyBDT(Number(costPrice) || 0)}
                        </Typography>
                     </Stack>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                     <Stack spacing={0.25}>
                        <Typography variant="caption" color="text.secondary">
                           Gross Profit
                        </Typography>
                        <Typography
                           variant="subtitle2"
                           fontWeight={700}
                           sx={{
                              color: pricingOutput.isProfitable
                                 ? "success.main"
                                 : "error.main",
                           }}
                        >
                           {formatCurrencyBDT(pricingOutput.grossProfit)}
                        </Typography>
                     </Stack>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                     <Stack spacing={0.25}>
                        <Typography variant="caption" color="text.secondary">
                           Profit Margin
                        </Typography>
                        <Typography
                           variant="subtitle2"
                           fontWeight={700}
                           sx={{
                              color:
                                 pricingOutput.profitMargin >= 0
                                    ? "success.main"
                                    : "error.main",
                           }}
                        >
                           {pricingOutput.profitMargin}%
                        </Typography>
                     </Stack>
                  </Grid>
               </Grid>
            </Paper>
         </Stack>
      </Paper>
   );
};
