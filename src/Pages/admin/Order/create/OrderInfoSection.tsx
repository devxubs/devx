"use client";

// Order Create (upgrade) — Order Information.
// Order ID / Invoice No. are previews only: the server assigns the real
// sequential IDs inside the creation transaction (no sequence number is
// burned by rendering this page). The preview is derived from the latest
// order (GET /api/orders?limit=1) and clearly labelled as an estimate.
import {
   Grid,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import CustomAutocomplete from "@src/components/Autocomplete";
import SectionCard from "./SectionCard";
import { orderSources, orderStatuses } from "../data";

const COURIER_OPTIONS = ["", "Steadfast", "Pathao", "RedX", "Sundarban", "Home Delivery", "Store Pickup"];

interface OrderInfoSectionProps {
   orderSource: string;
   status: string;
   courier: string;
   onChange: (partial: { orderSource?: string; status?: string; courier?: string }) => void;
}

function nextPreviewId(latest: string | null | undefined, prefix: string): string {
   if (!latest) return "Assigned on save";
   const match = String(latest).match(/(\d+)\s*$/);
   if (!match) return "Assigned on save";
   return `${prefix}${parseInt(match[1], 10) + 1}`;
}

const OrderInfoSection = ({ orderSource, status, courier, onChange }: OrderInfoSectionProps) => {
   const [orderPreview, setOrderPreview] = useState("Assigned on save");
   const [invoicePreview, setInvoicePreview] = useState("Assigned on save");

   const todayDhaka = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
   }).format(new Date());

   useEffect(() => {
      let cancelled = false;
      (async () => {
         try {
            const res = await fetch("/api/orders?limit=1");
            if (!res.ok) return;
            const data = await res.json();
            const latest = Array.isArray(data.orders) ? data.orders[0] : null;
            if (!latest || cancelled) return;
            setOrderPreview(nextPreviewId(latest.orderId || latest.customId, "ORD_"));
            setInvoicePreview(nextPreviewId(latest.invoiceNo, "INV_"));
         } catch { /* preview is best-effort */ }
      })();
      return () => {
         cancelled = true;
      };
   }, []);

   return (
      <SectionCard title="Order Information" subtitle="IDs are assigned by the server when the order is saved">
         <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Order ID <Typography component="span" variant="caption" color="textSecondary">(auto)</Typography>
                  </Typography>
                  <TextField
                     fullWidth
                     size="small"
                     value={orderPreview}
                     disabled
                     helperText="Preview — assigned by the server on save"
                  />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Invoice No. <Typography component="span" variant="caption" color="textSecondary">(auto)</Typography>
                  </Typography>
                  <TextField
                     fullWidth
                     size="small"
                     value={invoicePreview}
                     disabled
                     helperText="Preview — assigned by the server on save"
                  />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Order Date
                  </Typography>
                  <TextField fullWidth size="small" value={todayDhaka} disabled helperText="Asia/Dhaka — set by the server at creation" />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Delivery Method
                  </Typography>
                  <CustomAutocomplete
                     arrow
                     options={COURIER_OPTIONS}
                     value={courier}
                     onChange={(v) => onChange({ courier: v ?? "" })}
                     getOptionLabel={(o) => (o === "" ? "Not assigned" : String(o))}
                     placeholder="Select courier"
                     size="small"
                  />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Order Source
                  </Typography>
                  <CustomAutocomplete
                     arrow
                     options={orderSources}
                     value={orderSource || null}
                     onChange={(v) => onChange({ orderSource: v ?? "" })}
                     placeholder="Select source"
                     size="small"
                  />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Order Status
                  </Typography>
                  <CustomAutocomplete
                     arrow
                     options={orderStatuses}
                     value={status || null}
                     onChange={(v) => onChange({ status: v ?? "Pending" })}
                     placeholder="Select status"
                     size="small"
                  />
               </Stack>
            </Grid>
         </Grid>
      </SectionCard>
   );
};

export default OrderInfoSection;
