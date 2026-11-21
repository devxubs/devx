"use client";

// Order Create — compact product table.
// Discount type selector is integrated inside the discount input.
// Number input spinner arrows are removed from all numeric fields.

import React from "react";
import {
   Avatar,
   Box,
   Button,
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
   TableRow,
   TextField,
   ToggleButton,
   ToggleButtonGroup,
   Tooltip,
   Typography,
   alpha,
   useTheme,
} from "@mui/material";

import Icon from "@src/components/Icon";
import Barcode from "@src/components/Barcode";
import { formatBDT, lineDiscountAmount, lineTotal, num } from "./orderCalculations";
import type { OrderLine } from "./types";

interface ProductTableProps {
   lines: OrderLine[];
   /** Lines are addressed by their unique row key (INV-02). */
   onUpdate: (lineKey: string, partial: Partial<OrderLine>) => void;
   onRemove: (lineKey: string) => void;
   currencySymbol?: string;
}

/** "M · Black" style summary of a variant's attribute values. */
const variantAttributesLabel = (attributes?: Record<string, string> | null) =>
   attributes
      ? Object.values(attributes).filter(Boolean).join(" · ")
      : "";

/** Compact input styling shared by Qty / Unit Price / Product Discount. */

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

   // Remove number input spinner arrows
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

const ProductTable = ({
   lines,
   onUpdate,
   onRemove,
   currencySymbol = "৳",
}: ProductTableProps) => {
   const theme = useTheme();

   // INV-02: picking a variant retargets the line at that variant's
   // SKU, price and stock pool.
   const handleVariantChange = (line: OrderLine, variantId: string) => {
      const variant = line.variants.find((v) => v.id === variantId);
      if (!variant) return;
      const variantStock = Math.max(0, num(variant.quantity));
      onUpdate(line.key, {
         variantId: variant.id,
         variantName: variant.variantName,
         code: variant.sku || line.code,
         // The line shows the SELECTED variant's barcode; a variant
         // without its own barcode falls back to the product's.
         barcode: variant.barcode || line.productBarcode,
         stock: variantStock,
         listPrice: num(variant.salePrice ?? variant.regularPrice),
         quantity: Math.max(1, Math.min(line.quantity, Math.max(1, variantStock))),
      });
   };

   if (!lines.length) {
      return (
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
      );
   }

   return (
      <TableContainer
         component={Paper}
         elevation={0}
         sx={{
            maxHeight: 460,
            overflow: "auto",
            backgroundColor: alpha(theme.palette.grey[400], 0.08),
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1.5,
         }}
      >
         <Table
            stickyHeader
            size="small"
            sx={{
               minWidth: 720,
               "& .MuiTableCell-root": {
                  verticalAlign: "middle",
                  px: 1,
                  py: 0.875,
               },
               "& .MuiTableCell-head": {
                  backgroundColor: alpha(theme.palette.grey[400], 0.12),
                  fontWeight: 700,
                  whiteSpace: "nowrap",
               },
            }}
         >
            <TableHead>
               <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Product Discount</TableCell>
                  <TableCell align="right">Line Total</TableCell>
                  <TableCell align="center"></TableCell>
               </TableRow>
            </TableHead>

            <TableBody>
               {lines.map((line) => {
                  const overStock = line.quantity > line.stock;

                  return (
                     <TableRow key={line.key}>
                        {/* Product */}
                        <TableCell>
                           <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                           >
                              {line.image ? (
                                 <Avatar
                                    src={line.image}
                                    variant="rounded"
                                    sx={{
                                       width: 30,
                                       height: 30,
                                       flexShrink: 0,
                                    }}
                                 />
                              ) : (
                                 <Avatar
                                    variant="rounded"
                                    sx={{
                                       width: 30,
                                       height: 30,
                                       flexShrink: 0,
                                    }}
                                 >
                                    <Icon icon="solar:box-linear" size="15px" />
                                 </Avatar>
                              )}

                              <Box sx={{ minWidth: 0 }}>
                                 <Tooltip title={line.name} disableInteractive>
                                    <Typography
                                       variant="body2"
                                       fontWeight={600}
                                       noWrap
                                       sx={{ maxWidth: 138 }}
                                    >
                                       {line.name}
                                    </Typography>
                                 </Tooltip>

                                 {line.variants.length > 0 && !line.variantId ? (
                                    <Typography variant="caption" color="warning.main">
                                       Select a variant below
                                    </Typography>
                                 ) : (
                                    <Typography
                                       variant="caption"
                                       color={
                                          line.stock <= 5
                                             ? "warning.main"
                                             : "textSecondary"
                                       }
                                    >
                                       Stock: {line.stock} {line.unit}
                                       {lineDiscountAmount(line) > 0
                                          ? ` · Disc −${formatBDT(
                                               lineDiscountAmount(line),
                                               currencySymbol,
                                            )}`
                                          : ""}
                                    </Typography>
                                 )}

                                 {line.variants.length > 0 && (
                                    <FormControl
                                       size="small"
                                       sx={{ mt: 0.5, minWidth: 180, maxWidth: 220 }}
                                    >
                                       <Select
                                          value={line.variantId || ""}
                                          displayEmpty
                                          onChange={(e) =>
                                             handleVariantChange(
                                                line,
                                                String(e.target.value),
                                             )
                                          }
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
                                             const v = line.variants.find(
                                                (x) => x.id === selected,
                                             );
                                             return v
                                                ? `${v.variantName} (${v.sku})`
                                                : "Select variant";
                                          }}
                                       >
                                          {line.variants.map((v) => {
                                             const attrs = variantAttributesLabel(
                                                v.attributes,
                                             );
                                             const vStock = Math.max(
                                                0,
                                                num(v.quantity),
                                             );
                                             // O6: a non-ACTIVE variant
                                             // cannot be newly assigned —
                                             // the line's CURRENT variant
                                             // stays selectable so an
                                             // unrelated edit is never
                                             // trapped (the PUT applies
                                             // the same rule).
                                             const vInactive =
                                                Boolean(v.status) &&
                                                v.status !== "ACTIVE";
                                             return (
                                                <MenuItem
                                                   key={v.id}
                                                   value={v.id}
                                                   disabled={
                                                      vStock <= 0 ||
                                                      (vInactive &&
                                                         v.id !== line.variantId)
                                                   }
                                                >
                                                   <Box>
                                                      <Typography variant="body2">
                                                         {v.variantName}
                                                         {attrs ? ` — ${attrs}` : ""}
                                                      </Typography>
                                                      <Typography
                                                         variant="caption"
                                                         color="textSecondary"
                                                      >
                                                         SKU: {v.sku} · Stock:{" "}
                                                         {vStock}
                                                         {vInactive
                                                            ? " · Inactive"
                                                            : ""}
                                                      </Typography>
                                                   </Box>
                                                </MenuItem>
                                             );
                                          })}
                                       </Select>
                                    </FormControl>
                                 )}

                                 {/* Selected product's barcode, inside
                                     the line's product cell (variant
                                     barcode when a variant is chosen,
                                     product barcode otherwise). */}
                                 {line.barcode && (
                                    <Box sx={{ mt: 0.5 }}>
                                       <Barcode
                                          value={line.barcode}
                                          height={18}
                                          moduleWidth={0.7}
                                          showText={false}
                                       />
                                       <Typography
                                          variant="caption"
                                          color="textSecondary"
                                          sx={{
                                             fontFamily: "monospace",
                                             display: "block",
                                             lineHeight: 1.1,
                                          }}
                                       >
                                          {line.barcode}
                                       </Typography>
                                    </Box>
                                 )}
                              </Box>
                           </Stack>
                        </TableCell>

                        {/* SKU */}
                        <TableCell>
                           <Typography
                              variant="body2"
                              color="textSecondary"
                              noWrap
                           >
                              {line.code || "—"}
                           </Typography>
                        </TableCell>

                        {/* Quantity */}
                        <TableCell align="center">
                           <TextField
                              type="number"
                              size="small"
                              value={line.quantity}
                              error={overStock}
                              helperText={
                                 overStock ? `Max ${line.stock}` : undefined
                              }
                              onChange={(e) =>
                                 onUpdate(line.key, {
                                    quantity: Number(e.target.value),
                                 })
                              }
                              inputProps={{
                                 min: 1,
                                 max: line.stock,
                                 style: { textAlign: "center" },
                              }}
                              sx={{
                                 width: 58,
                                 ...compactFieldSx,
                              }}
                           />
                        </TableCell>

                        {/* Unit Price */}
                        <TableCell align="right">
                           <TextField
                              type="number"
                              size="small"
                              value={line.listPrice}
                              onChange={(e) =>
                                 onUpdate(line.key, {
                                    listPrice: Number(e.target.value),
                                 })
                              }
                              inputProps={{
                                 min: 0,
                                 step: "0.01",
                                 style: { textAlign: "right" },
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
                              sx={{
                                 width: 92,
                                 ...compactFieldSx,
                              }}
                           />
                        </TableCell>

                        {/* Product Discount — Button Start, Value End */}

                        <TableCell align="right">
                           <TextField
                              type="number"
                              size="small"
                              value={line.discountValue}
                              onChange={(e) =>
                                 onUpdate(line.key, {
                                    discountValue: Number(e.target.value),
                                 })
                              }
                              inputProps={{
                                 min: 0,
                                 step: "0.01",
                                 style: { textAlign: "right" },
                              }}
                              InputProps={{
                                 startAdornment: (
                                    <InputAdornment
                                       position="start"
                                       sx={{
                                          ml: 0,
                                          mr: 0,
                                          width: 26,
                                          height: "100%",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                       }}
                                    >
                                       <Button
                                          disableRipple
                                          size="small"
                                          color="inherit"
                                          onClick={() =>
                                             onUpdate(line.key, {
                                                discountType:
                                                   line.discountType ===
                                                   "amount"
                                                      ? "percent"
                                                      : "amount",
                                             })
                                          }
                                          sx={{
                                             minWidth: 26,
                                             width: 26,
                                             height: 26,
                                             p: 0,
                                             fontSize: 12,
                                             fontWeight: 700,
                                             lineHeight: 1,
                                             borderRadius: 1,
                                             textTransform: "none",
                                          }}
                                       >
                                          {line.discountType === "amount"
                                             ? currencySymbol
                                             : "%"}
                                       </Button>
                                    </InputAdornment>
                                 ),
                              }}
                              sx={{
                                 width: 100,
                                 ...compactFieldSx,

                                 "& .MuiOutlinedInput-root": {
                                    height: 32,
                                    minHeight: 32,
                                    pl: 0.5,
                                    pr: 0.5,
                                 },

                                 "& .MuiInputAdornment-positionStart": {
                                    mr: 0,
                                    ml: 0,
                                    height: "100%",
                                    maxHeight: "100%",
                                 },

                                 "& .MuiInputBase-input": {
                                    minWidth: 0,
                                    width: "100%",
                                    px: 0.3,
                                    py: "2px",
                                    fontSize: 13,
                                    lineHeight: 1.2,
                                    textAlign: "right",
                                 },

                                 "& .MuiInputAdornment-root .MuiButton-root": {
                                    minWidth: 24,
                                    width: 24,
                                    height: 22,
                                    minHeight: 22,
                                    p: 0,
                                    fontSize: 11,
                                 },

                                 "& input[type=number]": {
                                    MozAppearance: "textfield",
                                 },
                                 "& input[type=number]::-webkit-inner-spin-button":
                                    {
                                       WebkitAppearance: "none",
                                       margin: 0,
                                    },
                                 "& input[type=number]::-webkit-outer-spin-button":
                                    {
                                       WebkitAppearance: "none",
                                       margin: 0,
                                    },
                              }}
                           />
                        </TableCell>

                        {/* Line Total */}
                        <TableCell align="right">
                           <Typography variant="body2" fontWeight={700} noWrap>
                              {formatBDT(lineTotal(line), currencySymbol)}
                           </Typography>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center">
                           <Tooltip title="Remove product" disableInteractive>
                              <IconButton
                                 size="small"
                                 color="error"
                                 onClick={() => onRemove(line.key)}
                              >
                                 <Icon
                                    icon="solar:trash-bin-trash-bold"
                                    size="17px"
                                 />
                              </IconButton>
                           </Tooltip>
                        </TableCell>
                     </TableRow>
                  );
               })}
            </TableBody>
         </Table>
      </TableContainer>
   );
};

export default ProductTable;
