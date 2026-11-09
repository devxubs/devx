"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
   Alert,
   Box,
   Button,
   CircularProgress,
   Container,
   Grid,
   Stack,
   Typography,
   useTheme,
} from "@mui/material";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import { productSchema, ProductSchemaType, hideNumberSpinnerSx, ProductBundleComponent } from "./types";
import {
   ProductBreadcrumbs,
   ProductBasicInfoSection,
   ProductIdentificationSection,
   ProductMediaSection,
   ProductPricingSection,
   ProductVariantsSection,
   ProductBundleSection,
   ProductUnitsSection,
   ProductInventorySection,
   ProductBatchesSection,
   ProductSuppliersSection,
   ProductSpecificationsSection,
   ProductPOSSettingsSection,
   ProductRightSummaryPanel,
   ProductStickyFooter,
} from "./components";
import { useProductVariants } from "./hooks/useProductVariants";
import { useProductDraft } from "./hooks/useProductDraft";

const DEFAULT_FORM_VALUES: ProductSchemaType = {
   productName: "",
   subDescription: "",
   content: "",
   brand: "",
   manufacturer: "",
   category: "",
   subcategory: "",
   productType: "Simple",
   status: "ACTIVE",
   isFeatured: false,

   productCode: "",
   productSku: "",
   barcode: "",

   images: [],

   costPrice: 0,
   regularPrice: 0,
   salePrice: undefined,
   wholesalePrice: 0,
   dealerPrice: 0,
   taxRate: 0,
   taxMode: "EXCLUSIVE",
   discountPercentage: 0,

   baseUnit: "Piece",
   purchaseUnit: "",
   salesUnit: "Piece",
   unitConversionRate: 1,
   unit: [],
   color: [],

   quantity: 0,
   lowStockAlert: "10",
   minStockLevel: 5,
   maxStockLevel: 1000,
   warehouseId: "",
   rackLocation: "",
   shelfLocation: "",

   hasBatchTracking: false,
   hasSerialTracking: false,
   batchNumber: "",
   mfgDate: "",
   expDate: "",
   batchQuantity: undefined,

   primarySupplierId: "",
   supplierProductCode: "",
   supplierPrice: undefined,
   leadTimeDays: undefined,

   warrantyPeriod: "",
   warrantyType: "",
   modelNumber: "",
   originCountry: "",
   specifications: [],
   tags: [],

   salesAccount: "",
   purchaseAccount: "",
   inventoryAccount: "",
   cogsAccount: "",

   allowDiscount: true,
   allowPriceChangeAtPos: false,
   trackInventory: true,
   allowNegativeStock: false,
   availableForPos: true,
   availableForOnline: true,

   variants: [],
   bundleItems: [],
};

export const Publish: React.FC = () => {
   const theme = useTheme();
   const router = useRouter();
   const params = useSearchParams();
   const id = params?.get("id");
   const isEdit = Boolean(id);

   const [isLoadingExisting, setIsLoadingExisting] = useState(Boolean(id));
   const [submitting, setSubmitting] = useState(false);
   const [serverError, setServerError] = useState<string | null>(null);
   const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
   const [bundleItems, setBundleItems] = useState<ProductBundleComponent[]>([]);

   const {
      control,
      handleSubmit,
      formState: { errors, isDirty },
      reset,
      setValue,
      watch,
      getValues,
   } = useForm<ProductSchemaType>({
      resolver: zodResolver(productSchema as any),
      defaultValues: DEFAULT_FORM_VALUES,
   });

   const watchName = watch("productName");
   const watchPrice = watch("regularPrice");
   const watchCategory = watch("category");
   const watchType = watch("productType");
   const watchSku = watch("productSku");
   const watchCost = watch("costPrice");
   const watchImages = watch("images") || [];

   // Variants hook
   const {
      attributes,
      variants,
      setVariants,
      addAttribute,
      removeAttribute,
      addAttributeValue,
      removeAttributeValue,
      generateCombinations,
      updateVariant,
      removeVariant,
      addManualVariant,
      totalVariantQuantity,
   } = useProductVariants([], watchSku || "PROD", Number(watchPrice) || 0, Number(watchCost) || 0);

   // Sync variant quantity with main form quantity if Variable product
   useEffect(() => {
      if (watchType === "Variable") {
         setValue("quantity", totalVariantQuantity, { shouldDirty: true });
         setValue("variants", variants, { shouldDirty: true });
      }
   }, [watchType, totalVariantQuantity, variants, setValue]);

   // Sync bundle items with main form
   useEffect(() => {
      if (watchType === "Bundle") {
         setValue("bundleItems", bundleItems, { shouldDirty: true });
      }
   }, [watchType, bundleItems, setValue]);

   // Form completion tracking for mandatory fields
   const completedRequiredCount = [
      Boolean(watchName?.trim() && watchName.trim().length >= 2),
      Boolean(Number(watchPrice) > 0),
      Boolean(watchCategory?.trim()),
      Boolean(watchType?.trim()),
   ].filter(Boolean).length;

   // Draft Auto-save hook
   const handleRestoreDraft = useCallback(
      (draftData: Partial<ProductSchemaType>) => {
         reset({ ...DEFAULT_FORM_VALUES, ...draftData });
      },
      [reset],
   );

   const currentFormValues = getValues();
   const {
      hasSavedDraft,
      savedDraftTime,
      draftRestored,
      restoreDraft,
      discardDraft,
      clearDraftOnSubmit,
   } = useProductDraft(isEdit, currentFormValues, isDirty, handleRestoreDraft);

   // Unsaved changes confirmation
   const handleCancel = () => {
      if (isDirty && !submitting) {
         setDiscardDialogOpen(true);
      } else {
         router.push("/admin/product");
      }
   };

   // Window beforeunload prompt if dirty
   useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
         if (isDirty && !submitting) {
            e.preventDefault();
            e.returnValue = "";
         }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
   }, [isDirty, submitting]);

   // Load existing product if editing
   useEffect(() => {
      if (!id) {
         setIsLoadingExisting(false);
         return;
      }

      let isMounted = true;
      const fetchExisting = async () => {
         setIsLoadingExisting(true);
         try {
            const res = await fetch(`/api/products/${id}`);
            if (res.ok && isMounted) {
               const p = await res.json();
               const imgs = Array.isArray(p.images)
                  ? p.images
                  : typeof p.images === "string"
                  ? JSON.parse(p.images)
                  : [];

               const loadedVariants = Array.isArray(p.variants) ? p.variants : [];
               setVariants(loadedVariants);

               if (Array.isArray(p.bundleItems)) {
                  setBundleItems(
                     p.bundleItems.map((b: any) => ({
                        componentProductId: b.componentProductId,
                        componentProductName: b.componentProduct?.productName,
                        componentSku: b.componentProduct?.productSku,
                        quantity: b.quantity,
                        unitPrice: Number(b.unitPrice) || 0,
                     })),
                  );
               }

               reset({
                  productName: p.productName || "",
                  subDescription: p.subDescription || "",
                  content: p.content || "",
                  brand: p.brand || "",
                  manufacturer: p.manufacturer || "",
                  category: p.category?.name || p.category || "",
                  subcategory: p.subcategory || "",
                  productType: p.productType || "Simple",
                  status: (p.status as any) || "ACTIVE",
                  isFeatured: Boolean(p.isFeatured),

                  productCode: p.productCode || "",
                  productSku: p.productSku || "",
                  barcode: p.barcode || "",

                  images: imgs,

                  costPrice: Number(p.costPrice) || 0,
                  regularPrice: Number(p.regularPrice) || 0,
                  salePrice: p.salePrice ? Number(p.salePrice) : undefined,
                  wholesalePrice: Number(p.wholesalePrice) || 0,
                  dealerPrice: Number(p.dealerPrice) || 0,
                  taxRate: Number(p.taxRate) || 0,
                  taxMode: (p.taxMode as any) || "EXCLUSIVE",
                  discountPercentage: Number(p.discountPercentage) || 0,

                  baseUnit: p.baseUnit || "Piece",
                  purchaseUnit: p.purchaseUnit || "",
                  salesUnit: p.salesUnit || "Piece",
                  unitConversionRate: Number(p.unitConversionRate) || 1,
                  unit: Array.isArray(p.sizes) ? p.sizes : [],
                  color: Array.isArray(p.colors) ? p.colors : [],

                  quantity: p.quantity ?? 0,
                  lowStockAlert: String(p.lowStockAlert || "10"),
                  minStockLevel: p.minStockLevel ?? 5,
                  maxStockLevel: p.maxStockLevel ?? 1000,
                  warehouseId: p.warehouseStocks?.[0]?.warehouseId || "",
                  rackLocation: p.rackLocation || "",
                  shelfLocation: p.shelfLocation || "",

                  hasBatchTracking: Boolean(p.hasBatchTracking),
                  hasSerialTracking: Boolean(p.hasSerialTracking),
                  batchNumber: p.batches?.[0]?.batchNumber || "",
                  mfgDate: p.batches?.[0]?.mfgDate ? p.batches[0].mfgDate.split("T")[0] : "",
                  expDate: p.batches?.[0]?.expDate ? p.batches[0].expDate.split("T")[0] : "",
                  batchQuantity: p.batches?.[0]?.quantity,

                  primarySupplierId: p.primarySupplierId || "",
                  supplierProductCode: p.supplierProductCode || "",
                  supplierPrice: p.supplierPrice ? Number(p.supplierPrice) : undefined,
                  leadTimeDays: p.leadTimeDays ?? undefined,

                  warrantyPeriod: p.warrantyPeriod || "",
                  warrantyType: p.warrantyType || "",
                  modelNumber: p.modelNumber || "",
                  originCountry: p.originCountry || "",
                  specifications: Array.isArray(p.specifications) ? p.specifications : [],
                  tags: Array.isArray(p.tags) ? p.tags : [],

                  salesAccount: p.salesAccount || "",
                  purchaseAccount: p.purchaseAccount || "",
                  inventoryAccount: p.inventoryAccount || "",
                  cogsAccount: p.cogsAccount || "",

                  allowDiscount: p.allowDiscount !== false,
                  allowPriceChangeAtPos: Boolean(p.allowPriceChangeAtPos),
                  trackInventory: p.trackInventory !== false,
                  allowNegativeStock: Boolean(p.allowNegativeStock),
                  availableForPos: p.availableForPos !== false,
                  availableForOnline: p.availableForOnline !== false,

                  variants: loadedVariants,
                  bundleItems: p.bundleItems || [],
               });
            }
         } catch {
            if (isMounted) setServerError("Failed to fetch product details.");
         } finally {
            if (isMounted) setIsLoadingExisting(false);
         }
      };

      fetchExisting();
      return () => {
         isMounted = false;
      };
   }, [id, reset, setVariants]);

   // Core submission handler
   const submitProductData = async (data: ProductSchemaType, overrideStatus?: "ACTIVE" | "DRAFT") => {
      setSubmitting(true);
      setServerError(null);

      try {
         const finalStatus = overrideStatus || data.status || "ACTIVE";

         const payload = {
            ...data,
            images: Array.isArray(data.images) ? data.images : [],
            productCode: data.productCode?.trim() || undefined,
            productSku: data.productSku?.trim() || undefined,
            barcode: data.barcode?.trim() || null,
            quantity: Number(data.quantity) || 0,
            lowStockAlert: parseInt(String(data.lowStockAlert || "10")) || 10,
            regularPrice: Number(data.regularPrice) || 0,
            salePrice: data.salePrice ? Number(data.salePrice) : null,
            costPrice: Number(data.costPrice) || 0,
            wholesalePrice: Number(data.wholesalePrice) || 0,
            dealerPrice: Number(data.dealerPrice) || 0,
            status: finalStatus,
            variants: watchType === "Variable" ? variants : [],
            bundleItems: watchType === "Bundle" ? bundleItems : [],
         };

         const url = id ? `/api/products/${id}` : "/api/products";
         const method = id ? "PUT" : "POST";

         const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });

         if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || "Failed to save product");
         }

         clearDraftOnSubmit();
         return true;
      } catch (err: any) {
         setServerError(err.message || "Something went wrong while saving product.");
         return false;
      } finally {
         setSubmitting(false);
      }
   };

   // Standard Save
   const onSubmit: SubmitHandler<ProductSchemaType> = async (data) => {
      const ok = await submitProductData(data);
      if (ok) router.push("/admin/product");
   };

   // Save as Draft
   const handleSaveDraft = async () => {
      const currentValues = getValues();
      const ok = await submitProductData(currentValues, "DRAFT");
      if (ok) router.push("/admin/product");
   };

   // Save & Add Another
   const handleSaveAndAddAnother = async () => {
      const currentValues = getValues();
      const ok = await submitProductData(currentValues);
      if (ok) {
         reset(DEFAULT_FORM_VALUES);
         setVariants([]);
         setBundleItems([]);
         window.scrollTo({ top: 0, behavior: "smooth" });
      }
   };

   // Publish Directly
   const handlePublish = async () => {
      const currentValues = getValues();
      const ok = await submitProductData(currentValues, "ACTIVE");
      if (ok) router.push("/admin/product");
   };

   if (isLoadingExisting) {
      return (
         <Box
            sx={{
               display: "flex",
               flexDirection: "column",
               alignItems: "center",
               justifyContent: "center",
               minHeight: 400,
               gap: 2,
            }}
         >
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">
               Loading product details...
            </Typography>
         </Box>
      );
   }

   return (
      <Box
         component="form"
         onSubmit={handleSubmit(onSubmit)}
         sx={{
            width: "100%",
            pb: 4,
            ...hideNumberSpinnerSx,
         }}
      >
         <Container maxWidth={false} sx={{ maxWidth: 1680, px: { xs: 2, sm: 3, md: 4 } }}>
            <Stack spacing={2.5}>
               {/* Breadcrumbs Navigation */}
               <Box sx={{ pt: 1 }}>
                  <ProductBreadcrumbs
                     isEdit={isEdit}
                     onNavigateProducts={handleCancel}
                  />
               </Box>

               {/* Page Title & Context Header */}
               <Stack spacing={0.5}>
                  <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: "-0.02em" }}>
                     {isEdit ? "Edit Product" : "Create a New Product"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     Configure complete inventory details, multi-tier pricing, dynamic variants, batches and sales channel controls.
                  </Typography>
               </Stack>

               {/* Draft Recovery Notification Banner */}
               {!isEdit && hasSavedDraft && !draftRestored && (
                  <Alert
                     severity="info"
                     action={
                        <Stack direction="row" spacing={1}>
                           <Button size="small" color="inherit" onClick={restoreDraft} sx={{ fontWeight: 600 }}>
                              Restore
                           </Button>
                           <Button size="small" color="inherit" onClick={discardDraft}>
                              Dismiss
                           </Button>
                        </Stack>
                     }
                     sx={{
                        borderRadius: 1.5,
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        border: "1px solid",
                     }}
                  >
                     You have an auto-saved draft from {savedDraftTime}. Would you like to restore your progress?
                  </Alert>
               )}

               {/* 70% / 30% Modern SaaS Form Grid Layout */}
               <Grid container spacing={3}>
                  {/* Left Column (70%): 10 Sequential Product Form Sections */}
                  <Grid size={{ xs: 12, md: 7.5, lg: 8.4 }}>
                     <Stack spacing={3}>
                        {/* 1. Basic Product Information */}
                        <ProductBasicInfoSection
                           formControl={control}
                           errors={errors}
                           setValue={setValue}
                        />

                        {/* 2. Product Identification & SKU */}
                        <ProductIdentificationSection
                           formControl={control}
                           errors={errors}
                           setValue={setValue}
                           currentProductName={watchName}
                           currentCategory={watchCategory}
                        />

                        {/* 3. Product Images & Media */}
                        <ProductMediaSection
                           images={watchImages}
                           onChangeImages={(imgs) => setValue("images", imgs, { shouldDirty: true })}
                           error={errors.images?.message as string}
                        />

                        {/* 4. Variants, Sizes & Specifications */}
                        <Stack spacing={3}>
                           {watchType === "Variable" && (
                              <ProductVariantsSection
                                 variants={variants}
                                 attributes={attributes}
                                 onAddAttribute={addAttribute}
                                 onRemoveAttribute={removeAttribute}
                                 onAddAttributeValue={addAttributeValue}
                                 onRemoveAttributeValue={removeAttributeValue}
                                 onGenerateCombinations={generateCombinations}
                                 onUpdateVariant={updateVariant}
                                 onRemoveVariant={removeVariant}
                                 onAddManualVariant={addManualVariant}
                              />
                           )}

                           {watchType === "Bundle" && (
                              <ProductBundleSection
                                 bundleItems={bundleItems}
                                 onChangeBundleItems={setBundleItems}
                                 currentProductId={id}
                              />
                           )}

                           <ProductSpecificationsSection
                              formControl={control}
                              errors={errors}
                              setValue={setValue}
                           />
                        </Stack>

                        {/* 5. Pricing & Profit Analysis */}
                        <ProductPricingSection formControl={control} errors={errors} />

                        {/* 6. Units & Measurement Conversion (Non-service) */}
                        {watchType !== "Service" && (
                           <ProductUnitsSection formControl={control} errors={errors} />
                        )}

                        {/* 7. Inventory & Warehouse Management (Non-service) */}
                        {watchType !== "Service" && (
                           <ProductInventorySection formControl={control} errors={errors} />
                        )}

                        {/* 8. Stock & Supply Data (Non-service) */}
                        {watchType !== "Service" && (
                           <ProductBatchesSection formControl={control} errors={errors} />
                        )}

                        {/* 9. Supplier & Procurement Information */}
                        <ProductSuppliersSection formControl={control} errors={errors} />

                        {/* 10. SEO & Extra Product Settings */}
                        <ProductPOSSettingsSection formControl={control} errors={errors} />
                     </Stack>
                  </Grid>

                  {/* Right Column (30%): Live Summary, Preview, Status & Quick Jump */}
                  <Grid size={{ xs: 12, md: 4.5, lg: 3.6 }}>
                     <ProductRightSummaryPanel
                        formControl={control}
                        setValue={setValue}
                        isEdit={isEdit}
                        completedCount={completedRequiredCount}
                        totalCount={4}
                     />
                  </Grid>
               </Grid>

               {/* Sticky Footer */}
               <ProductStickyFooter
                  isEdit={isEdit}
                  isSubmitting={submitting}
                  onCancel={handleCancel}
                  serverError={serverError}
                  completedRequiredCount={completedRequiredCount}
                  totalRequiredCount={4}
                  isDirty={isDirty}
                  onSaveDraft={handleSaveDraft}
                  onSaveAndAddAnother={handleSaveAndAddAnother}
                  onPublish={handlePublish}
               />
            </Stack>
         </Container>

         {/* Unsaved changes confirmation dialog */}
         <AlertDialog
            open={discardDialogOpen}
            onClose={() => setDiscardDialogOpen(false)}
            type="warning"
            title="Discard unsaved product changes? You have unsaved edits in this product form."
            confirmText="Discard Changes"
            cancelText="Keep Editing"
            onConfirm={() => {
               setDiscardDialogOpen(false);
               router.push("/admin/product");
            }}
         />
      </Box>
   );
};

export default Publish;
