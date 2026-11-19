"use client";

// Order Create (upgrade) — form state, API wiring, validation, drafts.
//
// Backend contract (existing POST /api/orders, unchanged):
//   • item productId is read from `id` on each product entry — both `id` and
//     `productId` are sent so items link to products and stock is deducted;
//   • totals are recomputed server-side (subtotal from item prices,
//     total = subtotal − discount + deliveryCharge);
//   • stock is deducted for every status except CANCELLED — therefore a
//     server-side "draft" (e.g. HOLD) would wrongly deduct stock, so drafts
//     are implemented as localStorage form persistence on this page only;
//   • the four order notes live in orderTags JSON (existing mechanism used by
//     Order Details) — since Phase 2 (2.5) the POST accepts them directly
//     (courierNote / customerNote / packingNote / employeeNote), together
//     with the courier (delivery method) and the tax/discount breakdown in
//     orderTags, all stored inside the create transaction. No follow-up
//     PUT is needed, so notes can no longer be lost silently.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateOrderTotals, lineEffectiveUnitPrice, num } from "./orderCalculations";
import {
   EMPTY_CUSTOMER,
   EMPTY_NOTES,
   type ApiCustomer,
   type ApiProduct,
   type OrderCreateFormState,
   type OrderLine,
} from "./types";

export const DRAFT_STORAGE_KEY = "devxpos_order_create_draft_v1";

export interface DraftMeta {
   draftId: string;
   savedAt: string;
}

const initialForm = (defaults?: Partial<OrderCreateFormState>): OrderCreateFormState => ({
   customer: { ...EMPTY_CUSTOMER },
   lines: [],
   orderSource: "Website",
   status: "Pending",
   courier: "",
   paymentMethod: "Cash on Delivery",
   advancePayment: 0,
   discountType: "amount",
   discountValue: 0,
   taxEnabled: false,
   taxRate: 0,
   deliveryCharge: 0,
   notes: { ...EMPTY_NOTES },
   ...defaults,
});

export function useOrderCreate(defaults?: Partial<OrderCreateFormState>) {
   const [form, setForm] = useState<OrderCreateFormState>(() => initialForm(defaults));
   const [submitting, setSubmitting] = useState(false);
   const [savingDraft, setSavingDraft] = useState(false);
   const [submitError, setSubmitError] = useState<string | null>(null);
   const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
   const [draftMeta, setDraftMeta] = useState<DraftMeta | null>(null);
   const [restorableDraft, setRestorableDraft] = useState<(OrderCreateFormState & DraftMeta) | null>(null);
   const [isDirty, setIsDirty] = useState(false);
   const submitLock = useRef(false);

   const patch = useCallback((partial: Partial<OrderCreateFormState>) => {
      setForm((prev) => ({ ...prev, ...partial }));
      setIsDirty(true);
   }, []);

   const hydrate = useCallback((state: OrderCreateFormState) => {
      // Normalise lines from older drafts / external state that
      // predate the INV-02 line fields.
      const lines = (state.lines || []).map((l: any, i: number) => ({
         ...l,
         key: l.key || `${l.productId}::restored-${i}`,
         variantId: l.variantId ?? null,
         variantName: l.variantName ?? null,
         variants: Array.isArray(l.variants) ? l.variants : [],
      }));
      setForm({ ...state, lines });
      setIsDirty(false);
   }, []);

   const totals = useMemo(
      () =>
         calculateOrderTotals(form.lines, {
            discountType: form.discountType,
            discountValue: form.discountValue,
            taxEnabled: form.taxEnabled,
            taxRate: form.taxRate,
            deliveryCharge: form.deliveryCharge,
            advancePayment: form.advancePayment,
         }),
      [form.lines, form.discountType, form.discountValue, form.taxEnabled, form.taxRate, form.deliveryCharge, form.advancePayment],
   );

   // ── Search helpers (server-side search, small pages) ─────────────────────
   const searchCustomers = useCallback(async (query: string): Promise<ApiCustomer[]> => {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=20`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.customers) ? data.customers : [];
   }, []);

   const searchProducts = useCallback(async (query: string): Promise<ApiProduct[]> => {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`);
      if (!res.ok) return [];
      const data = await res.json();
      const list: ApiProduct[] = Array.isArray(data.products) ? data.products : [];
      // The products API already excludes deleted records; also skip
      // non-ACTIVE products when the status field is present.
      return list.filter((p) => !p.status || p.status === "ACTIVE");
   }, []);

   // ── Lines ────────────────────────────────────────────────────────────────
   const lineSeqRef = useRef(0);
   const addProduct = useCallback(
      (product: ApiProduct): string | null => {
         const stock = Math.max(0, num(product.quantity));
         if (stock <= 0) return `${product.productName} is out of stock`;
         const variants = Array.isArray(product.variants) ? product.variants : [];
         const isVariable = product.productType === "Variable" && variants.length > 0;
         let message: string | null = null;
         setForm((prev) => {
            // Simple products keep the one-line-per-product merge.
            // Variable products always append a fresh line (INV-02):
            // each row picks its own variant in the table, so two
            // variants of one product can be sold side by side.
            if (!isVariable) {
               const existing = prev.lines.find((l) => l.productId === product.id);
               if (existing) {
                  if (existing.quantity >= stock) {
                     message = `Only ${stock} in stock for ${product.productName}`;
                     return prev;
                  }
                  return {
                     ...prev,
                     lines: prev.lines.map((l) =>
                        l.productId === product.id
                           ? { ...l, quantity: l.quantity + 1, stock }
                           : l,
                     ),
                  };
               }
            }
            const price = num(product.salePrice ?? product.regularPrice);
            const line: OrderLine = {
               key: isVariable
                  ? `${product.id}::line-${++lineSeqRef.current}`
                  : product.id,
               productId: product.id,
               variantId: null,
               variantName: null,
               variants,
               name: product.productName,
               code: product.productSku || product.productCode || "",
               image: Array.isArray(product.images) ? product.images[0] : null,
               stock,
               unit: product.salesUnit || product.baseUnit || "Piece",
               listPrice: price,
               quantity: 1,
               discountType: "amount",
               discountValue: 0,
            };
            return { ...prev, lines: [...prev.lines, line] };
         });
         setIsDirty(true);
         return message;
      },
      [],
   );

   const updateLine = useCallback((lineKey: string, partial: Partial<OrderLine>) => {
      setForm((prev) => ({
         ...prev,
         lines: prev.lines.map((l) => {
            if (l.key !== lineKey) return l;
            const next = { ...l, ...partial };
            next.quantity = Math.max(1, Math.min(Math.floor(num(next.quantity)) || 1, Math.max(1, next.stock)));
            next.listPrice = Math.max(0, num(next.listPrice));
            next.discountValue = Math.max(0, num(next.discountValue));
            if (next.discountType === "percent") next.discountValue = Math.min(next.discountValue, 100);
            return next;
         }),
      }));
      setIsDirty(true);
   }, []);

   const removeLine = useCallback((lineKey: string) => {
      setForm((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.key !== lineKey) }));
      setIsDirty(true);
   }, []);

   // ── Validation ───────────────────────────────────────────────────────────
   const validate = useCallback((): string[] => {
      const errors: string[] = [];
      if (!form.customer.name.trim()) errors.push("Customer name is required");
      if (!form.customer.phone.trim()) {
         errors.push("Customer phone is required");
      } else if (!/^[0-9+\-\s()]+$/.test(form.customer.phone.trim())) {
         errors.push("Customer phone number looks invalid");
      }
      if (form.customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer.email.trim())) {
         errors.push("Customer email looks invalid");
      }
      if (form.lines.length === 0) errors.push("Add at least one product");
      for (const line of form.lines) {
         if (line.variants.length > 0 && !line.variantId) {
            errors.push(`Select a variant for ${line.name}`);
         }
         if (line.quantity < 1) errors.push(`Quantity for ${line.name} must be at least 1`);
         if (line.quantity > line.stock) errors.push(`Quantity for ${line.name} exceeds available stock (${line.stock})`);
         if (line.listPrice < 0) errors.push(`Price for ${line.name} cannot be negative`);
      }
      if (num(form.deliveryCharge) < 0) errors.push("Delivery charge cannot be negative");
      if (form.taxEnabled && (num(form.taxRate) < 0 || num(form.taxRate) > 100)) {
         errors.push("Tax rate must be between 0 and 100");
      }
      if (num(form.advancePayment) < 0) errors.push("Advance payment cannot be negative");
      if (num(form.advancePayment) > totals.grandTotal) {
         errors.push("Advance payment cannot exceed the grand total");
      }
      if (!form.paymentMethod) errors.push("Payment method is required");
      if (!form.status) errors.push("Order status is required");
      return errors;
   }, [form, totals.grandTotal]);

   // ── Payload ──────────────────────────────────────────────────────────────
   const buildPayload = useCallback(
      () => ({
         customer: {
            ...(form.customer.id ? { id: form.customer.id } : {}),
            name: form.customer.name.trim(),
            email: form.customer.email.trim(),
            phone: form.customer.phone.trim(),
            address: form.customer.address.trim(),
         },
         products: form.lines.map((l) => ({
            id: l.productId,
            productId: l.productId,
            ...(l.variantId ? { variantId: l.variantId } : {}),
            name: l.name,
            code: l.code,
            quantity: l.quantity,
            price: lineEffectiveUnitPrice(l),
         })),
         pricing: {
            paymentMethod: form.paymentMethod,
            deliveryCharge: totals.deliveryCharge,
            discount: totals.submittedDiscount,
            advancePayment: totals.advancePayment,
         },
         // The customer note doubles as the generic order note (existing
         // convention: Order Details falls back to orderNote for it).
         orderNote: form.notes.customer || "",
         orderSource: form.orderSource || "Direct",
         status: form.status || "Pending",
         // Phase 2 (2.5): the four notes stay separate fields, the
         // courier rides along, and the tax/discount breakdown goes in
         // orderTags — all persisted by the POST in one transaction.
         courierNote: form.notes.courier,
         customerNote: form.notes.customer,
         packingNote: form.notes.packing,
         employeeNote: form.notes.employee,
         ...(form.courier ? { courier: form.courier } : {}),
         orderTags: {
            taxRate: form.taxEnabled ? num(form.taxRate) : 0,
            taxAmount: totals.taxAmount,
            productDiscount: totals.productDiscount,
            overallDiscount: totals.overallDiscount,
         },
      }),
      [form, totals],
   );

   const clearDraft = useCallback(() => {
      try {
         localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch { /* storage unavailable */ }
      setDraftMeta(null);
      setRestorableDraft(null);
   }, []);

   // ── Submit (create or update) ────────────────────────────────────────────
   const submit = useCallback(
      async (editOrderId?: string): Promise<any | null> => {
         if (submitLock.current) return null;
         const errors = validate();
         if (errors.length) {
            setSubmitError(errors[0]);
            return null;
         }
         submitLock.current = true;
         setSubmitting(true);
         setSubmitError(null);
         try {
            const res = await fetch(editOrderId ? `/api/orders/${editOrderId}` : "/api/orders", {
               method: editOrderId ? "PUT" : "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(buildPayload()),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
               throw new Error(data.message || data.error || "Failed to save order");
            }
            clearDraft();
            setIsDirty(false);
            return data;
         } catch (err: any) {
            // Form state is intentionally preserved on API errors.
            setSubmitError(err?.message || "Failed to save order");
            return null;
         } finally {
            submitLock.current = false;
            setSubmitting(false);
         }
      },
      [validate, buildPayload, clearDraft],
   );

   // ── Drafts (localStorage only — see header note) ─────────────────────────
   const saveDraft = useCallback(() => {
      if (savingDraft) return;
      setSavingDraft(true);
      try {
         const meta: DraftMeta = draftMeta ?? {
            draftId: `draft-${Date.now()}`,
            savedAt: new Date().toISOString(),
         };
         const record = { ...form, ...meta };
         localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(record));
         setDraftMeta(meta);
         setRestorableDraft(null);
         setNotice({ type: "success", message: "Draft saved on this device. It does not deduct stock or record a payment." });
      } catch {
         setNotice({ type: "error", message: "Could not save the draft in this browser." });
      } finally {
         setSavingDraft(false);
      }
   }, [form, draftMeta, savingDraft]);

   const restoreDraft = useCallback(() => {
      if (!restorableDraft) return;
      const { draftId, savedAt, ...state } = restorableDraft;
      hydrate(state as OrderCreateFormState);
      setDraftMeta({ draftId, savedAt });
      setRestorableDraft(null);
      setIsDirty(true);
      setNotice({ type: "info", message: "Draft restored." });
   }, [restorableDraft, hydrate]);

   // Offer to restore a saved draft once, on mount.
   useEffect(() => {
      try {
         const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
         if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.draftId) setRestorableDraft(parsed);
         }
      } catch { /* ignore malformed drafts */ }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   return {
      form,
      patch,
      hydrate,
      totals,
      submitting,
      savingDraft,
      submitError,
      setSubmitError,
      notice,
      setNotice,
      isDirty,
      searchCustomers,
      searchProducts,
      addProduct,
      updateLine,
      removeLine,
      validate,
      submit,
      saveDraft,
      clearDraft,
      restoreDraft,
      restorableDraft,
      draftMeta,
   };
}

export type UseOrderCreate = ReturnType<typeof useOrderCreate>;
