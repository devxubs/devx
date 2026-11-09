"use client";

import React, { useState } from "react";
import {
   Box,
   Button,
   CircularProgress,
   Grid,
   Stack,
   Typography,
   Alert,
   Snackbar,
} from "@mui/material";
import { useRouter } from "next/navigation";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import CustomerDetailModal from "@src/Pages/admin/Customers/CustomerDetailModal";
import QuickEditModal from "../QuickEditModal";
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
   const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
   const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
   const [isUpdatingQuickEdit, setIsUpdatingQuickEdit] = useState(false);

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
            />

            {/* Feedback alert */}
            {feedback && (
               <Snackbar
                  open={Boolean(feedback)}
                  autoHideDuration={3000}
                  onClose={() => setFeedback(null)}
                  anchorOrigin={{ vertical: "top", horizontal: "right" }}
               >
                  <Alert
                     severity={feedback.type}
                     onClose={() => setFeedback(null)}
                     sx={{ width: "100%", borderRadius: 1 }}
                  >
                     {feedback.message}
                  </Alert>
               </Snackbar>
            )}

            {/* ============================================================ */}
            {/* 2. DUAL-COLUMN LAYOUT (Main Order Flow + Sidebar Context)    */}
            {/* ============================================================ */}
            <Grid container spacing={3} alignItems="flex-start">
               {/* LEFT MAIN COLUMN: Order Items, Financials, Timeline, Notes, Activity */}
               <Grid size={{ xs: 12, lg: 8 }}>
                  <Stack spacing={3}>
                     {/* SECTION 1: ORDER ITEMS & FINANCIAL SETTLEMENT */}
                     <OrderItemsTable
                        items={order.items || []}
                        subtotal={order.subtotal || 0}
                        deliveryCharge={order.deliveryCharge || 0}
                        discount={order.discount || 0}
                        tax={order.tax || 0}
                        total={order.total || 0}
                        advancePayment={order.advancePayment || 0}
                        dueAmount={order.dueAmount || 0}
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
      </Box>
   );
}

export * from "./components";
export * from "./hooks";
export * from "./helpers";
export * from "./types";

