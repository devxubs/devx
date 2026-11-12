"use client";

// Customer Page — advanced filter fields, styled after the existing
// Order Filter modal (src/Pages/admin/Order/OrderFilterModel.tsx):
// section titles (subtitle2/700), secondary body2 labels above controls,
// shared CustomAutocomplete dropdowns, shared DateRange, op + value rows,
// theme styling only. Rendered inside the shared CustomModal by the
// page, which owns the Reset / Cancel / Apply buttons (same order and
// variants as the Order filter). Filter options and logic are unchanged.
import {
   Box,
   Divider,
   FormHelperText,
   Grid,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import React from "react";
import CustomAutocomplete from "@src/components/Autocomplete";
import DateRange from "@src/components/DateRange";
import {
   CustomerFilterErrors,
   CustomerFilterState,
   LAST_ORDER_PRESET_OPTIONS,
   LastOrderPreset,
   NumericRange,
   REG_PRESET_OPTIONS,
   RangeOp,
   RegPreset,
   StatusFilter,
} from "./customerFilterUtils";

interface CustomerFiltersProps {
   value: CustomerFilterState;
   onChange: (next: CustomerFilterState) => void;
   errors?: CustomerFilterErrors;
   showErrors?: boolean;
}

const OP_OPTIONS: { value: RangeOp; label: string }[] = [
   { value: "gt", label: "Greater Than" },
   { value: "lt", label: "Less Than" },
   { value: "eq", label: "Equal To" },
   { value: "between", label: "Between" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
   { value: "all", label: "All" },
   { value: "new", label: "New" },
   { value: "returning", label: "Returning" },
];

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
   <Typography
      variant="subtitle2"
      fontWeight={700}
      color="text.primary"
      gutterBottom
   >
      {children}
   </Typography>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
   <Typography variant="body2" color="text.secondary">
      {children}
   </Typography>
);

const FieldError = ({ message }: { message?: string }) =>
   message ? (
      <Typography variant="caption" color="error.main">
         {message}
      </Typography>
   ) : null;

/** Operator + value row, mirroring the Order filter's qty/discount rows. */
const RangeFilterField = ({
   label,
   range,
   onChange,
   integer = false,
   placeholder,
   error,
   inputSize,
}: {
   label: string;
   range: NumericRange;
   onChange: (r: NumericRange) => void;
   integer?: boolean;
   placeholder: string;
   error?: string;
   inputSize: "small" | "medium";
}) => (
   <Stack spacing={1}>
      <FieldLabel>{label}</FieldLabel>
      <Stack direction="row" spacing={1}>
         <Box sx={{ width: range.op === "between" ? "44%" : "52%" }}>
            <CustomAutocomplete
               size={inputSize}
               options={OP_OPTIONS.map((o) => o.label)}
               value={
                  OP_OPTIONS.find((o) => o.value === range.op)?.label ||
                  "Greater Than"
               }
               onChange={(v: any) => {
                  const found = OP_OPTIONS.find((o) => o.label === v);
                  if (found) onChange({ ...range, op: found.value });
               }}
            />
         </Box>
         <TextField
            size={inputSize}
            type="number"
            placeholder={range.op === "between" ? "Min" : placeholder}
            value={range.value}
            onChange={(e) => onChange({ ...range, value: e.target.value })}
            error={Boolean(error)}
            inputProps={{ min: 0, step: integer ? 1 : "0.01" }}
            sx={{ width: range.op === "between" ? "28%" : "48%" }}
         />
         {range.op === "between" && (
            <TextField
               size={inputSize}
               type="number"
               placeholder="Max"
               value={range.value2}
               onChange={(e) =>
                  onChange({ ...range, value2: e.target.value })
               }
               error={Boolean(error)}
               inputProps={{ min: 0, step: integer ? 1 : "0.01" }}
               sx={{ width: "28%" }}
            />
         )}
      </Stack>
      <FieldError message={error} />
   </Stack>
);

/** Preset dropdown (CustomAutocomplete) + shared DateRange for Custom. */
const DatePresetField = ({
   label,
   presetValue,
   presetOptions,
   onPresetChange,
   range,
   onRangeChange,
   error,
   inputSize,
}: {
   label: string;
   presetValue: string;
   presetOptions: { value: string; label: string }[];
   onPresetChange: (v: string) => void;
   range: [Date | null, Date | null];
   onRangeChange: (r: [Date | null, Date | null]) => void;
   error?: string;
   inputSize: "small" | "medium";
}) => (
   <Stack spacing={1}>
      <FieldLabel>{label}</FieldLabel>
      <CustomAutocomplete
         size={inputSize}
         label={label}
         options={presetOptions.map((o) => o.label)}
         value={
            presetOptions.find((o) => o.value === presetValue)?.label || ""
         }
         onChange={(v: any) => {
            const found = presetOptions.find((o) => o.label === v);
            if (found) onPresetChange(found.value);
         }}
      />
      {presetValue === "custom" && (
         <DateRange
            size={inputSize}
            title={label}
            value={range}
            onChange={onRangeChange}
         />
      )}
      <FieldError message={error} />
   </Stack>
);

const CustomerFilters = ({
   value,
   onChange,
   errors = {},
   showErrors = false,
}: CustomerFiltersProps) => {
   // Compact controls throughout the modal (small size on every screen).
   const inputSize = "small" as const;
   const set = (partial: Partial<CustomerFilterState>) =>
      onChange({ ...value, ...partial });
   const err = (key: keyof CustomerFilterErrors) =>
      showErrors ? errors[key] : undefined;

   return (
      <>
         {/* SECTION 1: STATUS & DATES */}
         <Box>
            <SectionTitle>Customer Status & Dates</SectionTitle>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <FieldLabel>Customer Status</FieldLabel>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Customer Status"
                        options={STATUS_OPTIONS.map((o) => o.label)}
                        value={
                           STATUS_OPTIONS.find(
                              (o) => o.value === value.status,
                           )?.label || "All"
                        }
                        onChange={(v: any) => {
                           const found = STATUS_OPTIONS.find(
                              (o) => o.label === v,
                           );
                           if (found) set({ status: found.value });
                        }}
                     />
                     <FormHelperText sx={{ mx: 0 }}>
                        New = 1 or fewer valid orders · Returning = more
                        than 1
                     </FormHelperText>
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <DatePresetField
                     label="Registration Date"
                     presetValue={value.regPreset}
                     presetOptions={REG_PRESET_OPTIONS}
                     onPresetChange={(v) =>
                        set({ regPreset: v as RegPreset })
                     }
                     range={value.regRange}
                     onRangeChange={(range) => set({ regRange: range })}
                     error={err("reg")}
                     inputSize={inputSize}
                  />
               </Grid>

               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <DatePresetField
                     label="Last Order Date"
                     presetValue={value.lastPreset}
                     presetOptions={LAST_ORDER_PRESET_OPTIONS}
                     onPresetChange={(v) =>
                        set({ lastPreset: v as LastOrderPreset })
                     }
                     range={value.lastRange}
                     onRangeChange={(range) => set({ lastRange: range })}
                     error={err("last")}
                     inputSize={inputSize}
                  />
               </Grid>
            </Grid>
         </Box>

         <Divider />

         {/* SECTION 2: ORDER & AMOUNT RANGES */}
         <Box>
            <SectionTitle>Order & Amount Ranges</SectionTitle>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <RangeFilterField
                     label="Total Orders"
                     integer
                     placeholder="Qty"
                     range={value.orders}
                     onChange={(r) => set({ orders: r })}
                     error={err("orders")}
                     inputSize={inputSize}
                  />
               </Grid>
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <RangeFilterField
                     label="Total Purchase"
                     placeholder="Amount"
                     range={value.purchase}
                     onChange={(r) => set({ purchase: r })}
                     error={err("purchase")}
                     inputSize={inputSize}
                  />
               </Grid>
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <RangeFilterField
                     label="Total Paid"
                     placeholder="Amount"
                     range={value.paid}
                     onChange={(r) => set({ paid: r })}
                     error={err("paid")}
                     inputSize={inputSize}
                  />
               </Grid>
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <RangeFilterField
                     label="Total Due"
                     placeholder="Amount"
                     range={value.due}
                     onChange={(r) => set({ due: r })}
                     error={err("due")}
                     inputSize={inputSize}
                  />
               </Grid>
            </Grid>
         </Box>
      </>
   );
};

export default CustomerFilters;
