"use client";

import React, { memo, useState } from "react";
import {
   Grid,
   Stack,
   TextField,
   Typography,
   Box,
   FormControlLabel,
   Card,
   CardContent,
   Divider,
   Button,
   Chip,
   Tabs,
   Tab,
   IconButton,
   Tooltip,
} from "@mui/material";
import Icon from "@src/components/Icon";
import SettingsField from "./SettingsField";
import CustomSwitch from "@src/components/CustomSwitch";
import CustomAutocomplete from "@src/components/Autocomplete";
import CustomModal from "@src/components/Modal";
import AlertDialog from "@src/components/AlertDialog";
import { INVOICE_TEMPLATES, SAMPLE_INVOICE_ORDER } from "@src/components/InvoiceTemplates/templates";
import InvoiceRenderer from "@src/components/InvoiceTemplates/InvoiceRenderer";
import type { InvoiceTemplateMeta } from "@src/components/InvoiceTemplates/types";
import {
   CUSTOM_INVOICE_TEMPLATES_KEY,
   CUSTOM_TEMPLATE_VISIBILITY_KEYS,
   CustomInvoiceTemplate,
   applyInvoiceTemplateSelection,
   findCustomInvoiceTemplate,
   newCustomInvoiceTemplateId,
   resolveCustomInvoiceTemplates,
} from "@src/lib/customInvoiceTemplates";

interface InvoicesTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
   onConfigChange: (key: string, value: any) => void;
}

// RP-6 (D5): the Paper Size select was removed — nothing ever
// read StoreSetting.receiptPaperSize (paper behaviour comes from
// the selected invoice template). The column and its stored
// value are untouched.

const accentColorPresets = [
   { name: "Teal", hex: "#0F766E" },
   { name: "Navy Corporate", hex: "#1E3A8A" },
   { name: "Dark Slate", hex: "#1E293B" },
   { name: "Emerald Green", hex: "#047857" },
   { name: "Ocean Sky", hex: "#0284C7" },
   { name: "Royal Purple", hex: "#7C3AED" },
   { name: "Amber Gold", hex: "#B45309" },
   { name: "Crimson Rose", hex: "#BE123C" },
   { name: "Monochrome Black", hex: "#000000" },
];

const DEFAULT_TERMS =
   "Goods once sold can be exchanged within 7 days with original invoice. Preserve this receipt for warranty claims.";

const VISIBILITY_FIELDS: {
   key: (typeof CUSTOM_TEMPLATE_VISIBILITY_KEYS)[number];
   label: string;
   desc: string;
}[] = [
   { key: "showLogoOnReceipt", label: "Print Store Logo", desc: "Render store brand logo at the top of invoices" },
   { key: "showBarcodeOnReceipt", label: "Print Barcode / QR Code", desc: "Generate scannable order barcode at bottom of receipt" },
   { key: "showCustomerOnReceipt", label: "Print Customer Details", desc: "Display customer name, phone number, and address" },
   { key: "showCashierOnReceipt", label: "Print Cashier / Server Name", desc: "Display staff member who handled checkout" },
   { key: "showCourierOnReceipt", label: "Print Courier & Tracking ID", desc: "Show logistics partner name and shipment tracking number" },
   { key: "showSkuColumn", label: "Print SKU Column", desc: "Include product code/SKU in the line item table" },
   { key: "showSignatureBox", label: "Print Signature Authorization Line", desc: "Render signature blocks for cashier and customer verification" },
   { key: "showTermsOnReceipt", label: "Print Return & Warranty Terms", desc: "Show legal store return and exchange terms" },
];

// RP-7 (C4): card thumbnail — the ACTUAL template rendered with
// the shared sample order at design width, scaled down and
// centre-cropped. No image assets: it reuses InvoiceRenderer, so
// a thumbnail can never drift from the real design. Memoized on
// the (module-constant) template object with a fixed sample
// customization, so it renders once and never re-renders while
// the admin edits other fields. Decorative only — the eye button
// remains the full preview path.
const TemplateThumbnail = memo(function TemplateThumbnail({
   template,
}: {
   template: InvoiceTemplateMeta;
}) {
   return (
      <Box
         aria-hidden
         sx={{
            position: "relative",
            height: 148,
            overflow: "hidden",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "#fff",
            mb: 1.5,
         }}
      >
         <Box
            sx={{
               position: "absolute",
               top: 0,
               left: "50%",
               width: 680,
               transform: "translateX(-50%) scale(0.38)",
               transformOrigin: "top center",
               pointerEvents: "none",
               userSelect: "none",
            }}
         >
            <InvoiceRenderer
               order={SAMPLE_INVOICE_ORDER}
               templateId={template.id}
               customization={{
                  templateId: template.id,
                  accentColor: template.accent,
                  paperSize: template.paperSize as any,
               }}
            />
         </Box>
      </Box>
   );
});

// Cleanup Phase 2: a custom template's thumbnail renders its
// BASE layout with the template's own overrides applied — the
// same resolution the print path uses. Memoized on the custom
// template's serialized shape.
const CustomTemplateThumbnail = memo(function CustomTemplateThumbnail({
   template,
   cacheKey,
}: {
   template: CustomInvoiceTemplate;
   cacheKey: string;
}) {
   void cacheKey;
   const base = INVOICE_TEMPLATES.find((t) => t.id === template.baseTemplateId);
   const customization = applyInvoiceTemplateSelection(
      { templateId: template.id, accentColor: base?.accent },
      { [CUSTOM_INVOICE_TEMPLATES_KEY]: [template] },
   );
   return (
      <Box
         aria-hidden
         sx={{
            position: "relative",
            height: 148,
            overflow: "hidden",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "#fff",
            mb: 1.5,
         }}
      >
         <Box
            sx={{
               position: "absolute",
               top: 0,
               left: "50%",
               width: 680,
               transform: "translateX(-50%) scale(0.38)",
               transformOrigin: "top center",
               pointerEvents: "none",
               userSelect: "none",
            }}
         >
            <InvoiceRenderer
               order={SAMPLE_INVOICE_ORDER}
               templateId={customization.templateId}
               customization={{
                  ...customization,
                  paperSize: base?.paperSize as any,
               }}
            />
         </Box>
      </Box>
   );
});

interface BuilderDraft {
   id: string | null;
   name: string;
   baseTemplateId: string;
   accentColor: string;
   invoiceHeader: string;
   invoiceFooter: string;
   termsText: string;
   visibility: Record<string, boolean>;
}

export default function InvoicesTab({ values, onChange, onConfigChange }: InvoicesTabProps) {
   const customConfig = values.customConfig || {};
   const activeTemplateId = customConfig.invoiceTemplateId || values.invoiceTemplateId || "classic-pro";
   const customTemplates = resolveCustomInvoiceTemplates(customConfig);
   const activeCustom = findCustomInvoiceTemplate(customConfig, activeTemplateId);

   const [categoryFilter, setCategoryFilter] = useState<string>("All");
   const [previewModalOpen, setPreviewModalOpen] = useState(false);
   const [previewTemplateId, setPreviewTemplateId] = useState<string>(activeTemplateId);
   const [builder, setBuilder] = useState<BuilderDraft | null>(null);
   const [builderError, setBuilderError] = useState<string>("");
   const [deleteTarget, setDeleteTarget] = useState<CustomInvoiceTemplate | null>(null);

   const filteredTemplates = INVOICE_TEMPLATES.filter((t) => {
      if (categoryFilter === "All") return true;
      return t.category === categoryFilter;
   });

   const handleSelectDefaultTemplate = (templateId: string) => {
      onConfigChange("invoiceTemplateId", templateId);
   };

   const handleOpenPreview = (templateId: string) => {
      setPreviewTemplateId(templateId);
      setPreviewModalOpen(true);
   };

   // ── Builder (Cleanup Phase 2) ─────────────────────────────
   // The builder edits a LOCAL draft; nothing reaches the
   // settings form until "Save Template", so cancelling the
   // builder never dirties the form. Saving writes the list
   // through onConfigChange — from there the normal Settings
   // Save/Discard flow owns persistence.
   const globalVisibility = (key: string) =>
      Boolean(customConfig[key] ?? true);

   const draftFromGlobals = (
      baseTemplateId: string,
      accent: string,
   ): BuilderDraft => ({
      id: null,
      name: "",
      baseTemplateId,
      accentColor: customConfig.accentColor || accent,
      invoiceHeader: values.invoiceHeader || "",
      invoiceFooter: values.invoiceFooter || "",
      termsText: customConfig.termsText || "",
      visibility: Object.fromEntries(
         CUSTOM_TEMPLATE_VISIBILITY_KEYS.map((k) => [k, globalVisibility(k)]),
      ),
   });

   const openCreate = () => {
      const base =
         INVOICE_TEMPLATES.find((t) => t.id === activeTemplateId) ||
         INVOICE_TEMPLATES[0];
      const draft = draftFromGlobals(base.id, base.accent);
      draft.name = "Custom Template";
      setBuilderError("");
      setBuilder(draft);
   };

   const openDuplicateBuiltIn = (t: InvoiceTemplateMeta) => {
      const draft = draftFromGlobals(t.id, t.accent);
      draft.name = `${t.name} Copy`;
      setBuilderError("");
      setBuilder(draft);
   };

   const openEditCustom = (ct: CustomInvoiceTemplate) => {
      const base = INVOICE_TEMPLATES.find((t) => t.id === ct.baseTemplateId);
      const draft = draftFromGlobals(ct.baseTemplateId, base?.accent || "#0F766E");
      draft.id = ct.id;
      draft.name = ct.name;
      if (ct.accentColor !== undefined) draft.accentColor = ct.accentColor;
      if (ct.invoiceHeader !== undefined) draft.invoiceHeader = ct.invoiceHeader;
      if (ct.invoiceFooter !== undefined) draft.invoiceFooter = ct.invoiceFooter;
      if (ct.termsText !== undefined) draft.termsText = ct.termsText;
      for (const k of CUSTOM_TEMPLATE_VISIBILITY_KEYS) {
         if (ct[k] !== undefined) draft.visibility[k] = ct[k] as boolean;
      }
      setBuilderError("");
      setBuilder(draft);
   };

   const openDuplicateCustom = (ct: CustomInvoiceTemplate) => {
      openEditCustom(ct);
      setBuilder((d) =>
         d ? { ...d, id: null, name: `${ct.name} Copy` } : d,
      );
   };

   const saveBuilder = () => {
      if (!builder) return;
      const name = builder.name.trim();
      if (!name) {
         setBuilderError("Give the template a name.");
         return;
      }
      if (
         customTemplates.some(
            (t) => t.id !== builder.id && t.name.toLowerCase() === name.toLowerCase(),
         )
      ) {
         setBuilderError("A custom template with this name already exists.");
         return;
      }
      const entry: CustomInvoiceTemplate = {
         id: builder.id ?? newCustomInvoiceTemplateId(),
         name,
         baseTemplateId: builder.baseTemplateId,
         accentColor: builder.accentColor || undefined,
         invoiceHeader: builder.invoiceHeader,
         invoiceFooter: builder.invoiceFooter,
         termsText: builder.termsText,
         ...Object.fromEntries(
            CUSTOM_TEMPLATE_VISIBILITY_KEYS.map((k) => [
               k,
               builder.visibility[k] !== false,
            ]),
         ),
      };
      const next = builder.id
         ? customTemplates.map((t) => (t.id === builder.id ? entry : t))
         : [...customTemplates, entry];
      onConfigChange(CUSTOM_INVOICE_TEMPLATES_KEY, next);
      setBuilder(null);
   };

   const confirmDeleteCustom = () => {
      if (!deleteTarget) return;
      onConfigChange(
         CUSTOM_INVOICE_TEMPLATES_KEY,
         customTemplates.filter((t) => t.id !== deleteTarget.id),
      );
      // Deleting the ACTIVE template clears the selection — the
      // renderer falls back to the default built-in design
      // instead of pointing at a template that no longer exists.
      if (activeTemplateId === deleteTarget.id) {
         onConfigChange("invoiceTemplateId", undefined);
      }
      setDeleteTarget(null);
   };

   // Preview resolution shared by built-in and custom ids.
   const previewCustom = findCustomInvoiceTemplate(customConfig, previewTemplateId);
   const previewBase = INVOICE_TEMPLATES.find(
      (t) => t.id === (previewCustom?.baseTemplateId || previewTemplateId),
   );
   const previewCustomization = applyInvoiceTemplateSelection(
      {
         ...values,
         ...customConfig,
         templateId: previewTemplateId,
         accentColor:
            customConfig.accentColor ||
            (previewCustom ? undefined : previewBase?.accent),
      },
      customConfig,
   );
   const previewName =
      previewCustom?.name || previewBase?.name || "Template";

   const builderBase = builder
      ? INVOICE_TEMPLATES.find((t) => t.id === builder.baseTemplateId)
      : undefined;
   const builderPreviewCustomization = builder
      ? {
           templateId: builder.baseTemplateId,
           accentColor: builder.accentColor || undefined,
           invoiceHeader: builder.invoiceHeader || undefined,
           invoiceFooter: builder.invoiceFooter || undefined,
           termsText: builder.termsText || undefined,
           storeName: values.storeName,
           phone: values.phone,
           address: values.address,
           ...Object.fromEntries(
              CUSTOM_TEMPLATE_VISIBILITY_KEYS.map((k) => [
                 k,
                 builder.visibility[k] !== false,
              ]),
           ),
        }
      : null;

   return (
      <Stack spacing={3}>
         {/* 1. SECTION: INVOICE SETTINGS (global) */}
         <Box>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} mb={1.5} sx={{ flexWrap: "wrap", columnGap: 2 }}>
               <Typography variant="h6" fontWeight={700}>
                  Invoice Settings
               </Typography>
            </Stack>

            {/* RP-7 (C7): store phone, address and language are
                edited only in the General Store tab; invoices
                keep reading the same saved values. */}
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
               Store phone, address and language are set once in the General Store tab and used on invoices automatically.
            </Typography>

            {/* Global field standard: one field per row, label
                above, placeholder inside, helper below. */}
            <Stack spacing={2.5}>
               <SettingsField
                  label="Invoice Header Subtitle"
                  helper="Printed under the store name at the top of invoices."
               >
                  <TextField
                     fullWidth
                     size="small"
                     value={values.invoiceHeader || ""}
                     onChange={(e) => onChange("invoiceHeader", e.target.value)}
                     placeholder="Official Sales Invoice & Receipt"
                  />
               </SettingsField>
               <SettingsField
                  label="Closing Thank-You Note"
                  helper="Printed at the bottom of every invoice."
               >
                  <TextField
                     fullWidth
                     size="small"
                     value={values.invoiceFooter || "Thank you for shopping with us! Please come again."}
                     onChange={(e) => onChange("invoiceFooter", e.target.value)}
                     placeholder="Thank you for shopping with us! Please come again."
                  />
               </SettingsField>
               <SettingsField
                  label="Invoice Accent Color"
                  helper="The accent colour the selected invoice template is rendered with."
               >
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                     {accentColorPresets.map((c) => {
                        const isCurrentAccent = (customConfig.accentColor || "#0F766E") === c.hex;
                        return (
                           <Chip
                              key={c.hex}
                              label={c.name}
                              onClick={() => onConfigChange("accentColor", c.hex)}
                              icon={
                                 <Box
                                    sx={{
                                       width: 14,
                                       height: 14,
                                       borderRadius: "50%",
                                       bgcolor: c.hex,
                                       border: "1px solid #FFF",
                                    }}
                                 />
                              }
                              variant={isCurrentAccent ? "filled" : "outlined"}
                              color={isCurrentAccent ? "primary" : "default"}
                              sx={{
                                 fontWeight: 600,
                                 borderColor: isCurrentAccent ? c.hex : "divider",
                              }}
                           />
                        );
                     })}
                  </Stack>
               </SettingsField>
               <SettingsField
                  label="Warranty Terms & Conditions"
                  helper="Shown on invoices while 'Print Return & Warranty Terms' is switched on below."
                  width="wide"
               >
                  <TextField
                     fullWidth
                     size="small"
                     multiline
                     rows={2}
                     value={customConfig.termsText || DEFAULT_TERMS}
                     onChange={(e) => onConfigChange("termsText", e.target.value)}
                     placeholder="Enter the terms printed on invoices"
                  />
               </SettingsField>
            </Stack>

            {/* Visibility toggles — RP-2 (D6/D7): all eight persist
                to customConfig; the two of the same name that used
                to be StoreSetting columns are not read anywhere. */}
            <Typography variant="subtitle2" fontWeight={700} mt={2.5} mb={1}>
               Invoice Elements
            </Typography>
            {/* Switch rows follow the same standard: external
                label with explanatory text, one per row, no
                per-toggle cards. */}
            <Stack spacing={2}>
               {VISIBILITY_FIELDS.map((item) => {
                  const isChecked = Boolean(customConfig[item.key] ?? true);
                  return (
                     <FormControlLabel
                        key={item.key}
                        control={
                           <CustomSwitch
                              checked={isChecked}
                              onChange={(e) =>
                                 onConfigChange(item.key, e.target.checked)
                              }
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 {item.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 {item.desc}
                              </Typography>
                           </Box>
                        }
                     />
                  );
               })}
            </Stack>
         </Box>

         <Divider />

         {/* 2. SECTION: BUILT-IN TEMPLATES */}
         <Box>
            <Typography variant="h6" fontWeight={700}>
               Built-in Templates
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1}>
               Select the default invoice template, preview a design, or duplicate one to customize it.
               {activeCustom && (
                  <>
                     {" "}Currently active: the custom template{" "}
                     <strong>{activeCustom.name}</strong> (see below).
                  </>
               )}
            </Typography>

            <Tabs
               value={categoryFilter}
               onChange={(_, val) => setCategoryFilter(val)}
               variant="scrollable"
               scrollButtons="auto"
               sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
            >
               {["All", "Standard A4", "Thermal POS", "Compact A5", "Specialized"].map((cat) => (
                  <Tab key={cat} label={cat === "All" ? `All Templates (18)` : cat} value={cat} sx={{ textTransform: "none", fontWeight: 600 }} />
               ))}
            </Tabs>

            <Grid container spacing={2}>
               {filteredTemplates.map((template) => {
                  const isSelected = activeTemplateId === template.id;
                  return (
                     // RP-5: three-across only from lg up.
                     <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={template.id}>
                        <Card
                           variant="outlined"
                           sx={{
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              borderRadius: 2,
                              transition: "all 0.2s",
                              borderWidth: isSelected ? 2 : 1,
                              borderColor: isSelected ? "primary.main" : "divider",
                              bgcolor: isSelected ? "action.selected" : "background.paper",
                              position: "relative",
                              overflow: "hidden",
                           }}
                        >
                           <Box sx={{ height: 6, bgcolor: template.accent }} />
                           <CardContent sx={{ p: 2, flexGrow: 1 }}>
                              <TemplateThumbnail template={template} />
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                 <Typography variant="subtitle1" fontWeight={700}>
                                    {template.name}
                                 </Typography>
                                 <Chip
                                    label={template.paperSize}
                                    size="small"
                                    color={template.paperSize.includes("mm") ? "warning" : "default"}
                                    sx={{ fontWeight: 700, fontSize: "10px", height: 20 }}
                                 />
                              </Stack>
                              <Typography variant="caption" color="text.secondary" display="block" mb={2} sx={{ minHeight: 36 }}>
                                 {template.description}
                              </Typography>
                              {isSelected && (
                                 <Chip
                                    icon={<Icon icon="solar:check-circle-bold" size="small" />}
                                    label="Active Default Template"
                                    color="primary"
                                    size="small"
                                    sx={{ mb: 1.5, fontWeight: 700 }}
                                 />
                              )}
                           </CardContent>
                           <Divider />
                           <Stack direction="row" spacing={1} p={1.5} bgcolor="background.default" alignItems="center">
                              <Button
                                 variant={isSelected ? "contained" : "outlined"}
                                 color={isSelected ? "primary" : "inherit"}
                                 size="small"
                                 fullWidth
                                 onClick={() => handleSelectDefaultTemplate(template.id)}
                              >
                                 {isSelected ? "Selected" : "Set as Default"}
                              </Button>
                              <Tooltip disableInteractive title="Live Preview with Sample Data">
                                 <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleOpenPreview(template.id)}
                                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                                 >
                                    <Icon icon="solar:eye-bold" size="small" />
                                 </IconButton>
                              </Tooltip>
                              <Tooltip disableInteractive title="Duplicate & Customize">
                                 <IconButton
                                    size="small"
                                    onClick={() => openDuplicateBuiltIn(template)}
                                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                                 >
                                    <Icon icon="solar:copy-bold" size="small" />
                                 </IconButton>
                              </Tooltip>
                           </Stack>
                        </Card>
                     </Grid>
                  );
               })}
            </Grid>
         </Box>

         <Divider />

         {/* 3. SECTION: CUSTOM TEMPLATES */}
         <Box>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} mb={1.5} sx={{ flexWrap: "wrap", columnGap: 2 }}>
               <Box>
                  <Typography variant="h6" fontWeight={700}>
                     Custom Templates
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     Your own designs, based on a built-in layout with your colours, texts and element visibility.
                  </Typography>
               </Box>
               <Button
                  variant="contained"
                  size="small"
                  startIcon={<Icon icon="solar:add-circle-bold" size="small" />}
                  onClick={openCreate}
                  sx={{ mt: { xs: 1, sm: 0 }, alignSelf: { xs: "flex-start", sm: "center" }, whiteSpace: "nowrap", flexShrink: 0 }}
               >
                  Create Custom Invoice
               </Button>
            </Stack>

            {customTemplates.length === 0 ? (
               <Typography variant="body2" color="text.secondary">
                  No custom templates yet. Create one, or duplicate a built-in template above to customize it.
               </Typography>
            ) : (
               <Grid container spacing={2}>
                  {customTemplates.map((ct) => {
                     const base = INVOICE_TEMPLATES.find((t) => t.id === ct.baseTemplateId);
                     const isSelected = activeTemplateId === ct.id;
                     return (
                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={ct.id}>
                           <Card
                              variant="outlined"
                              sx={{
                                 height: "100%",
                                 display: "flex",
                                 flexDirection: "column",
                                 justifyContent: "space-between",
                                 borderRadius: 2,
                                 transition: "all 0.2s",
                                 borderWidth: isSelected ? 2 : 1,
                                 borderColor: isSelected ? "primary.main" : "divider",
                                 bgcolor: isSelected ? "action.selected" : "background.paper",
                                 position: "relative",
                                 overflow: "hidden",
                              }}
                           >
                              <Box sx={{ height: 6, bgcolor: ct.accentColor || base?.accent || "#0F766E" }} />
                              <CardContent sx={{ p: 2, flexGrow: 1 }}>
                                 <CustomTemplateThumbnail template={ct} cacheKey={JSON.stringify(ct)} />
                                 <Typography variant="subtitle1" fontWeight={700}>
                                    {ct.name}
                                 </Typography>
                                 <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                                    Based on {base?.name || ct.baseTemplateId} · {base?.paperSize || ""}
                                 </Typography>
                                 {isSelected && (
                                    <Chip
                                       icon={<Icon icon="solar:check-circle-bold" size="small" />}
                                       label="Active Default Template"
                                       color="primary"
                                       size="small"
                                       sx={{ mb: 1.5, fontWeight: 700 }}
                                    />
                                 )}
                              </CardContent>
                              <Divider />
                              <Stack direction="row" spacing={1} p={1.5} bgcolor="background.default" alignItems="center">
                                 <Button
                                    variant={isSelected ? "contained" : "outlined"}
                                    color={isSelected ? "primary" : "inherit"}
                                    size="small"
                                    fullWidth
                                    onClick={() => handleSelectDefaultTemplate(ct.id)}
                                 >
                                    {isSelected ? "Selected" : "Set as Default"}
                                 </Button>
                                 <Tooltip disableInteractive title="Preview">
                                    <IconButton
                                       size="small"
                                       color="primary"
                                       onClick={() => handleOpenPreview(ct.id)}
                                       sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                                    >
                                       <Icon icon="solar:eye-bold" size="small" />
                                    </IconButton>
                                 </Tooltip>
                                 <Tooltip disableInteractive title="Edit">
                                    <IconButton
                                       size="small"
                                       onClick={() => openEditCustom(ct)}
                                       sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                                    >
                                       <Icon icon="solar:pen-2-bold-duotone" size="small" />
                                    </IconButton>
                                 </Tooltip>
                                 <Tooltip disableInteractive title="Duplicate">
                                    <IconButton
                                       size="small"
                                       onClick={() => openDuplicateCustom(ct)}
                                       sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                                    >
                                       <Icon icon="solar:copy-bold" size="small" />
                                    </IconButton>
                                 </Tooltip>
                                 <Tooltip disableInteractive title="Delete">
                                    <IconButton
                                       size="small"
                                       color="error"
                                       onClick={() => setDeleteTarget(ct)}
                                       sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                                    >
                                       <Icon icon="solar:trash-bin-trash-bold-duotone" size="small" />
                                    </IconButton>
                                 </Tooltip>
                              </Stack>
                           </Card>
                        </Grid>
                     );
                  })}
               </Grid>
            )}
         </Box>

         {/* 4. PREVIEW MODAL (built-in + custom) */}
         <CustomModal
            open={previewModalOpen}
            onClose={() => setPreviewModalOpen(false)}
            title={`Invoice Preview — ${previewName}`}
            sx={{ width: { xs: "95%", sm: "85%", md: 850 }, p: 0, borderRadius: 2 }}
         >
            <Box p={3} maxHeight="80vh" overflow="auto">
               <InvoiceRenderer
                  order={SAMPLE_INVOICE_ORDER}
                  customization={previewCustomization}
                  templateId={previewCustomization.templateId}
               />
               <Stack direction="row" justifyContent="space-between" mt={3} pt={2} borderTop="1px solid" borderColor="divider">
                  <Button onClick={() => setPreviewModalOpen(false)} color="inherit">
                     Close Preview
                  </Button>
                  <Button
                     variant="contained"
                     color="primary"
                     startIcon={<Icon icon="solar:check-circle-bold" size="small" />}
                     onClick={() => {
                        handleSelectDefaultTemplate(previewTemplateId);
                        setPreviewModalOpen(false);
                     }}
                  >
                     Set as Active Default
                  </Button>
               </Stack>
            </Box>
         </CustomModal>

         {/* 5. CUSTOM TEMPLATE BUILDER */}
         <CustomModal
            open={builder !== null}
            onClose={() => setBuilder(null)}
            title={builder?.id ? "Edit Custom Template" : "Custom Invoice Builder"}
            size="lg"
            closeIcon
         >
            {builder && builderPreviewCustomization && (
               <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={2}>
                        <SettingsField
                           label="Template Name"
                           helper="The name shown in the Custom Templates list."
                           error={builderError || null}
                        >
                           <TextField
                              fullWidth
                              size="small"
                              value={builder.name}
                              onChange={(e) => setBuilder({ ...builder, name: e.target.value })}
                              error={!!builderError}
                              placeholder="e.g. Corporate Copy"
                           />
                        </SettingsField>
                        <SettingsField
                           label="Base Layout"
                           helper="The built-in design this template is based on."
                        >
                           <CustomAutocomplete
                              arrow
                              size="small"
                              options={INVOICE_TEMPLATES}
                              getOptionLabel={(o: any) => o?.name || ""}
                              isOptionEqualToValue={(a: any, b: any) => a?.id === b?.id}
                              value={builderBase || null}
                              onChange={(next: any) =>
                                 next &&
                                 setBuilder({ ...builder, baseTemplateId: next.id })
                              }
                              placeholder="Select base layout"
                           />
                        </SettingsField>
                        <Box>
                           <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary" mb={0.75}>
                              Accent Color
                           </Typography>
                           <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} alignItems="center">
                              {accentColorPresets.map((c) => (
                                 <Chip
                                    key={c.hex}
                                    label={c.name}
                                    size="small"
                                    onClick={() => setBuilder({ ...builder, accentColor: c.hex })}
                                    variant={builder.accentColor === c.hex ? "filled" : "outlined"}
                                    color={builder.accentColor === c.hex ? "primary" : "default"}
                                    icon={
                                       <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: c.hex, border: "1px solid #FFF" }} />
                                    }
                                 />
                              ))}
                              <Box
                                 component="input"
                                 type="color"
                                 aria-label="Custom accent colour"
                                 value={/^#[0-9A-Fa-f]{6}$/.test(builder.accentColor) ? builder.accentColor : "#0F766E"}
                                 onChange={(e: any) => setBuilder({ ...builder, accentColor: e.target.value })}
                                 sx={{ width: 36, height: 28, p: 0, border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "transparent", cursor: "pointer" }}
                              />
                           </Stack>
                           <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                              Overrides the base layout&apos;s accent colour for this template only.
                           </Typography>
                        </Box>
                        <SettingsField
                           label="Invoice Header Subtitle"
                           helper="Printed under the store name on this template. Leave empty to use the invoice-wide subtitle."
                        >
                           <TextField
                              fullWidth
                              size="small"
                              value={builder.invoiceHeader}
                              onChange={(e) => setBuilder({ ...builder, invoiceHeader: e.target.value })}
                              placeholder="Official Sales Invoice & Receipt"
                           />
                        </SettingsField>
                        <SettingsField
                           label="Closing Thank-You Note"
                           helper="Printed at the bottom of this template's invoices."
                        >
                           <TextField
                              fullWidth
                              size="small"
                              value={builder.invoiceFooter}
                              onChange={(e) => setBuilder({ ...builder, invoiceFooter: e.target.value })}
                              placeholder="Thank you for shopping with us! Please come again."
                           />
                        </SettingsField>
                        <SettingsField
                           label="Warranty Terms & Conditions"
                           helper="Terms text printed by this template when terms are shown."
                           width="wide"
                        >
                           <TextField
                              fullWidth
                              size="small"
                              multiline
                              rows={2}
                              value={builder.termsText}
                              onChange={(e) => setBuilder({ ...builder, termsText: e.target.value })}
                              placeholder="Enter the terms printed on invoices"
                           />
                        </SettingsField>
                        <Box>
                           <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary" mb={0.5}>
                              Elements
                           </Typography>
                           <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                              Choose which elements this template prints.
                           </Typography>
                           <Grid container spacing={0.5}>
                              {VISIBILITY_FIELDS.map((item) => (
                                 <Grid size={{ xs: 12, sm: 6 }} key={item.key}>
                                    <FormControlLabel
                                       control={
                                          <CustomSwitch
                                             checked={builder.visibility[item.key] !== false}
                                             onChange={(e) =>
                                                setBuilder({
                                                   ...builder,
                                                   visibility: { ...builder.visibility, [item.key]: e.target.checked },
                                                })
                                             }
                                          />
                                       }
                                       label={<Typography variant="body2">{item.label}</Typography>}
                                    />
                                 </Grid>
                              ))}
                           </Grid>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                           <Typography variant="body2" color="text.secondary">
                              Font
                           </Typography>
                           <Chip label="Not yet supported" size="small" variant="outlined" />
                           <Typography variant="caption" color="text.secondary">
                              Fonts follow the base layout design — the print renderer has no per-template font setting yet.
                           </Typography>
                        </Stack>
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary" mb={0.75}>
                        Live Preview
                     </Typography>
                     <Box
                        sx={{
                           position: "relative",
                           height: 420,
                           overflow: "hidden",
                           borderRadius: 1,
                           border: "1px solid",
                           borderColor: "divider",
                           bgcolor: "#fff",
                        }}
                     >
                        <Box
                           sx={{
                              position: "absolute",
                              top: 0,
                              left: "50%",
                              width: 680,
                              transform: "translateX(-50%) scale(0.55)",
                              transformOrigin: "top center",
                              pointerEvents: "none",
                              userSelect: "none",
                           }}
                        >
                           <InvoiceRenderer
                              order={SAMPLE_INVOICE_ORDER}
                              templateId={builder.baseTemplateId}
                              customization={{
                                 ...builderPreviewCustomization,
                                 paperSize: builderBase?.paperSize as any,
                              }}
                           />
                        </Box>
                     </Box>
                     <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        Preview uses sample data. Saving adds the template to the settings form — press Save Changes in the header to persist it.
                     </Typography>
                  </Grid>
                  <Grid size={12}>
                     <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                        <Button variant="outlined" color="inherit" onClick={() => setBuilder(null)}>
                           Cancel
                        </Button>
                        <Button variant="contained" onClick={saveBuilder}>
                           Save Template
                        </Button>
                     </Stack>
                  </Grid>
               </Grid>
            )}
         </CustomModal>

         {/* Delete custom template confirmation */}
         <AlertDialog
            open={deleteTarget !== null}
            onClose={() => setDeleteTarget(null)}
            type="error"
            title={`Delete the custom template "${deleteTarget?.name}"? This cannot be undone.`}
            confirmText="Delete Template"
            cancelText="Cancel"
            onConfirm={confirmDeleteCustom}
         />

      </Stack>
   );
}
