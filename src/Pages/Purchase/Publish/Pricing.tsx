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
import { PurchaseTypes } from "..";

interface PricingProps {
   control: any;
   errors: any;
   data: PurchaseTypes;
   setValue: Function;
   watch: any;
}

const Pricing = ({ control, errors, data, setValue, watch }: PricingProps) => {
   const [expanded, setExpanded] = useState(true);

   // ✅ Auto Calculation Effect
   useEffect(() => {
      const product = watch("product");
      const productAmount = Number(watch("product_amount")) || 0;
      const discount = Number(watch("discount")) || 0;
      const advance = Number(watch("advance")) || 0;
      const othersCost = Number(watch("others_cost")) || 0;
      const pay = Number(watch("pay"));

      const total = productAmount - discount + othersCost;
      const due = productAmount - (discount + advance) - pay;

      const pa = product
         .map((p: any, i: number) => p.price * p.quantity)
         .reduce(
            (accumulator: any, currentValue: any) => accumulator + currentValue,
            0
         );

      setValue("product_amount", parseInt(pa) || 0);
      setValue("total", total >= 0 ? total : 0);
      // setValue("pay", pay >= 0 ? pay : 0);
      setValue("due", due >= 0 ? due : 0);
   }, [
      watch("product"),
      watch("product_amount"),
      watch("discount"),
      watch("advance"),
      watch("others_cost"),
   ]);

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
                  Automated purchase pricing and balance calculations.
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
                  {/* Product Amount */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography fontSize={13} fontWeight={500}>
                           Product Amount.{" "}
                           <Typography
                              component={"span"}
                              variant="body2"
                              fontSize={12}
                              color="textSecondary"
                           >
                              (Auto-generated)
                           </Typography>
                        </Typography>
                        <Controller
                           name="product_amount"
                           control={control}
                           defaultValue={data?.product_amount ?? 0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 inputProps={{ min: 0 }}
                                 label="Amount"
                                 error={!!errors?.product_amount}
                                 helperText={errors?.product_amount?.message}
                                 disabled
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Discount */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography fontSize={13} fontWeight={500}>
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
                                 inputProps={{ min: 0 }}
                                 fullWidth
                                 label="Discount"
                                 error={!!errors?.discount}
                                 helperText={errors?.discount?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Pay Amount */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography fontSize={13} fontWeight={500}>
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
                                 inputProps={{ min: 0 }}
                                 label="Pay"
                                 error={!!errors?.pay}
                                 helperText={errors?.pay?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Advance Payment */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography fontSize={13} fontWeight={500}>
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
                                 inputProps={{ min: 0 }}
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
                        <Typography fontSize={13} fontWeight={500}>
                           Total Due.{" "}
                           <Typography
                              component={"span"}
                              variant="body2"
                              fontSize={12}
                              color="textSecondary"
                           >
                              (Auto-generated)
                           </Typography>
                        </Typography>
                        <Controller
                           name="due"
                           control={control}
                           defaultValue={0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 inputProps={{ min: 0 }}
                                 label="Total Due"
                                 InputProps={{ readOnly: true }}
                                 error={!!errors?.due}
                                 helperText={errors?.due?.message}
                                 disabled
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Others Cost */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography fontSize={13} fontWeight={500}>
                           Others Cost
                        </Typography>
                        <Controller
                           name="others_cost"
                           control={control}
                           defaultValue={data?.others_cost ?? 0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 inputProps={{ min: 0 }}
                                 fullWidth
                                 label="Others Cost"
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
                        <Typography fontSize={13} fontWeight={500}>
                           Grand Total.{" "}
                           <Typography
                              component={"span"}
                              variant="body2"
                              fontSize={12}
                              color="textSecondary"
                           >
                              (Auto-generated)
                           </Typography>
                        </Typography>
                        <Controller
                           name="total"
                           control={control}
                           defaultValue={data?.total ?? 0}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 type="number"
                                 fullWidth
                                 label="Total"
                                 InputProps={{ readOnly: true }}
                                 error={!!errors?.total}
                                 helperText={errors?.total?.message}
                                 disabled
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
