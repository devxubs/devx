"use client";

import React from "react";
import {
   Divider,
   FormControlLabel,
   Grid,
   Paper,
   Stack,
   Switch,
   Typography,
   useTheme,
} from "@mui/material";
import { Control, Controller, FieldErrors } from "react-hook-form";
import Icon from "@src/components/Icon";
import { ProductSchemaType } from "../types";

interface ProductPOSSettingsSectionProps {
   formControl: Control<ProductSchemaType>;
   errors: FieldErrors<ProductSchemaType>;
}

export const ProductPOSSettingsSection: React.FC<ProductPOSSettingsSectionProps> = ({
   formControl,
   errors,
}) => {
   const theme = useTheme();

   return (
      <Paper
         id="section-10-extra-settings"
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
                  icon="solar:shop-linear"
                  size="18px"
                  style={{ color: theme.palette.text.secondary }}
               />
               <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: "-0.01em" }}>
                  10. SEO & Extra Product Settings
               </Typography>
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            <Grid container spacing={2}>
               {/* Allow Discount */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                     name="allowDiscount"
                     control={formControl}
                     render={({ field }) => (
                        <FormControlLabel
                           control={
                              <Switch
                                 checked={field.value !== false}
                                 onChange={(e) => field.onChange(e.target.checked)}
                                 color="primary"
                              />
                           }
                           label={
                              <Typography variant="body2" fontWeight={500}>
                                 Allow Cashier Discounts
                              </Typography>
                           }
                        />
                     )}
                  />
               </Grid>

               {/* Allow Price Change at POS */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                     name="allowPriceChangeAtPos"
                     control={formControl}
                     render={({ field }) => (
                        <FormControlLabel
                           control={
                              <Switch
                                 checked={Boolean(field.value)}
                                 onChange={(e) => field.onChange(e.target.checked)}
                                 color="primary"
                              />
                           }
                           label={
                              <Typography variant="body2" fontWeight={500}>
                                 Allow Price Overrides at Register
                              </Typography>
                           }
                        />
                     )}
                  />
               </Grid>

               {/* Track Inventory */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                     name="trackInventory"
                     control={formControl}
                     render={({ field }) => (
                        <FormControlLabel
                           control={
                              <Switch
                                 checked={field.value !== false}
                                 onChange={(e) => field.onChange(e.target.checked)}
                                 color="primary"
                              />
                           }
                           label={
                              <Typography variant="body2" fontWeight={500}>
                                 Track Real-time Stock Count
                              </Typography>
                           }
                        />
                     )}
                  />
               </Grid>

               {/* Allow Negative Stock */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                     name="allowNegativeStock"
                     control={formControl}
                     render={({ field }) => (
                        <FormControlLabel
                           control={
                              <Switch
                                 checked={Boolean(field.value)}
                                 onChange={(e) => field.onChange(e.target.checked)}
                                 color="primary"
                              />
                           }
                           label={
                              <Typography variant="body2" fontWeight={500}>
                                 Allow Backorders (Negative Stock)
                              </Typography>
                           }
                        />
                     )}
                  />
               </Grid>

               {/* Available for POS Sales */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                     name="availableForPos"
                     control={formControl}
                     render={({ field }) => (
                        <FormControlLabel
                           control={
                              <Switch
                                 checked={field.value !== false}
                                 onChange={(e) => field.onChange(e.target.checked)}
                                 color="primary"
                              />
                           }
                           label={
                              <Typography variant="body2" fontWeight={500}>
                                 Visible on POS Register
                              </Typography>
                           }
                        />
                     )}
                  />
               </Grid>

               {/* Available for Online Store */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                     name="availableForOnline"
                     control={formControl}
                     render={({ field }) => (
                        <FormControlLabel
                           control={
                              <Switch
                                 checked={field.value !== false}
                                 onChange={(e) => field.onChange(e.target.checked)}
                                 color="primary"
                              />
                           }
                           label={
                              <Typography variant="body2" fontWeight={500}>
                                 Publish to Online Store Catalog
                              </Typography>
                           }
                        />
                     )}
                  />
               </Grid>
            </Grid>
         </Stack>
      </Paper>
   );
};
