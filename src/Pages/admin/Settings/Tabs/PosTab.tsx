"use client";

import React from "react";
import {
   Grid,
   MenuItem,
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

const paymentMethods = [
   "Cash",
   "Credit / Debit Card",
   "bKash / Mobile Banking",
   "Nagad",
   "Rocket",
   "Bank Transfer",
   "Cash on Delivery",
];

const orderStatuses = [
   "COMPLETED",
   "CONFIRMED",
   "PROCESSING",
   "SHIPPED",
   "DELIVERED",
   "PENDING",
];

export default function PosTab({ values, onChange, onConfigChange }: PosTabProps) {
   const customConfig = values.customConfig || {};

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

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  select
                  fullWidth
                  label="Default Payment Method"
                  size="small"
                  value={values.defaultPaymentMethod || "Cash"}
                  onChange={(e) => onChange("defaultPaymentMethod", e.target.value)}
                  helperText="Preselected payment method on new orders"
               >
                  {paymentMethods.map((pm) => (
                     <MenuItem key={pm} value={pm}>
                        {pm}
                     </MenuItem>
                  ))}
               </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  fullWidth
                  label="Invoice Number Prefix"
                  size="small"
                  value={values.invoicePrefix || "INV"}
                  onChange={(e) => onChange("invoicePrefix", e.target.value)}
                  placeholder="INV"
                  helperText="e.g. INV-10024"
               />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  fullWidth
                  label="Order ID Prefix"
                  size="small"
                  value={values.orderPrefix || "#"}
                  onChange={(e) => onChange("orderPrefix", e.target.value)}
                  placeholder="#"
                  helperText="e.g. #10024"
               />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  select
                  fullWidth
                  label="Default Order Status"
                  size="small"
                  value={customConfig.defaultOrderStatus || "COMPLETED"}
                  onChange={(e) => onConfigChange("defaultOrderStatus", e.target.value)}
                  helperText="Initial status assigned to POS counter sales"
               >
                  {orderStatuses.map((st) => (
                     <MenuItem key={st} value={st}>
                        {st}
                     </MenuItem>
                  ))}
               </TextField>
            </Grid>
         </Grid>

         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               POS Checkout Policies & Controls
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Configure stock verification, partial payments, and terminal automation.
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

            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <Switch
                              checked={customConfig.allowDuePayment ?? true}
                              onChange={(e) => onConfigChange("allowDuePayment", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Allow Partial & Due Payments
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Permit customer orders with an advance payment and due balance
                              </Typography>
                           </Box>
                        }
                     />
                  </CardContent>
               </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <Switch
                              checked={customConfig.autoPrintReceipt ?? false}
                              onChange={(e) => onConfigChange("autoPrintReceipt", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Auto-trigger Receipt Print
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Automatically launch browser print dialog upon submitting an order
                              </Typography>
                           </Box>
                        }
                     />
                  </CardContent>
               </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <Switch
                              checked={customConfig.roundTotals ?? false}
                              onChange={(e) => onConfigChange("roundTotals", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Round Final Order Totals
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Round fractions to nearest whole currency unit for cash transactions
                              </Typography>
                           </Box>
                        }
                     />
                  </CardContent>
               </Card>
            </Grid>
         </Grid>
      </Stack>
   );
}
