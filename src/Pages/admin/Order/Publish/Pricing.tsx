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
import { OrderType } from "../type";
import { Controller } from "react-hook-form";
import CustomAutocomplete from "@src/components/Autocomplete";
import { paymentMethod } from "../data";
import { useSettings } from "@src/lib/settingsContext";

interface DetailsProps {
   control: any;
   errors: any;
   data: OrderType["pricing"];
   setValue: Function;
   watch: any;
}

const Pricing = ({ control, errors, data, setValue, watch }: DetailsProps) => {
   const { settings } = useSettings();
   const [expanded, setExpanded] = useState(true);

   const subtotal = Number(watch("pricing.subtotal") ?? 0);
   const shipping = Number(watch("pricing.shipping") ?? 0);
   const discount = Number(watch("pricing.discount") ?? 0);
   const advance = Number(watch("pricing.advancePayment") ?? 0);
   const delivery = Number(watch("pricing.deliveryCharge") ?? 0);

   useEffect(() => {
      const total = Math.max(subtotal + shipping + delivery - discount, 0);
      const due = Math.max(total - advance, 0);

      setValue("pricing.total", total);
      setValue("pricing.dueAmount", due);
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
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Payment method
                        </Typography>
                        <Controller
                           name="pricing.paymentMethod"
                           control={control}
                           defaultValue={
                              data?.paymentMethod ?? (settings.defaultPaymentMethod || "Cash on Delivery")
                           }
                           render={({ field }) => (
                              <CustomAutocomplete
                                 {...field}
                                 value={field.value || ""}
                                 onChange={(val: any, e: any) =>
                                    field.onChange(val)
                                 }
                                 error={!!errors.paymentMethod}
                                 helperText={errors.paymentMethod?.message}
                                 arrow
                                 option={paymentMethod}
                                 placeholder="Payment method"
                                 label="Payment method"
                                 getOptionLabel={(option) => option.toString()}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Subtotal */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Subtotal
                        </Typography>
                        <Controller
                           name="pricing.subtotal"
                           control={control}
                           defaultValue={data?.subtotal ?? 0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Subtotal (Auto-calculated)"
                                 InputProps={{ readOnly: true }}
                                 error={!!errors?.subtotal}
                                 helperText={errors?.subtotal?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Delivery Charge */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Delivery Charge{" "}
                           <Typography
                              component={"span"}
                              variant="body2"
                              fontSize={12}
                              color="textSecondary"
                           >
                              (Leave 0 for free)
                           </Typography>
                        </Typography>
                        <Controller
                           name="pricing.deliveryCharge"
                           control={control}
                           defaultValue={data?.deliveryCharge ?? (settings.defaultDeliveryCharge ?? 0)}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Delivery Charge"
                                 error={!!errors?.deliveryCharge}
                                 helperText={errors?.deliveryCharge?.message}
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
                           name="pricing.discount"
                           control={control}
                           defaultValue={data?.discount ?? (settings.defaultDiscountRate ?? 0)}
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

                  {/* Total (read-only) */}
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
                           name="pricing.total"
                           control={control}
                           defaultValue={0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Total Amount"
                                 InputProps={{ readOnly: true }}
                                 error={!!errors?.total}
                                 helperText={errors?.total?.message}
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
                           name="pricing.advancePayment"
                           control={control}
                           defaultValue={data?.advancePayment ?? 0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Advance Payment"
                                 error={!!errors?.advancePayment}
                                 helperText={errors?.advancePayment?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Due (read-only) */}
                  <Grid size={{ xs: 12 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Due Amount
                        </Typography>
                        <Controller
                           name="pricing.dueAmount"
                           control={control}
                           defaultValue={0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Due Amount"
                                 InputProps={{ readOnly: true }}
                                 error={!!errors?.dueAmount}
                                 helperText={errors?.dueAmount?.message}
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
