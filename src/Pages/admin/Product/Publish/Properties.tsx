import {
   Stack,
   Typography,
   TextField,
   Grid,
   IconButton,
   Collapse,
   Paper,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import { Controller, get } from "react-hook-form";

import Icon from "@src/components/Icon";
import React, { useState } from "react";

interface PricingProps {
   formControl: any;
   errors: any;
}

const Properties = ({ formControl, errors }: PricingProps) => {
   const [expanded, setExpanded] = useState(true);
   const [type, setType] = useState("");

   return (
      <Paper sx={{ borderRadius: 1.5, boxShadow: 15, overflow: "hidden" }}>
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            p={3}
         >
            <Stack spacing={1}>
               <Typography variant="body1" fontSize={18} color="textPrimary">
                  Properties
               </Typography>
               <Typography
                  variant="body2"
                  fontSize={13}
                  fontWeight={400}
                  color="textSecondary"
               >
                  Additional functions and attributes...
               </Typography>
            </Stack>
            <IconButton onClick={() => setExpanded(!expanded)}>
               <Icon
                  style={{
                     transform: `rotate(${expanded ? 90 : 0}deg)`,
                     transition: "all 0.2s",
                  }}
                  icon={"solar:alt-arrow-right-broken"}
               />
            </IconButton>
         </Stack>
         <Collapse in={expanded}>
            <Grid container spacing={3} p={2}>
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Product code
                     </Typography>
                     <Controller
                        name="productCode"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              error={!!errors.productCode}
                              helperText={errors.productCode?.message || "Leave blank for auto sequential ID (e.g. PROD_6)"}
                              label="Product code"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Product sku
                     </Typography>
                     <Controller
                        name="productSku"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              error={!!errors.productSku}
                              helperText={errors.productSku?.message || "Leave blank for auto sequential SKU"}
                              label="Product sku"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Low stock alert
                     </Typography>
                     <Controller
                        name="lowStockAlert"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              error={!!errors.lowStockAlert}
                              helperText={errors.lowStockAlert?.message}
                              label="Low stock alert"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Quantity
                     </Typography>
                     <Controller
                        name="quantity"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? 0}
                              error={!!errors.quantity}
                              helperText={errors.quantity?.message}
                              label="Quantity"
                              variant="outlined"
                              type="number"
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
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5} flex={1}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Category
                     </Typography>
                     <Controller
                        name="category"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              {...field}
                              value={field.value || []} // ✅ always controlled
                              onChange={(val: any, e: any) =>
                                 field.onChange(val)
                              }
                              error={!!errors.category}
                              helperText={errors.category?.message}
                              arrow
                              label="Category"
                              options={["Active", "Inactive"]}
                              getOptionLabel={(option) => option.toString()}
                           />
                        )}
                     />
                  </Stack>
               </Grid>
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5} flex={1}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Product type
                     </Typography>
                     <Controller
                        name="productType"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              {...field}
                              value={field.value || []} // ✅ always controlled
                              onChange={(val: any, e: any) => {
                                 field.onChange(val);
                                 setType(val);
                              }}
                              error={!!errors.productType}
                              helperText={errors.productType?.message}
                              arrow
                              label="Product type"
                              options={["Simple", "Variable", "Bundle"]}
                              getOptionLabel={(option) => option.toString()}
                           />
                        )}
                     />
                  </Stack>
               </Grid>
               {type !== "Simple" && (
                  <>
                     <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                        <Stack spacing={1.5} flex={1}>
                           <Typography
                              variant="h6"
                              fontSize={"13px!important"}
                              fontWeight={500}
                           >
                              Color
                           </Typography>
                           <Controller
                              name="color"
                              control={formControl}
                              render={({ field }) => (
                                 <CustomAutocomplete
                                    {...field}
                                    value={field.value || []} // ✅ always controlled
                                    onChange={(val: any, e: any) =>
                                       field.onChange(val)
                                    }
                                    error={!!errors.color}
                                    helperText={errors.color?.message}
                                    arrow
                                    label="Color"
                                    limitTags={1}
                                    options={[
                                       "Red",
                                       "Blue",
                                       "Green",
                                       "Yellow",
                                       "Black",
                                       "White",
                                       "Gray",
                                       "Purple",
                                       "Orange",
                                       "Pink",
                                       "Brown",
                                       "Cyan",
                                       "Magenta",
                                       "Lime",
                                       "Maroon",
                                       "Navy",
                                       "Olive",
                                       "Teal",
                                       "Silver",
                                       "Gold",
                                       "Beige",
                                       "Coral",
                                       "Turquoise",
                                       "Indigo",
                                       "Violet",
                                       "Amber",
                                       "Crimson",
                                       "Azure",
                                       "Ivory",
                                       "Lavender",
                                       "Mint",
                                       "Peach",
                                       "Plum",
                                       "Salmon",
                                       "Tan",
                                       "Chocolate",
                                       "Charcoal",
                                       "Emerald",
                                       "Sapphire",
                                       "Ruby",
                                       "Onyx",
                                       "Pearl",
                                       "Bronze",
                                       "Copper",
                                       "Fuchsia",
                                       "Khaki",
                                       "Mauve",
                                       "Ochre",
                                       "Periwinkle",
                                       "Sienna",
                                       "Umber",
                                       "Zinc",
                                    ]}
                                    multiple
                                    getOptionLabel={(option) =>
                                       option.toString()
                                    }
                                 />
                              )}
                           />
                        </Stack>
                     </Grid>
                     <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                        <Stack spacing={1.5} flex={1}>
                           <Typography
                              variant="h6"
                              fontSize={"13px!important"}
                              fontWeight={500}
                           >
                              Unit
                           </Typography>
                           <Controller
                              name="unit"
                              control={formControl}
                              render={({ field }) => (
                                 <CustomAutocomplete
                                    {...field}
                                    value={field.value || []} // ✅ always controlled
                                    onChange={(val: any, e: any) =>
                                       field.onChange(val)
                                    }
                                    error={!!errors.unit}
                                    helperText={errors.unit?.message}
                                    arrow
                                    label="Unit"
                                    limitTags={1}
                                    options={[
                                       "66 inch",
                                       "45 inch",
                                       "34 inch",
                                       "24 inch",
                                       "400 ml",
                                       "200 ml",
                                       "100 ml",
                                       "200 g",
                                       "180 g",
                                       "100 g",
                                       "50 g",
                                       "0.5 kg",
                                       "1 kg",
                                    ]}
                                    multiple
                                    getOptionLabel={(option) =>
                                       option.toString()
                                    }
                                 />
                              )}
                           />
                        </Stack>
                     </Grid>
                  </>
               )}
            </Grid>
         </Collapse>
      </Paper>
   );
};

export default Properties;
