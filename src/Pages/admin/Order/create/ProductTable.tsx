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
   lineGross,
   lineTotal,
} from "./orderCalculations";
import type { OrderLine } from "./types";

interface ProductTableProps {
   lines: OrderLine[];
   onUpdate: (productId: string, partial: Partial<OrderLine>) => void;
   onRemove: (productId: string) => void;
   currencySymbol?: string;
}

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
            maxHeight: 380,
            overflow: "auto",
            backgroundColor: alpha(theme.palette.grey[400], 0.08),
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1.5,
         }}
      >
         <Table stickyHeader size="small" sx={{ minWidth: 860 }}>
            <TableHead>
               <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="center">Stock</TableCell>
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
                           <Stack direction="row" spacing={1.25} alignItems="center">
                              {line.image ? (
                                 <Avatar src={line.image} variant="rounded" sx={{ width: 32, height: 32 }} />
                              ) : (
                                 <Avatar variant="rounded" sx={{ width: 32, height: 32 }}>
                                    <Icon icon="solar:box-linear" size="16px" />
                                 </Avatar>
                              )}
                              <Box sx={{ minWidth: 0 }}>
                                 <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>
                                    {line.name}
                                 </Typography>
                                 <Typography variant="caption" color="textSecondary">
                                    Gross {formatBDT(lineGross(line), currencySymbol)}
                                    {lineDiscountAmount(line) > 0
                                       ? ` · Disc −${formatBDT(lineDiscountAmount(line), currencySymbol)}`
                                       : ""}
                                 </Typography>
                              </Box>
                           </Stack>
                        </TableCell>
                        <TableCell>
                           <Typography variant="body2">{line.code || "—"}</Typography>
                        </TableCell>
                        <TableCell align="center">
                           <Typography variant="body2" color={line.stock <= 5 ? "warning.main" : "textPrimary"}>
                              {line.stock} {line.unit}
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
                              sx={{ width: 74 }}
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
                              sx={{ width: 104 }}
                           />
                        </TableCell>
                        <TableCell align="right">
                           <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
                              <ToggleButtonGroup
                                 size="small"
                                 exclusive
                                 value={line.discountType}
                                 onChange={(_, v) => {
                                    if (v) onUpdate(line.productId, { discountType: v });
                                 }}
                                 sx={{ "& .MuiToggleButton-root": { px: 0.9, py: 0.3, fontSize: 12 } }}
                              >
                                 <ToggleButton value="amount">{currencySymbol}</ToggleButton>
                                 <ToggleButton value="percent">%</ToggleButton>
                              </ToggleButtonGroup>
                              <TextField
                                 type="number"
                                 size="small"
                                 value={line.discountValue}
                                 onChange={(e) =>
                                    onUpdate(line.productId, { discountValue: Number(e.target.value) })
                                 }
                                 inputProps={{ min: 0, step: "0.01", style: { textAlign: "right" } }}
                                 InputProps={{
                                    endAdornment: (
                                       <InputAdornment position="end">
                                          {line.discountType === "percent" ? "%" : currencySymbol}
                                       </InputAdornment>
                                    ),
                                 }}
                                 sx={{ width: 108 }}
                              />
                           </Stack>
                        </TableCell>
                        <TableCell align="right">
                           <Typography variant="body2" fontWeight={700}>
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
