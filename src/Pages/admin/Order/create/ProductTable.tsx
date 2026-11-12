"use client";

// Order Create (upgrade) — compact product table.
// Columns: Product, SKU, Available Stock, Quantity, Unit Price, Product
// Discount (fixed amount or %), Line Total, Actions. The table scrolls
// horizontally inside its own container; the page never overflows.
import {
   Avatar,
   Box,
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
import React from "react";
import Icon from "@src/components/Icon";
import {
   formatBDT,
   lineDiscountAmount,
   lineTotal,
} from "./orderCalculations";
import type { OrderLine } from "./types";

interface ProductTableProps {
   lines: OrderLine[];
   onUpdate: (productId: string, partial: Partial<OrderLine>) => void;
   onRemove: (productId: string) => void;
   currencySymbol?: string;
}

/** Compact input styling shared by Qty / Unit Price / Product Discount. */
const compactFieldSx = {
   "& .MuiInputBase-input": { py: "5.5px", px: "8px", fontSize: 13.5 },
   "& .MuiInputAdornment-root": { ml: 0, mr: 0 },
} as const;

const ProductTable = ({ lines, onUpdate, onRemove, currencySymbol = "৳" }: ProductTableProps) => {
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
            <Typography variant="body2">No products added yet — search above to add items.</Typography>
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
               "& .MuiTableCell-root": { verticalAlign: "middle", px: 1, py: 0.875 },
               "& .MuiTableCell-head": { backgroundColor: alpha(theme.palette.grey[400], 0.12), fontWeight: 700, whiteSpace: "nowrap" },
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
                     <TableRow key={line.productId} hover>
                        <TableCell>
                           <Stack direction="row" spacing={1} alignItems="center">
                              {line.image ? (
                                 <Avatar src={line.image} variant="rounded" sx={{ width: 30, height: 30, flexShrink: 0 }} />
                              ) : (
                                 <Avatar variant="rounded" sx={{ width: 30, height: 30, flexShrink: 0 }}>
                                    <Icon icon="solar:box-linear" size="15px" />
                                 </Avatar>
                              )}
                              <Box sx={{ minWidth: 0 }}>
                                 <Tooltip title={line.name} disableInteractive>
                                    <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 138 }}>
                                       {line.name}
                                    </Typography>
                                 </Tooltip>
                                 <Typography
                                    variant="caption"
                                    color={line.stock <= 5 ? "warning.main" : "textSecondary"}
                                 >
                                    Stock: {line.stock} {line.unit}
                                    {lineDiscountAmount(line) > 0
                                       ? ` · Disc −${formatBDT(lineDiscountAmount(line), currencySymbol)}`
                                       : ""}
                                 </Typography>
                              </Box>
                           </Stack>
                        </TableCell>
                        <TableCell>
                           <Typography variant="body2" color="textSecondary" noWrap>
                              {line.code || "—"}
                           </Typography>
                        </TableCell>
                        <TableCell align="center">
                           <TextField
                              type="number"
                              size="small"
                              value={line.quantity}
                              error={overStock}
                              helperText={overStock ? `Max ${line.stock}` : undefined}
                              onChange={(e) =>
                                 onUpdate(line.productId, { quantity: Number(e.target.value) })
                              }
                              inputProps={{ min: 1, max: line.stock, style: { textAlign: "center" } }}
                              sx={{ width: 58, ...compactFieldSx }}
                           />
                        </TableCell>
                        <TableCell align="right">
                           <TextField
                              type="number"
                              size="small"
                              value={line.listPrice}
                              onChange={(e) =>
                                 onUpdate(line.productId, { listPrice: Number(e.target.value) })
                              }
                              inputProps={{ min: 0, step: "0.01", style: { textAlign: "right" } }}
                              InputProps={{
                                 startAdornment: (
                                    <InputAdornment position="start" sx={{ mr: 0 }}>
                                       <Typography variant="caption" color="textSecondary">{currencySymbol}</Typography>
                                    </InputAdornment>
                                 ),
                              }}
                              sx={{ width: 92, ...compactFieldSx }}
                           />
                        </TableCell>
                        <TableCell align="right">
                           <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center" flexWrap="nowrap">
                              <TextField
                                 type="number"
                                 size="small"
                                 value={line.discountValue}
                                 onChange={(e) =>
                                    onUpdate(line.productId, { discountValue: Number(e.target.value) })
                                 }
                                 inputProps={{ min: 0, step: "0.01", style: { textAlign: "right" } }}
                                 sx={{ width: 72, ...compactFieldSx }}
                              />
                              <ToggleButtonGroup
                                 size="small"
                                 exclusive
                                 value={line.discountType}
                                 onChange={(_, v) => {
                                    if (v) onUpdate(line.productId, { discountType: v });
                                 }}
                                 sx={{
                                    "& .MuiToggleButton-root": {
                                       px: 0.7,
                                       py: 0.45,
                                       fontSize: 11.5,
                                       lineHeight: 1.3,
                                       whiteSpace: "nowrap",
                                       textTransform: "none",
                                    },
                                    flexShrink: 0,
                                 }}
                              >
                                 <ToggleButton value="amount">{currencySymbol} Amount</ToggleButton>
                                 <ToggleButton value="percent">% Percent</ToggleButton>
                              </ToggleButtonGroup>
                           </Stack>
                        </TableCell>
                        <TableCell align="right">
                           <Typography variant="body2" fontWeight={700} noWrap>
                              {formatBDT(lineTotal(line), currencySymbol)}
                           </Typography>
                        </TableCell>
                        <TableCell align="center">
                           <Tooltip title="Remove product" disableInteractive>
                              <IconButton size="small" color="error" onClick={() => onRemove(line.productId)}>
                                 <Icon icon="solar:trash-bin-trash-bold" size="17px" />
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
