"use client";

// Order Create (upgrade) — Discount, Tax and Delivery.
// Product-level discounts live in the product table; this section holds the
// ORDER-level discount (fixed amount or %), the optional Tax/VAT switch and
// the delivery charge. The Order model has no tax column: the tax amount is
// folded into the submitted totals by the calculation engine (see
// orderCalculations.ts) and its breakdown is stored on orderTags.
import {
   FormControlLabel,
   Grid,
   InputAdornment,
   Stack,
   Switch,
   TextField,
   ToggleButton,
   ToggleButtonGroup,
   Typography,
} from "@mui/material";
import React from "react";
import SectionCard from "./SectionCard";
import { formatBDT } from "./orderCalculations";
import type { DiscountType, OrderTotals } from "./types";

interface ChargesSectionProps {
   discountType: DiscountType;
   discountValue: number;
   taxEnabled: boolean;
   taxRate: number;
   deliveryCharge: number;
   totals: OrderTotals;
   onChange: (partial: {
      discountType?: DiscountType;
      discountValue?: number;
      taxEnabled?: boolean;
      taxRate?: number;
      deliveryCharge?: number;
   }) => void;
   currencySymbol?: string;
}

const ChargesSection = ({
   discountType,
   discountValue,
   taxEnabled,
   taxRate,
   deliveryCharge,
   totals,
   onChange,
   currencySymbol = "৳",
}: ChargesSectionProps) => {
   return (
      <SectionCard title="Discount, Tax & Delivery" subtitle="Order-level charges — product discounts stay in the product table">
         <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
               <Stack spacing={1}>
                  <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
                     Overall Discount
                  </Typography>
                  <Stack direction="row" spacing={1}>
                     <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={discountType}
                        onChange={(_, v) => {
                           if (v) onChange({ discountType: v });
                        }}
                        sx={{
                           "& .MuiToggleButton-root": {
                              px: 0.9,
                              py: 0.3,
                              fontSize: 12.5,
                              lineHeight: 1.35,
                              whiteSpace: "nowrap",
                           },
                        }}
                     >
                        <ToggleButton value="amount">{currencySymbol} Amount</ToggleButton>
                        <ToggleButton value="percent">% Percent</ToggleButton>
                     </ToggleButtonGroup>
                     <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={discountValue}
                        onChange={(e) => onChange({ discountValue: Math.max(0, Number(e.target.value)) })}
                        inputProps={{ min: 0, step: "0.01" }}
                        InputProps={{
                           endAdornment: (
                              <InputAdornment position="end">
                                 {discountType === "percent" ? "%" : currencySymbol}
                              </InputAdornment>
                           ),
                        }}
                     />
                  </Stack>
                  <Typography variant="caption" color="textSecondary">
                     Discount applied: {formatBDT(totals.overallDiscount, currencySymbol)}
                  </Typography>
               </Stack>
            </Grid>
            <Grid size={{ xs: 12 }}>
               <Stack spacing={1}>
                  <FormControlLabel
                     control={
                        <Switch
                           checked={taxEnabled}
                           onChange={(e) => onChange({ taxEnabled: e.target.checked })}
                           color="primary"
                        />
                     }
                     label={
                        <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
                           Tax / VAT
                        </Typography>
                     }
                  />
                  <TextField
                     type="number"
                     size="small"
                     fullWidth
                     disabled={!taxEnabled}
                     value={taxRate}
                     onChange={(e) => onChange({ taxRate: Math.min(100, Math.max(0, Number(e.target.value))) })}
                     inputProps={{ min: 0, max: 100, step: "0.01" }}
                     InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                     helperText={
                        taxEnabled
                           ? `Tax amount: ${formatBDT(totals.taxAmount, currencySymbol)} (included in the grand total; breakdown saved with the order)`
                           : "Off — no tax is applied"
                     }
                  />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12 }}>
               <Stack spacing={1}>
                  <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
                     Delivery Charge <Typography component="span" variant="caption" color="textSecondary">(0 = free)</Typography>
                  </Typography>
                  <TextField
                     type="number"
                     size="small"
                     fullWidth
                     value={deliveryCharge}
                     error={deliveryCharge < 0}
                     helperText={deliveryCharge < 0 ? "Delivery charge cannot be negative" : undefined}
                     onChange={(e) => onChange({ deliveryCharge: Number(e.target.value) })}
                     inputProps={{ min: 0, step: "0.01" }}
                     InputProps={{ startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment> }}
                  />
               </Stack>
            </Grid>
         </Grid>
      </SectionCard>
   );
};

export default ChargesSection;
