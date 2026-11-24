"use client";

import React, { useState } from "react";
import {
   Box,
   Button,
   CircularProgress,
   Grid,
   Stack,
   Typography,
} from "@mui/material";
import { useSnackbar } from "@src/lib/snackbarContext";
import { useRouter } from "next/navigation";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import AlertDialog from "@src/components/AlertDialog";
import CustomerDetailModal from "@src/Pages/admin/Customers/CustomerDetailModal";
import QuickEditModal from "../QuickEditModal";
import { displayOrderDiscount, displayOrderTax } from "@src/lib/orderMoney";
import { useOrderDetails } from "./hooks/useOrderDetails";
import { OrderDetailsPageProps } from "./types";
import {
   OrderHeader,
   OrderOverviewSidebar,
   OrderItemsTable,
   OrderNotes,
   OrderTracking,
   EmployeeActivityTimeline,
} from "./components";

export default function OrderDetailsPage({ orderId }: OrderDetailsPageProps = {}) {
   const router = useRouter();

   const {
      order,
      loading,
      error,
      feedback,
      notes,
      quickEditProducts,
      isCancelledOrder,
      displayOrderId,
      orderDate,
      setOrder,
      setFeedback,
      fetchOrder,
      handlePrintInvoice,
   } = useOrderDetails(orderId);

   // Modal states
   const { showSnackbar } = useSnackbar();
   const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);

   React.useEffect(() => {
      if (feedback) {
         showSnackbar(feedback.message, feedback.type);
         setFeedback(null);
      }
   }, [feedback, setFeedback, showSnackbar]);
   const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
   const [isUpdatingQuickEdit, setIsUpdatingQuickEdit] = useState(false);
   // OBS-C4: direct cancel from the details page.
   const [cancelOpen, setCancelOpen] = useState(false);
   const [cancelling, setCancelling] = useState(false);

   const statusUpper = String(order?.status || "").toUpperCase();
   const canCancelOrder =
      Boolean(order) &&
      !["CANCELLED", "FAILED", "COMPLETED", "DELIVERED", "RETURNED"].includes(statusUpper);

   const handleCancelOrder = async () => {
      if (!order) return;
      setCancelling(true);
      try {
         const res = await fetch(`/api/orders/${order.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Cancelled" }),
         });
         const data = await res.json().catch(() => ({}));
         if (!res.ok) {
            throw new Error(data.message || data.error || "Failed to cancel order");
         }
         setCancelOpen(false);
         setFeedback({ type: "success", message: "Order cancelled." });
         await fetchOrder();
      } catch (err: any) {
         setFeedback({
            type: "error",
            message: err?.message || "Failed to cancel order",
         });
      } finally {
         setCancelling(false);
      }
   };

   if (loading) {
      return (
         <Stack alignItems="center" justifyContent="center" height="70vh">
            <CircularProgress />
         </Stack>
      );
   }

   if (error || !order) {
      return (
         <Stack spacing={2} alignItems="center" justifyContent="center" height="70vh">
            <Typography variant="h6" color="error">
               {error || "Order not found"}
            </Typography>
            <Button
               variant="outlined"
               startIcon={<Icon icon="solar:arrow-left-linear" size="small" />}
               onClick={() => router.push("/admin/order")}
            >
               Back to Orders
            </Button>
         </Stack>
      );
   }

   return (
      <Box sx={{ maxWidth: 1320, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
         <Stack spacing={3}>
            {/* ============================================================ */}
            {/* 1. ORDER HEADER & TOOLBAR                                    */}
            {/* ============================================================ */}
            <OrderHeader
               displayOrderId={displayOrderId}
               status={order.status}
               invoiceNo={order.invoiceNo}
               orderDate={orderDate}
               orderId={order.id}
               onOpenQuickEdit={() => setIsQuickEditOpen(true)}
               onPrintInvoice={handlePrintInvoice}
               onCancelOrder={canCancelOrder ? () => setCancelOpen(true) : undefined}
            />

            {/* ============================================================ */}
            {/* 2. DUAL-COLUMN LAYOUT (Main Order Flow + Sidebar Context)    */}
            {/* ============================================================ */}
            <Grid container spacing={3} alignItems="flex-start">
               {/* LEFT MAIN COLUMN: Order Items, Financials, Timeline, Notes, Activity */}
               <Grid size={{ xs: 12, lg: 8 }}>
                  <Stack spacing={3}>
                     {/* SECTION 1: ORDER ITEMS & FINANCIAL SETTLEMENT */}
                     {/* O1 display: OrderItemsTable prints discount AND
                         tax rows, so show the TRUE breakdown from
                         orderTags (overall discount / tax amount) —
                         the stored discount is the tax-folded
                         submitted value and the Order model has no
                         tax field. Rows reconcile:
                         Subtotal − Overall Discount + Tax + Delivery
                         = Total. */}
                     <OrderItemsTable
                        items={order.items || []}
                        subtotal={order.subtotal || 0}
                        deliveryCharge={order.deliveryCharge || 0}
                        discount={displayOrderDiscount(order)}
                        tax={displayOrderTax(order)}
                        total={order.total || 0}
                        advancePayment={order.advancePayment || 0}
                        dueAmount={order.dueAmount || 0}
                        overpaidAmount={order.overpaidAmount}
                        isCancelled={isCancelledOrder}
                     />

                     {/* SECTION 2: ORDER LIFECYCLE & TRACKING TIMELINE */}
                     <OrderTracking order={order} />

                     {/* SECTION 3: ORDER NOTES & SPECIAL INSTRUCTIONS */}
                     <OrderNotes
                        orderId={order.id}
                        initialCourierNote={notes.courierNote}
                        initialCustomerNote={notes.customerNote}
                        initialPackingNote={notes.packingNote}
                        initialEmployeeNote={notes.employeeNote}
                        onNotesUpdated={(updated) => {
                           if (updated) {
                              setOrder(updated);
                           } else {
                              fetchOrder();
                           }
                        }}
                     />

                     {/* SECTION 4: OPERATIONAL AUDIT & EMPLOYEE ACTIVITY */}
                     <EmployeeActivityTimeline order={order} />
                  </Stack>
               </Grid>

               {/* RIGHT SIDEBAR COLUMN: Customer, Payment, Delivery, Staff */}
               <Grid size={{ xs: 12, lg: 4 }}>
                  <OrderOverviewSidebar
                     order={order}
                     onOpenCustomerProfile={(cusId) => setSelectedCustomerId(cusId)}
                     onOrderUpdated={(updated) => {
                        setOrder(updated);
                        setFeedback({
                           type: "success",
                           message: "Payment verification updated",
                        });
                     }}
                  />
               </Grid>
            </Grid>
         </Stack>

         {/* ============================================================ */}
         {/* MODALS                                                       */}
         {/* ============================================================ */}

         {/* Quick Edit Products Modal */}
         <CustomModal
            title="Quick Edit Order Items"
            open={isQuickEditOpen}
            onClose={() => setIsQuickEditOpen(false)}
            closeIcon={true}
            sx={{ width: { xs: "95%", sm: 600, md: 700 } }}
         >
            <QuickEditModal
               products={quickEditProducts as any}
               isLoading={isUpdatingQuickEdit}
               onClose={() => setIsQuickEditOpen(false)}
               onUpdate={async (updatedProducts) => {
                  setIsUpdatingQuickEdit(true);
                  try {
                     const res = await fetch(`/api/orders/${order.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                           items: updatedProducts.map((p) => ({
                              orderItemId: p.orderItemId || undefined,
                              productId: p.productId || null,
                              name: p.name,
                              quantity: Number(p.quantity) || 1,
                              price: Number(p.price) || 0,
                              subtotal: Number(p.subtotal ?? (Number(p.price) * Number(p.quantity))),
                              code: p.code || "",
                           })),
                        }),
                     });
                     const data = await res.json();
                     if (!res.ok) {
                        throw new Error(data.message || data.error || "Failed to update order items");
                     }
                     setIsQuickEditOpen(false);
                     setFeedback({
                        type: "success",
                        message: "Order items updated successfully",
                     });
                     await fetchOrder();
                  } catch (err: any) {
                     setFeedback({
                        type: "error",
                        message: err.message || "Failed to update order",
                     });
                     throw err;
                  } finally {
                     setIsUpdatingQuickEdit(false);
                  }
               }}
            />
         </CustomModal>

         {/* Customer Profile & Analytics Modal */}
         <CustomerDetailModal
            open={Boolean(selectedCustomerId)}
            onClose={() => setSelectedCustomerId(null)}
            customerId={selectedCustomerId}
         />

         {/* OBS-C4: cancel confirmation — the API restores the
             order's stock and writes the cancellation audit event. */}
         <AlertDialog
            open={cancelOpen}
            onClose={() => !cancelling && setCancelOpen(false)}
            onConfirm={handleCancelOrder}
            type={"confirm"}
            confirmText={cancelling ? "Cancelling..." : "Cancel Order"}
            title={`Cancel order <b>${displayOrderId}</b>? Its reserved stock will be restored.`}
         />
      </Box>
   );
}

export * from "./components";
export * from "./hooks";
export * from "./helpers";
export * from "./types";

