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
                     9. Supplier & Procurement Management
                  </Typography>
               </Stack>

               <Typography variant="caption" color="text.secondary">
                  Manage supplier assignments, product reference codes,
                  purchasing costs, and procurement lead times.
               </Typography>
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            <Grid container spacing={2.5}>
               {/* Primary Supplier */}
               <Grid size={{ xs: 12 }}>
                  <Stack spacing={0.75}>
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
                                 label="Select Primary Supplier"
                                 placeholder="Search or select a supplier"
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
                  </Stack>
               </Grid>

               {/* Supplier Product Code */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <Typography variant="caption" sx={labelSx}>
                        Supplier Product Code
                     </Typography>

                     <Controller
                        name="supplierProductCode"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              label="Supplier Product Code"
                              placeholder="e.g. SUP-PROD-001"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              helperText="Enter the supplier's product or catalog reference code."
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Supplier Purchase Price */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <Typography variant="caption" sx={labelSx}>
                        Supplier Purchase Price (৳)
                     </Typography>

                     <Controller
                        name="supplierPrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              label="Purchase Price (৳)"
                              placeholder="Enter supplier purchase price"
                              type="number"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              helperText="Enter the agreed purchase cost per unit."
                              sx={fieldSx}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Procurement Lead Time */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <Typography variant="caption" sx={labelSx}>
                        Procurement Lead Time
                     </Typography>

                     <Controller
                        name="leadTimeDays"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              label="Lead Time (Days)"
                              placeholder="e.g. 7"
                              type="number"
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              helperText="Expected number of days for supplier delivery."
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
