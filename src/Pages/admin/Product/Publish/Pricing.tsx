"use client";

import {
   Stack,
   Typography,
   TextField,
   Grid,
   IconButton,
   Paper,
   Collapse,
   Box,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import Icon from "@src/components/Icon";
import React, { useState } from "react";
import { Controller, useWatch } from "react-hook-form";

interface PricingProps {
   formControl: any;
   errors: any;
}

const Pricing = ({ formControl, errors }: PricingProps) => {
   const [expanded, setExpanded] = useState(true);

   const regularPrice = useWatch({ control: formControl, name: "regularPrice" });
   const salePrice = useWatch({ control: formControl, name: "salePrice" });
   const costPrice = useWatch({ control: formControl, name: "costPrice" });

   const effectivePrice = Number(salePrice) > 0 ? Number(salePrice) : Number(regularPrice) || 0;
   const cost = Number(costPrice) || 0;
   const grossProfit = effectivePrice - cost;
   const margin = effectivePrice > 0 ? Math.round((grossProfit / effectivePrice) * 100) : 0;

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
                  Price
               </Typography>
               <Typography
                  variant="body2"
                  fontSize={13}
                  fontWeight={400}
                  color="textSecondary"
               >
                  Price related inputs
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
               {/* Regular Price */}
               <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Regular Price
                     </Typography>
                     <Controller
                        name="regularPrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              type="number"
                              label="Regular Price"
                              variant="outlined"
                              error={!!errors.regularPrice}
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

               {/* Sale Price */}
               <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Sale Price
                     </Typography>
                     <Controller
                        name="salePrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              type="number"
                              label="Sale Price"
                              variant="outlined"
                              error={!!errors.salePrice}
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

               {/* Cost Price */}
               <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Cost Price (Purchase Price)
                     </Typography>
                     <Controller
                        name="costPrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              type="number"
                              label="Cost Price"
                              variant="outlined"
                              error={!!errors.costPrice}
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

               {/* Wholesale Price */}
               <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Wholesale Price
                     </Typography>
                     <Controller
                        name="wholesalePrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              type="number"
                              label="Wholesale Price"
                              variant="outlined"
                              error={!!errors.wholesalePrice}
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

               {/* Dealer Price */}
               <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Dealer Price
                     </Typography>
                     <Controller
                        name="dealerPrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              type="number"
                              label="Dealer Price"
                              variant="outlined"
                              error={!!errors.dealerPrice}
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

               {/* Discount Percentage */}
               <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Discount Percentage (%)
                     </Typography>
                     <Controller
                        name="discountPercentage"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              type="number"
                              label="Discount %"
                              variant="outlined"
                              error={!!errors.discountPercentage}
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

               {/* Tax Rate & Tax Mode */}
               <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Tax Rate (%)
                     </Typography>
                     <Controller
                        name="taxRate"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              type="number"
                              label="Tax Rate %"
                              variant="outlined"
                              error={!!errors.taxRate}
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

               <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5} flex={1}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Tax Mode
                     </Typography>
                     <Controller
                        name="taxMode"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              {...field}
                              value={field.value || "EXCLUSIVE"}
                              onChange={(val: any) => field.onChange(val)}
                              error={!!errors.taxMode}
                              helperText={errors.taxMode?.message}
                              arrow
                              label="Tax Mode"
                              options={["EXCLUSIVE", "INCLUSIVE"]}
                              getOptionLabel={(option) => option.toString()}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Real-time Profit & Margin Indicator */}
               {(effectivePrice > 0 || cost > 0) && (
                  <Grid size={{ xs: 12 }}>
                     <Box
                        sx={{
                           p: 1.5,
                           borderRadius: 1,
                           bgcolor: "action.hover",
                           display: "flex",
                           justifyContent: "space-between",
                           alignItems: "center",
                           flexWrap: "wrap",
                           gap: 1,
                        }}
                     >
                        <Typography variant="body2" color="text.secondary">
                           Estimated Gross Profit:{" "}
                           <Typography
                              component="span"
                              variant="body2"
                              fontWeight={600}
                              color={grossProfit >= 0 ? "success.main" : "error.main"}
                           >
                              ৳ {grossProfit.toLocaleString()}
                           </Typography>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                           Profit Margin:{" "}
                           <Typography
                              component="span"
                              variant="body2"
                              fontWeight={600}
                              color={margin >= 0 ? "success.main" : "error.main"}
                           >
                              {margin}%
                           </Typography>
                        </Typography>
                     </Box>
                  </Grid>
               )}
            </Grid>
         </Collapse>
      </Paper>
   );
};

export default Pricing;
