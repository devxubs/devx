"use client";

import React from "react";
import {
   Grid,
   MenuItem,
   Stack,
   TextField,
   Typography,
   Box,
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

export default function ExpensesTab({ values, onConfigChange }: ExpensesTabProps) {
   const customConfig = values.customConfig || {};

   return (
      <Stack spacing={3}>
         <Box>
            <Typography variant="h6" fontWeight={600}>
               Purchases & Expenses Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Configure the default category offered when recording store expenses.
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

            {/* P2-20: "Purchase Tax / Import Duty Rate" and "Default
                Expense Payment Method" were removed — write-only
                customConfig keys that no purchase or expense flow
                ever read. The "Auto-sync Received Purchases" and
                "Mandate Expense Attachment" toggles were removed for
                the same reason (purchases always sync stock on save;
                no expense-proof requirement exists). Only the Default
                Expense Category above is live: the Expense page seeds
                its category options from it. */}
         </Grid>
      </Stack>
   );
}
