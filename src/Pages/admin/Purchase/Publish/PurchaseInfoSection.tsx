"use client";

// Purchase Create (redesign) — Purchase Information section:
// internal Purchase ID (server-assigned preview / the record's own
// ID in edit mode), purchase date, supplier picker with the
// selected supplier's contact details, and the SUPPLIER's invoice
// number (kept clearly separate from the internal Purchase ID).
//
// The payment status is NOT shown here — it lives only in the
// Payment & Summary section, as on the reference create pages.
// Field presentation follows the Order Create / Product Create
// form system: FieldLabel above each size="small" field, no
// standing instructional helper text (helpers appear only as
// validation messages, the reference pages' pattern).

import { Grid, Stack, TextField, Typography } from "@mui/material";
import React from "react";
import { Controller } from "react-hook-form";
import { format } from "date-fns";
import CustomAutocomplete from "@src/components/Autocomplete";
import DatePicker from "@src/components/DateRange";
import Icon from "@src/components/Icon";
import type { SupplierOption } from "./index";
import FieldLabel from "./FieldLabel";

interface PurchaseInfoSectionProps {
   control: any;
   errors: any;
   supplierOptions: SupplierOption[];
   selectedSupplier: SupplierOption | null;
   onSupplierSelect: (supplier: SupplierOption | null) => void;
   purchaseIdText: string;
}

// One compact contact row in the selected-supplier box: a small
// solar icon (the icon family the reference pages use) + the value.
const ContactRow = ({
   icon,
   value,
}: {
   icon: string;
   value: string;
}) => (
   <Stack direction="row" spacing={1} alignItems="flex-start">
      {/* The shared Icon renders in text.secondary by default. */}
      <Icon icon={icon} size="15px" style={{ marginTop: 2, flexShrink: 0 }} />
      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
         {value}
      </Typography>
   </Stack>
);

const PurchaseInfoSection = ({
   control,
   errors,
   supplierOptions,
   selectedSupplier,
   onSupplierSelect,
   purchaseIdText,
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
                              {errors.date && (
                                 <Typography
                                    variant="caption"
                                    color="error"
                                    sx={{ ml: 1.75 }}
                                 >
                                    {errors.date.message}
                                 </Typography>
                              )}
                           </Stack>
                        );
                     }}
                  />
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
                           helperText={errors.supplier?.message}
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
                     // Compact contact box: a hairline border instead
                     // of the old filled grey panel, one icon row per
                     // saved detail, missing details hidden.
                     <Stack
                        spacing={0.75}
                        sx={{
                           px: 1.5,
                           py: 1.25,
                           borderRadius: 1.5,
                           border: (t) => `1px solid ${t.palette.divider}`,
                        }}
                     >
                        {selectedSupplier.phone ||
                        selectedSupplier.email ||
                        selectedSupplier.address ? (
                           <>
                              {selectedSupplier.phone && (
                                 <ContactRow
                                    icon="solar:phone-linear"
                                    value={selectedSupplier.phone}
                                 />
                              )}
                              {selectedSupplier.email && (
                                 <ContactRow
                                    icon="solar:letter-linear"
                                    value={selectedSupplier.email}
                                 />
                              )}
                              {selectedSupplier.address && (
                                 <ContactRow
                                    icon="solar:map-point-linear"
                                    value={selectedSupplier.address}
                                 />
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
                           helperText={errors.invoice?.message}
                        />
                     )}
                  />
               </Stack>
            </Grid>
         </Grid>
      </Stack>
   );
};

export default PurchaseInfoSection;
