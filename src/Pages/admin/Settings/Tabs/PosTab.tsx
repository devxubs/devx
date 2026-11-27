"use client";

import React from "react";
import OrderDisplaySection from "./OrderDisplaySection";
import OrderCreateDefaultsSection from "./OrderCreateDefaultsSection";
import PaymentMethodsSection from "./PaymentMethodsSection";
import SectionResetButton from "./SectionResetButton";
import {
   Grid,
   Stack,
   TextField,
   Typography,
   Box,
   Divider,
   FormControlLabel,
   Switch,
   Chip,
} from "@mui/material";

// RP-7 (C5): in-tab section anchors. The chips scroll the
// settings body to the matching section; scrollMarginTop on the
// targets keeps headings clear of the top edge when they land.
const POS_SECTIONS = [
   { id: "pos-pricing", label: "Pricing & Fees" },
   { id: "pos-policies", label: "Checkout Policies" },
   { id: "pos-order-display", label: "Order Display" },
   { id: "pos-order-defaults", label: "Order Create Defaults" },
   { id: "pos-payment-methods", label: "Payment Methods" },
];

function scrollToSection(id: string) {
   document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

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

         {/* RP-7 (C5): section quick-nav */}
         <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {POS_SECTIONS.map((s) => (
               <Chip
                  key={s.id}
                  label={s.label}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => scrollToSection(s.id)}
               />
            ))}
         </Stack>

         {/* Pricing & Fees — RP-7: the section gains its visible
             heading (the C5 anchor names it) and its X2 reset. */}
         <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Typography variant="h6" fontWeight={600}>
               Pricing & Fees
            </Typography>
            <SectionResetButton
               section="Pricing & Fees"
               onReset={() => {
                  onChange("defaultTaxRate", 0);
                  onChange("defaultDeliveryCharge", 60);
                  onChange("defaultDiscountRate", 0);
                  onChange("invoicePrefix", "INV");
               }}
            />
         </Stack>

         {/* P2-20: "Default Order Status" (customConfig.defaultOrderStatus)
             was removed — no order flow read it; new orders take the
             status chosen in the order form. The "Allow Partial & Due
             Payments", "Auto-trigger Receipt Print" and "Round Final
             Order Totals" toggles below were likewise write-only and
             have been removed. */}
         <Grid container spacing={2} id="pos-pricing" sx={{ scrollMarginTop: 12 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  fullWidth
                  label="Default Tax / VAT Rate (%)"
                  type="number"
                  size="small"
                  value={values.defaultTaxRate ?? 0}
                  onChange={(e) => onChange("defaultTaxRate", parseFloat(e.target.value) || 0)}
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
                  helperText="e.g. INV_126 — shares the order number sequence."
               />
            </Grid>

            {/* Final-verification fix: the legacy orderPrefix ("#")
                field was removed — it edited a StoreSetting column
                nothing consumes (a leftover of the old #6001 ID
                scheme) and sat confusingly beside the real prefixes.
                The actual Order ID prefix is prefixOrder, edited in
                the ID Prefixes tab. The column itself is untouched. */}

         </Grid>

         <Divider />

         <Box sx={{ scrollMarginTop: 12 }} id="pos-policies">
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
         <Box id="pos-order-display" sx={{ scrollMarginTop: 12 }}>
            <OrderDisplaySection values={values} onConfigChange={onConfigChange} />
         </Box>

         <Divider />

         {/* Phase 3: Order Creation Defaults. */}
         <Box id="pos-order-defaults" sx={{ scrollMarginTop: 12 }}>
            <OrderCreateDefaultsSection values={values} onConfigChange={onConfigChange} />
         </Box>

         <Divider />

         {/* Phase 5: Payment Methods + default payment method. */}
         <Box id="pos-payment-methods" sx={{ scrollMarginTop: 12 }}>
            <PaymentMethodsSection values={values} onChange={onChange} onConfigChange={onConfigChange} />
         </Box>
      </Stack>
   );
}
