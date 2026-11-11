"use client";

import React, { useEffect, useState } from "react";
import {
   Divider,
   Grid,
   Paper,
   Stack,
   TextField,
   Typography,
   useTheme,
} from "@mui/material";
import { Control, Controller, FieldErrors } from "react-hook-form";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import { ProductSchemaType } from "../types";

interface ProductSuppliersSectionProps {
   formControl: Control<ProductSchemaType>;
   errors: FieldErrors<ProductSchemaType>;
}

export const ProductSuppliersSection: React.FC<
   ProductSuppliersSectionProps
> = ({ formControl, errors }) => {
   const theme = useTheme();

   const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
      [],
   );

   useEffect(() => {
      let isMounted = true;

      fetch("/api/suppliers")
         .then((response) => (response.ok ? response.json() : []))
         .then((data) => {
            if (!isMounted) return;

            const list = Array.isArray(data) ? data : data.suppliers || [];

            setSuppliers(
               list.map((supplier: any) => ({
                  id: supplier.id,
                  name: supplier.name || supplier.companyName || supplier.id,
               })),
            );
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
         id="section-9-suppliers"
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
            <Stack spacing={0.5}>
               <Stack direction="row" spacing={1} alignItems="center">
                  <Icon
                     icon="solar:users-group-two-rounded-linear"
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
                     9. Supplier Details
                  </Typography>
               </Stack>

               <Typography variant="caption" color="text.secondary">
                  Add supplier information and purchase details for this
                  product.
               </Typography>
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            <Grid container spacing={2.5}>
               {/* Primary Supplier */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography variant="caption" sx={labelSx}>
                        Primary Supplier
                     </Typography>

                     <Controller
                        name="primarySupplierId"
                        control={formControl}
                        render={({ field }) => {
                           const currentSup = suppliers.find(
                              (supplier) => supplier.id === field.value,
                           );

                           return (
                              <CustomAutocomplete
                                 size="small"
                                 value={currentSup ? currentSup.name : ""}
                                 onChange={(value: any) => {
                                    const match = suppliers.find(
                                       (supplier) => supplier.name === value,
                                    );

                                    field.onChange(match ? match.id : "");
                                 }}
                                 arrow
                                 label="Select supplier"
                                 placeholder="Search supplier"
                                 options={suppliers.map(
                                    (supplier) => supplier.name,
                                 )}
                                 getOptionLabel={(option) =>
                                    option?.toString() || ""
                                 }
                              />
                           );
                        }}
                     />

                     <Typography variant="caption" color="text.secondary">
                        Select the main supplier for this product.
                     </Typography>
                  </Stack>
               </Grid>

               {/* Supplier Product Code */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography variant="caption" sx={labelSx}>
                        Supplier Product Code
                     </Typography>

                     <Controller
                        name="supplierProductCode"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              label="Enter product code"
                              placeholder="e.g. SUP-001"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              error={Boolean(errors.supplierProductCode)}
                              helperText={
                                 errors.supplierProductCode?.message ||
                                 "Product code provided by the supplier."
                              }
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Supplier Purchase Price */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography variant="caption" sx={labelSx}>
                        Purchase Price (৳)
                     </Typography>

                     <Controller
                        name="supplierPrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              label="Enter purchase price"
                              placeholder="e.g. 250"
                              type="number"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              error={Boolean(errors.supplierPrice)}
                              helperText={
                                 errors.supplierPrice?.message ||
                                 "Price you pay the supplier per purchase unit."
                              }
                              sx={fieldSx}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Delivery Time */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography variant="caption" sx={labelSx}>
                        Delivery Time (Days)
                     </Typography>

                     <Controller
                        name="leadTimeDays"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              label="Enter delivery time"
                              placeholder="e.g. 7"
                              type="number"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              error={Boolean(errors.leadTimeDays)}
                              helperText={
                                 errors.leadTimeDays?.message ||
                                 "How many days the supplier takes to deliver."
                              }
                              sx={fieldSx}
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
