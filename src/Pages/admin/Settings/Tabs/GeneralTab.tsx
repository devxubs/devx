"use client";

import React from "react";
import {
   Grid,
   MenuItem,
   Stack,
   TextField,
   Typography,
   Box,
   Avatar,
} from "@mui/material";

interface GeneralTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
}

const currencies = [
   { code: "BDT", symbol: "৳", label: "Bangladeshi Taka (BDT ৳)" },
   { code: "USD", symbol: "$", label: "US Dollar (USD $)" },
   { code: "EUR", symbol: "€", label: "Euro (EUR €)" },
   { code: "GBP", symbol: "£", label: "British Pound (GBP £)" },
   { code: "INR", symbol: "₹", label: "Indian Rupee (INR ₹)" },
   { code: "SAR", symbol: "﷼", label: "Saudi Riyal (SAR ﷼)" },
   { code: "AED", symbol: "د.إ", label: "UAE Dirham (AED)" },
];

const timezones = [
   { value: "Asia/Dhaka", label: "(GMT+6:00) Dhaka, Bangladesh" },
   { value: "Asia/Kolkata", label: "(GMT+5:30) Kolkata, New Delhi, India" },
   { value: "Asia/Dubai", label: "(GMT+4:00) Dubai, UAE" },
   { value: "Asia/Riyadh", label: "(GMT+3:00) Riyadh, Saudi Arabia" },
   { value: "Europe/London", label: "(GMT+0:00) London, UK" },
   { value: "UTC", label: "(GMT+0:00) UTC Universal Time" },
   { value: "America/New_York", label: "(GMT-5:00) New York, USA" },
];

const dateFormats = [
   { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 28/10/2026)" },
   { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 10/28/2026)" },
   { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2026-10-28)" },
];

export default function GeneralTab({ values, onChange }: GeneralTabProps) {
   const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = currencies.find((c) => c.code === e.target.value);
      onChange("currency", e.target.value);
      if (selected) {
         onChange("currencySymbol", selected.symbol);
      }
   };

   return (
      <Stack spacing={3}>
         <Box>
            <Typography variant="h6" fontWeight={600}>
               General Store Profile
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Configure your business identity, primary contact information, currency, and locale.
            </Typography>
         </Box>

         {/* Store Identity */}
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  fullWidth
                  label="Store Name"
                  size="small"
                  value={values.storeName || ""}
                  onChange={(e) => onChange("storeName", e.target.value)}
                  placeholder="DevX POS"
                  helperText="Displayed across receipts, invoices, and the dashboard navigation"
               />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  fullWidth
                  label="Store Tagline / Slogan"
                  size="small"
                  value={values.tagline || ""}
                  onChange={(e) => onChange("tagline", e.target.value)}
                  placeholder="Smart Retail & Point of Sale"
                  helperText="Short business motto printed on receipts"
               />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  fullWidth
                  label="Store Email"
                  size="small"
                  type="email"
                  value={values.email || ""}
                  onChange={(e) => onChange("email", e.target.value)}
                  placeholder="contact@devxpos.com"
                  helperText="Official email for customer correspondence"
               />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  fullWidth
                  label="Store Phone / Hotline"
                  size="small"
                  value={values.phone || ""}
                  onChange={(e) => onChange("phone", e.target.value)}
                  placeholder="+880 1700-123456"
                  helperText="Customer support telephone or mobile number"
               />
            </Grid>

            <Grid size={12}>
               <TextField
                  fullWidth
                  label="Business Address"
                  size="small"
                  multiline
                  rows={2}
                  value={values.address || ""}
                  onChange={(e) => onChange("address", e.target.value)}
                  placeholder="House 42, Road 11, Banani, Dhaka-1213, Bangladesh"
                  helperText="Physical shop or warehouse location displayed on invoice headers"
               />
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
               <TextField
                  fullWidth
                  label="Store Logo Image URL"
                  size="small"
                  value={values.logoUrl || ""}
                  onChange={(e) => onChange("logoUrl", e.target.value)}
                  placeholder="https://example.com/logo.png"
                  helperText="Direct URL or web path to your business logo"
               />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
               <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 0.5 }}>
                  <Avatar
                     src={values.logoUrl || "/assets/avatar.jpg"}
                     alt="Store Logo"
                     sx={{ width: 44, height: 44, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                     Logo Preview
                  </Typography>
               </Stack>
            </Grid>
         </Grid>

         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Currency & Localization
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Select your store currency, timezone, and calendar date preferences.
            </Typography>
         </Box>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  select
                  fullWidth
                  label="Default Currency"
                  size="small"
                  value={values.currency || "BDT"}
                  onChange={handleCurrencyChange}
                  helperText="Base transactional currency"
               >
                  {currencies.map((c) => (
                     <MenuItem key={c.code} value={c.code}>
                        {c.label}
                     </MenuItem>
                  ))}
               </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
               <TextField
                  fullWidth
                  label="Currency Symbol"
                  size="small"
                  value={values.currencySymbol || "৳"}
                  onChange={(e) => onChange("currencySymbol", e.target.value)}
                  helperText="e.g. ৳ or $"
               />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <TextField
                  select
                  fullWidth
                  label="System Timezone"
                  size="small"
                  value={values.timezone || "Asia/Dhaka"}
                  onChange={(e) => onChange("timezone", e.target.value)}
                  helperText="Used for order timestamping"
               >
                  {timezones.map((tz) => (
                     <MenuItem key={tz.value} value={tz.value}>
                        {tz.label}
                     </MenuItem>
                  ))}
               </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <TextField
                  select
                  fullWidth
                  label="Date Format"
                  size="small"
                  value={values.dateFormat || "DD/MM/YYYY"}
                  onChange={(e) => onChange("dateFormat", e.target.value)}
                  helperText="Receipt and table date display"
               >
                  {dateFormats.map((df) => (
                     <MenuItem key={df.value} value={df.value}>
                        {df.label}
                     </MenuItem>
                  ))}
               </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  select
                  fullWidth
                  label="Language"
                  size="small"
                  value={values.language || "en"}
                  onChange={(e) => onChange("language", e.target.value)}
                  helperText="Application display language"
               >
                  <MenuItem value="en">English (US / UK)</MenuItem>
                  <MenuItem value="bn">বাংলা (Bengali)</MenuItem>
               </TextField>
            </Grid>
         </Grid>
      </Stack>
   );
}
