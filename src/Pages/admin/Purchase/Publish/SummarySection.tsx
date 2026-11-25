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
         color={bold ? "textPrimary" : "textSecondary"}
      >
         {label}
      </Typography>
      <Typography
         variant="body2"
         fontWeight={bold ? 700 : 600}
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
      <Stack spacing={1.5}>
         <SummaryRow
            label="Subtotal"
            value={formatCurrency(totals.productAmount)}
         />

         {/* Others Cost */}
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
         >
            <Typography variant="body2" color="textSecondary">
               Others Cost
            </Typography>
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
                     sx={{ width: 130 }}
                  />
               )}
            />
         </Stack>

         {/* Total discount (purchase-level — the only discount the model stores) */}
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
         >
            <Typography variant="body2" color="textSecondary">
               Discount
            </Typography>
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
                     sx={{ width: 130 }}
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
            alignItems="center"
            spacing={2}
         >
            <Typography variant="body2" color="textSecondary">
               Paid Amount
            </Typography>
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
                     sx={{ width: 130 }}
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
