"use client";

import React, { useMemo, useState } from "react";
import {
   Box,
   Chip,
   MenuItem,
   Paper,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableRow,
   TextField,
   Typography,
   Button,
   Tooltip,
   InputAdornment,
} from "@mui/material";
import { useRouter } from "next/navigation";
import Icon from "@src/components/Icon";
import { useSettings } from "@src/lib/settingsContext";
import { OrderRecord } from "./customerAnalyticsHelpers";

interface CustomerOrderHistoryTableProps {
   orders: OrderRecord[];
   onCloseModal?: () => void;
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

export default function CustomerOrderHistoryTable({
   orders,
   onCloseModal,
}: CustomerOrderHistoryTableProps) {
   const router = useRouter();
   const { formatCurrency } = useSettings();

   const [statusFilter, setStatusFilter] = useState<string>("ALL");
   const [courierFilter, setCourierFilter] = useState<string>("ALL");
   const [searchQuery, setSearchQuery] = useState<string>("");

   // Unique couriers available in this customer's orders
   const uniqueCouriers = useMemo(() => {
      const set = new Set<string>();
      for (const o of orders) {
         if (o.courier && o.courier.trim() !== "") {
            set.add(o.courier.trim());
         }
      }
      return Array.from(set).sort();
   }, [orders]);

   // Filtered orders
   const filteredOrders = useMemo(() => {
      return orders.filter((o) => {
         // Status filter
         if (statusFilter !== "ALL") {
            const ordStatus = (o.status || "").toUpperCase();
            if (ordStatus !== statusFilter.toUpperCase()) {
               return false;
            }
         }

         // Courier filter
         if (courierFilter !== "ALL") {
            const ordCourier = (o.courier || "").trim().toUpperCase();
            if (ordCourier !== courierFilter.trim().toUpperCase()) {
               return false;
            }
         }

         // Search query (Order ID, Invoice, notes, or date)
         if (searchQuery.trim() !== "") {
            const q = searchQuery.toLowerCase().trim();
            const idMatch = (o.orderCode || o.orderId || o.customId || o.id || "").toLowerCase().includes(q);
            const invMatch = (o.invoiceNo || "").toLowerCase().includes(q);
            const dateStr = new Date(o.createdAt).toLocaleDateString().toLowerCase();
            const dateMatch = dateStr.includes(q);
            if (!idMatch && !invMatch && !dateMatch) {
               return false;
            }
         }

         return true;
      });
   }, [orders, statusFilter, courierFilter, searchQuery]);

   const handleOpenOrderDetails = (order: OrderRecord) => {
      if (onCloseModal) onCloseModal();
      const targetId = order.orderCode || order.orderId || order.customId || order.id;
      router.push(`/admin/order/${targetId}`);
   };

   return (
      <Box>
         {/* Title and Filter Controls */}
         <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            gap={1.5}
            mb={1.5}
         >
            <Stack direction="row" spacing={1} alignItems="center">
               <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  Customer Order History
               </Typography>
               <Chip
                  label={`${filteredOrders.length} of ${orders.length}`}
                  size="small"
                  sx={{ height: 20, fontSize: "0.75rem", fontWeight: 600 }}
               />
            </Stack>

            {/* Filters Row */}
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
               {/* Search Input */}
               <TextField
                  size="small"
                  placeholder="Search ID or Date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ width: { xs: "100%", sm: 160 } }}
                  InputProps={{
                     startAdornment: (
                        <InputAdornment position="start">
                           <Icon icon="solar:magnifer-linear" size="16px" />
                        </InputAdornment>
                     ),
                  }}
               />

               {/* Status Filter */}
               <TextField
                  select
                  size="small"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ width: { xs: "48%", sm: 130 } }}
                  label="Status"
               >
                  <MenuItem value="ALL">All Status</MenuItem>
                  <MenuItem value="DELIVERED">Delivered</MenuItem>
                  <MenuItem value="PROCESSING">Processing</MenuItem>
                  <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="SHIPPED">Shipped</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  <MenuItem value="FAILED">Failed</MenuItem>
               </TextField>

               {/* Courier Filter */}
               <TextField
                  select
                  size="small"
                  value={courierFilter}
                  onChange={(e) => setCourierFilter(e.target.value)}
                  sx={{ width: { xs: "48%", sm: 140 } }}
                  label="Courier"
               >
                  <MenuItem value="ALL">All Couriers</MenuItem>
                  {uniqueCouriers.map((c) => (
                     <MenuItem key={c} value={c}>
                        {c}
                     </MenuItem>
                  ))}
               </TextField>
            </Stack>
         </Stack>

         {/* Orders Table */}
         <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
            <Table size="small">
               <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                     <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                        Order ID
                     </TableCell>
                     <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                        Date & Time
                     </TableCell>
                     <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                        Amount
                     </TableCell>
                     <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                        Payment Status
                     </TableCell>
                     <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                        Order Status
                     </TableCell>
                     <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                        Courier Company
                     </TableCell>
                     <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                        Action
                     </TableCell>
                  </TableRow>
               </TableHead>
               <TableBody>
                  {filteredOrders.map((ord) => {
                     const isPaid = Number(ord.dueAmount || 0) <= 0;
                     const displayId = ord.orderCode || ord.orderId || ord.customId || `ORD_${ord.id}`;
                     return (
                        <TableRow key={ord.id} hover>
                           {/* Order ID - Clickable link to dedicated page */}
                           <TableCell sx={{ fontSize: "0.8rem", fontWeight: 700 }}>
                              <Typography
                                 variant="body2"
                                 fontWeight={700}
                                 color="primary.main"
                                 sx={{
                                    cursor: "pointer",
                                    display: "inline-block",
                                    "&:hover": { textDecoration: "underline" },
                                 }}
                                 onClick={() => handleOpenOrderDetails(ord)}
                              >
                                 {displayId}
                              </Typography>
                              {ord.invoiceNo && (
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                    sx={{ fontSize: "0.7rem" }}
                                 >
                                    {ord.invoiceNo}
                                 </Typography>
                              )}
                           </TableCell>

                           {/* Date */}
                           <TableCell sx={{ fontSize: "0.8rem" }}>
                              <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                                 {new Date(ord.createdAt).toLocaleDateString()}
                              </Typography>
                              <Typography
                                 variant="caption"
                                 color="text.secondary"
                                 sx={{ fontSize: "0.7rem" }}
                              >
                                 {new Date(ord.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                 })}
                              </Typography>
                           </TableCell>

                           {/* Amount */}
                           <TableCell
                              align="right"
                              sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                           >
                              {formatCurrency(Number(ord.total || 0))}
                           </TableCell>

                           {/* Payment Status */}
                           <TableCell align="center" sx={{ fontSize: "0.8rem" }}>
                              <Chip
                                 label={isPaid ? "PAID" : `DUE: ${formatCurrency(Number(ord.dueAmount || 0))}`}
                                 size="small"
                                 color={isPaid ? "success" : "warning"}
                                 sx={{ fontWeight: 700, height: 22, fontSize: "0.7rem" }}
                              />
                           </TableCell>

                           {/* Order Status */}
                           <TableCell align="center" sx={{ fontSize: "0.8rem" }}>
                              <Chip
                                 label={ord.status}
                                 size="small"
                                 color={statusColorMap[ord.status] || "default"}
                                 sx={{ fontWeight: 700, height: 22, fontSize: "0.7rem" }}
                              />
                           </TableCell>

                           {/* Courier Company */}
                           <TableCell sx={{ fontSize: "0.8rem" }}>
                              {ord.courier && ord.courier.trim() !== "" ? (
                                 <Stack direction="row" spacing={0.75} alignItems="center">
                                    <Icon icon="solar:delivery-bold" size="14px" />
                                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                                       {ord.courier}
                                    </Typography>
                                 </Stack>
                              ) : (
                                 <Typography variant="caption" color="text.secondary">
                                    Not Assigned
                                 </Typography>
                              )}
                           </TableCell>

                           {/* Actions */}
                           <TableCell align="right">
                              <Tooltip title="View Order Details Page">
                                 <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<Icon icon="solar:eye-bold" size="14px" />}
                                    sx={{
                                       textTransform: "none",
                                       py: 0.25,
                                       px: 1,
                                       fontSize: "0.75rem",
                                       fontWeight: 600,
                                    }}
                                    onClick={() => handleOpenOrderDetails(ord)}
                                 >
                                    View
                                 </Button>
                              </Tooltip>
                           </TableCell>
                        </TableRow>
                     );
                  })}

                  {filteredOrders.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                           {orders.length === 0
                              ? "No orders found for this customer."
                              : "No orders match the selected filters."}
                        </TableCell>
                     </TableRow>
                  )}
               </TableBody>
            </Table>
         </Paper>
      </Box>
   );
}
