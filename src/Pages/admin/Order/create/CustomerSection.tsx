"use client";

// Order Create (upgrade) — Customer Selection.
// Searchable autocomplete (name / phone / email via GET /api/customers?search=)
// that fills the manual fields and stores the real customer id for submission.
// Manual entry stays available (walk-in / new customer — the order API reuses
// an existing customer by phone or creates one, as before).
import {
   Button,
   Grid,
   Stack,
   TextField,
   Typography,
   Box,
   useTheme,
} from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import SectionCard from "./SectionCard";
import type { ApiCustomer, CustomerFormState } from "./types";

interface CustomerSectionProps {
   customer: CustomerFormState;
   onChange: (customer: CustomerFormState) => void;
   searchCustomers: (query: string) => Promise<ApiCustomer[]>;
}

const CustomerSection = ({
   customer,
   onChange,
   searchCustomers,
}: CustomerSectionProps) => {
   const theme = useTheme();
   const [options, setOptions] = useState<ApiCustomer[]>([]);
   const [loading, setLoading] = useState(false);
   const [inputValue, setInputValue] = useState("");
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
      const identityTouched =
         "name" in partial || "phone" in partial || "email" in partial;
      onChange({
         ...customer,
         ...partial,
         id: identityTouched ? null : customer.id,
      });
   };

   return (
      <SectionCard
         title="Customer Details"
         subtitle="Search an existing customer, or enter details for a walk-in / new customer"
      >
         <Stack direction="column" spacing={1.5}>
            <CustomAutocomplete
               options={options}
               loading={loading}
               value={null}
               inputValue={inputValue}
               onInputChange={(_, value, reason) => {
                  setInputValue(value);
                  if (reason === "input") runSearch(value);
               }}
               onChange={(value) => {
                  if (value) {
                     applyCustomer(value);
                     setInputValue("");
                  }
               }}
               getOptionLabel={(o) => o.name || ""}
               isOptionEqualToValue={(o, v) => o.id === v.id}
               noOptionsText={
                  loading
                     ? "Searching…"
                     : "No customer found — enter details below"
               }
               placeholder="Search customer by name, phone or email…"
               size="small"
               freeSolo={false}
               renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                     <Stack spacing={0} sx={{ py: 0.25, width: "100%" }}>
                        <Typography variant="body2" fontWeight={600}>
                           {option.name}
                           {option.customId ? (
                              <Typography
                                 component="span"
                                 variant="caption"
                                 color="textSecondary"
                              >
                                 {"  "}({option.customId})
                              </Typography>
                           ) : null}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                           {[option.phone, option.email]
                              .filter(Boolean)
                              .join(" · ") || "No phone / email on record"}
                        </Typography>
                     </Stack>
                  </li>
               )}
            />
            {customer.id && (
               <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ bgcolor: "action.hover", px: 1.5, py: 0.75, borderRadius: 1 }}>
                  <Typography variant="caption" color="textPrimary" fontWeight={600}>
                     Linked customer: {customer.name} {customer.phone ? `(${customer.phone})` : ""}
                  </Typography>
                  <Button
                     size="small"
                     color="error"
                     variant="text"
                     sx={{ textTransform: "none", minWidth: 0, p: 0, fontSize: "0.75rem" }}
                     onClick={() =>
                        onChange({
                           id: null,
                           name: "",
                           email: "",
                           phone: "",
                           address: "",
                        })
                     }
                  >
                     Clear selection
                  </Button>
               </Stack>
            )}
         </Stack>
         <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
               <TextField
                  label="Full Name *"
                  fullWidth
                  size="small"
                  value={customer.name}
                  onChange={(e) => patchManual({ name: e.target.value })}
                  placeholder="Customer name"
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
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
            <Grid size={{ xs: 12, sm: 6 }}>
               <TextField
                  label="E-mail"
                  fullWidth
                  size="small"
                  value={customer.email}
                  onChange={(e) => patchManual({ email: e.target.value })}
                  placeholder="customer@mail.com"
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
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
      </SectionCard>
   );
};

export default CustomerSection;
