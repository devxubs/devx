"use client";

// Purchase Create (redesign) — Purchase Information section:
// internal Purchase ID (server-assigned preview / the record's own
// ID in edit mode), supplier picker with the selected supplier's
// contact details, the SUPPLIER's invoice number (kept clearly
// separate from the internal Purchase ID), purchase date, and the
// derived payment status. The Purchase model has no status column
// and no payment-method column, so neither is invented here — the
// only status the system knows is the payment status, derived from
// paid vs total by the page's calculation engine.
//
// Field presentation follows the Order Create / Product Create
// form system: a 13px semi-bold secondary label above each field
// (FieldLabel), size="small" fields, and helper text under the
// field — guidance by default, replaced by the validation message
// when the field is in error.

import { Chip, Grid, Stack, TextField, Typography } from "@mui/material";
import React from "react";
import { Controller } from "react-hook-form";
import { format } from "date-fns";
import CustomAutocomplete from "@src/components/Autocomplete";
import DatePicker from "@src/components/DateRange";
import type { SupplierOption } from "./index";
import FieldLabel from "./FieldLabel";
import {
   paymentStatusLabel,
   type PurchasePaymentStatus,
} from "./calculations";

interface PurchaseInfoSectionProps {
   control: any;
   errors: any;
   supplierOptions: SupplierOption[];
   selectedSupplier: SupplierOption | null;
   onSupplierSelect: (supplier: SupplierOption | null) => void;
   purchaseIdText: string;
   purchaseIdHelper: string;
   paymentStatus: PurchasePaymentStatus;
}

const statusColor = (
   status: PurchasePaymentStatus,
): "success" | "warning" | "default" =>
   status === "PAID" ? "success" : status === "PARTIAL" ? "warning" : "default";

const PurchaseInfoSection = ({
   control,
   errors,
   supplierOptions,
   selectedSupplier,
   onSupplierSelect,
   purchaseIdText,
   purchaseIdHelper,
   paymentStatus,
}: PurchaseInfoSectionProps) => {
   return (
      <Stack spacing={2}>
         <Grid container spacing={3}>
            {/* Internal Purchase ID — read-only; the server assigns it. */}
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={0.75}>
                  <FieldLabel auto>Purchase ID</FieldLabel>
                  <TextField
                     value={purchaseIdText}
                     fullWidth
                     size="small"
                     disabled
                     helperText={purchaseIdHelper}
                  />
               </Stack>
            </Grid>

            {/* Payment status — derived, shown here and in the summary. */}
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={0.75}>
                  <FieldLabel>Payment Status</FieldLabel>
                  <Stack direction="row" alignItems="center" sx={{ minHeight: 40 }}>
                     <Chip
                        label={paymentStatusLabel(paymentStatus)}
                        color={statusColor(paymentStatus)}
                        sx={{ fontWeight: 600 }}
                     />
                  </Stack>
                  {/* Invisible spacer mirroring the Purchase ID
                      field's helper-text line, so the chip row aligns
                      with the field row beside it. */}
                  <Typography
                     variant="caption"
                     sx={{ visibility: "hidden" }}
                     aria-hidden
                  >
                     .
                  </Typography>
               </Stack>
            </Grid>

            {/* Supplier */}
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={0.75}>
                  <FieldLabel>Supplier</FieldLabel>
                  <Controller
                     name="supplier"
                     control={control}
                     render={({ field }) => (
                        <CustomAutocomplete
                           placeholder="Search supplier..."
                           arrow
                           size="small"
                           options={supplierOptions}
                           value={selectedSupplier}
                           onChange={(val: any) => {
                              const option =
                                 val && typeof val === "object"
                                    ? (val as SupplierOption)
                                    : null;
                              field.onChange(option ? option.name : "");
                              onSupplierSelect(option);
                           }}
                           error={!!errors.supplier}
                           helperText={
                              errors.supplier?.message ||
                              "Select the supplier for this purchase."
                           }
                           getOptionLabel={(option: any) =>
                              typeof option === "string"
                                 ? option
                                 : option?.name || ""
                           }
                           isOptionEqualToValue={(option: any, value: any) =>
                              option?.id === value?.id
                           }
                           filterOptions={(options: any[], state: any) => {
                              const q = (state.inputValue || "")
                                 .trim()
                                 .toLowerCase();
                              if (!q) return options;
                              return options.filter((o: any) =>
                                 [o.name, o.phone, o.email]
                                    .filter(Boolean)
                                    .some((v: string) =>
                                       v.toLowerCase().includes(q),
                                    ),
                              );
                           }}
                           renderOption={(props: any, option: any) => (
                              <li {...props} key={option.id}>
                                 <Stack>
                                    <Typography variant="body2">
                                       {option.name}
                                    </Typography>
                                    {option.phone && (
                                       <Typography
                                          variant="caption"
                                          color="text.secondary"
                                       >
                                          {option.phone}
                                       </Typography>
                                    )}
                                 </Stack>
                              </li>
                           )}
                        />
                     )}
                  />
                  {selectedSupplier && (
                     <Stack
                        spacing={0.25}
                        sx={{
                           px: 1.5,
                           py: 1,
                           borderRadius: 1,
                           bgcolor: "action.hover",
                        }}
                     >
                        {selectedSupplier.phone ||
                        selectedSupplier.email ||
                        selectedSupplier.address ? (
                           <>
                              {selectedSupplier.phone && (
                                 <Typography variant="body2">
                                    Phone: {selectedSupplier.phone}
                                 </Typography>
                              )}
                              {selectedSupplier.email && (
                                 <Typography variant="body2">
                                    Email: {selectedSupplier.email}
                                 </Typography>
                              )}
                              {selectedSupplier.address && (
                                 <Typography variant="body2">
                                    Address: {selectedSupplier.address}
                                 </Typography>
                              )}
                           </>
                        ) : (
                           <Typography variant="body2" color="textSecondary">
                              No contact details saved for this supplier.
                           </Typography>
                        )}
                     </Stack>
                  )}
               </Stack>
            </Grid>

            {/* Supplier invoice number — NOT the internal Purchase ID. */}
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={0.75}>
                  <FieldLabel optional>Supplier Invoice ID</FieldLabel>
                  <Controller
                     name="invoice"
                     control={control}
                     render={({ field }) => (
                        <TextField
                           {...field}
                           fullWidth
                           size="small"
                           placeholder="Supplier's own invoice number"
                           error={!!errors.invoice}
                           helperText={
                              errors.invoice?.message ||
                              "Enter the invoice number provided by the supplier."
                           }
                        />
                     )}
                  />
               </Stack>
            </Grid>

            {/* Purchase date */}
            <Grid size={{ xs: 12, md: 6 }}>
               <Stack spacing={0.75}>
                  <FieldLabel>Purchase Date</FieldLabel>
                  <Controller
                     name="date"
                     control={control}
                     render={({ field }) => {
                        // BUG-E1: the shared DateRange picker speaks in
                        // [Date, Date] tuples; the schema stores a
                        // "yyyy-MM-dd" string. Adapt at this boundary
                        // (moved unchanged from the old Information
                        // section).
                        const parsed = field.value
                           ? new Date(field.value as any)
                           : null;
                        const pickerValue: [Date | null, Date | null] =
                           parsed && !Number.isNaN(parsed.getTime())
                              ? [parsed, parsed]
                              : [null, null];
                        return (
                           <Stack spacing={0.5}>
                              <DatePicker
                                 type="single"
                                 size="small"
                                 value={pickerValue}
                                 onChange={(val) => {
                                    const d = val?.[0];
                                    field.onChange(
                                       d ? format(d, "yyyy-MM-dd") : "",
                                    );
                                 }}
                              />
                              {/* Helper line in the same style as the
                                  MUI helper text under the other
                                  fields: guidance, or the validation
                                  message in error colour. */}
                              <Typography
                                 variant="caption"
                                 color={errors.date ? "error" : "textSecondary"}
                                 sx={{ ml: 1.75 }}
                              >
                                 {errors.date?.message ||
                                    "Select the date of this purchase."}
                              </Typography>
                           </Stack>
                        );
                     }}
                  />
               </Stack>
            </Grid>
         </Grid>
      </Stack>
   );
};

export default PurchaseInfoSection;
