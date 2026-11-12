"use client";

// Order Create (upgrade) — Order Summary panel.
import { Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import React from "react";
import { formatBDT } from "./orderCalculations";
import type { OrderTotals } from "./types";

interface OrderSummaryPanelProps {
   totals: OrderTotals;
   currencySymbol?: string;
}

const Row = ({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) => (
   <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" color="textSecondary" fontWeight={bold ? 700 : 400}>
         {label}
      </Typography>
      <Typography variant="body2" fontWeight={bold ? 800 : 600} color={color || "textPrimary"}>
         {value}
      </Typography>
   </Stack>
);

const OrderSummaryPanel = ({ totals, currencySymbol = "৳" }: OrderSummaryPanelProps) => {
   const statusColor =
      totals.paymentStatus === "Paid" ? "success" : totals.paymentStatus === "Partial" ? "warning" : "error";
   return (
      <Paper sx={{ borderRadius: 1.5, boxShadow: 15, p: 2.5 }}>
         <Stack spacing={1.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
               <Typography variant="body1" fontSize={17} color="textPrimary">
                  Order Summary
               </Typography>
               <Chip label={totals.paymentStatus} color={statusColor as any} size="small" sx={{ fontWeight: 700 }} />
            </Stack>
            <Divider />
            <Row label="Subtotal" value={formatBDT(totals.subtotal, currencySymbol)} />
            <Row label="Product Discount" value={`− ${formatBDT(totals.productDiscount, currencySymbol)}`} />
            <Row label="Net Product Amount" value={formatBDT(totals.netProductAmount, currencySymbol)} />
            <Row label="Overall Discount" value={`− ${formatBDT(totals.overallDiscount, currencySymbol)}`} />
            <Row label="Tax / VAT" value={formatBDT(totals.taxAmount, currencySymbol)} />
            <Row label="Delivery Charge" value={formatBDT(totals.deliveryCharge, currencySymbol)} />
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
               <Typography variant="subtitle1" fontWeight={800}>
                  Grand Total
               </Typography>
               <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                  {formatBDT(totals.grandTotal, currencySymbol)}
               </Typography>
            </Stack>
            <Row label="Advance Payment" value={formatBDT(totals.advancePayment, currencySymbol)} />
            <Stack
               direction="row"
               justifyContent="space-between"
               alignItems="center"
               sx={{ bgcolor: "action.hover", borderRadius: 1, px: 1.25, py: 0.75 }}
            >
               <Typography variant="body2" fontWeight={700}>
                  Due Amount
               </Typography>
               <Typography variant="body2" fontWeight={800} color={totals.dueAmount > 0 ? "error.main" : "success.main"}>
                  {formatBDT(totals.dueAmount, currencySymbol)}
               </Typography>
            </Stack>
         </Stack>
      </Paper>
   );
};

export default OrderSummaryPanel;
