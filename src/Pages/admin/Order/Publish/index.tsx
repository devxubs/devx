"use client";

// Order Create Page (upgraded) — composing page.
// Sections and logic live in ../create/* (Order Create-specific modules).
// Create mode posts to /api/orders; edit mode (?id=) keeps the previous
// behaviour of loading the order and updating it via PUT /api/orders/:id.
// No other page, shared component or global style is modified by this page.
import {
   Alert,
   Button,
   CircularProgress,
   Container,
   Dialog,
   DialogActions,
   DialogContent,
   DialogContentText,
   DialogTitle,
   Grid,
   Snackbar,
   Stack,
   Typography,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@src/components/Icon";
import { useSettings } from "@src/lib/settingsContext";

import { mergeLineVariants } from "@src/lib/orderLineVariants";
import { useOrderCreate } from "../create/useOrderCreate";
import SectionCard from "../create/SectionCard";
import CustomerSection from "../create/CustomerSection";
import ProductSearch from "../create/ProductSearch";
import ProductTable from "../create/ProductTable";
import OrderInfoSection from "../create/OrderInfoSection";
import PaymentSection from "../create/PaymentSection";
import ChargesSection from "../create/ChargesSection";
import OrderSummaryPanel from "../create/OrderSummaryPanel";
import NotesSection from "../create/NotesSection";
import Breadcrumbs from "@src/components/Breadcrumbs";

const toTitleStatus = (s?: string | null) =>
   s
      ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ")
      : "Pending";

const Publish = () => {
   const router = useRouter();
   const params = useSearchParams();
   const editId = params?.get("id");
   const { settings } = useSettings();
   const currencySymbol = settings.currencySymbol || "৳";

   const oc = useOrderCreate();
   const { form, patch, totals } = oc;

   const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
   const [snackbar, setSnackbar] = useState<{
      type: "success" | "error" | "info";
      message: string;
   } | null>(null);
   const settingsApplied = useRef(false);

   // Apply store defaults once (create mode only, pristine form only).
   useEffect(() => {
      if (settingsApplied.current || editId || oc.isDirty) return;
      settingsApplied.current = true;
      patch({
         deliveryCharge: Number(settings.defaultDeliveryCharge) || 0,
         paymentMethod: settings.defaultPaymentMethod || "Cash on Delivery",
         taxRate: Number(settings.defaultTaxRate) || 0,
         taxEnabled: (Number(settings.defaultTaxRate) || 0) > 0,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [settings, editId]);

   // Edit mode: load the order and hydrate the form (previous behaviour).
   useEffect(() => {
      if (!editId) return;
      let cancelled = false;
      (async () => {
         try {
            const res = await fetch(`/api/orders/${editId}`);
            if (!res.ok) return;
            const o = await res.json();
            if (cancelled) return;
            const tags = (o.orderTags || {}) as any;
            // P2-2: load each line product's LIVE variants so the
            // variant selector renders on edit and the variant can be
            // changed (the PUT already nets stock per product+variant).
            // Source/shape match the create flow: the product payload's
            // live, non-deleted variants (via GET /api/products/[id]).
            // A failed fetch leaves that line with an empty picker
            // list — its stored variantId still rides along below.
            const orderItems: any[] = o.items || [];
            const lineProductIds = Array.from(
               new Set(
                  orderItems
                     .map((it: any) => it.productId || it.product?.id)
                     .filter(Boolean),
               ),
            ) as string[];
            const variantsByProductId: Record<string, any[]> = {};
            await Promise.all(
               lineProductIds.map(async (pid) => {
                  try {
                     const pr = await fetch(`/api/products/${pid}`);
                     if (pr.ok) {
                        const p = await pr.json();
                        variantsByProductId[pid] = Array.isArray(p.variants)
                           ? p.variants
                           : [];
                     }
                  } catch {
                     /* keep an empty picker list for this product */
                  }
               }),
            );
            if (cancelled) return;
            oc.hydrate({
               customer: {
                  id: o.customerId || o.customer?.id || null,
                  name: o.customer?.name || "",
                  email: o.customer?.email || "",
                  phone: o.customer?.phone || "",
                  address: o.customer?.address || "",
               },
               lines: mergeLineVariants(
                  orderItems.map((it: any) => ({
                  productId: it.productId || it.id,
                  // INV-02: keep the line's variant linkage through an
                  // edit — variantId/variantName ride along so the PUT
                  // preserves variant stock semantics, and (P2-2) the
                  // live picker list is merged in by mergeLineVariants.
                  variantId: it.variantId || null,
                  variantName: it.variant?.variantName || null,
                  name: it.name,
                  code: it.code || it.variant?.sku || "",
                  productBarcode: it.product?.barcode || null,
                  barcode:
                     it.variant?.barcode || it.product?.barcode || null,
                  image: it.product?.images?.[0] || null,
                  stock:
                     (it.variantId
                        ? Number(it.variant?.quantity) || 0
                        : Number(it.product?.quantity) || 0) +
                     (Number(it.quantity) || 0),
                  unit:
                     it.product?.salesUnit || it.product?.baseUnit || "Piece",
                  listPrice: Number(it.price) || 0,
                  quantity: Number(it.quantity) || 1,
                  discountType: "amount",
                  discountValue: 0,
                  })),
                  variantsByProductId,
               ),
               orderSource: o.orderSource || "Website",
               status: toTitleStatus(o.status),
               courier: o.courier || "",
               paymentMethod: o.paymentMethod || "Cash on Delivery",
               advancePayment: Number(o.advancePayment) || 0,
               paymentTxId: o.paymentTxId || "",
               paymentSenderNumber: o.paymentSenderNumber || "",
               discountType: "amount",
               discountValue: Number(o.discount) || 0,
               taxEnabled: Number(tags.taxAmount) > 0,
               taxRate: Number(tags.taxRate) || 0,
               deliveryCharge: Number(o.deliveryCharge) || 0,
               notes: {
                  customer: tags.customerNote ?? o.orderNote ?? "",
                  courier: tags.courierNote ?? "",
                  packing: tags.packingNote ?? "",
                  employee: tags.employeeNote ?? "",
               },
            });
         } catch {
            /* keep the blank form on load failure */
         }
      })();
      return () => {
         cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [editId]);

   // Surface hook notices (draft saved/restored, extras warning) as snackbars.
   useEffect(() => {
      if (oc.notice) {
         setSnackbar(oc.notice);
         oc.setNotice(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [oc.notice]);

   const handleAddProduct = (product: any) => {
      const message = oc.addProduct(product);
      if (message) setSnackbar({ type: "error", message });
      return message;
   };

   // Barcode scan (Phase 4, §4.1): exact code lookup; a match is
   // added (variant preselected for variant labels), anything else
   // surfaces here as an error and the typed code stays in the field.
   const handleScanBarcode = async (code: string) => {
      const message = await oc.scanBarcode(code);
      if (message) setSnackbar({ type: "error", message });
      return message;
   };

   const handleSubmit = async () => {
      const created = await oc.submit(editId || undefined);
      if (created) {
         setSnackbar({
            type: "success",
            message: editId
               ? "Order updated successfully"
               : `Order ${created.orderId || ""} created successfully`,
         });
         setTimeout(() => router.push("/admin/order"), 900);
      }
   };

   const handleCancel = () => {
      if (oc.isDirty && !editId) setCancelConfirmOpen(true);
      else router.push("/admin/order");
   };

   return (
      <Container maxWidth="xl" sx={{ py: 2, px: { xs: 1, sm: 2 } }}>
         <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
            <Breadcrumbs
               href="/admin/order"
               label={editId ? `Edit Order #${editId}` : "Create Order"}
               parentLabel="Back to Orders"
               parentHref="/admin/order"
            />
         </Stack>
         <Stack spacing={2.5}>
            <Stack
               direction="row"
               justifyContent="space-between"
               alignItems="center"
               flexWrap="wrap"
               gap={1}
            >
               <Typography variant="h5" fontWeight={700}>
                  {editId ? "Edit Order" : "Create Order"}
               </Typography>
               {oc.draftMeta && !editId && (
                  <Typography variant="caption" color="textSecondary">
                     Draft saved{" "}
                     {new Date(oc.draftMeta.savedAt).toLocaleString()} (this
                     device only)
                  </Typography>
               )}
            </Stack>

            {oc.restorableDraft && !editId && (
               <Alert
                  severity="info"
                  action={
                     <Stack direction="row" spacing={1}>
                        <Button
                           size="small"
                           color="inherit"
                           onClick={oc.restoreDraft}
                        >
                           Restore
                        </Button>
                        <Button
                           size="small"
                           color="inherit"
                           onClick={oc.clearDraft}
                        >
                           Discard
                        </Button>
                     </Stack>
                  }
               >
                  You have a saved draft from{" "}
                  {new Date(oc.restorableDraft.savedAt).toLocaleString()}.
                  Restore it?
               </Alert>
            )}

            {oc.submitError && (
               <Alert severity="error" onClose={() => oc.setSubmitError(null)}>
                  {oc.submitError}
               </Alert>
            )}

            <Grid container spacing={2.5} alignItems="flex-start">
               {/* Left column */}
               <Grid size={{ xs: 12, lg: 7 }}>
                  <Stack spacing={2.5}>
                     <CustomerSection
                        customer={form.customer}
                        onChange={(customer) => patch({ customer })}
                        searchCustomers={oc.searchCustomers}
                     />
                     <SectionCard
                        title="Products"
                        subtitle="Search by name or SKU, or scan a barcode — quantities are checked against stock"
                     >
                        <ProductSearch
                           searchProducts={oc.searchProducts}
                           onAdd={handleAddProduct}
                           onScan={handleScanBarcode}
                           currencySymbol={currencySymbol}
                        />
                        <ProductTable
                           lines={form.lines}
                           onUpdate={oc.updateLine}
                           onRemove={oc.removeLine}
                           currencySymbol={currencySymbol}
                        />
                     </SectionCard>
                     <NotesSection
                        notes={form.notes}
                        onChange={(notes) => patch({ notes })}
                     />
                  </Stack>
               </Grid>

               {/* Right column */}
               <Grid size={{ xs: 12, lg: 5 }}>
                  <Stack spacing={2.5}>
                     <OrderInfoSection
                        orderSource={form.orderSource}
                        status={form.status}
                        courier={form.courier}
                        onChange={(p) => patch(p)}
                     />
                     <PaymentSection
                        paymentMethod={form.paymentMethod}
                        advancePayment={form.advancePayment}
                        paymentTxId={form.paymentTxId}
                        paymentSenderNumber={form.paymentSenderNumber}
                        totals={totals}
                        onChange={(p) => patch(p)}
                        currencySymbol={currencySymbol}
                     />
                     <ChargesSection
                        discountType={form.discountType}
                        discountValue={form.discountValue}
                        taxEnabled={form.taxEnabled}
                        taxRate={form.taxRate}
                        deliveryCharge={form.deliveryCharge}
                        totals={totals}
                        onChange={(p) => patch(p)}
                        currencySymbol={currencySymbol}
                     />
                     <OrderSummaryPanel
                        totals={totals}
                        currencySymbol={currencySymbol}
                     />
                  </Stack>
               </Grid>
            </Grid>

            {/* Bottom actions */}
            <Stack
               direction={{ xs: "column", sm: "row" }}
               spacing={1.5}
               justifyContent="flex-end"
               alignItems={{ xs: "stretch", sm: "center" }}
            >
               <Button
                  variant="text"
                  color="inherit"
                  onClick={handleCancel}
                  disabled={oc.submitting}
                  sx={{
                     whiteSpace: "nowrap",
                     flexShrink: 0,
                     height: 42,
                     px: 2,
                  }}
               >
                  Cancel
               </Button>
               {!editId && (
                  <Button
                     variant="outlined"
                     color="inherit"
                     onClick={oc.saveDraft}
                     disabled={oc.savingDraft || oc.submitting}
                     startIcon={
                        oc.savingDraft ? (
                           <CircularProgress size={15} color="inherit" />
                        ) : (
                           <Icon
                              icon="solar:diskette-bold"
                              size="16px"
                              color="white"
                           />
                        )
                     }
                     // sx={{
                     //    textTransform: "none",
                     //    whiteSpace: "nowrap",
                     //    flexShrink: 0,
                     //    height: 42,
                     //    px: 2,
                     // }}
                  >
                     Save as Draft
                  </Button>
               )}
               <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  disabled={oc.submitting}
                  startIcon={
                     oc.submitting ? (
                        <CircularProgress size={16} color="inherit" />
                     ) : undefined
                  }
                  sx={{
                     textTransform: "none",
                     whiteSpace: "nowrap",
                     flexShrink: 0,
                     height: 42,
                     minWidth: 160,
                     px: 2.5,
                     fontWeight: 700,
                  }}
               >
                  {oc.submitting
                     ? "Saving…"
                     : editId
                       ? "Update Order"
                       : "Create Order"}
               </Button>
            </Stack>
         </Stack>

         <Dialog
            open={cancelConfirmOpen}
            onClose={() => setCancelConfirmOpen(false)}
         >
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogContent>
               <DialogContentText>
                  You have unsaved changes on this order form. Leaving now will
                  lose them (unless you save a draft first).
               </DialogContentText>
            </DialogContent>
            <DialogActions>
               <Button onClick={() => setCancelConfirmOpen(false)}>
                  Keep editing
               </Button>
               <Button
                  color="error"
                  onClick={() => {
                     setCancelConfirmOpen(false);
                     router.push("/admin/order");
                  }}
               >
                  Discard & leave
               </Button>
            </DialogActions>
         </Dialog>

         <Snackbar
            open={!!snackbar}
            autoHideDuration={4000}
            onClose={() => setSnackbar(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
         >
            {snackbar ? (
               <Alert
                  severity={snackbar.type}
                  onClose={() => setSnackbar(null)}
                  sx={{ width: "100%" }}
               >
                  {snackbar.message}
               </Alert>
            ) : undefined}
         </Snackbar>
      </Container>
   );
};

export default Publish;
