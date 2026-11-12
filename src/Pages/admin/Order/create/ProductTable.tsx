"use client";

// Order Create — compact product table.
// Discount type selector is integrated inside the discount input.
// Number input spinner arrows are removed from all numeric fields.

import React from "react";
import {
   Avatar,
   Box,
   Button,
   IconButton,
   InputAdornment,
   Paper,
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
import { formatBDT, lineDiscountAmount, lineTotal } from "./orderCalculations";
import type { OrderLine } from "./types";

interface ProductTableProps {
   lines: OrderLine[];
   onUpdate: (productId: string, partial: Partial<OrderLine>) => void;
   onRemove: (productId: string) => void;
   currencySymbol?: string;
}

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
                     <TableRow key={line.productId}>
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
                                 onUpdate(line.productId, {
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
                                 onUpdate(line.productId, {
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
                                 onUpdate(line.productId, {
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
                                             onUpdate(line.productId, {
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
                                 onClick={() => onRemove(line.productId)}
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
