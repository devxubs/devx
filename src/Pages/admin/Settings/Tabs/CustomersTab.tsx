"use client";

import React from "react";
import { Stack, Typography, Box, Card, CardContent } from "@mui/material";

interface CustomersTabProps {
   values: any;
   onConfigChange: (key: string, value: any) => void;
}

// P2-20: every control that used to live on this tab was a write-only
// customConfig key with no consumer anywhere in the app — the
// loyalty points rate, the supplier credit period, "Require Customer
// Mobile Phone", "Allow Walk-in / Guest Checkout", "Auto-save
// Customer on Checkout" and "Supplier Low-Stock Alerts" were saved
// and never enforced (there is no loyalty engine, no supplier
// credit-period logic, and checkout does not read any of them).
// Rather than leaving lying controls, the toggles were removed;
// this tab now says so honestly instead of pretending to configure
// behaviour that lives elsewhere (customer records are managed on
// the Customers page; supplier terms on each supplier's page).
export default function CustomersTab(_props: CustomersTabProps) {
   return (
      <Stack spacing={3}>
         <Box>
            <Typography variant="h6" fontWeight={600}>
               Customers & Suppliers Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
               There are currently no store-level customer or supplier
               behaviour settings.
            </Typography>
         </Box>

         <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
               <Typography variant="body2" color="text.secondary">
                  Earlier versions of this tab offered loyalty points,
                  supplier credit-period, phone-requirement and
                  guest-checkout switches that were saved but never
                  applied anywhere in the system. They have been
                  removed so this screen only contains settings that
                  actually change behaviour. Customer records are
                  managed on the Customers page, and supplier balances
                  and payment terms are handled per supplier.
               </Typography>
            </CardContent>
         </Card>
      </Stack>
   );
}
