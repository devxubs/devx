"use client";

import React from "react";
import {
   Divider,
   FormControlLabel,
   Grid,
   Paper,
   Stack,
   Switch,
   TextField,
   Typography,
   useTheme,
} from "@mui/material";
import { Control, Controller, FieldErrors, useWatch } from "react-hook-form";
import Icon from "@src/components/Icon";
import { ProductSchemaType } from "../types";

interface ProductBatchesSectionProps {
   formControl: Control<ProductSchemaType>;
   errors: FieldErrors<ProductSchemaType>;
}

export const ProductBatchesSection: React.FC<ProductBatchesSectionProps> = ({
   formControl,
   errors,
}) => {
   const theme = useTheme();

   const hasBatch = useWatch({
      control: formControl,
      name: "hasBatchTracking",
   });

   const expDate = useWatch({
      control: formControl,
      name: "expDate",
   });

   const isNearExpiry = expDate
      ? (new Date(expDate).getTime() - Date.now()) / (1000 * 3600 * 24) <= 30
      : false;

   const labelSx = {
      textTransform: "uppercase",
      letterSpacing: "0.45px",
      fontSize: "0.72rem",
      fontWeight: 600,
      color: "text.primary",
   };

   const fieldSx = {
      "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
         {
            display: "none",
         },
      "& input[type=number]": {
         MozAppearance: "textfield",
      },
   };

   return (
      <Paper
         id="section-8-stock-supply"
         variant="outlined"
         sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 1.5,
            bgcolor: "background.paper",
            borderColor: "divider",
         }}
      >
         <Stack spacing={2.5}>
            {/* Section Header */}
            <Stack
               direction={{ xs: "column", sm: "row" }}
               justifyContent="space-between"
               alignItems={{ xs: "flex-start", sm: "center" }}
               spacing={1.5}
            >
               <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                     <Icon
                        icon="solar:calendar-date-linear"
                        size="19px"
                        style={{
                           color: theme.palette.text.secondary,
                        }}
                     />

                     <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        sx={{ letterSpacing: "-0.01em" }}
                     >
                        8. Batch & Expiry Management
                     </Typography>
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                     Manage batch identification, manufacturing dates,
                     expiration dates, and stock rotation.
                  </Typography>
               </Stack>

               <Controller
                  name="hasBatchTracking"
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
                           <Typography
                              variant="caption"
                              fontWeight={600}
                              color="text.secondary"
                           >
                              Enable Batch Tracking
                           </Typography>
                        }
                        sx={{ m: 0 }}
                     />
                  )}
               />
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            {hasBatch ? (
               <Grid container spacing={2.5}>
                  {/* Batch / Lot Number */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                     <Stack spacing={0.75}>
                        <Typography variant="caption" sx={labelSx}>
                           Batch / Lot Number
                        </Typography>

                        <Controller
                           name="batchNumber"
                           control={formControl}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Batch / Lot Number"
                                 placeholder="e.g. LOT-2026-X80"
                                 value={field.value ?? ""}
                                 size="small"
                                 fullWidth
                                 error={Boolean(errors.batchNumber)}
                                 helperText={
                                    errors.batchNumber?.message ||
                                    "Enter the unique batch or lot identification number."
                                 }
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Initial Batch Quantity */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                     <Stack spacing={0.75}>
                        <Typography variant="caption" sx={labelSx}>
                           Initial Batch Quantity
                        </Typography>

                        <Controller
                           name="batchQuantity"
                           control={formControl}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Batch Quantity"
                                 placeholder="Enter batch quantity"
                                 type="number"
                                 value={field.value ?? ""}
                                 size="small"
                                 fullWidth
                                 helperText="Enter the available quantity in this batch."
                                 sx={fieldSx}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Manufacturing Date */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                     <Stack spacing={0.75}>
                        <Typography variant="caption" sx={labelSx}>
                           Manufacturing Date
                        </Typography>

                        <Controller
                           name="mfgDate"
                           control={formControl}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Manufacturing Date"
                                 type="date"
                                 value={field.value ?? ""}
                                 size="small"
                                 fullWidth
                                 InputLabelProps={{ shrink: true }}
                                 helperText="Select the product manufacturing date."
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Expiration Date */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                     <Stack spacing={0.75}>
                        <Typography variant="caption" sx={labelSx}>
                           Expiration Date
                        </Typography>

                        <Controller
                           name="expDate"
                           control={formControl}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Expiration Date"
                                 type="date"
                                 value={field.value ?? ""}
                                 size="small"
                                 fullWidth
                                 InputLabelProps={{ shrink: true }}
                                 error={isNearExpiry}
                                 helperText={
                                    isNearExpiry
                                       ? "Warning: Product is expired or expires within 30 days."
                                       : "Select the product expiration date."
                                 }
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
               </Grid>
            ) : (
               <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ py: 1 }}
               >
                  Batch and expiration tracking is currently disabled for this
                  product. Enable batch tracking for perishable, food, or
                  lot-controlled inventory.
               </Typography>
            )}
         </Stack>
      </Paper>
   );
};
