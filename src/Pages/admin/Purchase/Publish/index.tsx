"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import {
   Button,
   Stack,
   Grid,
   TextField,
   Typography,
   IconButton,
} from "@mui/material";
import Icon from "@src/components/Icon";
import React, { useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { PurchaseTypes } from "..";
import { useRouter } from "next/navigation";
import Details from "./Details";
import Pricing from "./Pricing";
import Information from "./Information";

export interface SupplierOption {
   id: string;
   name: string;
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

const Publish = () => {
   const [data, setData] = useState<PurchaseTypes>({} as PurchaseTypes);
   const router = useRouter();

   const {
      control,
      handleSubmit,
      reset,
      setValue,
      watch,
      formState: { errors },
   } = useForm<PurchaseFormValues>({
      resolver: yupResolver<PurchaseFormValues, any, any>(purchaseSchema),
      defaultValues: {
         id: 0,
         date: "", // e.g., "2025-10-25"
         invoice: "",
         supplier: "",
         product: [],
         product_amount: 0,
         others_cost: 0,
         discount: 0,
         total: 0,
         note: "",
      },
   });

   const [submitting, setSubmitting] = useState(false);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);

   // Phase 2 (2.4): real option data for the pickers. The previous
   // implementation read the `suppliersData` / `productsData` mock
   // exports, which are empty arrays — the supplier picker had no
   // options and line items never carried a productId, so stock was
   // never credited for UI-created purchases and supplier was always
   // null. Options now come from the real APIs.
   const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
   const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
   const [supplierId, setSupplierId] = useState<string | null>(null);

   // Edit mode: /admin/purchase/publish?id=<purchase id> (the list's
   // Edit action has always linked here; the page previously ignored
   // the id and created a duplicate purchase instead of editing).
   const [editId, setEditId] = useState<string | null>(null);
   const [loadingPurchase, setLoadingPurchase] = useState(false);

   React.useEffect(() => {
      fetch("/api/suppliers")
         .then((r) => (r.ok ? r.json() : []))
         .then((list) => {
            const arr = Array.isArray(list) ? list : list?.suppliers || [];
            setSupplierOptions(
               arr.map((s: any) => ({ id: s.id, name: s.name })),
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
   }, []);

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
            date: new Date().toISOString().split("T")[0],
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
         // Line items now include their productId (Phase 2, 2.4) so the
         // API can net stock correctly; totals are recomputed on the
         // server for both POST and PUT — client totals are advisory.
         const payload = {
            supplierId: supplierId || null,
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

         router.push("/admin/purchase");
      } catch (err: any) {
         setErrorMsg(err.message || "Failed to save purchase");
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <Stack
         width={"100%"}
         maxWidth={650}
         mx={"auto"}
         height={"100%"}
         component="form"
      >
         {prefillNotice && (
            <Typography
               variant="body2"
               color="primary"
               sx={{
                  mb: 2,
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: "primary.lighter",
               }}
            >
               {prefillNotice}
            </Typography>
         )}
         {editId && (
            <Stack spacing={0.5} mb={3}>
               <Typography variant="h6" fontWeight={700}>
                  Edit Purchase {(data as any)?.customId || ""}
               </Typography>
               <Typography variant="body2" color="textSecondary">
                  Internal Purchase ID: {(data as any)?.customId || editId} —
                  the supplier&apos;s own invoice number is edited in the
                  Information section below.
               </Typography>
               {loadingPurchase && (
                  <Typography variant="body2" color="textSecondary">
                     Loading purchase…
                  </Typography>
               )}
            </Stack>
         )}
         <Stack spacing={4}>
            <Stack>
               <Details
                  data={data || {}}
                  control={control}
                  errors={errors}
                  supplierOptions={supplierOptions}
                  productOptions={productOptions}
                  onSupplierSelect={(name) => {
                     const match = supplierOptions.find((s) => s.name === name);
                     setSupplierId(match ? match.id : null);
                  }}
               />
            </Stack>
            <Stack>
               <Information
                  data={data || {}}
                  control={control}
                  errors={errors}
               />
            </Stack>
            <Stack>
               <Pricing
                  data={data || {}}
                  control={control}
                  errors={errors}
                  setValue={setValue}
                  watch={watch}
               />
            </Stack>
         </Stack>

         <Stack
            spacing={2}
            direction={"row"}
            justifyContent={"flex-end"}
            width={"100%"}
            mt={2}
         >
            {errorMsg && (
               <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                  {errorMsg}
               </Typography>
            )}
            <Button
               variant="text"
               color="inherit"
               disabled={submitting}
               onClick={() => router.push("/admin/purchase")}
            >
               Cancel
            </Button>

            <Button
               variant="contained"
               color="primary"
               type="submit"
               disabled={submitting || loadingPurchase}
               onClick={handleSubmit(onSubmit)}
            >
               {submitting
                  ? "Saving..."
                  : editId
                    ? "Update Purchase"
                    : "Add Purchase"}
            </Button>
         </Stack>
      </Stack>
   );
};

export default Publish;
