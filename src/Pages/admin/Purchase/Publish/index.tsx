"use client";

// Purchase Create (redesign) — premium two-column layout:
// Purchase Information · Products · Additional Information on the
// left, a sticky Payment & Summary with the main actions on the
// right. All behaviour is preserved from the previous page: real
// supplier/product options, edit mode (?id=), Low Stock prefill
// (?prefill=), the attachments upload flow, the variant guard, and
// the server-recomputed totals. What changed is the organisation,
// the calculation engine (calculations.ts — exact decimals, the
// server's own formulas), product search by name/SKU/barcode with
// stock shown, a Purchase ID preview from the entity-sequence peek,
// and a print action after a successful creation. No schema, API or
// shared-component changes.

import { yupResolver } from "@hookform/resolvers/yup";
import {
   Alert,
   Button,
   CircularProgress,
   Grid,
   Paper,
   Stack,
   Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { PurchaseTypes } from "..";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@src/components/Breadcrumbs";
import SectionCard from "./SectionCard";
import PurchaseInfoSection from "./PurchaseInfoSection";
import ProductSection from "./ProductSection";
import SummarySection from "./SummarySection";
import NotesSection from "./NotesSection";
import { computePurchaseTotals } from "./calculations";
import { buildPurchaseInvoicePrint } from "./purchaseInvoicePrint";
import { uploadImageFile } from "@src/lib/uploadImage";
import { useSnackbar } from "@src/lib/snackbarContext";
import { usePrint } from "@src/components/TablePrintDocument/PrintPortal";
import { useSettings } from "@src/lib/settingsContext";

export interface SupplierOption {
   id: string;
   name: string;
   phone?: string | null;
   email?: string | null;
   address?: string | null;
}

export interface ProductVariantOption {
   id: string;
   variantName: string;
   sku: string;
   barcode?: string | null;
   quantity: number;
   costPrice: number;
   attributes?: Record<string, any> | null;
}

export interface ProductOption {
   id: string;
   name: string;
   code: string;
   barcode?: string | null;
   price: number;
   // Current stock of the product itself (variable products report
   // per-variant stock; the section sums the variants).
   quantity: number;
   // INV-02: variable products carry their live variants so purchase
   // lines can target a variant.
   productType?: string;
   variants?: ProductVariantOption[];
}

export const purchaseSchema = yup.object({
   id: yup
      .number()
      .integer("ID must be a whole number")
      .required("ID is required"),

   date: yup
      .string()
      .matches(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .required("Date is required"),

   invoice: yup
      .string()
      // The field is optional (the API stores purchases without an
      // invoice number, and the submit path already sends undefined
      // for a blank value) — but the form's default is "", and a
      // present empty string still runs the min/max checks, so a
      // blank invoice failed with "Invoice number is too short" and
      // blocked creation (found in the field-consistency live
      // check). Normalise blank to undefined so .optional() means
      // what it says; a typed value still must be 2–20 chars.
      .transform((v) =>
         typeof v === "string" && v.trim() === "" ? undefined : v,
      )
      .min(2, "Invoice number is too short")
      .max(20, "Invoice number is too long")
      .optional(),

   supplier: yup
      .string()
      .min(2, "Supplier name is too short")
      .max(50, "Supplier name is too long")
      .required("Supplier is required"),

   product: yup
      .array()
      .of(
         yup.object({
            // Phase 2 (2.4): line items carry their product reference so
            // stock can be credited/debited against the real product.
            id: yup.string().optional(),
            productId: yup.string().nullable().optional(),
            // INV-02: optional variant target for variable products.
            variantId: yup.string().nullable().optional(),
            variantName: yup.string().nullable().optional(),
            code: yup.string().nullable().optional(),
            name: yup.string().required("Product name is required"),
            quantity: yup
               .number()
               .min(1, "Quantity must be at least 1")
               .required("Quantity is required"),
            price: yup
               .number()
               .min(0, "Price must be positive")
               .required("Price is required"),
            images: yup.array().of(yup.string().url("Invalid image URL")),
         }),
      )
      .min(1, "At least one product is required"),

   pay: yup.number().min(0, "Pay amount cannot be negative").optional(),

   product_amount: yup
      .number()
      .min(0, "Product amount cannot be negative")
      .required("Product amount is required"),

   others_cost: yup
      .number()
      .min(0, "Other costs cannot be negative")
      .optional(),

   discount: yup.number().min(0, "Discount cannot be negative").optional(),

   total: yup
      .number()
      .min(0, "Total cannot be negative")
      .required("Total is required"),
   due: yup
      .number()
      .min(0, "Total cannot be negative")
      .required("Total is required"),

   note: yup.string().max(200, "Note is too long").optional(),
   attachments: yup
      .array()
      .of(
         yup.object({
            name: yup.string().required("Attachment name is required"),
            url: yup.string().url("Invalid attachment URL").required(),
            type: yup.string().required("Attachment type is required"), // e.g., "pdf", "image"
            size: yup
               .number()
               .min(0, "Attachment size must be positive")
               .optional(),
         }),
      )
      .optional(),
});

export type PurchaseFormValues = yup.InferType<typeof purchaseSchema>;

// BUG-E1 follow-through: "today" for the purchase date must be the
// store's calendar day (Asia/Dhaka — the same zone the order-create
// page hardcodes for its date display). `new Date().toISOString()`
// is UTC and showed *yesterday* every Dhaka morning. en-CA formats
// as yyyy-MM-dd.
const todayDhaka = (): string =>
   new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
   }).format(new Date());

const blankForm = (): PurchaseFormValues =>
   ({
      id: 0,
      date: todayDhaka(),
      invoice: "",
      supplier: "",
      product: [],
      product_amount: 0,
      others_cost: 0,
      discount: 0,
      pay: 0,
      total: 0,
      due: 0,
      note: "",
      attachments: [],
   }) as PurchaseFormValues;

const Publish = () => {
   const [data, setData] = useState<PurchaseTypes>({} as PurchaseTypes);
   const router = useRouter();
   const { showSnackbar } = useSnackbar();
   const { printDocument } = usePrint();
   const { settings, formatCurrency } = useSettings();

   const {
      control,
      handleSubmit,
      reset,
      setValue,
      watch,
      formState: { errors },
   } = useForm<PurchaseFormValues>({
      resolver: yupResolver<PurchaseFormValues, any, any>(purchaseSchema),
      defaultValues: blankForm(),
   });

   const [submitting, setSubmitting] = useState(false);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);

   // Phase 2 (2.4): real option data for the pickers, from the real
   // APIs (the previous mock exports were empty arrays). The
   // redesign also carries the supplier's contact fields and each
   // product's current stock for display — same responses, wider
   // mapping.
   const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
   const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
   const [supplierId, setSupplierId] = useState<string | null>(null);

   // Edit mode: /admin/purchase/publish?id=<purchase id>.
   const [editId, setEditId] = useState<string | null>(null);
   const [loadingPurchase, setLoadingPurchase] = useState(false);

   // Purchase ID preview (create mode) from the same EntitySequence
   // the POST consumes — the OBS-B1 peek; read-only, never consumes
   // a number. In edit mode the record's own customId is shown.
   const [idPreview, setIdPreview] = useState<string | null>(null);
   const [createdPurchase, setCreatedPurchase] = useState<any | null>(null);

   const fetchIdPreview = React.useCallback(() => {
      fetch("/api/entity-sequence?type=PURCHASE")
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => setIdPreview(d?.nextId || null))
         .catch(() => setIdPreview(null));
   }, []);

   React.useEffect(() => {
      fetch("/api/suppliers")
         .then((r) => (r.ok ? r.json() : []))
         .then((list) => {
            const arr = Array.isArray(list) ? list : list?.suppliers || [];
            setSupplierOptions(
               arr.map((s: any) => ({
                  id: s.id,
                  name: s.name,
                  phone: s.phone || null,
                  email: s.email || null,
                  address: s.address || null,
               })),
            );
         })
         .catch(() => {});
      fetch("/api/products?limit=100")
         .then((r) => (r.ok ? r.json() : { products: [] }))
         .then((d) => {
            setProductOptions(
               (d.products || []).map((p: any) => ({
                  id: p.id,
                  name: p.productName,
                  code: p.productCode || p.productSku || "",
                  barcode: p.barcode || null,
                  price: Number(p.costPrice ?? p.regularPrice ?? 0),
                  quantity: Number(p.quantity) || 0,
                  productType: p.productType || "simple",
                  variants: (p.variants || []).map((v: any) => ({
                     id: v.id,
                     variantName: v.variantName,
                     sku: v.sku || "",
                     barcode: v.barcode || null,
                     quantity: Number(v.quantity) || 0,
                     costPrice: Number(v.costPrice ?? 0),
                     attributes: v.attributes ?? null,
                  })),
               })),
            );
         })
         .catch(() => {});
      fetchIdPreview();
   }, [fetchIdPreview]);

   React.useEffect(() => {
      const id = new URLSearchParams(window.location.search).get("id");
      if (!id) return;
      setEditId(id);
      setLoadingPurchase(true);
      fetch(`/api/purchases/${id}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((p) => {
            if (!p) {
               setErrorMsg("Purchase not found — it may have been deleted.");
               return;
            }
            setSupplierId(p.supplierId || p.supplier?.id || null);
            setData({
               ...(p as any),
               date: p.createdAt
                  ? new Date(p.createdAt).toISOString().split("T")[0]
                  : "",
               invoice: p.invoice || "",
               supplier: p.supplier?.name || "",
               attachments: p.attachments || [],
            } as PurchaseTypes);
            reset({
               id: 0,
               date: p.createdAt
                  ? new Date(p.createdAt).toISOString().split("T")[0]
                  : "",
               invoice: p.invoice || "",
               supplier: p.supplier?.name || "",
               product: (p.items || []).map((it: any) => ({
                  id: it.productId || undefined,
                  productId: it.productId || null,
                  // INV-02: keep the line's variant linkage in edit mode.
                  variantId: it.variantId || null,
                  variantName: it.variant?.variantName || null,
                  name: it.name,
                  code: it.code || null,
                  barcode: it.variant?.barcode || it.product?.barcode || null,
                  quantity: it.quantity,
                  price: Number(it.price),
               })),
               product_amount: Number(p.productAmount),
               others_cost: Number(p.othersCost),
               discount: Number(p.discount),
               pay: Number(p.paid),
               total: Number(p.total),
               due: Number(p.due),
               note: p.note || "",
               attachments: [],
            } as PurchaseFormValues);
         })
         .catch(() => setErrorMsg("Failed to load the purchase for editing."))
         .finally(() => setLoadingPurchase(false));
   }, [reset]);

   // Phase 3A (3.3): draft prefill from the Stock → Low Stock view.
   // `?prefill=<url-encoded JSON>` carries { supplierId, supplierName,
   // items: [...] } — the form opens prefilled for MANUAL review; nothing
   // is created or submitted automatically.
   const [prefillNotice, setPrefillNotice] = useState<string | null>(null);
   React.useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("id")) return; // edit mode wins
      const raw = params.get("prefill");
      if (!raw) return;
      try {
         const draft = JSON.parse(raw);
         const items = Array.isArray(draft.items) ? draft.items : [];
         if (!items.length) return;
         if (draft.supplierId) setSupplierId(draft.supplierId);
         const productAmount = items.reduce(
            (sum: number, it: any) =>
               sum + Number(it.price || 0) * Number(it.quantity || 0),
            0,
         );
         reset({
            id: 0,
            date: todayDhaka(),
            invoice: "",
            supplier: draft.supplierName || "",
            product: items.map((it: any) => ({
               id: it.productId || undefined,
               productId: it.productId || null,
               variantId: it.variantId || null,
               variantName: it.variantName || null,
               name: it.name,
               code: it.code || null,
               quantity: Number(it.quantity) || 1,
               price: Number(it.price) || 0,
            })),
            product_amount: productAmount,
            others_cost: 0,
            discount: 0,
            pay: 0,
            total: productAmount,
            due: productAmount,
            note: "",
            attachments: [],
         } as PurchaseFormValues);
         setPrefillNotice(
            "Draft prefilled from Low Stock — review the lines, then save manually. Nothing has been submitted.",
         );
      } catch {
         // Malformed prefill — ignore and open a blank form.
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   // ── Totals: the page's calculation engine keeps the form's
   // product_amount / total / due in sync with the exact figures the
   // server will compute (advisory only — the API recomputes).
   const watchedProducts = watch("product");
   const watchedDiscount = watch("discount");
   const watchedOthersCost = watch("others_cost");
   const watchedPay = watch("pay");
   const totals = useMemo(
      () =>
         computePurchaseTotals(
            (watchedProducts || []) as any[],
            Number(watchedOthersCost) || 0,
            Number(watchedDiscount) || 0,
            Number(watchedPay) || 0,
         ),
      [watchedProducts, watchedDiscount, watchedOthersCost, watchedPay],
   );
   React.useEffect(() => {
      setValue("product_amount", totals.productAmount);
      setValue("total", totals.total);
      setValue("due", totals.due);
   }, [totals, setValue]);

   const supplierNameValue = watch("supplier");
   const selectedSupplier: SupplierOption | null =
      supplierOptions.find((s) => s.id === supplierId) ??
      (supplierId && supplierNameValue
         ? { id: supplierId, name: supplierNameValue }
         : null);

   const onSubmit: SubmitHandler<PurchaseFormValues> = async (formData) => {
      setSubmitting(true);
      setErrorMsg(null);
      try {
         // INV-02: a line for a variable product must target a variant.
         for (const p of (formData.product || []) as any[]) {
            const opt = productOptions.find(
               (o) => o.id === (p.productId || p.id),
            );
            const isVariable =
               opt?.productType === "variable" ||
               (opt?.variants && opt.variants.length > 0);
            if (isVariable && !p.variantId) {
               setErrorMsg(`Select a variant for "${p.name}".`);
               setSubmitting(false);
               return;
            }
         }
         // B2-2 (audit C-8 / P1-6): attachments the uploader
         // collected ride in the payload. Each new file goes through
         // the existing uploads flow (POST /api/uploads) and is sent
         // as the { name, url, type, size } descriptor
         // PurchaseAttachment stores. In edit mode the already-saved
         // attachments are resent as-is so the API's replace-set
         // reconcile keeps them.
         const attachmentDescriptors: Array<{
            name: string;
            url: string;
            type?: string;
            size?: number;
         }> = [];
         if (editId) {
            for (const att of ((data as any)?.attachments || []) as any[]) {
               if (att?.url) {
                  attachmentDescriptors.push({
                     name: att.name || "Attachment",
                     url: att.url,
                     type: att.type || undefined,
                     size: att.size ?? undefined,
                  });
               }
            }
         }
         for (const att of ((formData as any).attachments || []) as any[]) {
            if (!att) continue;
            if (typeof att === "object" && "url" in att && att.url) {
               if (!attachmentDescriptors.some((d) => d.url === att.url)) {
                  attachmentDescriptors.push({
                     name: att.name || "Attachment",
                     url: att.url,
                     type: att.type || undefined,
                     size: att.size ?? undefined,
                  });
               }
            } else if (typeof File !== "undefined" && att instanceof File) {
               const url = await uploadImageFile(att);
               attachmentDescriptors.push({
                  name: att.name,
                  url,
                  type: att.type || undefined,
                  size: att.size,
               });
            }
         }

         // Line items include their productId (Phase 2, 2.4) so the
         // API can net stock correctly; totals are recomputed on the
         // server for both POST and PUT — client totals are advisory.
         const payload = {
            supplierId: supplierId || null,
            // BUG-E1 follow-through: the form's date is sent — the API
            // stores it as the purchase's date (createdAt).
            date: formData.date || undefined,
            invoice: formData.invoice?.trim() || undefined,
            items: (formData.product || []).map((p: any) => ({
               productId: p.productId || p.id || null,
               // INV-02: variant target when the line has one.
               variantId: p.variantId || null,
               name: p.name,
               code: p.code || null,
               quantity: p.quantity,
               price: p.price,
            })),
            productAmount: formData.product_amount,
            othersCost: formData.others_cost,
            discount: formData.discount,
            paid: Number((formData as any).pay || 0),
            note: formData.note || "",
            attachments: attachmentDescriptors,
         };

         const res = await fetch(
            editId ? `/api/purchases/${editId}` : "/api/purchases",
            {
               method: editId ? "PUT" : "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(payload),
            },
         );

         if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            // The PUT's 409 (stock reversal unsafe — purchased units
            // already sold) carries its explanation in `message`.
            throw new Error(
               err.message || err.error || "Failed to save purchase",
            );
         }

         const saved = await res.json().catch(() => null);

         // BUG-E1 follow-through: a successful save confirms via the
         // snackbar (the provider lives in the admin Layout).
         showSnackbar(
            editId ? "Purchase updated." : "Purchase added.",
            "success",
         );
         if (editId) {
            router.push("/admin/purchase");
         } else {
            // Redesign: after a successful creation, stay on the page
            // with a success panel — the new Purchase ID, the totals,
            // and the Print Purchase Invoice action — instead of
            // navigating away instantly.
            setCreatedPurchase(saved);
            window.scrollTo({ top: 0, behavior: "smooth" });
         }
      } catch (err: any) {
         setErrorMsg(err.message || "Failed to save purchase");
      } finally {
         setSubmitting(false);
      }
   };

   // ── Success panel after a successful creation ──────────────────
   if (createdPurchase && !editId) {
      return (
         <Stack width="100%" maxWidth={720} mx="auto" spacing={3}>
            <Alert severity="success">
               Purchase {createdPurchase.customId || ""} created
               successfully — stock has been updated.
            </Alert>
            <Paper variant="outlined" sx={{ borderRadius: 1.5, p: 4 }}>
               <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>
                     {createdPurchase.customId || "New Purchase"}
                  </Typography>
                  <Stack spacing={0.5}>
                     <Typography variant="body2" color="textSecondary">
                        Supplier:{" "}
                        {createdPurchase.supplier?.name || "—"}
                        {createdPurchase.invoice
                           ? ` · Supplier Invoice: ${createdPurchase.invoice}`
                           : ""}
                     </Typography>
                     <Typography variant="body2" color="textSecondary">
                        Items: {(createdPurchase.items || []).length} ·
                        Grand Total:{" "}
                        {formatCurrency(Number(createdPurchase.total) || 0)} ·
                        Paid:{" "}
                        {formatCurrency(Number(createdPurchase.paid) || 0)} ·
                        Due:{" "}
                        {formatCurrency(Number(createdPurchase.due) || 0)}
                     </Typography>
                     {createdPurchase.creationOverpayment && (
                        <Typography variant="body2" color="warning.main">
                           Overpayment of{" "}
                           {formatCurrency(
                              Number(
                                 createdPurchase.creationOverpayment.amount,
                              ) || 0,
                           )}{" "}
                           was recorded as supplier credit (
                           {createdPurchase.creationOverpayment
                              .supplierPaymentCustomId || "unallocated payment"}
                           ).
                        </Typography>
                     )}
                  </Stack>
                  <Stack
                     direction={{ xs: "column", sm: "row" }}
                     spacing={1.5}
                     pt={1}
                  >
                     <Button
                        variant="contained"
                        color="primary"
                        onClick={() =>
                           printDocument(
                              buildPurchaseInvoicePrint(
                                 createdPurchase,
                                 settings,
                              ),
                           )
                        }
                     >
                        Print Purchase Invoice
                     </Button>
                     <Button
                        variant="outlined"
                        onClick={() => {
                           setCreatedPurchase(null);
                           setSupplierId(null);
                           setData({} as PurchaseTypes);
                           reset(blankForm());
                           fetchIdPreview();
                        }}
                     >
                        Create Another
                     </Button>
                     <Button
                        variant="text"
                        color="inherit"
                        onClick={() => router.push("/admin/purchase")}
                     >
                        Back to Purchases
                     </Button>
                  </Stack>
               </Stack>
            </Paper>
         </Stack>
      );
   }

   return (
      <Stack width="100%" maxWidth={1180} mx="auto" component="form" spacing={4}>
         {/* Breadcrumbs — the shared component, used exactly as on
             the Order Create page (back-link + current-page label). */}
         <Stack direction="row" alignItems="center" spacing={1}>
            <Breadcrumbs
               href="/admin/purchase"
               label={
                  editId
                     ? `Edit Purchase ${(data as any)?.customId || ""}`
                     : "Create Purchase"
               }
               parentLabel="Back to Purchases"
               parentHref="/admin/purchase"
            />
         </Stack>

         <Stack spacing={1}>
            <Typography variant="h5" fontWeight={700}>
               {editId
                  ? `Edit Purchase ${(data as any)?.customId || ""}`
                  : "Create Purchase"}
            </Typography>
            <Typography variant="body2" color="textSecondary">
               {editId
                  ? "Update this purchase — stock and totals are recalculated by the server on save."
                  : "Record a supplier purchase. Stock increases when the purchase is saved."}
            </Typography>
            {loadingPurchase && (
               <Typography variant="body2" color="textSecondary">
                  Loading purchase…
               </Typography>
            )}
         </Stack>

         {prefillNotice && <Alert severity="info">{prefillNotice}</Alert>}
         {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

         {/* No alignItems override: the default stretch makes the
             right-hand grid item as tall as the row, which is what
             gives the sticky summary room to travel — with
             flex-start the item collapsed to the summary's own
             height and the sticky had no effect (live-check fix). */}
         <Grid container spacing={4}>
            <Grid size={{ xs: 12, lg: 8 }}>
               <Stack spacing={4}>
                  <SectionCard
                     title="Purchase Information"
                     subtitle="Purchase ID, supplier, invoice and date"
                  >
                     <PurchaseInfoSection
                        control={control}
                        errors={errors}
                        supplierOptions={supplierOptions}
                        selectedSupplier={selectedSupplier}
                        onSupplierSelect={(option) =>
                           setSupplierId(option ? option.id : null)
                        }
                        purchaseIdText={
                           editId
                              ? (data as any)?.customId || editId
                              : idPreview || "—"
                        }
                     />
                  </SectionCard>

                  <SectionCard
                     title="Products"
                     subtitle="Search by name, SKU or barcode — quantities and prices are editable"
                  >
                     <ProductSection
                        control={control}
                        errors={errors}
                        productOptions={productOptions}
                     />
                  </SectionCard>

                  <SectionCard
                     title="Additional Information"
                     subtitle="Notes and attachments"
                  >
                     <NotesSection control={control} data={data || {}} />
                  </SectionCard>
               </Stack>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
               <Stack
                  spacing={4}
                  sx={{ position: { lg: "sticky" }, top: { lg: 88 } }}
               >
                  <SectionCard
                     title="Payment & Summary"
                     subtitle="Calculated with the server's formulas"
                  >
                     <SummarySection
                        control={control}
                        errors={errors}
                        data={data || {}}
                        totals={totals}
                        hasSupplier={Boolean(supplierId)}
                     />
                  </SectionCard>
               </Stack>
            </Grid>
         </Grid>

         {/* Bottom actions — the Order Create / Product Create
             pattern: a right-aligned row under the form, Cancel as
             the quiet secondary first, the primary action last.
             (Purchase has no draft support, so the references'
             middle Save-as-Draft button does not appear.) */}
         <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="flex-end"
            alignItems={{ xs: "stretch", sm: "center" }}
         >
            <Button
               variant="text"
               color="inherit"
               onClick={() => router.push("/admin/purchase")}
               disabled={submitting}
               sx={{ whiteSpace: "nowrap", flexShrink: 0, height: 42, px: 2 }}
            >
               Cancel
            </Button>
            <Button
               variant="contained"
               color="primary"
               type="submit"
               onClick={handleSubmit(onSubmit)}
               disabled={submitting || loadingPurchase}
               startIcon={
                  submitting ? (
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
               {submitting
                  ? "Saving…"
                  : editId
                    ? "Update Purchase"
                    : "Create Purchase"}
            </Button>
         </Stack>
      </Stack>
   );
};

export default Publish;
