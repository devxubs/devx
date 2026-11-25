"use client";

// Purchase Create (redesign) — Payment & Purchase Summary.
//
// Subtotal, others cost, discount, grand total, paid, due and the
// payment status — every figure comes from the page's calculation
// engine (calculations.ts), which mirrors the server's formulas, so
// what is displayed here is what POST /api/purchases will store.
// The Purchase model has no tax field and no payment-method field,
// so neither appears; discount is the purchase-level discount the
// model actually stores (there is no per-line discount).

import {
   Chip,
   Divider,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import React from "react";
import { Controller } from "react-hook-form";
import { useSettings } from "@src/lib/settingsContext";
import {
   paymentStatusLabel,
   type PurchaseTotals,
} from "./calculations";

// Row label for the summary's input rows. Others cost, discount
// and paid amount are all optional in the form schema; the
// "(Optional)" qualifier sits on its own caption line under the
// name — the summary card is narrow, and the inline caption span
// used by FieldLabel wrapped mid-label here (live-check finding).
const RowLabel = ({ children }: { children: React.ReactNode }) => (
   <Stack sx={{ pt: "2px" }}>
      <Typography variant="body2" color="textSecondary">
         {children}
      </Typography>
      <Typography variant="caption" color="textSecondary">
         (Optional)
      </Typography>
   </Stack>
);

interface SummarySectionProps {
   control: any;
   errors: any;
   data: any;
   totals: PurchaseTotals;
   hasSupplier: boolean;
}

const SummaryRow = ({
   label,
   value,
   bold,
   color,
}: {
   label: string;
   value: string;
   bold?: boolean;
   color?: string;
}) => (
   <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography
         variant="body2"
         fontWeight={bold ? 700 : 400}
         fontSize={bold ? "1.02rem" : undefined}
         color={bold ? "textPrimary" : "textSecondary"}
      >
         {label}
      </Typography>
      <Typography
         variant="body2"
         fontWeight={bold ? 700 : 600}
         fontSize={bold ? "1.02rem" : undefined}
         color={color || "textPrimary"}
         noWrap
      >
         {value}
      </Typography>
   </Stack>
);

const SummarySection = ({
   control,
   errors,
   data,
   totals,
   hasSupplier,
}: SummarySectionProps) => {
   const { formatCurrency } = useSettings();

   return (
      <Stack spacing={2.25}>
         <SummaryRow
            label="Subtotal"
            value={formatCurrency(totals.productAmount)}
         />

         {/* Others Cost */}
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={2}
         >
            <RowLabel>Others Cost</RowLabel>
            <Controller
               name="others_cost"
               control={control}
               defaultValue={data?.others_cost ?? 0}
               render={({ field }) => (
                  <TextField
                     {...field}
                     type="number"
                     size="small"
                     inputProps={{ min: 0, step: "0.01" }}
                     error={!!errors?.others_cost}
                     helperText={errors?.others_cost?.message}
                     sx={{ width: 150 }}
                  />
               )}
            />
         </Stack>

         {/* Total discount (purchase-level — the only discount the model stores) */}
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={2}
         >
            <RowLabel>Discount</RowLabel>
            <Controller
               name="discount"
               control={control}
               defaultValue={data?.discount ?? 0}
               render={({ field }) => (
                  <TextField
                     {...field}
                     type="number"
                     size="small"
                     inputProps={{ min: 0, step: "0.01" }}
                     error={!!errors?.discount}
                     helperText={errors?.discount?.message}
                     sx={{ width: 150 }}
                  />
               )}
            />
         </Stack>

         <Divider />

         <SummaryRow
            label="Grand Total"
            value={formatCurrency(totals.total)}
            bold
         />

         {/* Paid amount */}
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={2}
         >
            <RowLabel>Paid Amount</RowLabel>
            <Controller
               name="pay"
               control={control}
               defaultValue={0}
               render={({ field }) => (
                  <TextField
                     {...field}
                     type="number"
                     size="small"
                     inputProps={{ min: 0, step: "0.01" }}
                     error={!!errors?.pay}
                     helperText={errors?.pay?.message}
                     sx={{ width: 150 }}
                  />
               )}
            />
         </Stack>

         <SummaryRow
            label="Due Amount"
            value={formatCurrency(totals.due)}
            bold
            color={totals.due > 0 ? "error.main" : "success.main"}
         />

         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
         >
            <Typography variant="body2" color="textSecondary">
               Payment Status
            </Typography>
            <Chip
               label={paymentStatusLabel(totals.paymentStatus)}
               color={
                  totals.paymentStatus === "PAID"
                     ? "success"
                     : totals.paymentStatus === "PARTIAL"
                       ? "warning"
                       : "default"
               }
               size="small"
               sx={{ fontWeight: 600 }}
            />
         </Stack>

         {totals.overpayment > 0 && (
            <Typography variant="caption" color="warning.main">
               Paid exceeds the grand total by{" "}
               {formatCurrency(totals.overpayment)}.
               {hasSupplier
                  ? " The excess will be recorded as supplier credit."
                  : " Select a supplier to hold the excess as credit, or reduce the paid amount."}
            </Typography>
         )}

         <Typography variant="caption" color="textSecondary">
            Totals are recomputed by the server on save — the figures
            above use the same formulas.
         </Typography>
      </Stack>
   );
};

export default SummarySection;
