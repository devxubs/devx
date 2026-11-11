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
                        8. Batch & Expiry Details
                     </Typography>
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                     Track product batches, quantities, and expiry dates.
                  </Typography>
               </Stack>

               {/* Batch Tracking Switch */}
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
                  {/* Batch Number */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                     <Stack spacing={1}>
                        <Typography variant="caption" sx={labelSx}>
                           Batch Number
                        </Typography>

                        <Controller
                           name="batchNumber"
                           control={formControl}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Enter batch number"
                                 placeholder="e.g. BATCH-001"
                                 value={field.value ?? ""}
                                 size="small"
                                 fullWidth
                                 error={Boolean(errors.batchNumber)}
                                 helperText={
                                    errors.batchNumber?.message ||
                                    "Enter the batch number for this product."
                                 }
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Batch Quantity */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                     <Stack spacing={1}>
                        <Typography variant="caption" sx={labelSx}>
                           Batch Quantity
                        </Typography>

                        <Controller
                           name="batchQuantity"
                           control={formControl}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Enter quantity"
                                 placeholder="e.g. 100"
                                 type="number"
                                 value={field.value ?? ""}
                                 size="small"
                                 fullWidth
                                 error={Boolean(errors.batchQuantity)}
                                 helperText={
                                    errors.batchQuantity?.message ||
                                    "Enter the available stock in this batch."
                                 }
                                 sx={fieldSx}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Manufacturing Date */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                     <Stack spacing={1}>
                        <Typography variant="caption" sx={labelSx}>
                           Manufacturing Date
                        </Typography>

                        <Controller
                           name="mfgDate"
                           control={formControl}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Select manufacturing date"
                                 type="date"
                                 value={field.value ?? ""}
                                 size="small"
                                 fullWidth
                                 InputLabelProps={{ shrink: true }}
                                 error={Boolean(errors.mfgDate)}
                                 helperText={
                                    errors.mfgDate?.message ||
                                    "When was this product made?"
                                 }
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Expiration Date */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                     <Stack spacing={1}>
                        <Typography variant="caption" sx={labelSx}>
                           Expiration Date
                        </Typography>

                        <Controller
                           name="expDate"
                           control={formControl}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Select expiry date"
                                 type="date"
                                 value={field.value ?? ""}
                                 size="small"
                                 fullWidth
                                 InputLabelProps={{ shrink: true }}
                                 error={Boolean(errors.expDate) || isNearExpiry}
                                 helperText={
                                    errors.expDate?.message ||
                                    (isNearExpiry
                                       ? "This product is expired or expires within 30 days."
                                       : "When will this product expire?")
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
                  Batch tracking is disabled. Enable it to track batch numbers,
                  quantities, and expiry dates.
               </Typography>
            )}
         </Stack>
      </Paper>
   );
};
