import React, { useState, useCallback, useEffect } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import Icon from "@src/components/Icon";
import {
   CancellationCategoryFields,
   buildCancellationReason,
} from "../components/CancellationCategoryFields";
import { useParams } from "next/navigation";
import { QuickEditModalProps } from "./types";
import {
   useQuickEditNotes,
   useQuickEditProducts,
   useQuickEditOrder,
} from "./hooks";
import {
   QuickEditHeader,
   QuickEditFooter,
   QuickEditCustomerSection,
   QuickEditItemsSection,
   QuickEditPricingSection,
   QuickEditNotesSection,
} from "./components";

export const QuickEdit: React.FC<QuickEditModalProps> = ({
   products = [],
   order,
   orderId,
   isLoading = false,
   onClose,
   onUpdate,
}) => {
   const params = useParams();

   const effectiveOrderId =
      orderId ||
      order?.orderCode ||
      order?.orderId ||
      order?.id ||
      (params?.id as string);

   const [errorMessage, setErrorMessage] = useState<string | null>(null);
   const [isSubmitting, setIsSubmitting] = useState(false);

   // 1. Notes Management Hook
   const { notes, initNotes, handleAddNote } = useQuickEditNotes(order);

   // 2. Products Management Hook
   const {
      editableProducts,
      handleUpdateQuantity,
      handleUpdatePrice,
      handleUpdateSubtotal,
      handleUpdateVariant,
      handleRemoveItem,
      handleAddItem,
      calculatedSubtotal,
   } = useQuickEditProducts(products);

   // 3. Order & Pricing Management Hook
   const {
      customer,
      pricing,
      status,
      setStatus,
      initialStatus,
      orderSource,
      setOrderSource,
      courier,
      setCourier,
      orderNote,
      isFetchingOrder,
      handleCustomerFieldChange,
      handlePricingFieldChange,
   } = useQuickEditOrder({
      order,
      effectiveOrderId,
      calculatedSubtotal,
      onOrderFetched: initNotes,
   });

   // D2 (plan §4.5 / Step 7): a transition INTO CANCELLED requires a
   // structured category. Editing an order that is ALREADY cancelled
   // (initialStatus === CANCELLED) never forces a category and never
   // rewrites its existing cancellationReason — the field is simply
   // omitted from the PUT in that case.
   const [cancellationCategory, setCancellationCategory] = useState("");
   const [cancellationNote, setCancellationNote] = useState("");
   const isCancelling =
      String(status || "").toUpperCase() === "CANCELLED" &&
      String(initialStatus || "").toUpperCase() !== "CANCELLED";

   // Fresh category state per order opened in this modal.
   useEffect(() => {
      setCancellationCategory("");
      setCancellationNote("");
   }, [effectiveOrderId]);

   // Wrapped remove item with error validation
   const onRemoveProduct = useCallback(
      (index: number) => {
         const removed = handleRemoveItem(index);
         if (!removed) {
            setErrorMessage("Order must contain at least one product item.");
         } else {
            setErrorMessage(null);
         }
      },
      [handleRemoveItem],
   );

   // Wrapped add product with clear error
   const onAddProduct = useCallback(
      (catalogProd: any) => {
         setErrorMessage(null);
         handleAddItem(catalogProd);
      },
      [handleAddItem],
   );

   // Form Submit Handler
   const handleSubmit = async () => {
      if (isLoading || isSubmitting) return;

      if (editableProducts.length === 0) {
         setErrorMessage("Order must contain at least one product item.");
         return;
      }

      for (const p of editableProducts) {
         if (p.variants && p.variants.length > 0 && !p.variantId) {
            setErrorMessage(`Select a variant for "${p.name}".`);
            return;
         }
         if (p.quantity < 1) {
            setErrorMessage(`Quantity for "${p.name}" must be at least 1.`);
            return;
         }
         if (p.price < 0) {
            setErrorMessage(`Price for "${p.name}" cannot be negative.`);
            return;
         }
      }

      if (isCancelling && !cancellationCategory) {
         setErrorMessage(
            "Select a cancellation category before cancelling this order.",
         );
         return;
      }

      setErrorMessage(null);
      setIsSubmitting(true);

      const customerNote =
         notes.find((n) => n.type === "customer")?.content || orderNote;
      const courierNote =
         notes.find((n) => n.type === "courier")?.content || undefined;
      const packingNote =
         notes.find((n) => n.type === "packing")?.content || undefined;
      const employeeNote =
         notes.find((n) => n.type === "employee")?.content || undefined;

      const extraFields = {
         customer,
         pricing,
         status,
         orderSource,
         orderNote: customerNote,
         courier,
         deliveryCharge: pricing.deliveryCharge,
         discount: pricing.discount,
         advancePayment: pricing.advancePayment,
         paymentMethod: pricing.paymentMethod,
         notes,
      };

      try {
         // Update full order details via atomic API transaction if order ID is present
         if (effectiveOrderId) {
            const res = await fetch(`/api/orders/${effectiveOrderId}`, {
               method: "PUT",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  items: editableProducts.map((p) => ({
                     orderItemId: p.orderItemId || undefined,
                     productId: p.productId || null,
                     // INV-02: send the variant explicitly when the
                     // line carries one; when absent the API preserves
                     // the stored variant for existing lines.
                     ...(p.variantId ? { variantId: p.variantId } : {}),
                     name: p.name,
                     code: p.code || "",
                     quantity: Number(p.quantity) || 1,
                     price: Number(p.price) || 0,
                     subtotal: Number(
                        p.subtotal ?? Number(p.price) * Number(p.quantity),
                     ),
                  })),
                  customer,
                  deliveryCharge: pricing.deliveryCharge,
                  discount: pricing.discount,
                  advancePayment: pricing.advancePayment,
                  paymentMethod: pricing.paymentMethod,
                  paymentTxId: pricing.paymentTxId,
                  paymentSenderNumber: pricing.paymentSenderNumber,
                  status,
                  // D2: token-prefixed reason, sent ONLY on a fresh
                  // transition into CANCELLED (see isCancelling).
                  ...(isCancelling
                     ? {
                          cancellationReason: buildCancellationReason(
                             cancellationCategory,
                             cancellationNote,
                          ),
                       }
                     : {}),
                  orderSource,
                  orderNote: customerNote,
                  customerNote,
                  courierNote,
                  packingNote,
                  employeeNote,
                  courier,
                  notes,
               }),
            });

            if (!res.ok) {
               const errData = await res.json().catch(() => ({}));
               throw new Error(
                  errData.message ||
                     errData.error ||
                     "Failed to update order details",
               );
            }
         }

         // Trigger caller callback
         await onUpdate?.(editableProducts, extraFields);
         onClose?.();
      } catch (err: any) {
         setErrorMessage(err?.message || "Failed to save order updates.");
      } finally {
         setIsSubmitting(false);
      }
   };

   const isBusy = isLoading || isSubmitting;

   return (
      <Stack spacing={2.5}>
         {/* Order Badges Header Banner */}
         <QuickEditHeader
            effectiveOrderId={effectiveOrderId}
            invoiceNo={order?.invoiceNo}
            status={status}
            isFetchingOrder={isFetchingOrder}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
         />

         {/* Scrollable Content Container with hidden scrollbars */}
         <Box
            sx={{
               maxHeight: { xs: "calc(90vh - 140px)", sm: "65vh" },
               overflowY: "auto",
               overflowX: "hidden",
               pr: { xs: 0.2, sm: 0.8 },
               scrollbarWidth: "none !important",
               msOverflowStyle: "none !important",
               "&::-webkit-scrollbar": {
                  display: "none !important",
               },
            }}
         >
            <Stack spacing={2.5}>
               {/* 1. Customer & Order Info */}
               <QuickEditCustomerSection
                  customer={customer}
                  onChangeCustomer={handleCustomerFieldChange}
                  status={status}
                  onChangeStatus={setStatus}
                  orderSource={orderSource}
                  onChangeOrderSource={setOrderSource}
                  courier={courier}
                  onChangeCourier={setCourier}
                  disabled={isBusy}
               />

               {/* 1b. D2: cancellation category — shown only when this
                   save transitions the order INTO CANCELLED. */}
               {isCancelling && (
                  <Paper
                     variant="outlined"
                     sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: 1,
                        bgcolor: "background.paper",
                        borderColor: "divider",
                     }}
                  >
                     <Stack spacing={2}>
                        <Stack direction="row" spacing={1} alignItems="center">
                           <Icon
                              icon="solar:close-circle-bold"
                              size="small"
                              style={{
                                 color: "var(--mui-palette-error-main, #FF5630)",
                              }}
                           />
                           <Typography variant="subtitle2" fontWeight={700}>
                              Cancellation Details
                           </Typography>
                        </Stack>
                        <CancellationCategoryFields
                           category={cancellationCategory}
                           onCategoryChange={setCancellationCategory}
                           reasonText={cancellationNote}
                           onReasonTextChange={setCancellationNote}
                           disabled={isBusy}
                        />
                     </Stack>
                  </Paper>
               )}

               {/* 2. Order Items & Catalog Product Addition */}
               <QuickEditItemsSection
                  items={editableProducts}
                  onUpdateQuantity={handleUpdateQuantity}
                  onUpdatePrice={handleUpdatePrice}
                  onUpdateSubtotal={handleUpdateSubtotal}
                  onUpdateVariant={handleUpdateVariant}
                  onRemoveItem={onRemoveProduct}
                  onAddItem={onAddProduct}
                  disabled={isBusy}
               />

               {/* 3. Pricing & Financial Settlement */}
               <QuickEditPricingSection
                  pricing={pricing}
                  onChangeField={handlePricingFieldChange}
                  disabled={isBusy}
               />

               {/* 4. Order Note & Special Instructions */}
               <QuickEditNotesSection
                  notes={notes}
                  onAddNote={handleAddNote}
                  isLoading={isFetchingOrder}
                  disabled={isBusy}
               />
            </Stack>
         </Box>

         {/* Bottom Action Buttons Footer */}
         <QuickEditFooter
            onClose={onClose}
            onSubmit={handleSubmit}
            isBusy={isBusy}
         />
      </Stack>
   );
};

export default QuickEdit;
