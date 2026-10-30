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

interface ExpensesTabProps {
   values: any;
   onConfigChange: (key: string, value: any) => void;
}

const expenseCategories = [
   "Store Operations",
   "Utilities & Electricity",
   "Store Rent",
   "Employee Salaries & Wages",
   "Packaging & Shipping Supplies",
   "Repairs & Maintenance",
   "Marketing & Advertising",
   "Miscellaneous",
];

const paymentMethods = ["Cash", "Bank Transfer", "Petty Cash", "Credit Card", "bKash"];

export default function ExpensesTab({ values, onConfigChange }: ExpensesTabProps) {
   const customConfig = values.customConfig || {};

   return (
      <Stack spacing={3}>
         <Box>
            <Typography variant="h6" fontWeight={600}>
               Purchases & Expenses Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Configure default cost categories, purchase tax rates, and procurement workflows.
            </Typography>
         </Box>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  select
                  fullWidth
                  label="Default Expense Category"
                  size="small"
                  value={customConfig.defaultExpenseCategory || "Store Operations"}
                  onChange={(e) => onConfigChange("defaultExpenseCategory", e.target.value)}
                  helperText="Default category assigned when recording store expenses"
               >
                  {expenseCategories.map((c) => (
                     <MenuItem key={c} value={c}>
                        {c}
                     </MenuItem>
                  ))}
               </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  fullWidth
                  label="Purchase Tax / Import Duty Rate (%)"
                  type="number"
                  size="small"
                  value={customConfig.purchaseTaxRate ?? 0}
                  onChange={(e) => onConfigChange("purchaseTaxRate", parseFloat(e.target.value) || 0)}
                  helperText="Default tax rate applied to purchase bills"
                  inputProps={{ min: 0, max: 100, step: 0.5 }}
               />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  select
                  fullWidth
                  label="Default Expense Payment Method"
                  size="small"
                  value={customConfig.defaultExpensePaymentMethod || "Cash"}
                  onChange={(e) => onConfigChange("defaultExpensePaymentMethod", e.target.value)}
                  helperText="Payment method for store overhead expenses"
               >
                  {paymentMethods.map((m) => (
                     <MenuItem key={m} value={m}>
                        {m}
                     </MenuItem>
                  ))}
               </TextField>
            </Grid>
         </Grid>

         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Procurement & Expense Validation
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Control automated inventory synchronization from completed purchase bills.
            </Typography>
         </Box>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <Switch
                              checked={customConfig.autoApprovePurchases ?? true}
                              onChange={(e) => onConfigChange("autoApprovePurchases", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Auto-sync Received Purchases to Stock
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Automatically increment product inventory quantities upon saving purchase orders
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
                              checked={customConfig.requireExpenseProof ?? false}
                              onChange={(e) => onConfigChange("requireExpenseProof", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Mandate Expense Attachment
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Require cashiers/managers to upload receipt or voucher proof when creating expenses
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
