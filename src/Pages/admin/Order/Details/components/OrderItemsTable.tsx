"use client";

import React from "react";
import {
   Box,
   Chip,
   Divider,
   Paper,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableRow,
   Typography,
   alpha,
   useTheme,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { useSettings } from "@src/lib/settingsContext";

interface OrderItemsTableProps {
   items: any[];
   subtotal: number | string;
   deliveryCharge?: number | string;
   discount?: number | string;
   tax?: number | string;
   total: number | string;
   advancePayment?: number | string;
   dueAmount?: number | string;
   isCancelled?: boolean;
}

export default function OrderItemsTable({
   items = [],
   subtotal = 0,
   deliveryCharge = 0,
   discount = 0,
   tax = 0,
   total = 0,
   advancePayment = 0,
   dueAmount = 0,
   isCancelled = false,
}: OrderItemsTableProps) {
   const theme = useTheme();
   const { formatCurrency } = useSettings();

   const safeItems = Array.isArray(items) ? items : [];
   const totalQuantity = safeItems.reduce((acc, it) => acc + Number(it.quantity || 1), 0);

   return (
      <Paper
         variant="outlined"
         sx={{
            borderRadius: 1,
            overflow: "hidden",
            borderColor: "divider",
            bgcolor: "background.paper",
         }}
      >
         {/* Card Header */}
         <Box
            sx={{
               px: 2.5,
               py: 1.5,
               bgcolor: alpha(theme.palette.text.primary, 0.02),
               borderBottom: `1px solid ${theme.palette.divider}`,
               display: "flex",
               alignItems: "center",
               justifyContent: "space-between",
               flexWrap: "wrap",
               gap: 1,
            }}
         >
            <Stack direction="row" spacing={1.25} alignItems="center">
               <Box
                  sx={{
                     width: 28,
                     height: 28,
                     borderRadius: 0.75,
                     bgcolor: alpha(theme.palette.primary.main, 0.1),
                     color: "primary.main",
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                  }}
               >
                  <Icon icon="solar:bag-3-bold" size="16px" />
               </Box>
               <Box>
                  <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
                     Order Items
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                     Products, quantities and financial calculations
                  </Typography>
               </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
               <Chip
                  label={`${safeItems.length} ${safeItems.length === 1 ? "Line Item" : "Line Items"}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
               />
               <Chip
                  label={`${totalQuantity} Total Units`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }}
               />
            </Stack>
         </Box>

         {/* Products Table */}
         <Table size="medium">
            <TableHead>
               <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", py: 1.25 }}>
                     PRODUCT ITEM
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", py: 1.25 }}>
                     QTY
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", py: 1.25 }}>
                     UNIT PRICE
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", py: 1.25 }}>
                     SUBTOTAL
                  </TableCell>
               </TableRow>
            </TableHead>
            <TableBody>
               {safeItems.map((item, idx) => {
                  const itemName = item.name || item.product?.productName || "Product Item";
                  const itemSku = item.code || item.sku || item.product?.sku;
                  const itemQty = Number(item.quantity || 1);
                  const itemPrice = Number(item.price || 0);
                  const itemSubtotal = Number(item.subtotal || itemQty * itemPrice);

                  return (
                     <TableRow
                        key={idx}
                        hover
                        sx={{
                           "&:last-child td": { borderBottom: 0 },
                        }}
                     >
                        <TableCell sx={{ py: 1.5 }}>
                           <Stack direction="row" spacing={1.5} alignItems="center">
                              <Box
                                 sx={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 0.75,
                                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                                    color: "primary.main",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                 }}
                              >
                                 <Icon icon="solar:box-bold-duotone" size="20px" />
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                 <Typography variant="body2" fontWeight={600} color="text.primary">
                                    {itemName}
                                 </Typography>
                                 {itemSku && (
                                    <Typography
                                       variant="caption"
                                       color="text.secondary"
                                       sx={{
                                          fontFamily: "monospace",
                                          fontSize: "0.72rem",
                                          bgcolor: "action.hover",
                                          px: 0.75,
                                          py: 0.15,
                                          borderRadius: 0.5,
                                          display: "inline-block",
                                          mt: 0.25,
                                       }}
                                    >
                                       SKU: {itemSku}
                                    </Typography>
                                 )}
                              </Box>
                           </Stack>
                        </TableCell>

                        <TableCell align="center" sx={{ py: 1.5 }}>
                           <Box
                              sx={{
                                 display: "inline-block",
                                 px: 1.25,
                                 py: 0.25,
                                 borderRadius: 1,
                                 bgcolor: "action.hover",
                                 fontWeight: 700,
                                 fontSize: "0.8rem",
                              }}
                           >
                              {itemQty}
                           </Box>
                        </TableCell>

                        <TableCell align="right" sx={{ py: 1.5, fontSize: "0.85rem", fontVariantNumeric: "tabular-nums" }}>
                           {formatCurrency(itemPrice)}
                        </TableCell>

                        <TableCell
                           align="right"
                           sx={{
                              py: 1.5,
                              fontWeight: 700,
                              fontSize: "0.875rem",
                              fontVariantNumeric: "tabular-nums",
                              color: "text.primary",
                           }}
                        >
                           {formatCurrency(itemSubtotal)}
                        </TableCell>
                     </TableRow>
                  );
               })}

               {safeItems.length === 0 && (
                  <TableRow>
                     <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        <Typography variant="body2">No products registered in this order.</Typography>
                     </TableCell>
                  </TableRow>
               )}
            </TableBody>
         </Table>

         <Divider sx={{ borderColor: "divider" }} />

         {/* Integrated Financial Settlement Section */}
         <Box
            sx={{
               p: 2.5,
               bgcolor: alpha(theme.palette.text.primary, 0.015),
               display: "flex",
               justifyContent: "flex-end",
            }}
         >
            <Box sx={{ width: { xs: "100%", sm: 340 } }}>
               <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        Subtotal:
                     </Typography>
                     <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(Number(subtotal))}
                     </Typography>
                  </Stack>

                  {Number(discount) > 0 && (
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="error.main" fontWeight={500}>
                           Discount:
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="error.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
                           -{formatCurrency(Number(discount))}
                        </Typography>
                     </Stack>
                  )}

                  {Number(deliveryCharge) > 0 && (
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                           Delivery Charge:
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
                           +{formatCurrency(Number(deliveryCharge))}
                        </Typography>
                     </Stack>
                  )}

                  {Number(tax) > 0 && (
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                           Tax:
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
                           +{formatCurrency(Number(tax))}
                        </Typography>
                     </Stack>
                  )}

                  <Divider sx={{ my: 0.75, borderColor: "divider" }} />

                  {/* Grand Total */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="subtitle1" fontWeight={700}>
                        Grand Total:
                     </Typography>
                     <Typography
                        variant="h6"
                        fontWeight={800}
                        color="primary.main"
                        sx={{ fontVariantNumeric: "tabular-nums" }}
                     >
                        {formatCurrency(Number(total))}
                     </Typography>
                  </Stack>

                  <Divider sx={{ my: 0.5, borderColor: "divider" }} />

                  {/* Advance & Due */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        Advance Paid:
                     </Typography>
                     <Typography variant="body2" fontWeight={700} color="success.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(Number(advancePayment))}
                     </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        Due Amount:
                     </Typography>
                     <Typography
                        variant="body2"
                        fontWeight={700}
                        color={
                           isCancelled
                              ? "text.disabled"
                              : Number(dueAmount) > 0
                                ? "warning.main"
                                : "text.secondary"
                        }
                        sx={isCancelled ? { textDecoration: "line-through" } : undefined}
                     >
                        {formatCurrency(Number(dueAmount))}
                        {isCancelled && " (Void)"}
                     </Typography>
                  </Stack>
               </Stack>
            </Box>
         </Box>
      </Paper>
   );
}
