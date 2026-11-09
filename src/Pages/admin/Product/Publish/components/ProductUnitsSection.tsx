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

const STANDARD_UNITS = [
   "Piece",
   "Box",
   "Carton",
   "Pack",
   "Dozen",
   "Kg",
   "Gram",
   "Liter",
   "Ml",
   "Meter",
   "Roll",
];

interface ProductUnitsSectionProps {
   formControl: Control<ProductSchemaType>;
   errors: FieldErrors<ProductSchemaType>;
}

export const ProductUnitsSection: React.FC<ProductUnitsSectionProps> = ({
   formControl,
   errors,
}) => {
   const theme = useTheme();
   const [unitOptions, setUnitOptions] = useState<string[]>(STANDARD_UNITS);

   useEffect(() => {
      let isMounted = true;
      fetch("/api/units")
         .then((r) => (r.ok ? r.json() : []))
         .then((data) => {
            if (!isMounted) return;
            const fetched = Array.isArray(data) ? data : data.units || [];
            const names = fetched.map((u: any) => u.name || u.unitName).filter(Boolean);
            if (names.length > 0) {
               setUnitOptions(Array.from(new Set([...STANDARD_UNITS, ...names])));
            }
         })
         .catch(() => {});
      return () => {
         isMounted = false;
      };
   }, []);

   return (
      <Paper
         id="section-6-units"
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
            <Stack direction="row" spacing={1} alignItems="center">
               <Icon
                  icon="solar:scale-linear"
                  size="18px"
                  style={{ color: theme.palette.text.secondary }}
               />
               <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: "-0.01em" }}>
                  6. Units & Measurement Conversion
               </Typography>
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            <Grid container spacing={2}>
               {/* Base Unit */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.primary"
                        sx={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "0.72rem" }}
                     >
                        Base / Inventory Unit
                     </Typography>
                     <Controller
                        name="baseUnit"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              size="small"
                              value={field.value || "Piece"}
                              onChange={(val: any) => field.onChange(val || "Piece")}
                              arrow
                              label="Base Unit"
                              options={unitOptions}
                              getOptionLabel={(option) => option?.toString() || ""}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Purchase Unit */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.primary"
                        sx={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "0.72rem" }}
                     >
                        Purchase / Procurement Unit
                     </Typography>
                     <Controller
                        name="purchaseUnit"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              size="small"
                              value={field.value || ""}
                              onChange={(val: any) => field.onChange(val || "")}
                              arrow
                              label="Purchase Unit (e.g. Carton, Box)"
                              options={unitOptions}
                              getOptionLabel={(option) => option?.toString() || ""}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Sales Unit */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.primary"
                        sx={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "0.72rem" }}
                     >
                        POS Sales Unit
                     </Typography>
                     <Controller
                        name="salesUnit"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              size="small"
                              value={field.value || "Piece"}
                              onChange={(val: any) => field.onChange(val || "Piece")}
                              arrow
                              label="Sales Unit"
                              options={unitOptions}
                              getOptionLabel={(option) => option?.toString() || ""}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Conversion Rate */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.primary"
                        sx={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "0.72rem" }}
                     >
                        Unit Conversion Ratio
                     </Typography>
                     <Controller
                        name="unitConversionRate"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              type="number"
                              value={field.value ?? 1}
                              size="small"
                              fullWidth
                              placeholder="e.g. 1 Carton = 12 Pieces"
                              helperText="Conversion factor: 1 Purchase Unit = N Base Units"
                              sx={{
                                 "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
                                    display: "none",
                                 },
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
