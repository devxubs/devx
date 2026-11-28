"use client";

import React from "react";
import OrderDisplaySection from "./OrderDisplaySection";
import OrderCreateDefaultsSection from "./OrderCreateDefaultsSection";
import PaymentMethodsSection from "./PaymentMethodsSection";
import {
   Stack,
   TextField,
   Typography,
   Box,
   Divider,
   FormControlLabel,
   Switch,
} from "@mui/material";
import SettingsField from "./SettingsField";

// RP-7 (C5) history: this tab briefly carried a chip row that
// scrolled to in-tab section anchors. The owner later asked for
// the quick navigation to be removed again — the chips, the
// POS_SECTIONS list, the scroll helper and the section anchor
// ids were all deleted; the sections below are plain content.

interface PosTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
   onConfigChange: (key: string, value: any) => void;
}

export default function PosTab({ values, onChange, onConfigChange }: PosTabProps) {

   return (
      <Stack spacing={2}>
         {/* Sales & POS cleanup: the tab-level "Sales &
             Point-of-Sale Configuration" heading was removed —
             it only repeated the tab's own name in the Settings
             navigation/banner. The five categories below read as
             one continuous form: a heading per section with a
             subtle divider between sections, no per-section
             cards. */}

         {/* Pricing & Fees. (The RP-7 X2 per-section reset
             button was removed in the global reset-actions
             removal — Settings now has no section resets.) */}
         <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Typography variant="h6" fontWeight={600}>
               Pricing & Fees
            </Typography>
         </Stack>

         {/* P2-20: "Default Order Status" (customConfig.defaultOrderStatus)
             was removed — no order flow read it; new orders take the
             status chosen in the order form. The "Allow Partial & Due
             Payments", "Auto-trigger Receipt Print" and "Round Final
             Order Totals" toggles below were likewise write-only and
             have been removed. */}
         {/* Global field standard: one field per row, label
             above, placeholder inside, helper below. */}
         <Stack spacing={2.5}>
            <SettingsField
               label="Default Tax / VAT Rate (%)"
               helper="Applied to new orders by default; it can still be changed on each order."
            >
               <TextField
                  fullWidth
                  type="number"
                  size="small"
                  value={values.defaultTaxRate ?? 0}
                  onChange={(e) => onChange("defaultTaxRate", parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 100, step: 0.5 }}
                  placeholder="0"
               />
            </SettingsField>

            <SettingsField
               label={`Default Delivery Fee (${values.currencySymbol || "৳"})`}
               helper="Pre-filled as the delivery charge on new orders."
            >
               <TextField
                  fullWidth
                  type="number"
                  size="small"
                  value={values.defaultDeliveryCharge ?? 60}
                  onChange={(e) => onChange("defaultDeliveryCharge", parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 5 }}
                  placeholder="60"
               />
            </SettingsField>

            <SettingsField
               label="Default Discount Rate (%)"
               helper="Default discount applied to new orders."
            >
               <TextField
                  fullWidth
                  type="number"
                  size="small"
                  value={values.defaultDiscountRate ?? 0}
                  onChange={(e) => onChange("defaultDiscountRate", parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 100, step: 1 }}
                  placeholder="0"
               />
            </SettingsField>

            {/* Phase 5: the Default Payment Method selector moved
                into the Payment Methods section below, where its
                options come from the managed method list. */}

            <SettingsField
               label="Invoice Number Prefix"
               helper="e.g. INV_126 — shares the order number sequence."
            >
               <TextField
                  fullWidth
                  size="small"
                  value={values.invoicePrefix || "INV"}
                  onChange={(e) => onChange("invoicePrefix", e.target.value)}
                  placeholder="INV"
               />
            </SettingsField>

            {/* Final-verification fix: the legacy orderPrefix ("#")
                field was removed — it edited a StoreSetting column
                nothing consumes (a leftover of the old #6001 ID
                scheme) and sat confusingly beside the real prefixes.
                The actual Order ID prefix is prefixOrder, edited in
                the ID Prefixes tab. The column itself is untouched. */}

         </Stack>

         <Divider />

         <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
               POS Checkout Policies & Controls
            </Typography>
            {/* Sales & POS cleanup: the switch row sits directly
                in the form (no per-policy card), like the toggle
                rows in the other Settings sections. */}
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
         </Box>

         <Divider />

         {/* Phase 2: Order Display & Sorting (status order,
             visibility, list defaults, table columns). */}
         <Box>
            <OrderDisplaySection values={values} onConfigChange={onConfigChange} />
         </Box>

         <Divider />

         {/* Phase 3: Order Creation Defaults. */}
         <Box>
            <OrderCreateDefaultsSection values={values} onConfigChange={onConfigChange} />
         </Box>

         <Divider />

         {/* Phase 5: Payment Methods + default payment method. */}
         <Box>
            <PaymentMethodsSection values={values} onChange={onChange} onConfigChange={onConfigChange} />
         </Box>
      </Stack>
   );
}
