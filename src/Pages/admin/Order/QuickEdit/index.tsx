import React, { useState, useCallback } from "react";
import { Box, Stack } from "@mui/material";
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
         if (p.quantity < 1) {
            setErrorMessage(`Quantity for "${p.name}" must be at least 1.`);
            return;
         }
         if (p.price < 0) {
            setErrorMessage(`Price for "${p.name}" cannot be negative.`);
            return;
         }
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
                  status,
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

               {/* 2. Order Items & Catalog Product Addition */}
               <QuickEditItemsSection
                  items={editableProducts}
                  onUpdateQuantity={handleUpdateQuantity}
                  onUpdatePrice={handleUpdatePrice}
                  onUpdateSubtotal={handleUpdateSubtotal}
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
