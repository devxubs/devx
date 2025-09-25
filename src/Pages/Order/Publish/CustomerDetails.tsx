"use client";

import {
   Paper,
   Stack,
   Typography,
   TextField,
   IconButton,
   Collapse,
   Grid,
} from "@mui/material";
import React, { useState } from "react";

import Icon from "@src/components/Icon";
import { OrderType } from "../type";
import { Controller } from "react-hook-form";

interface DetailsProps {
   control: any;
   errors: any;
   data: OrderType["customer"];
}

const CustomerDetails = ({ control, errors, data }: DetailsProps) => {
   const [expanded, setExpanded] = useState(true);

   return (
      <Paper sx={{ borderRadius: 1.5, boxShadow: 15, overflow: "hidden" }}>
         {/* Header */}
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            p={3}
         >
            <Stack spacing={0.5}>
               <Typography variant="body1" fontSize={18} color="textPrimary">
                  Customer Details
               </Typography>
               <Typography variant="body2" color="textSecondary">
                  Name, Number, E-mail, Address ...
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

         {/* Animated Content */}
         <Collapse in={expanded}>
            <Stack spacing={3} p={2} pt={0}>
               <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Full Name
                        </Typography>
                        <Controller
                           name="customer.name"
                           control={control}
                           defaultValue={data?.name}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 placeholder="Name"
                                 label="Name"
                                 error={!!errors.name}
                                 helperText={errors.name?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           E-mail
                        </Typography>
                        <Controller
                           name="customer.email"
                           control={control}
                           defaultValue={data?.email}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 placeholder="E-mail"
                                 label="E-mail"
                                 error={!!errors.email}
                                 helperText={errors.email?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Phone Number
                        </Typography>
                        <Controller
                           name="customer.phone"
                           control={control}
                           defaultValue={data?.phone}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 placeholder="Number"
                                 label="Number"
                                 type="tel"
                                 error={!!errors.phone}
                                 helperText={errors.phone?.message}
                                 sx={{
                                    "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                       { display: "none" },
                                 }}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Billing Address{" "}
                           <Typography
                              component={"span"}
                              variant="body2"
                              fontSize={12}
                              color="textSecondary"
                           >
                              (Street, City, State)
                           </Typography>
                        </Typography>
                        <Controller
                           name="customer.address"
                           control={control}
                           defaultValue={data?.address}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 placeholder="Address"
                                 label="Address"
                                 error={!!errors.address}
                                 helperText={errors.address?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
               </Grid>
            </Stack>
         </Collapse>
      </Paper>
   );
};

export default CustomerDetails;
