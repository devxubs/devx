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
   <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant="body2" color="textSecondary" fontWeight={bold ? 700 : 400}>
         {label}
      </Typography>
      <Typography variant="body2" fontWeight={bold ? 800 : 600} color={color || "textPrimary"} noWrap>
         {value}
      </Typography>
   </Stack>
);

const OrderSummaryPanel = ({ totals, currencySymbol = "৳" }: OrderSummaryPanelProps) => {
   const statusColor =
      totals.paymentStatus === "Paid" ? "success" : totals.paymentStatus === "Partial" ? "warning" : "error";
   return (
      <Paper
         variant="outlined"
         sx={{
            borderRadius: 1.5,
            borderColor: "divider",
            p: 2,
            bgcolor: "background.paper",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
         }}
      >
         <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
               <Typography variant="subtitle1" fontWeight={700} fontSize="0.95rem" color="textPrimary">
                  Order Summary
               </Typography>
               <Chip label={totals.paymentStatus} color={statusColor as any} size="small" sx={{ fontWeight: 700, height: 22, fontSize: "0.75rem" }} />
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Row label="Subtotal" value={formatBDT(totals.subtotal, currencySymbol)} />
            <Row label="Product Discount" value={`− ${formatBDT(totals.productDiscount, currencySymbol)}`} />
            <Row label="Net Product Amount" value={formatBDT(totals.netProductAmount, currencySymbol)} />
            <Row label="Overall Discount" value={`− ${formatBDT(totals.overallDiscount, currencySymbol)}`} />
            <Row label="Tax / VAT" value={formatBDT(totals.taxAmount, currencySymbol)} />
            <Row label="Delivery Charge" value={formatBDT(totals.deliveryCharge, currencySymbol)} />
            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
               <Typography variant="subtitle1" fontWeight={800} fontSize="1rem">
                  Grand Total
               </Typography>
               <Typography variant="subtitle1" fontWeight={800} fontSize="1.1rem" color="primary.main" noWrap>
                  {formatBDT(totals.grandTotal, currencySymbol)}
               </Typography>
            </Stack>
            <Row label="Advance Payment" value={formatBDT(totals.advancePayment, currencySymbol)} />
            <Stack
               direction="row"
               justifyContent="space-between"
               alignItems="center"
               sx={{ bgcolor: "action.hover", borderRadius: 1, px: 1.25, py: 0.75, mt: 0.5 }}
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
