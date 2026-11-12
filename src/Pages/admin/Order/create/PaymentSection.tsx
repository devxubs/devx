"use client";

// Order Create (upgrade) — Payment Information.
// Payment status (Paid / Partial / Unpaid) is derived from advance vs grand
// total by the calculation engine and shown as a chip; it is not stored
// separately (the orders API derives it the same way from advance/due).
import {
   Autocomplete,
   Chip,
   Grid,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import React from "react";
import SectionCard from "./SectionCard";
import { formatBDT } from "./orderCalculations";
import type { OrderTotals } from "./types";

/** Existing methods (data.ts) plus the mobile-banking methods used in BD. */
export const PAYMENT_METHODS = [
   "Cash",
   "Cash on Delivery",
   "bKash",
   "Nagad",
   "Rocket",
   "Card",
   "Bank Transfer",
   "Wallet",
   "Credit Card",
   "Other",
];

interface PaymentSectionProps {
   paymentMethod: string;
   advancePayment: number;
   totals: OrderTotals;
   onChange: (partial: { paymentMethod?: string; advancePayment?: number }) => void;
   currencySymbol?: string;
}

const PaymentSection = ({ paymentMethod, advancePayment, totals, onChange, currencySymbol = "৳" }: PaymentSectionProps) => {
   const statusColor =
      totals.paymentStatus === "Paid" ? "success" : totals.paymentStatus === "Partial" ? "warning" : "error";
   const overpaid = advancePayment > totals.grandTotal;

   return (
      <SectionCard title="Payment Information" subtitle="Advance, due and payment status update automatically">
         <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
               <Stack spacing={1}>
                  <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
                     Payment Method
                  </Typography>
                  <Autocomplete
                     options={PAYMENT_METHODS}
                     value={paymentMethod || null}
                     onChange={(_, v) => onChange({ paymentMethod: v ?? "" })}
                     renderInput={(params) => <TextField {...params} size="small" placeholder="Select method" />}
                  />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={1}>
                  <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
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
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={1}>
                  <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
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
