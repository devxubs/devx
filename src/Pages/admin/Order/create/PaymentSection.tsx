"use client";

// Order Create (upgrade) — Payment Information.
// Payment status (Paid / Partial / Unpaid) is derived from advance vs grand
// total by the calculation engine and shown as a chip; it is not stored
// separately (the orders API derives it the same way from advance/due).
import {
   Chip,
   Grid,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import React from "react";
import CustomAutocomplete from "@src/components/Autocomplete";
import SectionCard from "./SectionCard";
import { formatBDT } from "./orderCalculations";
import { isMobilePaymentMethod } from "../paymentMethods";
import { useSettings } from "@src/lib/settingsContext";
import { paymentMethodOptionsFor } from "@src/lib/paymentMethods";
import type { OrderTotals } from "./types";

// Phase 5: the method list is centralised in @src/lib/paymentMethods
// (configurable in Settings → Sales & POS → Payment Methods). The
// hardcoded PAYMENT_METHODS list that lived here is retired; its
// contents became the lib's built-in defaults.

interface PaymentSectionProps {
   paymentMethod: string;
   advancePayment: number;
   paymentTxId?: string;
   paymentSenderNumber?: string;
   totals: OrderTotals;
   onChange: (partial: { paymentMethod?: string; advancePayment?: number; paymentTxId?: string; paymentSenderNumber?: string }) => void;
   currencySymbol?: string;
}

const PaymentSection = ({ paymentMethod, advancePayment, paymentTxId = "", paymentSenderNumber = "", totals, onChange, currencySymbol = "৳" }: PaymentSectionProps) => {
   // Phase 5: options come from the central payment-method
   // config (active methods, configured order); the current
   // value is merged back so it always stays selectable.
   const { settings } = useSettings();
   const methodOptions = paymentMethodOptionsFor(settings?.customConfig, paymentMethod);
   const showTxFields = isMobilePaymentMethod(paymentMethod);
   const statusColor =
      totals.paymentStatus === "Paid" ? "success" : totals.paymentStatus === "Partial" ? "warning" : "error";
   const overpaid = advancePayment > totals.grandTotal;

   return (
      <SectionCard title="Payment Information" subtitle="Advance, due and payment status update automatically">
         <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Payment Method
                  </Typography>
                  <CustomAutocomplete
                     arrow
                     options={methodOptions}
                     value={paymentMethod || null}
                     onChange={(v) => onChange({ paymentMethod: v ?? "" })}
                     placeholder="Select method"
                     size="small"
                  />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Advance Payment
                  </Typography>
                  <TextField
                     type="number"
                     size="small"
                     fullWidth
                     value={advancePayment}
                     error={overpaid || advancePayment < 0}
                     helperText={overpaid ? "Advance cannot exceed the grand total" : undefined}
                     onChange={(e) => onChange({ advancePayment: Number(e.target.value) })}
                     inputProps={{ min: 0, step: "0.01" }}
                  />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Due Amount
                  </Typography>
                  <TextField
                     size="small"
                     fullWidth
                     value={formatBDT(totals.dueAmount, currencySymbol)}
                     InputProps={{ readOnly: true }}
                  />
               </Stack>
            </Grid>
            {showTxFields && (
               <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                     <Stack spacing={0.75}>
                        <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                           Transaction ID (optional)
                        </Typography>
                        <TextField
                           size="small"
                           fullWidth
                           value={paymentTxId}
                           placeholder="e.g. 9HX7K2LM1P"
                           onChange={(e) => onChange({ paymentTxId: e.target.value })}
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                     <Stack spacing={0.75}>
                        <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                           Sender Number (optional)
                        </Typography>
                        <TextField
                           size="small"
                           fullWidth
                           value={paymentSenderNumber}
                           placeholder="01XXXXXXXXX"
                           onChange={(e) => onChange({ paymentSenderNumber: e.target.value })}
                        />
                     </Stack>
                  </Grid>
               </>
            )}
            <Grid size={{ xs: 12 }}>
               <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="textSecondary">
                     Payment Status:
                  </Typography>
                  <Chip label={totals.paymentStatus} color={statusColor as any} size="small" sx={{ fontWeight: 700 }} />
                  <Typography variant="caption" color="textSecondary">
                     Grand Total {formatBDT(totals.grandTotal, currencySymbol)}
                  </Typography>
               </Stack>
            </Grid>
         </Grid>
      </SectionCard>
   );
};

export default PaymentSection;
