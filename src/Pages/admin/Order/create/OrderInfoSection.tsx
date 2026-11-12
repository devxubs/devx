"use client";

// Order Create (upgrade) — Order Information.
// Order ID / Invoice No. are previews only: the server assigns the real
// sequential IDs inside the creation transaction (no sequence number is
// burned by rendering this page). The preview is derived from the latest
// order (GET /api/orders?limit=1) and clearly labelled as an estimate.
import {
   Autocomplete,
   Grid,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
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
   return `${prefix}${parseInt(match[1], 10) + 1} (assigned on save)`;
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
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={1}>
                  <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
                     Order ID <Typography component="span" variant="caption" color="textSecondary">(auto)</Typography>
                  </Typography>
                  <TextField fullWidth size="small" value={orderPreview} disabled />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={1}>
                  <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
                     Invoice No. <Typography component="span" variant="caption" color="textSecondary">(auto)</Typography>
                  </Typography>
                  <TextField fullWidth size="small" value={invoicePreview} disabled />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={1}>
                  <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
                     Order Date
                  </Typography>
                  <TextField fullWidth size="small" value={todayDhaka} disabled helperText="Asia/Dhaka — set by the server at creation" />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={1}>
                  <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
                     Delivery Method
                  </Typography>
                  <Autocomplete
                     options={COURIER_OPTIONS}
                     value={courier}
                     onChange={(_, v) => onChange({ courier: v ?? "" })}
                     getOptionLabel={(o) => (o === "" ? "Not assigned" : o)}
                     renderInput={(params) => <TextField {...params} size="small" label="Delivery method" placeholder="Select courier" />}
                  />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={1}>
                  <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
                     Order Source
                  </Typography>
                  <Autocomplete
                     options={orderSources}
                     value={orderSource || null}
                     onChange={(_, v) => onChange({ orderSource: v ?? "" })}
                     renderInput={(params) => <TextField {...params} size="small" label="Source" placeholder="Select source" />}
                  />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={1}>
                  <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
                     Order Status
                  </Typography>
                  <Autocomplete
                     options={orderStatuses}
                     value={status || null}
                     onChange={(_, v) => onChange({ status: v ?? "Pending" })}
                     renderInput={(params) => <TextField {...params} size="small" label="Status" placeholder="Select status" />}
                  />
               </Stack>
            </Grid>
         </Grid>
      </SectionCard>
   );
};

export default OrderInfoSection;
