"use client";

// Order Create (upgrade) — Product Search.
// Async autocomplete over GET /api/products?search= (name / SKU / code /
// barcode on the server). Shows thumbnail, name, SKU, stock + unit and the
// selling price in BDT. Out-of-stock products are visible but disabled.
import {
   Autocomplete,
   Avatar,
   Box,
   CircularProgress,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@src/components/Icon";
import { formatBDT, num } from "./orderCalculations";
import type { ApiProduct } from "./types";

interface ProductSearchProps {
   searchProducts: (query: string) => Promise<ApiProduct[]>;
   /** Returns an error message to surface, or null when added silently. */
   onAdd: (product: ApiProduct) => string | null;
   currencySymbol?: string;
}

const ProductSearch = ({ searchProducts, onAdd, currencySymbol = "৳" }: ProductSearchProps) => {
   const [options, setOptions] = useState<ApiProduct[]>([]);
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
               const results = await searchProducts(query);
               if (req === requestRef.current) setOptions(results);
            } finally {
               if (req === requestRef.current) setLoading(false);
            }
         }, 300);
      },
      [searchProducts],
   );

   useEffect(() => {
      runSearch("");
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   return (
      <Autocomplete<ApiProduct>
         options={options}
         loading={loading}
         value={null}
         blurOnSelect
         inputValue={inputValue}
         onInputChange={(_, value, reason) => {
            setInputValue(value);
            if (reason === "input") runSearch(value);
         }}
         onChange={(_, value) => {
            if (value) {
               onAdd(value);
               setInputValue("");
            }
         }}
         getOptionLabel={(o) => o.productName || ""}
         isOptionEqualToValue={(o, v) => o.id === v.id}
         getOptionDisabled={(o) => num(o.quantity) <= 0}
         noOptionsText={loading ? "Searching…" : "No product found"}
         renderOption={(props, option) => {
            const price = num(option.salePrice ?? option.regularPrice);
            const stock = num(option.quantity);
            const image = Array.isArray(option.images) ? option.images[0] : null;
            return (
               <li {...props} key={option.id}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: "100%", py: 0.25 }}>
                     {image ? (
                        <Avatar src={image} variant="rounded" sx={{ width: 34, height: 34 }} />
                     ) : (
                        <Avatar variant="rounded" sx={{ width: 34, height: 34 }}>
                           <Icon icon="solar:box-linear" size="18px" />
                        </Avatar>
                     )}
                     <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                           {option.productName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                           SKU: {option.productSku || option.productCode || "—"} ·{" "}
                           {stock > 0 ? `${stock} ${option.salesUnit || option.baseUnit || "Piece"} in stock` : "Out of stock"}
                        </Typography>
                     </Box>
                     <Typography variant="body2" fontWeight={600}>
                        {formatBDT(price, currencySymbol)}
                     </Typography>
                  </Stack>
               </li>
            );
         }}
         renderInput={(params) => (
            <TextField
               {...params}
               label="Search product (name or SKU)"
               placeholder="Start typing to search products…"
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
   );
};

export default ProductSearch;
