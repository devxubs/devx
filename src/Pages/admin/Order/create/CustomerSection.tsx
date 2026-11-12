"use client";

// Order Create (upgrade) — Customer Selection.
// Searchable autocomplete (name / phone / email via GET /api/customers?search=)
// that fills the manual fields and stores the real customer id for submission.
// Manual entry stays available (walk-in / new customer — the order API reuses
// an existing customer by phone or creates one, as before).
import {
   Autocomplete,
   Button,
   CircularProgress,
   Grid,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@src/components/Icon";
import SectionCard from "./SectionCard";
import AddCustomerModal from "./AddCustomerModal";
import type { ApiCustomer, CustomerFormState } from "./types";

interface CustomerSectionProps {
   customer: CustomerFormState;
   onChange: (customer: CustomerFormState) => void;
   searchCustomers: (query: string) => Promise<ApiCustomer[]>;
}

const CustomerSection = ({ customer, onChange, searchCustomers }: CustomerSectionProps) => {
   const [options, setOptions] = useState<ApiCustomer[]>([]);
   const [loading, setLoading] = useState(false);
   const [inputValue, setInputValue] = useState("");
   const [modalOpen, setModalOpen] = useState(false);
   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const requestRef = useRef(0);

   const runSearch = useCallback(
      (query: string) => {
         if (debounceRef.current) clearTimeout(debounceRef.current);
         debounceRef.current = setTimeout(async () => {
            const req = ++requestRef.current;
            setLoading(true);
            try {
               const results = await searchCustomers(query);
               if (req === requestRef.current) setOptions(results);
            } finally {
               if (req === requestRef.current) setLoading(false);
            }
         }, 300);
      },
      [searchCustomers],
   );

   useEffect(() => {
      runSearch("");
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   const applyCustomer = (c: ApiCustomer) => {
      onChange({
         id: c.id,
         name: c.name || "",
         email: c.email || "",
         phone: c.phone || "",
         address: c.address || "",
      });
   };

   /** Editing identity fields manually detaches the picked customer id. */
   const patchManual = (partial: Partial<CustomerFormState>) => {
      const identityTouched = "name" in partial || "phone" in partial || "email" in partial;
      onChange({ ...customer, ...partial, id: identityTouched ? null : customer.id });
   };

   return (
      <SectionCard
         title="Customer Details"
         subtitle="Search an existing customer, or type details for a walk-in / new customer"
         action={
            <Button
               size="small"
               variant="outlined"
               color="primary"
               startIcon={<Icon icon="solar:user-plus-bold" size="16px" />}
               onClick={() => setModalOpen(true)}
               sx={{
                  textTransform: "none",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  px: 1.75,
                  py: 0.75,
                  fontWeight: 600,
                  "& .MuiButton-startIcon": { mr: 0.75, color: "primary.main" },
               }}
            >
               Add Customer
            </Button>
         }
      >
         <Autocomplete<ApiCustomer>
            options={options}
            loading={loading}
            value={null}
            inputValue={inputValue}
            onInputChange={(_, value, reason) => {
               setInputValue(value);
               if (reason === "input") runSearch(value);
            }}
            onChange={(_, value) => {
               if (value) {
                  applyCustomer(value);
                  setInputValue("");
               }
            }}
            getOptionLabel={(o) => o.name || ""}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            noOptionsText={loading ? "Searching…" : "No customer found — type details below or use Add Customer"}
            renderOption={(props, option) => (
               <li {...props} key={option.id}>
                  <Stack spacing={0} sx={{ py: 0.25 }}>
                     <Typography variant="body2" fontWeight={600}>
                        {option.name}
                        {option.customId ? (
                           <Typography component="span" variant="caption" color="textSecondary">
                              {"  "}({option.customId})
                           </Typography>
                        ) : null}
                     </Typography>
                     <Typography variant="caption" color="textSecondary">
                        {[option.phone, option.email].filter(Boolean).join(" · ") || "No phone / email on record"}
                     </Typography>
                  </Stack>
               </li>
            )}
            renderInput={(params) => (
               <TextField
                  {...params}
                  label="Search customer (name, phone or email)"
                  placeholder="Start typing to search…"
                  size="small"
                  InputProps={{
                     ...params.InputProps,
                     endAdornment: (
                        <>
                           {loading ? <CircularProgress size={16} /> : null}
                           {params.InputProps.endAdornment}
                        </>
                     ),
                  }}
               />
            )}
         />
         {customer.id && (
            <Stack direction="row" alignItems="center" spacing={1}>
               <Icon icon="solar:check-circle-bold" size="15px" style={{ color: "#00A76F" }} />
               <Typography variant="caption" color="textSecondary">
                  Linked to an existing customer record. Clearing name/phone/email switches back to manual entry.
               </Typography>
               <Button
                  size="small"
                  variant="text"
                  sx={{ textTransform: "none", minWidth: 0, p: 0.25 }}
                  onClick={() => onChange({ id: null, name: "", email: "", phone: "", address: "" })}
               >
                  Clear selection
               </Button>
            </Stack>
         )}
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  label="Full Name *"
                  fullWidth
                  size="small"
                  value={customer.name}
                  onChange={(e) => patchManual({ name: e.target.value })}
                  placeholder="Customer name"
               />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  label="Phone Number *"
                  fullWidth
                  size="small"
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => patchManual({ phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
               />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  label="E-mail"
                  fullWidth
                  size="small"
                  value={customer.email}
                  onChange={(e) => patchManual({ email: e.target.value })}
                  placeholder="customer@mail.com"
               />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  label="Billing Address"
                  fullWidth
                  size="small"
                  value={customer.address}
                  onChange={(e) => patchManual({ address: e.target.value })}
                  placeholder="Street, City, District"
               />
            </Grid>
         </Grid>
         <AddCustomerModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onCreated={applyCustomer}
         />
      </SectionCard>
   );
};

export default CustomerSection;
