"use client";

import React, { useState, useEffect } from "react";
import {
   Button,
   Stack,
   Typography,
   Box,
   Chip,
   Grid,
   Table,
   TableHead,
   TableRow,
   TableCell,
   TableBody,
   Paper,
   CircularProgress,
} from "@mui/material";
import CustomModal from "@src/components/Modal";
import { useSettings } from "@src/lib/settingsContext";
import { OrderTracking, EmployeeActivityTimeline } from "../Details/components";

interface OrderDetailModalProps {
   open: boolean;
   onClose: () => void;
   orderId?: string | null;
}

const statusColorMap: Record<
   string,
   "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
> = {
   PENDING: "warning",
   Pending: "warning",
   CONFIRMED: "info",
   Confirmed: "info",
   PROCESSING: "info",
   Processing: "info",
   SHIPPED: "primary",
   Shipped: "primary",
   OUT_FOR_DELIVERY: "primary",
   "Out for Delivery": "primary",
   DELIVERED: "success",
   Delivered: "success",
   COMPLETED: "success",
   Completed: "success",
   CANCELLED: "error",
   Cancelled: "error",
   FAILED: "error",
   Failed: "error",
   HOLD: "default",
   Hold: "default",
};

export default function OrderDetailModal({
   open,
   onClose,
   orderId,
}: OrderDetailModalProps) {
   const { formatCurrency } = useSettings();
   const [order, setOrder] = useState<any>(null);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (!open || !orderId) return;
      setLoading(true);
      fetch(`/api/orders/${orderId}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => setOrder(d))
         .catch(() => {})
         .finally(() => setLoading(false));
   }, [open, orderId]);

   return (
      <CustomModal
         open={open}
         onClose={onClose}
         title="Order Preview"
         closeIcon={true}
         sx={{
            width: { xs: "95%", sm: "90%", md: 860 },
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            p: { xs: 2, sm: 3 },
         }}
      >
         {loading ? (
            <Stack alignItems="center" py={6}>
               <CircularProgress />
            </Stack>
         ) : order ? (
            <Box
               sx={{
                  maxHeight: "calc(90vh - 120px)",
                  overflowY: "auto",
                  overflowX: "hidden",
                  pr: { xs: 0.5, sm: 1 },
               }}
            >
               <Stack spacing={3}>
                  {/* Top Order Badges Bar */}
                  <Stack
                     direction="row"
                     justifyContent="space-between"
                     alignItems="center"
                     flexWrap="wrap"
                     gap={1}
                  >
                     <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                           label={order?.orderCode || order?.orderId || order?.customId || "ORD"}
                           color="info"
                           size="small"
                           sx={{ fontWeight: 700 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                           Invoice: <b>{order.invoiceNo || "N/A"}</b>
                        </Typography>
                     </Stack>
                     {order?.status && (
                        <Chip
                           label={order.status}
                           color={statusColorMap[order.status] || "default"}
                           size="small"
                           sx={{ fontWeight: 700 }}
                        />
                     )}
                  </Stack>

                  {/* Customer & Order Metadata Grid */}
                  <Paper
                     variant="outlined"
                     sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.paper" }}
                  >
                     <Grid container spacing={2}>
                        <Grid size={{ xs: 6, sm: 3 }}>
                           <Typography variant="caption" color="text.secondary">
                              Customer
                           </Typography>
                           <Typography variant="body2" fontWeight={600}>
                              {order.customer?.name || "Walk-in Customer"}
                           </Typography>
                           {order.customer?.phone && (
                              <Typography
                                 variant="caption"
                                 color="text.secondary"
                                 display="block"
                              >
                                 {order.customer.phone}
                              </Typography>
                           )}
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                           <Typography variant="caption" color="text.secondary">
                              Date & Time
                           </Typography>
                           <Typography variant="body2" fontWeight={600}>
                              {order.createdAt
                                 ? new Date(order.createdAt).toLocaleDateString()
                                 : "-"}
                           </Typography>
                           <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                           >
                              {order.createdAt
                                 ? new Date(order.createdAt).toLocaleTimeString(
                                      [],
                                      { hour: "2-digit", minute: "2-digit" },
                                   )
                                 : ""}
                           </Typography>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                           <Typography variant="caption" color="text.secondary">
                              Payment Method
                           </Typography>
                           <Typography variant="body2" fontWeight={600}>
                              {order.paymentMethod || "Cash on Delivery"}
                           </Typography>
                           <Typography
                              variant="caption"
                              color={
                                 Number(order.dueAmount || 0) <= 0
                                    ? "success.main"
                                    : "warning.main"
                              }
                              fontWeight={600}
                              display="block"
                           >
                              {Number(order.dueAmount || 0) <= 0
                                 ? "Paid in full"
                                 : `Due: ${formatCurrency(
                                      Number(order.dueAmount || 0),
                                   )}`}
                           </Typography>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                           <Typography variant="caption" color="text.secondary">
                              Source & Type
                           </Typography>
                           <Typography variant="body2" fontWeight={600}>
                              {order.orderSource || "Direct"}
                           </Typography>
                           <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                           >
                              {order.orderType || "Regular Order"}
                           </Typography>
                        </Grid>
                     </Grid>
                  </Paper>

                  {/* Order Items Table */}
                  <Box>
                     <Typography variant="subtitle2" fontWeight={700} mb={1}>
                        Order Items ({(order.items || []).length})
                     </Typography>
                     <Paper
                        variant="outlined"
                        sx={{ borderRadius: 1.5, overflow: "hidden" }}
                     >
                        <Table size="small">
                           <TableHead>
                              <TableRow sx={{ bgcolor: "action.hover" }}>
                                 <TableCell
                                    sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                                 >
                                    Item
                                 </TableCell>
                                 <TableCell
                                    align="center"
                                    sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                                 >
                                    Qty
                                 </TableCell>
                                 <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                                 >
                                    Price
                                 </TableCell>
                                 <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                                 >
                                    Subtotal
                                 </TableCell>
                              </TableRow>
                           </TableHead>
                           <TableBody>
                              {(order.items || []).map(
                                 (item: any, idx: number) => (
                                    <TableRow key={idx} hover>
                                       <TableCell sx={{ fontSize: "0.8rem" }}>
                                          <Typography
                                             variant="body2"
                                             fontWeight={600}
                                          >
                                             {item.name}
                                          </Typography>
                                          {item.code && (
                                             <Typography
                                                variant="caption"
                                                color="text.secondary"
                                             >
                                                SKU: {item.code}
                                             </Typography>
                                          )}
                                       </TableCell>
                                       <TableCell
                                          align="center"
                                          sx={{ fontSize: "0.8rem" }}
                                       >
                                          {item.quantity}
                                       </TableCell>
                                       <TableCell
                                          align="right"
                                          sx={{ fontSize: "0.8rem" }}
                                       >
                                          {formatCurrency(Number(item.price))}
                                       </TableCell>
                                       <TableCell
                                          align="right"
                                          sx={{
                                             fontWeight: 700,
                                             fontSize: "0.8rem",
                                          }}
                                       >
                                          {formatCurrency(
                                             Number(item.subtotal),
                                          )}
                                       </TableCell>
                                    </TableRow>
                                 ),
                              )}
                           </TableBody>
                        </Table>
                     </Paper>

                     {/* Financial Breakdown */}
                     <Stack spacing={0.5} alignItems="flex-end" mt={1.5} px={1}>
                        <Typography variant="body2" color="text.secondary">
                           Subtotal:{" "}
                           <b>{formatCurrency(Number(order.subtotal || 0))}</b>
                        </Typography>
                        {Number(order.deliveryCharge || 0) > 0 && (
                           <Typography variant="body2" color="text.secondary">
                              Delivery Charge: +
                              {formatCurrency(Number(order.deliveryCharge))}
                           </Typography>
                        )}
                        {Number(order.discount || 0) > 0 && (
                           <Typography variant="body2" color="text.secondary">
                              Discount: -
                              {formatCurrency(Number(order.discount))}
                           </Typography>
                        )}
                        <Typography
                           variant="subtitle1"
                           fontWeight={700}
                           color="primary.main"
                        >
                           Grand Total: {formatCurrency(Number(order.total || 0))}
                        </Typography>
                     </Stack>
                  </Box>

                  {/* Section 1: Order Tracking */}
                  <OrderTracking order={order} />

                  {/* Section 2: Employee Activity Track on this Order */}
                  <EmployeeActivityTimeline order={order} />

                  {/* Bottom Close Button */}
                  <Stack direction="row" justifyContent="flex-end" pt={1}>
                     <Button
                        onClick={onClose}
                        variant="contained"
                        color="inherit"
                        size="small"
                     >
                        Close
                     </Button>
                  </Stack>
               </Stack>
            </Box>
         ) : (
            <Typography variant="body2" color="text.secondary">
               Order not found.
            </Typography>
         )}
      </CustomModal>
   );
}
