"use client";

import React from "react";
import OrderDisplaySection from "./OrderDisplaySection";
import OrderCreateDefaultsSection from "./OrderCreateDefaultsSection";
import PaymentMethodsSection from "./PaymentMethodsSection";
import {
   Grid,
   Stack,
   TextField,
   Typography,
   Box,
   FormControlLabel,
   Switch,
   Card,
   CardContent,
} from "@mui/material";

interface PosTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
   onConfigChange: (key: string, value: any) => void;
}

export default function PosTab({ values, onChange, onConfigChange }: PosTabProps) {

   return (
      <Stack spacing={3}>
         <Box>
            <Typography variant="h6" fontWeight={600}>
               Sales & Point-of-Sale Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Fine-tune default VAT/taxes, shipping rates, payment gateways, and POS terminal rules.
            </Typography>
         </Box>

         {/* Pricing & Fees */}
         {/* P2-20: "Default Order Status" (customConfig.defaultOrderStatus)
             was removed — no order flow read it; new orders take the
             status chosen in the order form. The "Allow Partial & Due
             Payments", "Auto-trigger Receipt Print" and "Round Final
             Order Totals" toggles below were likewise write-only and
             have been removed. */}
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  fullWidth
                  label="Default Tax / VAT Rate (%)"
                  type="number"
                  size="small"
                  value={values.defaultTaxRate ?? 0}
                  onChange={(e) => onChange("defaultTaxRate", parseFloat(e.target.value) || 0)}
                  helperText="Default VAT percentage applied on checkout"
                  inputProps={{ min: 0, max: 100, step: 0.5 }}
               />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  fullWidth
                  label={`Default Delivery Fee (${values.currencySymbol || "৳"})`}
                  type="number"
                  size="small"
                  value={values.defaultDeliveryCharge ?? 60}
                  onChange={(e) => onChange("defaultDeliveryCharge", parseFloat(e.target.value) || 0)}
                  helperText="Standard home delivery or shipping rate"
                  inputProps={{ min: 0, step: 5 }}
               />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  fullWidth
                  label="Default Discount Rate (%)"
                  type="number"
                  size="small"
                  value={values.defaultDiscountRate ?? 0}
                  onChange={(e) => onChange("defaultDiscountRate", parseFloat(e.target.value) || 0)}
                  helperText="Standard promotional discount on sales"
                  inputProps={{ min: 0, max: 100, step: 1 }}
               />
            </Grid>

            {/* Phase 5: the Default Payment Method selector moved
                into the Payment Methods section below, where its
                options come from the managed method list. */}

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  fullWidth
                  label="Invoice Number Prefix"
                  size="small"
                  value={values.invoicePrefix || "INV"}
                  onChange={(e) => onChange("invoicePrefix", e.target.value)}
                  placeholder="INV"
                  helperText="New invoices look like INV_126 — the number shares the order sequence and never restarts when the prefix changes."
               />
            </Grid>

            {/* Final-verification fix: the legacy orderPrefix ("#")
                field was removed — it edited a StoreSetting column
                nothing consumes (a leftover of the old #6001 ID
                scheme) and sat confusingly beside the real prefixes.
                The actual Order ID prefix is prefixOrder, edited in
                the ID Prefixes tab. The column itself is untouched. */}

         </Grid>

         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               POS Checkout Policies & Controls
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Configure stock verification for checkout.
            </Typography>
         </Box>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <Switch
                              checked={Boolean(values.enableStockValidation)}
                              onChange={(e) => onChange("enableStockValidation", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Strict Stock Validation
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Prevent checkout when inventory is insufficient (disallow negative stock)
                              </Typography>
                           </Box>
                        }
                     />
                  </CardContent>
               </Card>
            </Grid>



         </Grid>

         {/* Phase 2: Order Display & Sorting (status order,
             visibility, list defaults, table columns). */}
         <OrderDisplaySection values={values} onConfigChange={onConfigChange} />

         {/* Phase 3: Order Creation Defaults. */}
         <OrderCreateDefaultsSection values={values} onConfigChange={onConfigChange} />

         {/* Phase 5: Payment Methods + default payment method. */}
         <PaymentMethodsSection values={values} onChange={onChange} onConfigChange={onConfigChange} />
      </Stack>
   );
}
