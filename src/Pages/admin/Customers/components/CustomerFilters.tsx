"use client";

// DevX POS — Customer Filter Modal (Redesigned)
// Clean, modern, compact, professional UI with reusable CustomAutocomplete
// operator adornments, Autocomplete-based Customer Status, and responsive layouts.
import {
   Box,
   Checkbox,
   Divider,
   FormControlLabel,
   Grid,
   InputAdornment,
   Stack,
   TextField,
   Typography,
   alpha,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import CustomAutocomplete from "@src/components/Autocomplete";
import DateRange from "@src/components/DateRange";
import {
   CustomerFilterErrors,
   CustomerFilterState,
   NumericRange,
   ORDER_STATUS_OPTIONS,
   RangeOp,
   StatusFilter,
} from "./customerFilterUtils";

interface CustomerFiltersProps {
   value: CustomerFilterState;
   onChange: (next: CustomerFilterState) => void;
   errors?: CustomerFilterErrors;
   showErrors?: boolean;
   currencySymbol?: string;
}

interface OperatorOption {
   value: RangeOp;
   label: string;
   symbol: string;
}

const OP_OPTIONS: OperatorOption[] = [
   { value: "gt", label: "Greater Than", symbol: ">" },
   { value: "gte", label: "Greater Than or Equal", symbol: "≥" },
   { value: "lt", label: "Less Than", symbol: "<" },
   { value: "lte", label: "Less Than or Equal", symbol: "≤" },
   { value: "eq", label: "Equal To", symbol: "=" },
   { value: "between", label: "Between", symbol: "↔" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
   { value: "all", label: "All" },
   { value: "new", label: "New" },
   { value: "returning", label: "Returning" },
];

type EntityOption = { id: string; label: string };

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
   <Typography
      variant="subtitle2"
      sx={{
         fontWeight: 700,
         fontSize: "0.85rem",
         letterSpacing: "0.03em",
         textTransform: "uppercase",
         color: "text.primary",
         mb: 1.5,
      }}
   >
      {children}
   </Typography>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
   <Typography
      variant="body2"
      sx={{
         fontSize: "0.8125rem",
         fontWeight: 600,
         color: "text.secondary",
         letterSpacing: "0.01em",
      }}
   >
      {children}
   </Typography>
);

const FieldError = ({ message }: { message?: string }) =>
   message ? (
      <Typography
         variant="caption"
         color="error.main"
         sx={{ fontSize: "0.75rem", mt: 0.5, display: "block" }}
      >
         {message}
      </Typography>
   ) : null;

/** Operator selector adornment powered by reusable CustomAutocomplete */
interface RangeFilterFieldProps {
   label: string;
   range: NumericRange;
   onChange: (r: NumericRange) => void;
   integer?: boolean;
   placeholder: string;
   prefixAdornment?: string;
   suffixAdornment?: string;
   error?: string;
}

const RangeFilterField = ({
   label,
   range,
   onChange,
   integer = false,
   placeholder,
   prefixAdornment,
   suffixAdornment,
   error,
}: RangeFilterFieldProps) => {
   const isBetween = range.op === "between";
   const activeOp =
      OP_OPTIONS.find((o) => o.value === range.op) || OP_OPTIONS[0];

   const operatorControl = (
      <InputAdornment
         position="start"
         sx={{ mr: 0.5 }}
         onClick={(e) => e.stopPropagation()}
         onMouseDown={(e) => e.stopPropagation()}
      >
         <CustomAutocomplete
            size="small"
            arrow={true}
            options={OP_OPTIONS}
            value={activeOp}
            onChange={(val: any) => {
               if (val && typeof val === "object" && val.value) {
                  onChange({ ...range, op: val.value });
               }
            }}
            getOptionLabel={(opt: any) => opt?.symbol || ""}
            isOptionEqualToValue={(opt: any, val: any) =>
               opt.value === (val?.value || val)
            }
            renderOption={(props: any, option: any) => {
               const { key, ...otherProps } = props;
               return (
                  <Box
                     component="li"
                     key={key || option.value}
                     {...otherProps}
                     sx={{
                        display: "flex !important",
                        alignItems: "center",
                        gap: 1.25,
                        py: 0.75,
                        px: 1.25,
                        fontSize: "0.85rem",
                     }}
                  >
                     <Box
                        component="span"
                        sx={{
                           width: 22,
                           height: 22,
                           display: "inline-flex",
                           alignItems: "center",
                           justifyContent: "center",
                           borderRadius: 0.75,
                           bgcolor: (theme) =>
                              alpha(theme.palette.text.primary, 0.08),
                           fontWeight: 700,
                           fontSize: "0.85rem",
                           color: "primary.main",
                        }}
                     >
                        {option.symbol}
                     </Box>
                     <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {option.label}
                     </Typography>
                  </Box>
               );
            }}
            componentsProps={{
               popper: {
                  style: {
                     minWidth: 220,
                     width: "max-content",
                     zIndex: 1400,
                  },
               },
            }}
            slotProps={{
               popper: {
                  style: {
                     minWidth: 220,
                     width: "max-content",
                     zIndex: 1400,
                  },
               },
            }}
            sx={{
               width: 52,
               minWidth: 52,
               "& .MuiOutlinedInput-notchedOutline": {
                  border: "none !important",
               },
               "& .MuiOutlinedInput-root": {
                  p: "0 !important",
                  paddingTop: "0 !important",
                  paddingBottom: "0 !important",
                  paddingLeft: "0 !important",
                  paddingRight: "22px !important",
                  minHeight: "unset !important",
                  height: "28px !important",
                  cursor: "pointer",
                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                  borderRadius: "6px",
                  transition: "all 0.15s ease",
                  "&:hover": {
                     bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
                  },
                  "&.Mui-focused": {
                     bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  },
               },
               "& .MuiOutlinedInput-input": {
                  p: "0 0 0 6px !important",
                  width: "18px !important",
                  textAlign: "center",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  color: "text.primary",
                  userSelect: "none",
               },
               "& .MuiAutocomplete-endAdornment": {
                  position: "absolute !important",
                  right: "2px !important",
                  top: "50% !important",
                  transform: "translateY(-50%) !important",
               },
               "& .MuiAutocomplete-popupIndicator": {
                  p: "2px !important",
                  color: "text.secondary",
                  "&:hover": {
                     color: "text.primary",
                  },
                  "& .MuiSvgIcon-root": {
                     fontSize: "1rem",
                  },
               },
            }}
         />
         <Divider
            orientation="vertical"
            flexItem
            sx={{
               height: 18,
               alignSelf: "center",
               mx: 0.75,
               borderColor: "divider",
            }}
         />
         {prefixAdornment && (
            <Typography
               variant="body2"
               sx={{
                  fontWeight: 600,
                  color: "text.secondary",
                  userSelect: "none",
                  fontSize: "0.875rem",
                  pr: 0.25,
               }}
            >
               {prefixAdornment}
            </Typography>
         )}
      </InputAdornment>
   );

   const endAdornmentControl = suffixAdornment ? (
      <InputAdornment position="end" sx={{ mr: 0.25 }}>
         <Typography
            variant="caption"
            sx={{
               fontWeight: 600,
               color: "text.secondary",
               bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
               px: 0.75,
               py: 0.25,
               borderRadius: 0.75,
               fontSize: "0.75rem",
               userSelect: "none",
            }}
         >
            {suffixAdornment}
         </Typography>
      </InputAdornment>
   ) : undefined;

   return (
      <Stack spacing={0.75}>
         <FieldLabel>{label}</FieldLabel>

         {!isBetween ? (
            <TextField
               size="small"
               type="number"
               fullWidth
               placeholder={placeholder}
               value={range.value}
               onChange={(e) => onChange({ ...range, value: e.target.value })}
               error={Boolean(error)}
               inputProps={{ min: 0, step: integer ? 1 : "0.01" }}
               InputProps={{
                  startAdornment: operatorControl,
                  endAdornment: endAdornmentControl,
               }}
            />
         ) : (
            <Stack direction="row" spacing={1} alignItems="center">
               <TextField
                  size="small"
                  type="number"
                  placeholder="Min"
                  value={range.value}
                  onChange={(e) =>
                     onChange({ ...range, value: e.target.value })
                  }
                  error={Boolean(error)}
                  inputProps={{ min: 0, step: integer ? 1 : "0.01" }}
                  InputProps={{
                     startAdornment: operatorControl,
                     endAdornment: endAdornmentControl,
                  }}
                  sx={{ flex: 1 }}
               />
               <Typography
                  variant="caption"
                  sx={{
                     color: "text.secondary",
                     fontWeight: 600,
                     userSelect: "none",
                     px: 0.25,
                  }}
               >
                  to
               </Typography>
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
                  InputProps={{
                     startAdornment: prefixAdornment ? (
                        <InputAdornment position="start" sx={{ mr: 0.5 }}>
                           <Typography
                              variant="body2"
                              sx={{
                                 fontWeight: 600,
                                 color: "text.secondary",
                                 userSelect: "none",
                                 fontSize: "0.875rem",
                              }}
                           >
                              {prefixAdornment}
                           </Typography>
                        </InputAdornment>
                     ) : undefined,
                     endAdornment: endAdornmentControl,
                  }}
                  sx={{ flex: 1 }}
               />
            </Stack>
         )}

         <FieldError message={error} />
      </Stack>
   );
};

/** Label row with compact, neatly aligned Exclude checkbox on the right. */
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
      sx={{ minHeight: 22 }}
   >
      <FieldLabel>{label}</FieldLabel>
      <FormControlLabel
         control={
            <Checkbox
               size="small"
               checked={exclude}
               onChange={(e) => onExcludeChange(e.target.checked)}
               sx={{
                  p: 0.25,
                  color: "text.secondary",
                  "&.Mui-checked": {
                     color: "warning.main",
                  },
               }}
            />
         }
         label={
            <Typography
               variant="caption"
               sx={{
                  fontSize: "0.75rem",
                  fontWeight: exclude ? 600 : 400,
                  color: exclude ? "warning.main" : "text.secondary",
                  userSelect: "none",
               }}
            >
               Exclude
            </Typography>
         }
         sx={{ m: 0, gap: 0.5 }}
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
         } catch {
            /* facet unavailable — field shows no options */
         }
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
         } catch {
            /* ignore */
         }
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
         } catch {
            /* employee field stays hidden without user access */
         }
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
      } catch {
         /* keep previous options */
      }
   };

   useEffect(() => {
      searchProducts("");
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   return (
      <Stack spacing={2.5}>
         {/* SECTION 1: STATUS & DATES */}
         <Box>
            <SectionTitle>Customer Status & Dates</SectionTitle>
            <Grid container spacing={2}>
               {/* Customer Status: Replaced ButtonGroup with searchable Autocomplete */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.75}>
                     <FieldLabel>Customer Status</FieldLabel>
                     <CustomAutocomplete
                        size="small"
                        arrow={true}
                        placeholder="All"
                        options={STATUS_OPTIONS.map((o) => o.label)}
                        value={
                           STATUS_OPTIONS.find((o) => o.value === value.status)
                              ?.label || "All"
                        }
                        onChange={(v: any) => {
                           const found = STATUS_OPTIONS.find(
                              (o) => o.label === v,
                           );
                           set({
                              status: (found
                                 ? found.value
                                 : "all") as StatusFilter,
                           });
                        }}
                     />
                     <Typography
                        variant="caption"
                        sx={{
                           color: "text.secondary",
                           fontSize: "0.72rem",
                           lineHeight: 1.25,
                           mt: 0.25,
                        }}
                     >
                        New = 1 or fewer valid orders · Returning = more than 1
                     </Typography>
                  </Stack>
               </Grid>

               {/* Registration Date */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.75}>
                     <FieldLabel>Registration Date</FieldLabel>
                     <Box sx={{ width: "100%", "& > *": { width: "100%" } }}>
                        <DateRange
                           size="small"
                           title="All Time"
                           value={value.regRange}
                           onChange={(range) =>
                              set({
                                 regRange: range,
                                 regPreset:
                                    range[0] && range[1] ? "custom" : "all",
                              })
                           }
                        />
                     </Box>
                     <FieldError message={err("reg")} />
                  </Stack>
               </Grid>

               {/* Last Order Date */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.75}>
                     <FieldLabel>Last Order Date</FieldLabel>
                     <Box sx={{ width: "100%", "& > *": { width: "100%" } }}>
                        <DateRange
                           size="small"
                           title="Any Time"
                           value={value.lastRange}
                           onChange={(range) =>
                              set({
                                 lastRange: range,
                                 lastPreset:
                                    range[0] && range[1] ? "custom" : "all",
                              })
                           }
                        />
                     </Box>
                     <FieldError message={err("last")} />
                  </Stack>
               </Grid>
            </Grid>
         </Box>

         <Divider
            sx={{
               borderColor: (theme) => alpha(theme.palette.divider, 0.08),
            }}
         />

         {/* SECTION 2: ORDER & AMOUNT RANGES */}
         <Box>
            <SectionTitle>Order & Amount Ranges</SectionTitle>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <RangeFilterField
                     label="Total Orders"
                     integer
                     placeholder="Enter quantity"
                     range={value.orders}
                     onChange={(r) => set({ orders: r })}
                     error={err("orders")}
                  />
               </Grid>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <RangeFilterField
                     label="Total Purchase"
                     placeholder="Amount"
                     prefixAdornment={currencySymbol}
                     range={value.purchase}
                     onChange={(r) => set({ purchase: r })}
                     error={err("purchase")}
                  />
               </Grid>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <RangeFilterField
                     label="Total Paid"
                     placeholder="Amount"
                     prefixAdornment={currencySymbol}
                     range={value.paid}
                     onChange={(r) => set({ paid: r })}
                     error={err("paid")}
                  />
               </Grid>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <RangeFilterField
                     label="Total Due"
                     placeholder="Amount"
                     prefixAdornment={currencySymbol}
                     range={value.due}
                     onChange={(r) => set({ due: r })}
                     error={err("due")}
                  />
               </Grid>
            </Grid>
         </Box>

         <Divider
            sx={{
               borderColor: (theme) => alpha(theme.palette.divider, 0.08),
            }}
         />

         {/* SECTION 3: ADDITIONAL CUSTOMER FILTERS */}
         <Box>
            <SectionTitle>Additional Customer Filters</SectionTitle>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.75}>
                     <ExcludeLabel
                        label="Order Status"
                        exclude={value.orderStatusExclude}
                        onExcludeChange={(v) =>
                           set({ orderStatusExclude: v })
                        }
                     />
                     <CustomAutocomplete
                        size="small"
                        multiple
                        placeholder={
                           value.orderStatuses.length === 0
                              ? "All statuses"
                              : ""
                        }
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
                  <Stack spacing={0.75}>
                     <ExcludeLabel
                        label="Order Source"
                        exclude={value.orderSourceExclude}
                        onExcludeChange={(v) =>
                           set({ orderSourceExclude: v })
                        }
                     />
                     <CustomAutocomplete
                        size="small"
                        multiple
                        placeholder={
                           value.orderSources.length === 0
                              ? "All sources"
                              : ""
                        }
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
                     suffixAdornment="Qty"
                     range={value.itemQty}
                     onChange={(r) => set({ itemQty: r })}
                     error={err("itemQty")}
                  />
               </Grid>

               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.75}>
                     <FieldLabel>Product</FieldLabel>
                     <CustomAutocomplete
                        size="small"
                        placeholder="Search product..."
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
                        onInputChange={(
                           _: any,
                           term: string,
                           reason: string,
                        ) => {
                           if (reason === "input") searchProducts(term);
                        }}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.75}>
                     <FieldLabel>Product Category</FieldLabel>
                     <CustomAutocomplete
                        size="small"
                        arrow={true}
                        placeholder="Select category..."
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
                     <Stack spacing={0.75}>
                        <FieldLabel>Employee</FieldLabel>
                        <CustomAutocomplete
                           size="small"
                           arrow={true}
                           placeholder="Select employee..."
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
                  <Stack spacing={0.75}>
                     <FieldLabel>BD Mobile Number</FieldLabel>
                     <TextField
                        size="small"
                        fullWidth
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
      </Stack>
   );
};

export default CustomerFilters;
