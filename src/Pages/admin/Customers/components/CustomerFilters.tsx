"use client";

// Customer Page — advanced filter fields for the filter modal (draft
// state; rendered inside the shared CustomModal by the page, which owns
// Apply/Reset and validation display). All colors come from the MUI
// theme — no hardcoded values. Groups: status, registration date,
// total orders / purchase / paid / due ranges, last-order date.
import {
   FormControl,
   FormHelperText,
   Grid,
   InputAdornment,
   InputLabel,
   MenuItem,
   Select,
   Stack,
   TextField,
   ToggleButton,
   ToggleButtonGroup,
   Typography,
} from "@mui/material";
import React from "react";
import DateRangePickerCustom from "@src/components/DateRange";
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
   currencySymbol?: string;
   errors?: CustomerFilterErrors;
   showErrors?: boolean;
}

/** Shared field styling: ~50px tall controls, 10px radius, theme borders. */
const fieldSx = {
   "& .MuiOutlinedInput-root": { borderRadius: 2.5, height: 50 },
   "& .MuiSelect-select": { display: "flex", alignItems: "center" },
};

const OP_OPTIONS: { value: RangeOp; label: string }[] = [
   { value: "gt", label: "Greater Than" },
   { value: "lt", label: "Less Than" },
   { value: "eq", label: "Equal To" },
   { value: "between", label: "Between" },
];

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
   <Typography variant="body2" fontWeight={600} color="text.primary">
      {children}
   </Typography>
);

const FieldError = ({ message }: { message?: string }) =>
   message ? (
      <Typography variant="caption" color="error.main" sx={{ mt: 0.5 }}>
         {message}
      </Typography>
   ) : null;

const RangeFilterField = ({
   label,
   range,
   onChange,
   integer = false,
   adornment,
   placeholder,
   error,
}: {
   label: string;
   range: NumericRange;
   onChange: (r: NumericRange) => void;
   integer?: boolean;
   adornment?: string;
   placeholder: string;
   error?: string;
}) => (
   <Stack spacing={1}>
      <FieldLabel>{label}</FieldLabel>
      <Stack direction="row" spacing={1}>
         <FormControl sx={{ width: 152, flexShrink: 0, ...fieldSx }}>
            <Select
               value={range.op}
               onChange={(e) =>
                  onChange({ ...range, op: e.target.value as RangeOp })
               }
               displayEmpty
            >
               {OP_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                     {o.label}
                  </MenuItem>
               ))}
            </Select>
         </FormControl>
         <TextField
            type="number"
            placeholder={
               range.op === "between" ? "Minimum" : placeholder
            }
            value={range.value}
            onChange={(e) => onChange({ ...range, value: e.target.value })}
            error={Boolean(error)}
            inputProps={{ min: 0, step: integer ? 1 : "0.01" }}
            InputProps={
               adornment
                  ? {
                       startAdornment: (
                          <InputAdornment position="start">
                             {adornment}
                          </InputAdornment>
                       ),
                    }
                  : undefined
            }
            sx={{ flex: 1, minWidth: 0, ...fieldSx }}
         />
         {range.op === "between" && (
            <TextField
               type="number"
               placeholder="Maximum"
               value={range.value2}
               onChange={(e) =>
                  onChange({ ...range, value2: e.target.value })
               }
               error={Boolean(error)}
               inputProps={{ min: 0, step: integer ? 1 : "0.01" }}
               InputProps={
                  adornment
                     ? {
                          startAdornment: (
                             <InputAdornment position="start">
                                {adornment}
                             </InputAdornment>
                          ),
                       }
                     : undefined
               }
               sx={{ flex: 1, minWidth: 0, ...fieldSx }}
            />
         )}
      </Stack>
      <FieldError message={error} />
   </Stack>
);

const DatePresetField = ({
   label,
   presetValue,
   presetOptions,
   onPresetChange,
   range,
   onRangeChange,
   rangeTitle,
   error,
}: {
   label: string;
   presetValue: string;
   presetOptions: { value: string; label: string }[];
   onPresetChange: (v: string) => void;
   range: [Date | null, Date | null];
   onRangeChange: (r: [Date | null, Date | null]) => void;
   rangeTitle: string;
   error?: string;
}) => (
   <Stack spacing={1}>
      <FieldLabel>{label}</FieldLabel>
      <FormControl fullWidth sx={fieldSx}>
         <InputLabel>Preset</InputLabel>
         <Select
            label="Preset"
            value={presetValue}
            onChange={(e) => onPresetChange(e.target.value)}
         >
            {presetOptions.map((o) => (
               <MenuItem key={o.value} value={o.value}>
                  {o.label}
               </MenuItem>
            ))}
         </Select>
      </FormControl>
      {presetValue === "custom" && (
         <DateRangePickerCustom
            title={rangeTitle}
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
   currencySymbol = "৳",
   errors = {},
   showErrors = false,
}: CustomerFiltersProps) => {
   const set = (partial: Partial<CustomerFilterState>) =>
      onChange({ ...value, ...partial });
   const err = (key: keyof CustomerFilterErrors) =>
      showErrors ? errors[key] : undefined;

   return (
      <Grid container spacing={3}>
         {/* Status — segmented control */}
         <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1}>
               <FieldLabel>Customer Status</FieldLabel>
               <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={value.status}
                  onChange={(_, v) => {
                     if (v) set({ status: v as StatusFilter });
                  }}
                  sx={{
                     height: 50,
                     "& .MuiToggleButtonGroup-grouped": {
                        borderColor: "divider",
                     },
                     "& .MuiToggleButton-root": {
                        textTransform: "none",
                        fontWeight: 600,
                        color: "text.secondary",
                        borderRadius: "10px",
                     },
                     "& .MuiToggleButton-root.Mui-selected": {
                        bgcolor: "action.selected",
                        color: "text.primary",
                     },
                     "& .MuiToggleButton-root.Mui-selected:hover": {
                        bgcolor: "action.selected",
                     },
                  }}
               >
                  <ToggleButton value="all">All</ToggleButton>
                  <ToggleButton value="new">New</ToggleButton>
                  <ToggleButton value="returning">Returning</ToggleButton>
               </ToggleButtonGroup>
               <FormHelperText sx={{ mx: 0 }}>
                  New = 1 or fewer valid orders · Returning = more than 1
               </FormHelperText>
            </Stack>
         </Grid>

         {/* Registration date */}
         <Grid size={{ xs: 12, md: 6 }}>
            <DatePresetField
               label="Registration Date"
               presetValue={value.regPreset}
               presetOptions={REG_PRESET_OPTIONS}
               onPresetChange={(v) => set({ regPreset: v as RegPreset })}
               range={value.regRange}
               onRangeChange={(range) => set({ regRange: range })}
               rangeTitle="Registration range"
               error={err("reg")}
            />
         </Grid>

         {/* Numeric ranges */}
         <Grid size={{ xs: 12, md: 6 }}>
            <RangeFilterField
               label="Total Orders"
               integer
               placeholder="Enter number of orders"
               range={value.orders}
               onChange={(r) => set({ orders: r })}
               error={err("orders")}
            />
         </Grid>
         <Grid size={{ xs: 12, md: 6 }}>
            <RangeFilterField
               label="Total Purchase"
               adornment={currencySymbol}
               placeholder="Enter purchase amount"
               range={value.purchase}
               onChange={(r) => set({ purchase: r })}
               error={err("purchase")}
            />
         </Grid>
         <Grid size={{ xs: 12, md: 6 }}>
            <RangeFilterField
               label="Total Paid"
               adornment={currencySymbol}
               placeholder="Enter paid amount"
               range={value.paid}
               onChange={(r) => set({ paid: r })}
               error={err("paid")}
            />
         </Grid>
         <Grid size={{ xs: 12, md: 6 }}>
            <RangeFilterField
               label="Total Due"
               adornment={currencySymbol}
               placeholder="Enter due amount"
               range={value.due}
               onChange={(r) => set({ due: r })}
               error={err("due")}
            />
         </Grid>

         {/* Last order date */}
         <Grid size={{ xs: 12, md: 6 }}>
            <DatePresetField
               label="Last Order Date"
               presetValue={value.lastPreset}
               presetOptions={LAST_ORDER_PRESET_OPTIONS}
               onPresetChange={(v) =>
                  set({ lastPreset: v as LastOrderPreset })
               }
               range={value.lastRange}
               onRangeChange={(range) => set({ lastRange: range })}
               rangeTitle="Last order range"
               error={err("last")}
            />
         </Grid>
      </Grid>
   );
};

export default CustomerFilters;
