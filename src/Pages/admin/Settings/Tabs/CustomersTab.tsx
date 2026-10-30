"use client";

import React from "react";
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

interface CustomersTabProps {
   values: any;
   onConfigChange: (key: string, value: any) => void;
}

export default function CustomersTab({ values, onConfigChange }: CustomersTabProps) {
   const customConfig = values.customConfig || {};

   return (
      <Stack spacing={3}>
         <Box>
            <Typography variant="h6" fontWeight={600}>
               Customers & Suppliers Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Manage required customer checkout information, loyalty reward programs, and supplier terms.
            </Typography>
         </Box>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
               <TextField
                  fullWidth
                  label="Customer Loyalty Points Rate (%)"
                  type="number"
                  size="small"
                  value={customConfig.loyaltyRewardRate ?? 1}
                  onChange={(e) => onConfigChange("loyaltyRewardRate", parseFloat(e.target.value) || 0)}
                  helperText="Percentage of total purchase awarded as reward credit (e.g. 1% of ৳1,000 = ৳10)"
                  inputProps={{ min: 0, max: 20, step: 0.5 }}
               />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
               <TextField
                  fullWidth
                  label="Default Supplier Credit Period (Days)"
                  type="number"
                  size="small"
                  value={customConfig.supplierCreditDays ?? 30}
                  onChange={(e) => onConfigChange("supplierCreditDays", parseInt(e.target.value) || 0)}
                  helperText="Default payment grace period for purchase orders before marked overdue"
                  inputProps={{ min: 0, step: 5 }}
               />
            </Grid>
         </Grid>

         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Customer & Supplier Rules
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Configure contact verification and automatic customer registration.
            </Typography>
         </Box>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <Switch
                              checked={customConfig.requireCustomerPhone ?? false}
                              onChange={(e) => onConfigChange("requireCustomerPhone", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Require Customer Mobile Phone
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Mandate customer phone number before completing order checkout
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
                              checked={customConfig.allowGuestCustomer ?? true}
                              onChange={(e) => onConfigChange("allowGuestCustomer", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Allow Walk-in / Guest Checkout
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Permit fast counter checkouts without creating a customer account
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
                              checked={customConfig.autoCreateCustomerOnPos ?? true}
                              onChange={(e) => onConfigChange("autoCreateCustomerOnPos", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Auto-save Customer on Checkout
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Automatically register new customer directory record when phone & name are entered
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
                              checked={customConfig.notifySuppliersLowStock ?? false}
                              onChange={(e) => onConfigChange("notifySuppliersLowStock", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Supplier Low-Stock Alerts
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Flag primary supplier contact info on restock alert reports
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
