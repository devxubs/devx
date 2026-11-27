"use client";

import React, { useEffect, useRef, useState } from "react";
import {
   Box,
   Card,
   CardContent,
   Stack,
   Typography,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import SectionResetButton from "./SectionResetButton";
import { orderSources } from "@src/Pages/admin/Order/data";
import {
   ORDER_CREATE_DEFAULT_PRODUCT_ID_KEY,
   ORDER_CREATE_DEFAULT_SOURCE_KEY,
   ORDER_CREATE_DEFAULT_STATUS_KEY,
   ORDER_STATUS_LABELS,
   resolveOrderCreateDefaults,
   statusOptionsFor,
} from "@src/lib/orderStatusDisplay";

interface OrderCreateDefaultsSectionProps {
   values: any;
   onConfigChange: (key: string, value: any) => void;
}

type ProductOption = {
   id: string;
   productName: string;
   productCode?: string | null;
   productSku?: string | null;
   status?: string | null;
};

/**
 * Phase 3 — Order Creation Defaults (rendered inside the Sales
 * & POS tab, under Order Display & Sorting). All three values
 * write through onConfigChange into customConfig and persist via
 * the shared settings Save flow. They apply ONCE when a NEW
 * Order Create form initialises — never on edit, never over a
 * restorable draft, and never re-applied after the employee
 * changes or removes them (see the Publish page effect).
 */
export default function OrderCreateDefaultsSection({
   values,
   onConfigChange,
}: OrderCreateDefaultsSectionProps) {
   const config = values?.customConfig;
   const defaults = resolveOrderCreateDefaults(config);

   // ── Default product (server-searched, like Order Create) ──
   const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
   const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

   const searchProducts = async (query: string) => {
      try {
         const res = await fetch(
            `/api/products?search=${encodeURIComponent(query)}&limit=20`,
         );
         if (!res.ok) return;
         const data = await res.json();
         const list: ProductOption[] = Array.isArray(data.products)
            ? data.products
            : [];
         setProductOptions(
            list.filter((p) => !p.status || p.status === "ACTIVE"),
         );
      } catch {
         /* keep the current options on a failed search */
      }
   };

   // Seed the option list so the configured product renders with
   // its name, and refresh the seed if the configured id changes.
   useEffect(() => {
      let cancelled = false;
      (async () => {
         if (!defaults.productId) {
            searchProducts("");
            return;
         }
         try {
            const res = await fetch(`/api/products/${defaults.productId}`);
            if (!res.ok) return;
            const p = await res.json();
            if (!cancelled && p?.id) {
               setProductOptions((prev) =>
                  prev.some((o) => o.id === p.id) ? prev : [p, ...prev],
               );
            }
         } catch {
            /* an unavailable default simply renders empty */
         }
      })();
      return () => {
         cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [defaults.productId]);

   const selectedProduct =
      productOptions.find((p) => p.id === defaults.productId) || null;

   const statusOptions = statusOptionsFor("create", config);
   const selectedStatus =
      statusOptions.find((o) => o.value === defaults.status) || null;

   return (
      <Card variant="outlined">
         <CardContent>
            <Stack spacing={2.5}>
               <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box>
                     <Typography variant="subtitle1" fontWeight={600}>
                        Order Creation Defaults
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                        Starting values for a NEW order. They are applied once
                        when the Order Create page opens — employees can change
                        or remove them freely, editing an existing order never
                        touches them, and an unavailable default product is
                        skipped rather than forced.
                     </Typography>
                  </Box>
                  <SectionResetButton
                     section="Order Creation Defaults"
                     onReset={() => {
                        onConfigChange(ORDER_CREATE_DEFAULT_PRODUCT_ID_KEY, undefined);
                        onConfigChange(ORDER_CREATE_DEFAULT_SOURCE_KEY, undefined);
                        onConfigChange(ORDER_CREATE_DEFAULT_STATUS_KEY, undefined);
                     }}
                  />
               </Stack>

               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Default Product
                  </Typography>
                  <CustomAutocomplete
                     arrow
                     size="small"
                     options={productOptions}
                     getOptionLabel={(o: any) => o?.productName || ""}
                     isOptionEqualToValue={(a: any, b: any) => a?.id === b?.id}
                     value={selectedProduct}
                     onChange={(_: any, next: any) =>
                        onConfigChange(
                           ORDER_CREATE_DEFAULT_PRODUCT_ID_KEY,
                           next?.id || undefined,
                        )
                     }
                     onInputChange={(_: any, input: string, reason: string) => {
                        if (reason !== "input") return;
                        if (searchTimer.current) clearTimeout(searchTimer.current);
                        searchTimer.current = setTimeout(
                           () => searchProducts(input),
                           300,
                        );
                     }}
                     placeholder="Search products…"
                  />
               </Stack>

               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Default Source
                  </Typography>
                  <CustomAutocomplete
                     arrow
                     size="small"
                     options={orderSources}
                     value={defaults.source}
                     onChange={(_: any, next: any) =>
                        onConfigChange(
                           ORDER_CREATE_DEFAULT_SOURCE_KEY,
                           next || undefined,
                        )
                     }
                     placeholder="Select source"
                  />
               </Stack>

               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Default Status
                  </Typography>
                  <CustomAutocomplete
                     arrow
                     size="small"
                     options={statusOptions}
                     getOptionLabel={(o: any) => o?.label || ""}
                     isOptionEqualToValue={(a: any, b: any) => a?.value === b?.value}
                     value={selectedStatus}
                     onChange={(_: any, next: any) =>
                        onConfigChange(
                           ORDER_CREATE_DEFAULT_STATUS_KEY,
                           next?.value || undefined,
                        )
                     }
                     placeholder="Select status"
                  />
                  <Typography variant="caption" color="text.secondary">
                     Only statuses visible in Create pickers (Phase 2) can be
                     a default. If the default is later hidden, new orders
                     fall back to{" "}
                     {ORDER_STATUS_LABELS.PENDING} or the first visible
                     status.
                  </Typography>
               </Stack>
            </Stack>
         </CardContent>
      </Card>
   );
}
