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
import React, { useEffect, useState } from "react";
import Icon from "@src/components/Icon";
import { Controller } from "react-hook-form";
import CustomAutocomplete from "@src/components/Autocomplete";
import { paymentMethod } from "@src/Pages/Order/data";
import { PurchaseTypes } from "..";

interface DetailsProps {
   control: any;
   errors: any;
   data: PurchaseTypes;
   setValue: Function;
   watch: any;
}

const Pricing = ({ control, errors, data, setValue, watch }: DetailsProps) => {
   const [expanded, setExpanded] = useState(true);

   const subtotal = Number(watch("subtotal") ?? 0);
   const shipping = Number(watch("shipping") ?? 0);
   const discount = Number(watch("discount") ?? 0);
   const advance = Number(watch("advancePayment") ?? 0);
   const delivery = Number(watch("deliveryCharge") ?? 0);

   useEffect(() => {
      const total = Math.max(subtotal + shipping + delivery - discount, 0);
      const due = Math.max(total - advance, 0);

      setValue("total", total);
      setValue("dueAmount", due);
   }, [subtotal, shipping, delivery, discount, advance, setValue]);

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
                  Pricing & Discounts
               </Typography>
               <Typography variant="body2" color="textSecondary">
                  Affordable rates with exclusive discounts on bulk and seasonal
                  orders.
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
                     {/* Product Amount */}
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Product Amount
                        </Typography>
                        <Controller
                           name="product_amount"
                           control={control}
                           defaultValue={
                              data?.product_amount ?? "Cash on Delivery"
                           }
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Subtotal"
                                 error={!!errors?.subtotal}
                                 helperText={errors?.subtotal?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Discount */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Discount
                        </Typography>
                        <Controller
                           name="discount"
                           control={control}
                           defaultValue={data?.discount ?? 0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Discount"
                                 error={!!errors?.discount}
                                 helperText={errors?.discount?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Total Amount */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Total Amount
                        </Typography>
                        <Controller
                           name="supplier_total"
                           control={control}
                           defaultValue={data?.supplier_total ?? 0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Total"
                                 error={!!errors?.supplier_total}
                                 helperText={errors?.supplier_total?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Pay Amount */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Pay Amount
                        </Typography>
                        <Controller
                           name="pay"
                           control={control}
                           defaultValue={0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Pay"
                                 InputProps={{ readOnly: true }}
                                 error={!!errors?.pay}
                                 helperText={errors?.pay?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Due Amount */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Due Amount
                        </Typography>
                        <Controller
                           name="Due"
                           control={control}
                           defaultValue={data?.due ?? 0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Due"
                                 error={!!errors?.due}
                                 helperText={errors?.due?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Advance Payment */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Advance Payment
                        </Typography>
                        <Controller
                           name="advance"
                           control={control}
                           defaultValue={data?.advance ?? 0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Advance"
                                 error={!!errors?.advance}
                                 helperText={errors?.advance?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Total Due */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Total Due
                        </Typography>
                        <Controller
                           name="total_due"
                           control={control}
                           defaultValue={0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Total Due"
                                 InputProps={{ readOnly: true }}
                                 error={!!errors?.total_due}
                                 helperText={errors?.total_due?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Others cost */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Others cost
                        </Typography>
                        <Controller
                           name="others_cost"
                           control={control}
                           defaultValue={data?.others_cost ?? 0} // free by default
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Others cost"
                                 error={!!errors?.others_cost}
                                 helperText={errors?.others_cost?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Grand Total */}
                  <Grid size={{ xs: 12 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Grand Total
                        </Typography>
                        <Controller
                           name="total"
                           control={control}
                           defaultValue={data?.total ?? 0} // free by default
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Total"
                                 error={!!errors?.total}
                                 helperText={errors?.total?.message}
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

export default Pricing;
