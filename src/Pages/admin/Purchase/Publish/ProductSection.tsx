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
   Avatar,
   Box,
   FormControl,
   IconButton,
   InputAdornment,
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
   Tooltip,
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

/** Compact in-table field styling — the Order Create product
 * table's pattern (30px fields, 13px text, number spinners
 * removed), copied page-scoped; the Order page is not modified. */
const compactFieldSx = {
   "& .MuiInputBase-root": {
      minHeight: 30,
      height: 30,
   },
   "& .MuiInputBase-input": {
      py: "3px",
      px: "6px",
      fontSize: 13,
      lineHeight: 1.2,
   },
   "& .MuiInputAdornment-root": {
      ml: 0,
      mr: 0,
      maxHeight: "100%",
   },
   "& input[type=number]": {
      MozAppearance: "textfield",
   },
   "& input[type=number]::-webkit-inner-spin-button": {
      WebkitAppearance: "none",
      margin: 0,
   },
   "& input[type=number]::-webkit-outer-spin-button": {
      WebkitAppearance: "none",
      margin: 0,
   },
} as const;

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
   const { formatCurrency, settings } = useSettings();
   const currencySymbol = settings?.currencySymbol || "৳";

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
               <Stack spacing={3}>
                  <CustomAutocomplete
                     size="small"
                     value={selectedOptions}
                     onChange={(val: any) =>
                        syncSelection(
                           Array.isArray(val) ? val : val ? [val] : [],
                        )
                     }
                     error={!!errors.product?.message}
                     helperText={errors.product?.message}
                     arrow
                     option={productOptions}
                     placeholder="Search product..."
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
                     // Empty state — the Order Create product table's
                     // dashed-box pattern.
                     <Stack
                        alignItems="center"
                        justifyContent="center"
                        spacing={1}
                        sx={{
                           py: 4,
                           border: `1px dashed ${alpha(theme.palette.text.primary, 0.25)}`,
                           borderRadius: 1.5,
                           color: "text.secondary",
                        }}
                     >
                        <Icon icon="solar:cart-large-linear" size="26px" />
                        <Typography variant="body2">
                           No products added yet — search above to add items.
                        </Typography>
                     </Stack>
                  ) : (
                     // Container, header and cell rhythm follow the
                     // Order Create product table exactly; the
                     // columns and cell contents stay Purchase's.
                     <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{
                           maxHeight: 460,
                           overflow: "auto",
                           backgroundColor: alpha(
                              theme.palette.grey[400],
                              0.08,
                           ),
                           border: `1px solid ${theme.palette.divider}`,
                           borderRadius: 1.5,
                        }}
                     >
                        <Table
                           stickyHeader
                           size="small"
                           sx={{
                              // Order's table uses 720, but it has a
                              // seventh (discount) column and a wider
                              // card; at 720 this six-column table
                              // overflowed its card at desktop width
                              // and pushed Line Total and the remove
                              // button off-screen (live-check finding).
                              minWidth: 640,
                              "& .MuiTableCell-root": {
                                 verticalAlign: "middle",
                                 px: 1,
                                 py: 0.875,
                              },
                              "& .MuiTableCell-head": {
                                 backgroundColor: alpha(
                                    theme.palette.grey[400],
                                    0.12,
                                 ),
                                 fontWeight: 700,
                                 whiteSpace: "nowrap",
                              },
                           }}
                        >
                           <TableHead>
                              <TableRowMUI>
                                 <TableCell>Product</TableCell>
                                 <TableCell align="center">Stock</TableCell>
                                 <TableCell align="center">Qty</TableCell>
                                 <TableCell align="right">
                                    Purchase Price
                                 </TableCell>
                                 <TableCell align="right">Line Total</TableCell>
                                 <TableCell align="center"></TableCell>
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
                                          <Stack
                                             direction="row"
                                             spacing={1}
                                             alignItems="flex-start"
                                          >
                                             <Avatar
                                                variant="rounded"
                                                sx={{
                                                   width: 30,
                                                   height: 30,
                                                   flexShrink: 0,
                                                }}
                                             >
                                                <Icon
                                                   icon="solar:box-linear"
                                                   size="15px"
                                                />
                                             </Avatar>
                                             <Box sx={{ minWidth: 0 }}>
                                                <Tooltip
                                                   title={row.name}
                                                   disableInteractive
                                                >
                                                   <Typography
                                                      variant="body2"
                                                      fontWeight={600}
                                                      noWrap
                                                      sx={{ maxWidth: 138 }}
                                                   >
                                                      {row.name}
                                                   </Typography>
                                                </Tooltip>
                                                {row.code && (
                                                   <Typography
                                                      variant="caption"
                                                      color="textSecondary"
                                                      component="div"
                                                   >
                                                      SKU: {row.code}
                                                   </Typography>
                                                )}
                                                {lineVariants.length > 0 ? (
                                                <FormControl
                                                   size="small"
                                                   sx={{
                                                      mt: 0.5,
                                                      minWidth: 180,
                                                      maxWidth: 220,
                                                   }}
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
                                                         height: 30,
                                                         fontSize: 13,
                                                         "& .MuiSelect-select": {
                                                            py: "4px",
                                                         },
                                                      }}
                                                      renderValue={(selected) => {
                                                         if (!selected) {
                                                            return (
                                                               <Typography
                                                                  variant="body2"
                                                                  color="warning.main"
                                                                  fontSize={13}
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
                                             </Box>
                                          </Stack>
                                       </TableCell>
                                       <TableCell align="center">
                                          <Typography variant="body2">
                                             {stock ?? "—"}
                                          </Typography>
                                       </TableCell>
                                       <TableCell align="center">
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
                                             sx={{ width: 64, ...compactFieldSx }}
                                             inputProps={{
                                                min: 1,
                                                style: { textAlign: "center" },
                                             }}
                                          />
                                       </TableCell>
                                       <TableCell align="right">
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
                                             InputProps={{
                                                startAdornment: (
                                                   <InputAdornment
                                                      position="start"
                                                      sx={{ mr: 0 }}
                                                   >
                                                      <Typography
                                                         variant="caption"
                                                         color="textSecondary"
                                                      >
                                                         {currencySymbol}
                                                      </Typography>
                                                   </InputAdornment>
                                                ),
                                             }}
                                             sx={{ width: 92, ...compactFieldSx }}
                                             inputProps={{
                                                min: 0,
                                                step: "0.01",
                                                style: { textAlign: "right" },
                                             }}
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
                                       <TableCell align="center">
                                          <Tooltip
                                             title="Remove product"
                                             disableInteractive
                                          >
                                             <IconButton
                                                size="small"
                                                color="error"
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
                                                <Icon
                                                   icon="solar:trash-bin-trash-bold"
                                                   size="17px"
                                                />
                                             </IconButton>
                                          </Tooltip>
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
