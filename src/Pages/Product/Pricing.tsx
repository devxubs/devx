"use client";

import {
   Stack,
   Typography,
   TextField,
   Grid,
   IconButton,
   Paper,
   Collapse,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { TableRow } from "@src/components/Table";
import React, { useState } from "react";

import { Controller } from "react-hook-form";

interface PricingProps {
   formControl: any;
   errors: any;
   data: TableRow;
}

const Pricing = ({ formControl, errors, data }: PricingProps) => {
   const [expanded, setExpanded] = useState(true);
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
               <Grid size={{ xs: 12 }}>
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
                        defaultValue={data.regularPrice || ""}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              type="number"
                              label="Regular Price"
                              variant="outlined"
                              error={!!errors.regularPrice}
                              helperText={errors.regularPrice?.message}
                              InputProps={{
                                 inputProps: { min: 0 },
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

               {/* Sale Price */}
               <Grid size={{ xs: 12 }}>
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
                        defaultValue={data.salePrice || ""}
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
            </Grid>
         </Collapse>
      </Paper>
   );
};

export default Pricing;
