"use client";

import React, { useEffect, useState } from "react";
import {
   Box,
   Chip,
   Divider,
   Grid,
   Paper,
   Stack,
   TextField,
   Typography,
   useTheme,
} from "@mui/material";
import { Control, Controller, FieldErrors, useWatch } from "react-hook-form";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import { ProductSchemaType } from "../types";

interface ProductInventorySectionProps {
   formControl: Control<ProductSchemaType>;
   errors: FieldErrors<ProductSchemaType>;
}

export const ProductInventorySection: React.FC<
   ProductInventorySectionProps
> = ({ formControl, errors }) => {
   const theme = useTheme();

   const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>(
      [],
   );

   const qty = Number(
      useWatch({ control: formControl, name: "quantity" }) ?? 0,
   );

   const lowStockAlert = Number(
      useWatch({ control: formControl, name: "lowStockAlert" }) ?? 10,
   );

   const minStock = Number(
      useWatch({ control: formControl, name: "minStockLevel" }) ?? 5,
   );

   const stockStatus =
      qty <= 0
         ? { label: "Out of Stock", color: "error" as const }
         : qty <= lowStockAlert || qty <= minStock
           ? { label: "Low Stock", color: "warning" as const }
           : { label: "In Stock", color: "success" as const };

   useEffect(() => {
      let isMounted = true;

      fetch("/api/warehouses")
         .then((response) => (response.ok ? response.json() : []))
         .then((data) => {
            if (isMounted) {
               setWarehouses(Array.isArray(data) ? data : []);
            }
         })
         .catch(() => {});

      return () => {
         isMounted = false;
      };
   }, []);

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
         id="section-7-inventory"
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
                        icon="solar:box-linear"
                        size="19px"
                        style={{ color: theme.palette.text.secondary }}
                     />

                     <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        sx={{ letterSpacing: "-0.01em" }}
                     >
                        7. Inventory & Stock Management
                     </Typography>
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                     Manage opening stock, inventory thresholds, warehouse
                     assignments, and storage locations.
                  </Typography>
               </Stack>

               <Chip
                  size="small"
                  label={stockStatus.label}
                  color={stockStatus.color}
                  sx={{
                     fontWeight: 600,
                     height: 25,
                     fontSize: "0.7rem",
                  }}
               />
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            <Grid container spacing={2.5}>
               {/* Assigned Warehouse */}
               <Grid size={{ xs: 12 }}>
                  <Stack spacing={1}>
                     <Typography variant="caption" sx={labelSx}>
                        Assigned Warehouse
                     </Typography>

                     <Controller
                        name="warehouseId"
                        control={formControl}
                        render={({ field }) => {
                           const currentWh = warehouses.find(
                              (warehouse) => warehouse.id === field.value,
                           );

                           return (
                              <CustomAutocomplete
                                 size="small"
                                 value={currentWh ? currentWh.name : ""}
                                 onChange={(value: any) => {
                                    const match = warehouses.find(
                                       (warehouse) => warehouse.name === value,
                                    );
                                    field.onChange(match ? match.id : "");
                                 }}
                                 arrow
                                 label="Choose a warehouse"
                                 placeholder="Search or select a warehouse"
                                 options={warehouses.map(
                                    (warehouse) => warehouse.name,
                                 )}
                                 getOptionLabel={(option) =>
                                    option?.toString() || ""
                                 }
                              />
                           );
                        }}
                     />
                  </Stack>
               </Grid>

               {/* Opening Stock */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography variant="caption" sx={labelSx}>
                        Opening Stock
                     </Typography>

                     <Controller
                        name="quantity"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              label="Opening Stock"
                              placeholder="Enter opening stock quantity"
                              type="number"
                              value={field.value ?? 0}
                              size="small"
                              fullWidth
                              error={Boolean(errors.quantity)}
                              helperText={
                                 errors.quantity?.message ||
                                 "Enter the initial available stock quantity."
                              }
                              sx={fieldSx}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Low Stock Threshold */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography variant="caption" sx={labelSx}>
                        Low Stock Threshold
                     </Typography>

                     <Controller
                        name="lowStockAlert"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              label="Low Stock Threshold"
                              placeholder="Enter low stock threshold"
                              type="number"
                              value={field.value ?? 10}
                              size="small"
                              fullWidth
                              error={Boolean(errors.lowStockAlert)}
                              helperText={
                                 errors.lowStockAlert?.message ||
                                 "Get notified when stock reaches this level."
                              }
                              sx={fieldSx}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Minimum Stock Level */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography variant="caption" sx={labelSx}>
                        Minimum Stock Level
                     </Typography>

                     <Controller
                        name="minStockLevel"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              label="Minimum Stock Level"
                              placeholder="Enter minimum stock quantity"
                              type="number"
                              value={field.value ?? 5}
                              size="small"
                              fullWidth
                              helperText="Minimum quantity to maintain before replenishment."
                              sx={fieldSx}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Maximum Stock Level */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography variant="caption" sx={labelSx}>
                        Maximum Stock Level
                     </Typography>

                     <Controller
                        name="maxStockLevel"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              label="Maximum Stock Level"
                              placeholder="Enter maximum stock quantity"
                              type="number"
                              value={field.value ?? 1000}
                              size="small"
                              fullWidth
                              helperText="Recommended maximum inventory capacity."
                              sx={fieldSx}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Rack / Aisle */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography variant="caption" sx={labelSx}>
                        Rack / Aisle
                     </Typography>

                     <Controller
                        name="rackLocation"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              label="Rack / Aisle"
                              placeholder="e.g. Aisle 3, Rack B"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              helperText="Specify the warehouse rack or aisle."
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Shelf / Bin Location */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography variant="caption" sx={labelSx}>
                        Shelf / Bin Location
                     </Typography>

                     <Controller
                        name="shelfLocation"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              label="Shelf / Bin Location"
                              placeholder="e.g. Shelf 4, Bin 12"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              helperText="Specify the exact storage position."
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
