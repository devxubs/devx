"use client";

import React, { useState } from "react";
import {
   Box,
   Button,
   Chip,
   Paper,
   Stack,
   Typography,
   Tooltip,
   IconButton,
   Avatar,
   alpha,
   useTheme,
   Divider,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { useSettings } from "@src/lib/settingsContext";
import { formatEmployeeCode } from "../helpers/trackingHelpers";

interface OrderOverviewSidebarProps {
   order: any;
   onOpenCustomerProfile?: (customerId: string) => void;
}

export default function OrderOverviewSidebar({
   order,
   onOpenCustomerProfile,
}: OrderOverviewSidebarProps) {
   const theme = useTheme();
   const { formatCurrency } = useSettings();

   const [copiedPhone, setCopiedPhone] = useState(false);
   const [copiedTracking, setCopiedTracking] = useState(false);

   const customer = order?.customer;
   const employee = order?.employee;
   const cleanEmployeeId = formatEmployeeCode(employee, employee?.id);

   const isPaid = Number(order?.dueAmount || 0) <= 0;
   const isCancelledOrder = ["CANCELLED", "FAILED", "RETURNED"].includes(
      String(order?.status || "").toUpperCase(),
   );
   const trackingRef = order?.referenceId || order?.courierTrackingId || "";

   const handleCopyPhone = () => {
      if (!customer?.phone) return;
      navigator.clipboard.writeText(String(customer.phone));
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
   };

   const handleCopyTracking = () => {
      if (!trackingRef) return;
      navigator.clipboard.writeText(trackingRef);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2000);
   };

   // Customer initials
   const customerInitials = (customer?.name || "W")
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

   // Staff initials
   const staffInitials = (employee?.name || "A")
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

   return (
      <Stack spacing={2.5}>
         {/* ============================================================== */}
         {/* 1. CUSTOMER PROFILE CARD                                       */}
         {/* ============================================================== */}
         <Paper
            variant="outlined"
            sx={{
               borderRadius: 1,
               bgcolor: "background.paper",
               overflow: "hidden",
               borderColor: "divider",
            }}
         >
            {/* Card Header */}
            <Box
               sx={{
                  px: 2,
                  py: 1.25,
                  bgcolor: alpha(theme.palette.info.main, 0.05),
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
               }}
            >
               <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                     sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0.75,
                        bgcolor: alpha(theme.palette.info.main, 0.12),
                        color: "info.main",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                     }}
                  >
                     <Icon icon="solar:user-bold" size="14px" />
                  </Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing="0.04em">
                     CUSTOMER
                  </Typography>
               </Stack>

               {customer && (
                  <Chip
                     label={customer.customId || "CUS"}
                     size="small"
                     color="info"
                     variant="outlined"
                     sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
                  />
               )}
            </Box>

            {/* Card Body */}
            <Box sx={{ p: 2 }}>
               <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                  <Avatar
                     sx={{
                        width: 40,
                        height: 40,
                        bgcolor: alpha(theme.palette.info.main, 0.12),
                        color: "info.main",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        border: `1px solid ${alpha(theme.palette.info.main, 0.25)}`,
                     }}
                  >
                     {customerInitials}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                     <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        noWrap
                        sx={{
                           cursor: customer ? "pointer" : "default",
                           "&:hover": customer ? { color: "primary.main", textDecoration: "underline" } : {},
                        }}
                        onClick={() => customer && onOpenCustomerProfile && onOpenCustomerProfile(customer.id || customer.customId)}
                     >
                        {customer?.name || "Walk-in Customer"}
                     </Typography>

                     {customer?.email ? (
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                           {customer.email}
                        </Typography>
                     ) : (
                        <Typography variant="caption" color="text.disabled">
                           No email provided
                        </Typography>
                     )}
                  </Box>
               </Stack>

               <Divider sx={{ my: 1.5, borderColor: "divider" }} />

               {/* Contact details */}
               <Stack spacing={1}>
                  {customer?.phone && (
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                           <Icon icon="solar:phone-bold" size="14px" color="secondary" />
                           <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.825rem" }}>
                              {customer.phone}
                           </Typography>
                        </Stack>

                        <Stack direction="row" spacing={0.5}>
                           <Tooltip title={copiedPhone ? "Copied!" : "Copy phone"}>
                              <IconButton size="small" onClick={handleCopyPhone} sx={{ p: 0.5 }}>
                                 <Icon
                                    icon={copiedPhone ? "solar:check-read-bold" : "solar:copy-bold"}
                                    size="14px"
                                    color={copiedPhone ? "success" : "default"}
                                 />
                              </IconButton>
                           </Tooltip>
                           <Tooltip title="Call now">
                              <IconButton
                                 size="small"
                                 color="primary"
                                 onClick={() => window.open(`tel:${customer.phone}`)}
                                 sx={{ p: 0.5 }}
                              >
                                 <Icon icon="solar:outgoing-call-rounded-bold" size="14px" />
                              </IconButton>
                           </Tooltip>
                        </Stack>
                     </Stack>
                  )}

                  {customer?.address && (
                     <Stack direction="row" spacing={1} alignItems="flex-start" mt={0.5}>
                        <Box sx={{ mt: 0.25 }}>
                           <Icon icon="solar:map-point-bold" size="14px" color="secondary" />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                           {customer.address}
                        </Typography>
                     </Stack>
                  )}
               </Stack>

               {customer && onOpenCustomerProfile && (
                  <Button
                     fullWidth
                     size="small"
                     variant="outlined"
                     color="inherit"
                     endIcon={<Icon icon="solar:arrow-right-linear" size="14px" />}
                     onClick={() => onOpenCustomerProfile(customer.id || customer.customId)}
                     sx={{
                        mt: 2,
                        textTransform: "none",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        borderRadius: 1,
                        borderColor: "divider",
                        "&:hover": { borderColor: "info.main", bgcolor: alpha(theme.palette.info.main, 0.04) },
                     }}
                  >
                     View Profile & Analytics
                  </Button>
               )}
            </Box>
         </Paper>

         {/* ============================================================== */}
         {/* 2. PAYMENT & SETTLEMENT CARD                                   */}
         {/* ============================================================== */}
         <Paper
            variant="outlined"
            sx={{
               borderRadius: 1,
               bgcolor: "background.paper",
               overflow: "hidden",
               borderColor: "divider",
            }}
         >
            <Box
               sx={{
                  px: 2,
                  py: 1.25,
                  bgcolor: alpha(
                     isCancelledOrder
                        ? theme.palette.error.main
                        : isPaid
                          ? theme.palette.success.main
                          : theme.palette.warning.main,
                     0.05,
                  ),
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
               }}
            >
               <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                     sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0.75,
                        bgcolor: alpha(
                           isCancelledOrder
                              ? theme.palette.error.main
                              : isPaid
                                ? theme.palette.success.main
                                : theme.palette.warning.main,
                           0.12,
                        ),
                        color: isCancelledOrder
                           ? "error.main"
                           : isPaid
                             ? "success.main"
                             : "warning.main",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                     }}
                  >
                     <Icon icon="solar:wallet-money-bold" size="14px" />
                  </Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing="0.04em">
                     PAYMENT SETTLEMENT
                  </Typography>
               </Stack>

               <Chip
                  label={isCancelledOrder ? "CANCELLED" : isPaid ? "PAID" : "DUE"}
                  size="small"
                  color={isCancelledOrder ? "error" : isPaid ? "success" : "warning"}
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
               />
            </Box>

            <Box sx={{ p: 2 }}>
               <Typography variant="body1" fontWeight={700} mb={1.5}>
                  {order?.paymentMethod || "Cash on Delivery"}
               </Typography>

               <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="caption" color="text.secondary">
                        Advance Payment:
                     </Typography>
                     <Typography variant="body2" fontWeight={600} color="success.main">
                        {formatCurrency(Number(order?.advancePayment || 0))}
                     </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="caption" color="text.secondary">
                        Outstanding Due:
                     </Typography>
                     <Typography
                        variant="body2"
                        fontWeight={700}
                        color={
                           isCancelledOrder
                              ? "text.disabled"
                              : Number(order?.dueAmount || 0) > 0
                                ? "warning.main"
                                : "text.secondary"
                        }
                        sx={isCancelledOrder ? { textDecoration: "line-through" } : undefined}
                     >
                        {formatCurrency(Number(order?.dueAmount || 0))}
                        {isCancelledOrder && " (Void)"}
                     </Typography>
                  </Stack>

                  <Divider sx={{ my: 0.5, borderColor: "divider" }} />

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Sales Channel:
                     </Typography>
                     <Typography variant="caption" fontWeight={700} color="text.primary">
                        {order?.orderSource || "Direct Sales"}
                     </Typography>
                  </Stack>
               </Stack>
            </Box>
         </Paper>

         {/* ============================================================== */}
         {/* 3. FULFILLMENT & LOGISTICS CARD                                */}
         {/* ============================================================== */}
         <Paper
            variant="outlined"
            sx={{
               borderRadius: 1,
               bgcolor: "background.paper",
               overflow: "hidden",
               borderColor: "divider",
            }}
         >
            <Box
               sx={{
                  px: 2,
                  py: 1.25,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
               }}
            >
               <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                     sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0.75,
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: "primary.main",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                     }}
                  >
                     <Icon icon="solar:delivery-bold" size="14px" />
                  </Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing="0.04em">
                     FULFILLMENT & DELIVERY
                  </Typography>
               </Stack>

               <Chip
                  label={order?.courierStatus || order?.status || "PENDING"}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
               />
            </Box>

            <Box sx={{ p: 2 }}>
               <Typography variant="body1" fontWeight={700} mb={1.5}>
                  {order?.courier
                     ? `${order.courier} (Courier)`
                     : order?.orderType === "Home Delivery"
                       ? "Home Delivery"
                       : order?.orderType === "Store Pickup" || order?.orderType === "Direct Store Pickup"
                         ? "Direct Store Pickup"
                         : "In-House Delivery"}
               </Typography>

               <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Fulfillment Method:
                     </Typography>
                     <Typography variant="caption" fontWeight={700} color="text.primary">
                        {order?.courier
                           ? "Third-Party Courier"
                           : order?.orderType === "Store Pickup" || order?.orderType === "Direct Store Pickup"
                             ? "Customer Store Pickup"
                             : "In-House Delivery"}
                     </Typography>
                  </Stack>

                  {trackingRef ? (
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                           Tracking ID:
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                           <Typography
                              variant="caption"
                              fontWeight={700}
                              sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                           >
                              {trackingRef}
                           </Typography>
                           <Tooltip title={copiedTracking ? "Copied!" : "Copy Tracking ID"}>
                              <IconButton size="small" onClick={handleCopyTracking} sx={{ p: 0.25 }}>
                                 <Icon
                                    icon={copiedTracking ? "solar:check-read-bold" : "solar:copy-bold"}
                                    size="13px"
                                    color={copiedTracking ? "success" : "default"}
                                 />
                              </IconButton>
                           </Tooltip>
                        </Stack>
                     </Stack>
                  ) : (
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                           Tracking ID:
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                           No tracking assigned
                        </Typography>
                     </Stack>
                  )}

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Delivery Charge:
                     </Typography>
                     <Typography variant="body2" fontWeight={600} color="text.primary">
                        {formatCurrency(Number(order?.deliveryCharge || 0))}
                     </Typography>
                  </Stack>
               </Stack>
            </Box>
         </Paper>

         {/* ============================================================== */}
         {/* 4. HANDLING STAFF ATTRIBUTION CARD                             */}
         {/* ============================================================== */}
         <Paper
            variant="outlined"
            sx={{
               borderRadius: 1,
               bgcolor: "background.paper",
               overflow: "hidden",
               borderColor: "divider",
            }}
         >
            <Box
               sx={{
                  px: 2,
                  py: 1.25,
                  bgcolor: alpha(theme.palette.secondary.main, 0.05),
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
               }}
            >
               <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                     sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0.75,
                        bgcolor: alpha(theme.palette.secondary.main, 0.12),
                        color: "secondary.main",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                     }}
                  >
                     <Icon icon="solar:user-hand-up-bold" size="14px" />
                  </Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing="0.04em">
                     ATTRIBUTED STAFF
                  </Typography>
               </Stack>

               <Chip
                  label={`ID: ${cleanEmployeeId}`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
               />
            </Box>

            <Box sx={{ p: 2 }}>
               <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                  <Avatar
                     sx={{
                        width: 38,
                        height: 38,
                        bgcolor: alpha(theme.palette.secondary.main, 0.12),
                        color: "secondary.main",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`,
                     }}
                  >
                     {staffInitials}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                     <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {employee?.name || "DevX POS Administrator"}
                     </Typography>
                     <Typography variant="caption" color="text.secondary" display="block">
                        Order Fulfillment / Billing
                     </Typography>
                  </Box>
               </Stack>

               <Stack spacing={0.75}>
                  {employee?.phoneNumber && (
                     <Stack direction="row" spacing={1} alignItems="center">
                        <Icon icon="solar:phone-bold" size="13px" color="secondary" />
                        <Typography variant="caption" color="text.secondary">
                           {employee.phoneNumber}
                        </Typography>
                     </Stack>
                  )}

                  {employee?.email && (
                     <Stack direction="row" spacing={1} alignItems="center">
                        <Icon icon="solar:letter-bold" size="13px" color="secondary" />
                        <Typography variant="caption" color="text.secondary" noWrap>
                           {employee.email}
                        </Typography>
                     </Stack>
                  )}
               </Stack>
            </Box>
         </Paper>
      </Stack>
   );
}
