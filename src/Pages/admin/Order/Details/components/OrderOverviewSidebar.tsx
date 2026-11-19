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
   TextField,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { useSettings } from "@src/lib/settingsContext";
import { formatEmployeeCode } from "../helpers/trackingHelpers";

interface OrderOverviewSidebarProps {
   order: any;
   onOpenCustomerProfile?: (customerId: string) => void;
   /** Phase 3B: called with the fresh order after a payment
    * verification change so the page state stays in sync. */
   onOrderUpdated?: (order: any) => void;
}

const PAYMENT_VERIFICATION_META: Record<
   string,
   { label: string; color: "success" | "warning" | "error" }
> = {
   VERIFIED: { label: "Verified", color: "success" },
   MISMATCHED: { label: "Mismatched", color: "error" },
   UNVERIFIED: { label: "Unverified", color: "warning" },
};

export default function OrderOverviewSidebar({
   order,
   onOpenCustomerProfile,
   onOrderUpdated,
}: OrderOverviewSidebarProps) {
   const theme = useTheme();
   const { formatCurrency } = useSettings();

   const [copiedPhone, setCopiedPhone] = useState(false);
   const [copiedTracking, setCopiedTracking] = useState(false);
   const [verificationSaving, setVerificationSaving] = useState(false);
   const [verificationError, setVerificationError] = useState<string | null>(null);

   const verificationStatus = String(order?.paymentStatus || "UNVERIFIED");
   const verificationMeta =
      PAYMENT_VERIFICATION_META[verificationStatus] || PAYMENT_VERIFICATION_META.UNVERIFIED;

   const handleVerificationChange = async (next: string) => {
      if (!order?.id || verificationSaving) return;
      setVerificationSaving(true);
      setVerificationError(null);
      try {
         const res = await fetch(`/api/orders/${order.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentStatus: next }),
         });
         const data = await res.json().catch(() => ({}));
         if (!res.ok) {
            throw new Error(data.message || data.error || "Failed to update verification");
         }
         onOrderUpdated?.(data);
      } catch (err: any) {
         setVerificationError(err?.message || "Failed to update verification");
      } finally {
         setVerificationSaving(false);
      }
   };

   // Phase 4 (D3): courier booking identifiers — manual edit via
   // the same order PUT the verification control above uses.
   const [courierEditing, setCourierEditing] = useState(false);
   const [courierDraft, setCourierDraft] = useState({
      consignmentId: "",
      trackingCode: "",
      providerStatus: "",
   });
   const [courierSaving, setCourierSaving] = useState(false);
   const [courierError, setCourierError] = useState<string | null>(null);

   const startCourierEdit = () => {
      setCourierDraft({
         consignmentId: order?.courierConsignmentId || "",
         trackingCode: order?.courierTrackingCode || "",
         providerStatus: order?.courierProviderStatus || "",
      });
      setCourierError(null);
      setCourierEditing(true);
   };

   const handleCourierSave = async () => {
      if (!order?.id || courierSaving) return;
      setCourierSaving(true);
      setCourierError(null);
      try {
         const res = await fetch(`/api/orders/${order.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               courierConsignmentId: courierDraft.consignmentId,
               courierTrackingCode: courierDraft.trackingCode,
               courierProviderStatus: courierDraft.providerStatus,
            }),
         });
         const data = await res.json().catch(() => ({}));
         if (!res.ok) {
            throw new Error(data.message || data.error || "Failed to save courier details");
         }
         onOrderUpdated?.(data);
         setCourierEditing(false);
      } catch (err: any) {
         setCourierError(err?.message || "Failed to save courier details");
      } finally {
         setCourierSaving(false);
      }
   };

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
                           <Tooltip title={copiedPhone ? "Copied!" : "Copy phone"} disableInteractive>
                              <IconButton size="small" onClick={handleCopyPhone} sx={{ p: 0.5 }}>
                                 <Icon
                                    icon={copiedPhone ? "solar:check-read-bold" : "solar:copy-bold"}
                                    size="14px"
                                    color={copiedPhone ? "success" : "default"}
                                 />
                              </IconButton>
                           </Tooltip>
                           <Tooltip title="Call now" disableInteractive>
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

                  {/* Phase 3B (3.6): reconciliation references +
                      verification state. Verification is a manual
                      staff action — nothing auto-verifies a payment. */}
                  {(order?.paymentTxId || order?.paymentSenderNumber) && (
                     <>
                        {order?.paymentTxId ? (
                           <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                 Transaction ID:
                              </Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ fontFamily: "monospace" }}>
                                 {order.paymentTxId}
                              </Typography>
                           </Stack>
                        ) : null}
                        {order?.paymentSenderNumber ? (
                           <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                 Sender Number:
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                 {order.paymentSenderNumber}
                              </Typography>
                           </Stack>
                        ) : null}
                     </>
                  )}

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="caption" color="text.secondary">
                        Payment Verification:
                     </Typography>
                     <Chip
                        label={verificationMeta.label}
                        size="small"
                        color={verificationMeta.color}
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
                     />
                  </Stack>
                  {!isCancelledOrder && (
                     <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {verificationStatus !== "VERIFIED" && (
                           <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              disabled={verificationSaving}
                              onClick={() => handleVerificationChange("VERIFIED")}
                           >
                              Mark Verified
                           </Button>
                        )}
                        {verificationStatus !== "MISMATCHED" && (
                           <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              disabled={verificationSaving}
                              onClick={() => handleVerificationChange("MISMATCHED")}
                           >
                              Flag Mismatch
                           </Button>
                        )}
                        {verificationStatus !== "UNVERIFIED" && (
                           <Button
                              size="small"
                              variant="text"
                              color="inherit"
                              disabled={verificationSaving}
                              onClick={() => handleVerificationChange("UNVERIFIED")}
                           >
                              Reset
                           </Button>
                        )}
                     </Stack>
                  )}
                  {verificationError && (
                     <Typography variant="caption" color="error.main">
                        {verificationError}
                     </Typography>
                  )}

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
                           <Tooltip title={copiedTracking ? "Copied!" : "Copy Tracking ID"} disableInteractive>
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

                  <Divider />

                  {/* Phase 4 (D3): the courier provider's own booking
                      identifiers (Order columns) — manual entry only,
                      no live integration. Kept distinct from the
                      legacy Tracking ID row above, which reads the
                      orderTags reference. courierLastSyncAt is
                      stamped by the API whenever these fields are
                      saved; it is captioned "Courier updated" here
                      because edits are manual. */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                     <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing="0.04em">
                        COURIER BOOKING
                     </Typography>
                     {!courierEditing && (
                        <Button
                           size="small"
                           variant="text"
                           onClick={startCourierEdit}
                           sx={{ minWidth: 0, px: 0.5, fontSize: "0.72rem" }}
                        >
                           {order?.courierConsignmentId ||
                           order?.courierTrackingCode ||
                           order?.courierProviderStatus
                              ? "Edit"
                              : "Add"}
                        </Button>
                     )}
                  </Stack>

                  {!courierEditing ? (
                     <>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                           <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              Consignment ID:
                           </Typography>
                           <Typography variant="caption" fontWeight={700} sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                              {order?.courierConsignmentId || "—"}
                           </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                           <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              Tracking Code:
                           </Typography>
                           <Typography variant="caption" fontWeight={700} sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                              {order?.courierTrackingCode || "—"}
                           </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                           <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              Provider Status:
                           </Typography>
                           <Typography variant="caption" fontWeight={700} color="text.primary">
                              {order?.courierProviderStatus || "—"}
                           </Typography>
                        </Stack>
                        {order?.courierLastSyncAt && (
                           <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                 Courier updated:
                              </Typography>
                              <Typography variant="caption" color="text.primary">
                                 {new Date(order.courierLastSyncAt).toLocaleString()}
                              </Typography>
                           </Stack>
                        )}
                     </>
                  ) : (
                     <Stack spacing={1}>
                        <TextField
                           label="Consignment ID"
                           size="small"
                           fullWidth
                           value={courierDraft.consignmentId}
                           onChange={(e) =>
                              setCourierDraft((d) => ({ ...d, consignmentId: e.target.value }))
                           }
                        />
                        <TextField
                           label="Tracking Code"
                           size="small"
                           fullWidth
                           value={courierDraft.trackingCode}
                           onChange={(e) =>
                              setCourierDraft((d) => ({ ...d, trackingCode: e.target.value }))
                           }
                        />
                        <TextField
                           label="Provider Status"
                           size="small"
                           fullWidth
                           value={courierDraft.providerStatus}
                           onChange={(e) =>
                              setCourierDraft((d) => ({ ...d, providerStatus: e.target.value }))
                           }
                           placeholder="e.g. In Transit, Delivered"
                        />
                        {courierError && (
                           <Typography variant="caption" color="error.main">
                              {courierError}
                           </Typography>
                        )}
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                           <Button
                              size="small"
                              variant="outlined"
                              color="inherit"
                              disabled={courierSaving}
                              onClick={() => setCourierEditing(false)}
                           >
                              Cancel
                           </Button>
                           <Button
                              size="small"
                              variant="contained"
                              disabled={courierSaving}
                              onClick={handleCourierSave}
                           >
                              {courierSaving ? "Saving…" : "Save"}
                           </Button>
                        </Stack>
                     </Stack>
                  )}
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
