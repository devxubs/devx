"use client";

// Customer Page — advanced filter fields for the filter modal (draft
// state; rendered inside the shared CustomModal by the page, which owns
// Reset / Cancel / Apply). Layout follows the Order Filter pattern
// (sections, secondary labels above controls, shared CustomAutocomplete
// and DateRange, compact small controls, theme tokens only).
//
// Additional filters are only rendered when real data support exists:
// order status/source (Order fields), delivered count + item quantity
// (order aggregates), product/category (OrderItem → Product relations),
// employee (Order.employeeId), phone (Customer.phone). Dropdown options
// come from the live APIs / facets — never hardcoded lists.
import {
   Box,
   Checkbox,
   Divider,
   FormControlLabel,
   FormHelperText,
   Grid,
   InputAdornment,
   Stack,
   TextField,
   ToggleButton,
   ToggleButtonGroup,
   Typography,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import CustomAutocomplete from "@src/components/Autocomplete";
import DateRange from "@src/components/DateRange";
import {
   CustomerFilterErrors,
   CustomerFilterState,
   LAST_ORDER_PRESET_OPTIONS,
   LastOrderPreset,
   NumericRange,
   ORDER_STATUS_OPTIONS,
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
   currencySymbol?: string;
}

const OP_OPTIONS: { value: RangeOp; label: string }[] = [
   { value: "gt", label: "Greater Than" },
   { value: "gte", label: "Greater Than or Equal" },
   { value: "lt", label: "Less Than" },
   { value: "lte", label: "Less Than or Equal" },
   { value: "eq", label: "Equal To" },
   { value: "between", label: "Between" },
];

type EntityOption = { id: string; label: string };

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

/** Operator + value row (Between adds a Max field), Order-filter style. */
const RangeFilterField = ({
   label,
   range,
   onChange,
   integer = false,
   placeholder,
   adornment,
   error,
}: {
   label: string;
   range: NumericRange;
   onChange: (r: NumericRange) => void;
   integer?: boolean;
   placeholder: string;
   adornment?: string;
   error?: string;
}) => {
   const adornmentProps = adornment
      ? {
           startAdornment: (
              <InputAdornment position="start">{adornment}</InputAdornment>
           ),
        }
      : undefined;
   return (
      <Stack spacing={1}>
         <FieldLabel>{label}</FieldLabel>
         <Stack direction="row" spacing={1}>
            <Box sx={{ width: range.op === "between" ? "44%" : "52%" }}>
               <CustomAutocomplete
                  size="small"
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
               size="small"
               type="number"
               placeholder={range.op === "between" ? "Min" : placeholder}
               value={range.value}
               onChange={(e) => onChange({ ...range, value: e.target.value })}
               error={Boolean(error)}
               inputProps={{ min: 0, step: integer ? 1 : "0.01" }}
               InputProps={adornmentProps}
               sx={{ width: range.op === "between" ? "28%" : "48%" }}
            />
            {range.op === "between" && (
               <TextField
                  size="small"
                  type="number"
                  placeholder="Max"
                  value={range.value2}
                  onChange={(e) =>
                     onChange({ ...range, value2: e.target.value })
                  }
                  error={Boolean(error)}
                  inputProps={{ min: 0, step: integer ? 1 : "0.01" }}
                  InputProps={adornmentProps}
                  sx={{ width: "28%" }}
               />
            )}
         </Stack>
         <FieldError message={error} />
      </Stack>
   );
};

/** Preset dropdown (CustomAutocomplete) + shared DateRange for Custom. */
const DatePresetField = ({
   label,
   presetValue,
   presetOptions,
   onPresetChange,
   range,
   onRangeChange,
   error,
}: {
   label: string;
   presetValue: string;
   presetOptions: { value: string; label: string }[];
   onPresetChange: (v: string) => void;
   range: [Date | null, Date | null];
   onRangeChange: (r: [Date | null, Date | null]) => void;
   error?: string;
}) => (
   <Stack spacing={1}>
      <FieldLabel>{label}</FieldLabel>
      <CustomAutocomplete
         size="small"
         label={label}
         options={presetOptions.map((o) => o.label)}
         value={presetOptions.find((o) => o.value === presetValue)?.label || ""}
         onChange={(v: any) => {
            const found = presetOptions.find((o) => o.label === v);
            if (found) onPresetChange(found.value);
         }}
      />
      {presetValue === "custom" && (
         <DateRange
            size="small"
            title={label}
            value={range}
            onChange={onRangeChange}
         />
      )}
      <FieldError message={error} />
   </Stack>
);

/** Label row with an Order-filter-style Exclude checkbox on the right. */
const ExcludeLabel = ({
   label,
   exclude,
   onExcludeChange,
}: {
   label: string;
   exclude: boolean;
   onExcludeChange: (v: boolean) => void;
}) => (
   <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
   >
      <FieldLabel>{label}</FieldLabel>
      <FormControlLabel
         control={
            <Checkbox
               size="small"
               checked={exclude}
               onChange={(e) => onExcludeChange(e.target.checked)}
            />
         }
         label={<Typography variant="caption">Exclude</Typography>}
         sx={{ m: 0 }}
      />
   </Stack>
);

const CustomerFilters = ({
   value,
   onChange,
   errors = {},
   showErrors = false,
   currencySymbol = "৳",
}: CustomerFiltersProps) => {
   const set = (partial: Partial<CustomerFilterState>) =>
      onChange({ ...value, ...partial });
   const err = (key: keyof CustomerFilterErrors) =>
      showErrors ? errors[key] : undefined;

   // ── API-backed dropdown data (loaded once when the modal mounts) ──
   const [sourceOptions, setSourceOptions] = useState<string[]>([]);
   const [categoryOptions, setCategoryOptions] = useState<EntityOption[]>([]);
   const [employeeOptions, setEmployeeOptions] = useState<EntityOption[]>([]);
   const [employeesLoaded, setEmployeesLoaded] = useState(false);
   const [productOptions, setProductOptions] = useState<EntityOption[]>([]);
   const productSearchRef = useRef<number>(0);

   useEffect(() => {
      let cancelled = false;
      (async () => {
         try {
            const res = await fetch("/api/customers?facets=1");
            if (res.ok) {
               const data = await res.json();
               if (!cancelled && Array.isArray(data.orderSources))
                  setSourceOptions(data.orderSources);
            }
         } catch { /* facet unavailable — field shows no options */ }
         try {
            const res = await fetch("/api/categories");
            if (res.ok) {
               const data = await res.json();
               const list = Array.isArray(data) ? data : data.categories || [];
               if (!cancelled)
                  setCategoryOptions(
                     list.map((c: any) => ({ id: c.id, label: c.name })),
                  );
            }
         } catch { /* ignore */ }
         try {
            const res = await fetch("/api/users?limit=100");
            if (res.ok) {
               const data = await res.json();
               const list = Array.isArray(data) ? data : data.users || [];
               if (!cancelled) {
                  setEmployeeOptions(
                     list.map((u: any) => ({
                        id: u.id,
                        label: u.name || u.email || u.id,
                     })),
                  );
                  setEmployeesLoaded(true);
               }
            }
         } catch { /* employee field stays hidden without user access */ }
      })();
      return () => {
         cancelled = true;
      };
   }, []);

   const searchProducts = async (term: string) => {
      const req = ++productSearchRef.current;
      try {
         const q = new URLSearchParams({ limit: "50" });
         if (term) q.set("search", term);
         const res = await fetch(`/api/products?${q.toString()}`);
         if (!res.ok) return;
         const data = await res.json();
         if (req !== productSearchRef.current) return;
         setProductOptions(
            (data.products || []).map((p: any) => ({
               id: p.id,
               label: p.productName,
            })),
         );
      } catch { /* keep previous options */ }
   };

   useEffect(() => {
      searchProducts("");
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   return (
      <>
         {/* SECTION 1: STATUS & DATES */}
         <Box>
            <SectionTitle>Customer Status & Dates</SectionTitle>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <FieldLabel>Customer Status</FieldLabel>
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
                              color: "text.secondary",
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
                     onPresetChange={(v) => set({ regPreset: v as RegPreset })}
                     range={value.regRange}
                     onRangeChange={(range) => set({ regRange: range })}
                     error={err("reg")}
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
                  />
               </Grid>
            </Grid>
         </Box>

         <Divider />

         {/* SECTION 2: ORDER & AMOUNT RANGES */}
         <Box>
            <SectionTitle>Order & Amount Ranges</SectionTitle>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, md: 6 }}>
                  <RangeFilterField
                     label="Total Orders"
                     integer
                     placeholder="Enter quantity"
                     range={value.orders}
                     onChange={(r) => set({ orders: r })}
                     error={err("orders")}
                  />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                  <RangeFilterField
                     label="Total Purchase"
                     placeholder="Amount"
                     adornment={currencySymbol}
                     range={value.purchase}
                     onChange={(r) => set({ purchase: r })}
                     error={err("purchase")}
                  />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                  <RangeFilterField
                     label="Total Paid"
                     placeholder="Amount"
                     adornment={currencySymbol}
                     range={value.paid}
                     onChange={(r) => set({ paid: r })}
                     error={err("paid")}
                  />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                  <RangeFilterField
                     label="Total Due"
                     placeholder="Amount"
                     adornment={currencySymbol}
                     range={value.due}
                     onChange={(r) => set({ due: r })}
                     error={err("due")}
                  />
               </Grid>
            </Grid>
         </Box>

         <Divider />

         {/* SECTION 3: ADDITIONAL CUSTOMER FILTERS */}
         <Box>
            <SectionTitle>Additional Customer Filters</SectionTitle>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <ExcludeLabel
                        label="Order Status"
                        exclude={value.orderStatusExclude}
                        onExcludeChange={(v) =>
                           set({ orderStatusExclude: v })
                        }
                     />
                     <CustomAutocomplete
                        size="small"
                        label="Order Status"
                        multiple
                        options={ORDER_STATUS_OPTIONS}
                        value={value.orderStatuses}
                        onChange={(v: any) => {
                           const list = (Array.isArray(v) ? v : []).filter(
                              (s: any) => ORDER_STATUS_OPTIONS.includes(s),
                           );
                           set({ orderStatuses: list });
                        }}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <ExcludeLabel
                        label="Order Source"
                        exclude={value.orderSourceExclude}
                        onExcludeChange={(v) =>
                           set({ orderSourceExclude: v })
                        }
                     />
                     <CustomAutocomplete
                        size="small"
                        label="Order Source"
                        multiple
                        options={sourceOptions}
                        value={value.orderSources}
                        onChange={(v: any) => {
                           const list = (Array.isArray(v) ? v : []).filter(
                              (s: any) => sourceOptions.includes(s),
                           );
                           set({ orderSources: list });
                        }}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <RangeFilterField
                     label="Delivered / Completed Orders"
                     integer
                     placeholder="Qty"
                     range={value.delivered}
                     onChange={(r) => set({ delivered: r })}
                     error={err("delivered")}
                  />
               </Grid>

               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <RangeFilterField
                     label="Order Item Quantity"
                     integer
                     placeholder="Qty"
                     range={value.itemQty}
                     onChange={(r) => set({ itemQty: r })}
                     error={err("itemQty")}
                  />
               </Grid>

               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <FieldLabel>Product</FieldLabel>
                     <CustomAutocomplete
                        size="small"
                        label="Product"
                        options={productOptions}
                        value={
                           value.productId
                              ? {
                                   id: value.productId,
                                   label: value.productLabel,
                                }
                              : null
                        }
                        onChange={(v: any) => {
                           if (v && typeof v === "object" && v.id)
                              set({
                                 productId: v.id,
                                 productLabel: v.label || "",
                              });
                           else if (!v)
                              set({ productId: "", productLabel: "" });
                        }}
                        onInputChange={(_: any, term: string, reason: string) => {
                           if (reason === "input") searchProducts(term);
                        }}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <FieldLabel>Product Category</FieldLabel>
                     <CustomAutocomplete
                        size="small"
                        label="Product Category"
                        options={categoryOptions}
                        value={
                           value.categoryId
                              ? {
                                   id: value.categoryId,
                                   label: value.categoryLabel,
                                }
                              : null
                        }
                        onChange={(v: any) => {
                           if (v && typeof v === "object" && v.id)
                              set({
                                 categoryId: v.id,
                                 categoryLabel: v.label || "",
                              });
                           else if (!v)
                              set({ categoryId: "", categoryLabel: "" });
                        }}
                     />
                  </Stack>
               </Grid>

               {employeesLoaded && employeeOptions.length > 0 && (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                     <Stack spacing={1}>
                        <FieldLabel>Employee</FieldLabel>
                        <CustomAutocomplete
                           size="small"
                           label="Employee"
                           options={employeeOptions}
                           value={
                              value.employeeId
                                 ? {
                                      id: value.employeeId,
                                      label: value.employeeLabel,
                                   }
                                 : null
                           }
                           onChange={(v: any) => {
                              if (v && typeof v === "object" && v.id)
                                 set({
                                    employeeId: v.id,
                                    employeeLabel: v.label || "",
                                 });
                              else if (!v)
                                 set({ employeeId: "", employeeLabel: "" });
                           }}
                        />
                     </Stack>
                  </Grid>
               )}

               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <FieldLabel>BD Mobile Number</FieldLabel>
                     <TextField
                        size="small"
                        placeholder="e.g. 01711000001"
                        value={value.phoneNumber}
                        onChange={(e) =>
                           set({ phoneNumber: e.target.value })
                        }
                        error={Boolean(err("phone"))}
                     />
                     <FieldError message={err("phone")} />
                  </Stack>
               </Grid>
            </Grid>
         </Box>
      </>
   );
};

export default CustomerFilters;
