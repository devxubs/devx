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
         .then((res) => (res.ok ? res.json() : []))
         .then((data) => {
            if (!isMounted) return;

            const fetched = Array.isArray(data) ? data : data.units || [];
            const names = fetched
               .map((unit: any) => unit.name || unit.unitName)
               .filter(Boolean);

            if (names.length > 0) {
               setUnitOptions(
                  Array.from(new Set([...STANDARD_UNITS, ...names])),
               );
            }
         })
         .catch(() => {});

      return () => {
         isMounted = false;
      };
   }, []);

   const labelSx = {
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      fontSize: "0.72rem",
      fontWeight: 600,
   };

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
            {/* Section Header */}
            <Stack direction="row" spacing={1} alignItems="center">
               <Icon
                  icon="solar:scale-linear"
                  size="18px"
                  style={{ color: theme.palette.text.secondary }}
               />

               <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{ letterSpacing: "-0.01em" }}
               >
                  6. Units & Conversion
               </Typography>
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            <Grid container spacing={2}>
               {/* Base Unit */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography sx={labelSx}>Base Unit</Typography>

                     <Controller
                        name="baseUnit"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              size="small"
                              value={field.value || "Piece"}
                              onChange={(val: any) =>
                                 field.onChange(val || "Piece")
                              }
                              arrow
                              label="Select base unit"
                              options={unitOptions}
                              getOptionLabel={(option) =>
                                 option?.toString() || ""
                              }
                           />
                        )}
                     />

                     <Typography variant="caption" color="text.secondary">
                        Main unit for stock (e.g. Piece, Kg).
                     </Typography>
                  </Stack>
               </Grid>

               {/* Purchase Unit */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography sx={labelSx}>Purchase Unit</Typography>

                     <Controller
                        name="purchaseUnit"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              size="small"
                              value={field.value || ""}
                              onChange={(val: any) => field.onChange(val || "")}
                              arrow
                              label="Select purchase unit"
                              options={unitOptions}
                              getOptionLabel={(option) =>
                                 option?.toString() || ""
                              }
                           />
                        )}
                     />

                     <Typography variant="caption" color="text.secondary">
                        Unit used to buy this product.
                     </Typography>
                  </Stack>
               </Grid>

               {/* Sales Unit */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography sx={labelSx}>Sales Unit</Typography>

                     <Controller
                        name="salesUnit"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              size="small"
                              value={field.value || "Piece"}
                              onChange={(val: any) =>
                                 field.onChange(val || "Piece")
                              }
                              arrow
                              label="Select sales unit"
                              options={unitOptions}
                              getOptionLabel={(option) =>
                                 option?.toString() || ""
                              }
                           />
                        )}
                     />

                     <Typography variant="caption" color="text.secondary">
                        Unit used to sell this product.
                     </Typography>
                  </Stack>
               </Grid>

               {/* Conversion Rate */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                     <Typography sx={labelSx}>Conversion Rate</Typography>

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
                              label="Conversion Rate"
                              placeholder="Enter quantity (e.g. 12)"
                              error={!!errors.unitConversionRate}
                              helperText={
                                 errors.unitConversionRate?.message ||
                                 "1 Purchase Unit = N Base Units."
                              }
                              inputProps={{
                                 min: 0.000001,
                                 step: "any",
                              }}
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
         </Stack>
      </Paper>
   );
};
