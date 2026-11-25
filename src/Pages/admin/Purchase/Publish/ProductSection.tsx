"use client";

// Purchase Create (redesign) — product search + purchase items table.
//
// Search matches name, SKU/code, product barcode and variant
// SKU/barcode, and each result shows the purchase price and the
// available stock. The picker is multi-select over product options
// and the form's line list is kept in sync with the selection, so a
// product can never be added twice by accident — re-selecting it is
// a no-op, and removing it from the picker removes its line (the
// row's remove button does the same). Variable products keep the
// established one-row-per-product model with a per-line variant
// picker (INV-02); the variant's stock, SKU and barcode follow the
// selection exactly as before.

import {
   FormControl,
   IconButton,
   MenuItem,
   Paper,
   Select,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableContainer,
   TableHead,
   TableRow as TableRowMUI,
   TextField,
   Typography,
   alpha,
   useTheme,
} from "@mui/material";
import React from "react";
import { Controller } from "react-hook-form";
import Icon from "@src/components/Icon";
import Barcode from "@src/components/Barcode";
import CustomAutocomplete from "@src/components/Autocomplete";
import { useSettings } from "@src/lib/settingsContext";
import type { ProductOption } from "./index";
import { lineSubtotal, lineValidation } from "./calculations";

interface ProductSectionProps {
   control: any;
   errors: any;
   productOptions: ProductOption[];
}

const productStock = (option?: ProductOption | null): number | null => {
   if (!option) return null;
   if (option.variants && option.variants.length > 0) {
      return option.variants.reduce(
         (sum, v) => sum + (Number(v.quantity) || 0),
         0,
      );
   }
   return Number(option.quantity) || 0;
};

const ProductSection = ({
   control,
   errors,
   productOptions,
}: ProductSectionProps) => {
   const theme = useTheme();
   const { formatCurrency } = useSettings();

   return (
      <Controller
         name="product"
         control={control}
         render={({ field }) => {
            const lines: any[] = field.value || [];
            const lineProductId = (line: any) => line.productId || line.id;
            const selectedOptions = productOptions.filter((o) =>
               lines.some((l) => lineProductId(l) === o.id),
            );

            const syncSelection = (options: ProductOption[]) => {
               const next = options.map((opt) => {
                  const existing = lines.find(
                     (l) => lineProductId(l) === opt.id,
                  );
                  if (existing) return existing;
                  return {
                     id: opt.id,
                     productId: opt.id,
                     variantId: null,
                     variantName: null,
                     variants: opt.variants || [],
                     name: opt.name,
                     code: opt.code,
                     barcode: opt.barcode || null,
                     quantity: 1,
                     price: opt.price,
                  };
               });
               field.onChange(next);
            };

            const updateLine = (idx: number, patch: Record<string, any>) => {
               const updated = [...lines];
               updated[idx] = { ...updated[idx], ...patch };
               field.onChange(updated);
            };

            return (
               <Stack spacing={2}>
                  <CustomAutocomplete
                     value={selectedOptions}
                     onChange={(val: any) =>
                        syncSelection(
                           Array.isArray(val) ? val : val ? [val] : [],
                        )
                     }
                     error={!!errors.product?.message}
                     helperText={
                        errors.product?.message ||
                        "Search by product name, SKU or barcode. Selecting a product adds one row — it can't be added twice, and an added product is disabled in this list so a stray click can't remove its row."
                     }
                     arrow
                     option={productOptions}
                     placeholder="Search product..."
                     label="Search"
                     multiple
                     getOptionLabel={(option: any) =>
                        typeof option === "string"
                           ? option
                           : option?.name || ""
                     }
                     isOptionEqualToValue={(option: any, value: any) =>
                        option?.id === value?.id
                     }
                     getOptionDisabled={(option: any) =>
                        // An already-added product is disabled in the
                        // results: MUI's default multi-select toggles a
                        // selected option OFF on click, which silently
                        // discarded the row and its edited quantity /
                        // price (found in live verification). Removal
                        // stays deliberate — the row's remove button or
                        // the chip's ×.
                        lines.some((l) => lineProductId(l) === option?.id)
                     }
                     filterOptions={(options: any[], state: any) => {
                        const q = (state.inputValue || "")
                           .trim()
                           .toLowerCase();
                        if (!q) return options;
                        return options.filter((o: any) => {
                           if (
                              [o.name, o.code, o.barcode]
                                 .filter(Boolean)
                                 .some((v: string) =>
                                    v.toLowerCase().includes(q),
                                 )
                           ) {
                              return true;
                           }
                           return (o.variants || []).some((v: any) =>
                              [v.sku, v.barcode, v.variantName]
                                 .filter(Boolean)
                                 .some((s: string) =>
                                    s.toLowerCase().includes(q),
                                 ),
                           );
                        });
                     }}
                     renderOption={(props: any, option: any) => {
                        const stock = productStock(option);
                        return (
                           <li {...props} key={option.id}>
                              <Stack
                                 direction="row"
                                 justifyContent="space-between"
                                 alignItems="center"
                                 sx={{ width: "100%" }}
                                 spacing={2}
                              >
                                 <Stack sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" noWrap>
                                       {option.name}
                                    </Typography>
                                    <Typography
                                       variant="caption"
                                       color="text.secondary"
                                    >
                                       SKU: {option.code || "—"}
                                       {option.barcode
                                          ? ` · Barcode: ${option.barcode}`
                                          : ""}
                                    </Typography>
                                 </Stack>
                                 <Stack alignItems="flex-end">
                                    <Typography variant="body2" fontWeight={600}>
                                       {formatCurrency(Number(option.price) || 0)}
                                    </Typography>
                                    <Typography
                                       variant="caption"
                                       color="text.secondary"
                                    >
                                       Stock: {stock ?? "—"}
                                    </Typography>
                                 </Stack>
                              </Stack>
                           </li>
                        );
                     }}
                     limitTags={1}
                  />

                  {!lines.length ? (
                     <Stack
                        alignItems="center"
                        justifyContent="center"
                        p={3}
                        sx={{
                           color: theme.palette.text.secondary,
                           border: `1px dashed ${theme.palette.divider}`,
                           borderRadius: 1.5,
                        }}
                     >
                        <Typography variant="body2">
                           No products added yet — search above to add items.
                        </Typography>
                     </Stack>
                  ) : (
                     <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{
                           maxHeight: 380,
                           overflowY: "auto",
                           scrollbarWidth: "none!important",
                           backgroundColor: alpha(
                              theme.palette.grey[400],
                              0.06,
                           ),
                           "&::-webkit-scrollbar": { display: "none" },
                        }}
                     >
                        <Table stickyHeader sx={{ minWidth: 640 }}>
                           <TableHead
                              sx={{
                                 "& th": {
                                    backgroundColor: theme.palette.grey[200],
                                    fontWeight: 600,
                                    ...theme.applyStyles("dark", {
                                       backgroundColor: theme.palette.grey[800],
                                    }),
                                 },
                              }}
                           >
                              <TableRowMUI>
                                 <TableCell>Product</TableCell>
                                 <TableCell align="left">Stock</TableCell>
                                 <TableCell align="left">Qty</TableCell>
                                 <TableCell align="left">
                                    Purchase Price
                                 </TableCell>
                                 <TableCell align="right">Line Total</TableCell>
                                 <TableCell align="left"></TableCell>
                              </TableRowMUI>
                           </TableHead>
                           <TableBody>
                              {lines.map((row: any, idx: number) => {
                                 const opt = productOptions.find(
                                    (o) => o.id === lineProductId(row),
                                 );
                                 const lineVariants: any[] =
                                    row.variants?.length
                                       ? row.variants
                                       : opt?.variants || [];
                                 const chosenVariant = lineVariants.find(
                                    (v: any) => v.id === row.variantId,
                                 );
                                 const stock = chosenVariant
                                    ? Number(chosenVariant.quantity) || 0
                                    : productStock(opt);
                                 const live = lineValidation(row);
                                 const yupQty =
                                    errors.product?.[idx]?.quantity?.message;
                                 const yupPrice =
                                    errors.product?.[idx]?.price?.message;
                                 return (
                                    <TableRowMUI key={row.productId || row.id || idx}>
                                       <TableCell>
                                          <Stack spacing={0.5}>
                                             <Typography variant="body2" fontWeight={500}>
                                                {row.name}
                                             </Typography>
                                             {row.code && (
                                                <Typography
                                                   variant="caption"
                                                   color="text.secondary"
                                                >
                                                   SKU: {row.code}
                                                </Typography>
                                             )}
                                             {lineVariants.length > 0 ? (
                                                <FormControl
                                                   size="small"
                                                   sx={{ minWidth: 170, maxWidth: 230 }}
                                                >
                                                   <Select
                                                      value={row.variantId || ""}
                                                      displayEmpty
                                                      onChange={(e) => {
                                                         const v = lineVariants.find(
                                                            (x: any) =>
                                                               x.id ===
                                                               String(e.target.value),
                                                         );
                                                         updateLine(idx, {
                                                            variantId: v ? v.id : null,
                                                            variantName: v
                                                               ? v.variantName
                                                               : null,
                                                            barcode: v
                                                               ? v.barcode || opt?.barcode || null
                                                               : opt?.barcode || null,
                                                            code: v
                                                               ? v.sku
                                                               : row.code,
                                                            price: v
                                                               ? Number(v.costPrice) || row.price
                                                               : row.price,
                                                         });
                                                      }}
                                                      sx={{
                                                         height: 28,
                                                         fontSize: "0.78rem",
                                                         "& .MuiSelect-select": {
                                                            py: "3px",
                                                         },
                                                      }}
                                                      renderValue={(selected) => {
                                                         if (!selected) {
                                                            return (
                                                               <Typography
                                                                  variant="body2"
                                                                  color="warning.main"
                                                                  fontSize="0.78rem"
                                                               >
                                                                  Select variant
                                                               </Typography>
                                                            );
                                                         }
                                                         const v = lineVariants.find(
                                                            (x: any) => x.id === selected,
                                                         );
                                                         return v
                                                            ? `${v.variantName} (${v.sku})`
                                                            : row.variantName || "Select variant";
                                                      }}
                                                   >
                                                      {lineVariants.map((v: any) => {
                                                         const attrs = v.attributes
                                                            ? Object.values(v.attributes)
                                                                 .filter(Boolean)
                                                                 .join(" · ")
                                                            : "";
                                                         return (
                                                            <MenuItem key={v.id} value={v.id}>
                                                               <Stack>
                                                                  <Typography variant="body2">
                                                                     {v.variantName}
                                                                     {attrs ? ` — ${attrs}` : ""}
                                                                  </Typography>
                                                                  <Typography
                                                                     variant="caption"
                                                                     color="text.secondary"
                                                                  >
                                                                     SKU: {v.sku} · Stock:{" "}
                                                                     {Number(v.quantity) || 0}
                                                                  </Typography>
                                                               </Stack>
                                                            </MenuItem>
                                                         );
                                                      })}
                                                   </Select>
                                                </FormControl>
                                             ) : row.variantName ? (
                                                <Typography
                                                   variant="caption"
                                                   color="primary.main"
                                                   fontWeight={600}
                                                >
                                                   Variant: {row.variantName}
                                                </Typography>
                                             ) : null}
                                             {row.barcode && (
                                                <Stack spacing={0.25} sx={{ pt: 0.5 }}>
                                                   <Barcode
                                                      value={row.barcode}
                                                      height={18}
                                                      moduleWidth={0.7}
                                                      showText={false}
                                                   />
                                                   <Typography
                                                      variant="caption"
                                                      color="text.secondary"
                                                      sx={{ fontFamily: "monospace" }}
                                                   >
                                                      {row.barcode}
                                                   </Typography>
                                                </Stack>
                                             )}
                                          </Stack>
                                       </TableCell>
                                       <TableCell align="left">
                                          <Typography variant="body2">
                                             {stock ?? "—"}
                                          </Typography>
                                       </TableCell>
                                       <TableCell align="left">
                                          <TextField
                                             type="number"
                                             size="small"
                                             value={row.quantity}
                                             error={Boolean(live.quantityError || yupQty)}
                                             helperText={live.quantityError || yupQty || undefined}
                                             onChange={(e) => {
                                                const raw = e.target.value;
                                                updateLine(idx, {
                                                   quantity:
                                                      raw === ""
                                                         ? 0
                                                         : parseInt(raw, 10) || 0,
                                                });
                                             }}
                                             sx={{ width: 84 }}
                                             inputProps={{ min: 1 }}
                                          />
                                       </TableCell>
                                       <TableCell align="left">
                                          <TextField
                                             type="number"
                                             size="small"
                                             value={row.price}
                                             error={Boolean(live.priceError || yupPrice)}
                                             helperText={live.priceError || yupPrice || undefined}
                                             onChange={(e) => {
                                                const raw = e.target.value;
                                                updateLine(idx, {
                                                   price:
                                                      raw === ""
                                                         ? 0
                                                         : parseFloat(raw) || 0,
                                                });
                                             }}
                                             sx={{ width: 104 }}
                                             inputProps={{ min: 0, step: "0.01" }}
                                          />
                                       </TableCell>
                                       <TableCell align="right">
                                          <Typography variant="body2" fontWeight={600} noWrap>
                                             {formatCurrency(
                                                lineSubtotal(
                                                   Number(row.quantity) || 0,
                                                   Number(row.price) || 0,
                                                ),
                                             )}
                                          </Typography>
                                       </TableCell>
                                       <TableCell align="left">
                                          <IconButton
                                             aria-label={`Remove ${row.name}`}
                                             onClick={() =>
                                                field.onChange(
                                                   lines.filter(
                                                      (_: any, i: number) =>
                                                         i !== idx,
                                                   ),
                                                )
                                             }
                                          >
                                             <Icon icon="carbon:close" />
                                          </IconButton>
                                       </TableCell>
                                    </TableRowMUI>
                                 );
                              })}
                           </TableBody>
                        </Table>
                     </TableContainer>
                  )}
               </Stack>
            );
         }}
      />
   );
};

export default ProductSection;
