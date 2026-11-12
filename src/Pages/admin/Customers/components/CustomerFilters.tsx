"use client";

// Customer Page upgrade — advanced filter panel (draft state; the page
// applies it on "Apply Filters"). Groups: status, registration date,
// total orders / purchase / paid / due ranges, last-order date.
import {
   Box,
   Button,
   FormControl,
   Grid,
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
import Icon from "@src/components/Icon";
import {
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
   onApply: () => void;
   onReset: () => void;
   currencySymbol?: string;
}

const OP_OPTIONS: { value: RangeOp; label: string }[] = [
   { value: "eq", label: "Equal To" },
   { value: "gt", label: "Greater Than" },
   { value: "lt", label: "Less Than" },
   { value: "between", label: "Between" },
];

const RangeFilterField = ({
   label,
   range,
   onChange,
   integer = false,
   adornment,
}: {
   label: string;
   range: NumericRange;
   onChange: (r: NumericRange) => void;
   integer?: boolean;
   adornment?: string;
}) => (
   <Stack spacing={1}>
      <Typography variant="body2" fontWeight={600}>
         {label}
      </Typography>
      <Stack direction="row" spacing={1}>
         <FormControl size="small" sx={{ minWidth: 128, flexShrink: 0 }}>
            <Select
               value={range.op}
               onChange={(e) => onChange({ ...range, op: e.target.value as RangeOp })}
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
            size="small"
            type="number"
            placeholder={adornment ? `Amount (${adornment})` : "Value"}
            value={range.value}
            onChange={(e) => onChange({ ...range, value: e.target.value })}
            inputProps={{ min: 0, step: integer ? 1 : "0.01" }}
            fullWidth
         />
         {range.op === "between" && (
            <TextField
               size="small"
               type="number"
               placeholder="To"
               value={range.value2}
               onChange={(e) => onChange({ ...range, value2: e.target.value })}
               inputProps={{ min: 0, step: integer ? 1 : "0.01" }}
               fullWidth
            />
         )}
      </Stack>
   </Stack>
);

const CustomerFilters = ({
   value,
   onChange,
   onApply,
   onReset,
   currencySymbol = "৳",
}: CustomerFiltersProps) => {
   const set = (partial: Partial<CustomerFilterState>) =>
      onChange({ ...value, ...partial });

   return (
      <Box
         sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
            bgcolor: "background.paper",
         }}
      >
         <Grid container spacing={2.5}>
            {/* Status */}
            <Grid size={{ xs: 12, md: 4 }}>
               <Stack spacing={1}>
                  <Typography variant="body2" fontWeight={600}>
                     Customer Status
                  </Typography>
                  <ToggleButtonGroup
                     size="small"
                     exclusive
                     fullWidth
                     value={value.status}
                     onChange={(_, v) => {
                        if (v) set({ status: v as StatusFilter });
                     }}
                     sx={{
                        "& .MuiToggleButton-root": {
                           textTransform: "none",
                           fontWeight: 600,
                        },
                     }}
                  >
                     <ToggleButton value="all">All</ToggleButton>
                     <ToggleButton value="new">New</ToggleButton>
                     <ToggleButton value="returning">Returning</ToggleButton>
                  </ToggleButtonGroup>
                  <Typography variant="caption" color="textSecondary">
                     New = 1 or fewer valid orders · Returning = more than 1
                  </Typography>
               </Stack>
            </Grid>

            {/* Registration date */}
            <Grid size={{ xs: 12, md: 8 }}>
               <Stack spacing={1}>
                  <Typography variant="body2" fontWeight={600}>
                     Registration Date
                  </Typography>
                  <Stack
                     direction={{ xs: "column", sm: "row" }}
                     spacing={1}
                     alignItems={{ xs: "stretch", sm: "center" }}
                  >
                     <FormControl size="small" sx={{ minWidth: 170 }}>
                        <InputLabel>Preset</InputLabel>
                        <Select
                           label="Preset"
                           value={value.regPreset}
                           onChange={(e) =>
                              set({ regPreset: e.target.value as RegPreset })
                           }
                        >
                           {REG_PRESET_OPTIONS.map((o) => (
                              <MenuItem key={o.value} value={o.value}>
                                 {o.label}
                              </MenuItem>
                           ))}
                        </Select>
                     </FormControl>
                     {value.regPreset === "custom" && (
                        <DateRangePickerCustom
                           size="small"
                           title="Registration range"
                           value={value.regRange}
                           onChange={(range) => set({ regRange: range })}
                        />
                     )}
                  </Stack>
               </Stack>
            </Grid>

            {/* Numeric ranges */}
            <Grid size={{ xs: 12, md: 6 }}>
               <RangeFilterField
                  label="Total Orders"
                  integer
                  range={value.orders}
                  onChange={(r) => set({ orders: r })}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <RangeFilterField
                  label="Total Purchase"
                  adornment={currencySymbol}
                  range={value.purchase}
                  onChange={(r) => set({ purchase: r })}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <RangeFilterField
                  label="Total Paid"
                  adornment={currencySymbol}
                  range={value.paid}
                  onChange={(r) => set({ paid: r })}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <RangeFilterField
                  label="Total Due"
                  adornment={currencySymbol}
                  range={value.due}
                  onChange={(r) => set({ due: r })}
               />
            </Grid>

            {/* Last order date */}
            <Grid size={{ xs: 12, md: 8 }}>
               <Stack spacing={1}>
                  <Typography variant="body2" fontWeight={600}>
                     Last Order Date
                  </Typography>
                  <Stack
                     direction={{ xs: "column", sm: "row" }}
                     spacing={1}
                     alignItems={{ xs: "stretch", sm: "center" }}
                  >
                     <FormControl size="small" sx={{ minWidth: 170 }}>
                        <InputLabel>Preset</InputLabel>
                        <Select
                           label="Preset"
                           value={value.lastPreset}
                           onChange={(e) =>
                              set({ lastPreset: e.target.value as LastOrderPreset })
                           }
                        >
                           {LAST_ORDER_PRESET_OPTIONS.map((o) => (
                              <MenuItem key={o.value} value={o.value}>
                                 {o.label}
                              </MenuItem>
                           ))}
                        </Select>
                     </FormControl>
                     {value.lastPreset === "custom" && (
                        <DateRangePickerCustom
                           size="small"
                           title="Last order range"
                           value={value.lastRange}
                           onChange={(range) => set({ lastRange: range })}
                        />
                     )}
                  </Stack>
               </Stack>
            </Grid>

            {/* Actions */}
            <Grid size={{ xs: 12, md: 4 }}>
               <Stack
                  direction="row"
                  spacing={1.5}
                  justifyContent={{ xs: "flex-start", md: "flex-end" }}
                  alignItems="flex-end"
                  sx={{ height: "100%" }}
               >
                  <Button
                     variant="outlined"
                     color="inherit"
                     onClick={onReset}
                     startIcon={<Icon icon="solar:restart-bold" size="small" />}
                     sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                     Reset
                  </Button>
                  <Button
                     variant="contained"
                     onClick={onApply}
                     startIcon={<Icon icon="solar:filter-bold" size="small" />}
                     sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                     Apply Filters
                  </Button>
               </Stack>
            </Grid>
         </Grid>
      </Box>
   );
};

export default CustomerFilters;
