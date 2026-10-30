"use client";

import React, { useState } from "react";
import {
   Grid,
   MenuItem,
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
   Paper,
   Tabs,
   Tab,
   IconButton,
   Tooltip,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomSwitch from "@src/components/CustomSwitch";
import CustomModal from "@src/components/Modal";
import AlertDialog from "@src/components/AlertDialog";
import { INVOICE_TEMPLATES, SAMPLE_INVOICE_ORDER } from "@src/components/InvoiceTemplates/templates";
import InvoiceRenderer from "@src/components/InvoiceTemplates/InvoiceRenderer";

interface InvoicesTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
   onConfigChange: (key: string, value: any) => void;
}

const paperSizes = [
   { value: "80mm", label: "80mm Standard POS Thermal Receipt" },
   { value: "58mm", label: "58mm Compact Mobile Thermal Receipt" },
   { value: "A4", label: "A4 Full Page Laser / Inkjet Sheet" },
   { value: "A5", label: "A5 Half Sheet Business Invoice" },
];

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

export default function InvoicesTab({ values, onChange, onConfigChange }: InvoicesTabProps) {
   const customConfig = values.customConfig || {};
   const activeTemplateId = customConfig.invoiceTemplateId || values.invoiceTemplateId || "classic-pro";

   const [categoryFilter, setCategoryFilter] = useState<string>("All");
   const [previewModalOpen, setPreviewModalOpen] = useState(false);
   const [previewTemplateId, setPreviewTemplateId] = useState<string>(activeTemplateId);
   const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

   const filteredTemplates = INVOICE_TEMPLATES.filter((t) => {
      if (categoryFilter === "All") return true;
      return t.category === categoryFilter;
   });

   const handleSelectDefaultTemplate = (templateId: string, defaultPaperSize?: string) => {
      onConfigChange("invoiceTemplateId", templateId);
      if (defaultPaperSize) {
         onChange("receiptPaperSize", defaultPaperSize);
      }
   };

   const handleOpenPreview = (templateId: string) => {
      setPreviewTemplateId(templateId);
      setPreviewModalOpen(true);
   };

   const handleConfirmReset = () => {
      onConfigChange("invoiceTemplateId", "classic-pro");
      onConfigChange("accentColor", "#1E3A8A");
      onChange("receiptPaperSize", "A4");
      onChange("invoiceHeader", "Official Sales Invoice & Receipt");
      onChange("invoiceFooter", "Thank you for shopping with us! Please come again.");
      onChange("showLogoOnReceipt", true);
      onChange("showBarcodeOnReceipt", true);
      onConfigChange("showCustomerOnReceipt", true);
      onConfigChange("showCashierOnReceipt", true);
      onConfigChange("showCourierOnReceipt", true);
      onConfigChange("showSkuColumn", true);
      onConfigChange("showSignatureBox", true);
      onConfigChange("showTermsOnReceipt", true);
      setResetConfirmOpen(false);
   };

   return (
      <Stack spacing={4}>
         {/* 1. SECTION: TEMPLATE GALLERY (18 TEMPLATES) */}
         <Box>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} mb={1}>
               <Box>
                  <Typography variant="h6" fontWeight={700}>
                     18 Distinct Invoice & Receipt Templates
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     Select your store&apos;s default invoice template. Every design is fully responsive and supports A4, A5, and continuous POS thermal rolls.
                  </Typography>
               </Box>
               <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  startIcon={<Icon icon="solar:restart-bold" size="small" />}
                  onClick={() => setResetConfirmOpen(true)}
                  sx={{ mt: { xs: 1, sm: 0 }, alignSelf: { xs: "flex-start", sm: "center" } }}
               >
                  Reset Defaults
               </Button>
            </Stack>

            {/* Category Filter Tabs */}
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

            {/* Template Cards Grid */}
            <Grid container spacing={2}>
               {filteredTemplates.map((template) => {
                  const isSelected = activeTemplateId === template.id;
                  return (
                     <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.id}>
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
                           {/* Color accent top strip */}
                           <Box sx={{ height: 6, bgcolor: template.accent }} />

                           <CardContent sx={{ p: 2, flexGrow: 1 }}>
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

                           <Stack direction="row" spacing={1} p={1.5} bgcolor="background.default">
                              <Button
                                 variant={isSelected ? "contained" : "outlined"}
                                 color={isSelected ? "primary" : "inherit"}
                                 size="small"
                                 fullWidth
                                 onClick={() => handleSelectDefaultTemplate(template.id, template.paperSize)}
                              >
                                 {isSelected ? "Selected" : "Set as Default"}
                              </Button>
                              <Tooltip title="Live Preview with Sample Data">
                                 <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleOpenPreview(template.id)}
                                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                                 >
                                    <Icon icon="solar:eye-bold" size="small" />
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

         {/* 2. SECTION: INVOICE CUSTOMIZATION CONTROLS */}
         <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
               Document Layout & Business Identity
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2.5}>
               These parameters apply universally to your selected invoice template when generating and printing invoices.
            </Typography>

            <Grid container spacing={2.5}>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                     select
                     fullWidth
                     label="Paper Size"
                     size="small"
                     value={values.receiptPaperSize || "A4"}
                     onChange={(e) => onChange("receiptPaperSize", e.target.value)}
                     helperText="Dimensions used when invoking browser print or PDF"
                  >
                     {paperSizes.map((p) => (
                        <MenuItem key={p.value} value={p.value}>
                           {p.label}
                        </MenuItem>
                     ))}
                  </TextField>
               </Grid>

               <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                     fullWidth
                     label="Invoice Header Subtitle"
                     size="small"
                     value={values.invoiceHeader || ""}
                     onChange={(e) => onChange("invoiceHeader", e.target.value)}
                     placeholder="Official Sales Invoice & Receipt"
                     helperText="Printed right beneath your store header"
                  />
               </Grid>

               <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                     fullWidth
                     label="Store Contact Phone"
                     size="small"
                     value={values.phone || ""}
                     onChange={(e) => onChange("phone", e.target.value)}
                     placeholder="+880 1700-123456"
                     helperText="Shown on invoice header contact row"
                  />
               </Grid>

               <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                     fullWidth
                     label="Store Address"
                     size="small"
                     value={values.address || ""}
                     onChange={(e) => onChange("address", e.target.value)}
                     placeholder="Banani, Dhaka-1213, Bangladesh"
                     helperText="Store location printed on the bill"
                  />
               </Grid>

               {/* Accent Color Palette Selector */}
               <Grid size={12}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                     Invoice Accent Color:
                  </Typography>
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
               </Grid>

               <Grid size={12}>
                  <TextField
                     fullWidth
                     label="Warranty Terms & Conditions"
                     size="small"
                     multiline
                     rows={2}
                     value={customConfig.termsText || "Goods once sold can be exchanged within 7 days with original invoice. Preserve this receipt for warranty claims."}
                     onChange={(e) => onConfigChange("termsText", e.target.value)}
                     helperText="Legal return, warranty, and replacement guidelines displayed at the base of the invoice"
                  />
               </Grid>

               <Grid size={12}>
                  <TextField
                     fullWidth
                     label="Closing Thank-You Note"
                     size="small"
                     value={values.invoiceFooter || "Thank you for shopping with us! Please come again."}
                     onChange={(e) => onChange("invoiceFooter", e.target.value)}
                     helperText="Friendly greeting printed at the very bottom"
                  />
               </Grid>
            </Grid>
         </Box>

         <Divider />

         {/* 3. SECTION: VISIBILITY & ELEMENT TOGGLES */}
         <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
               Invoice Elements & Data Visibility
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
               Control which customer, delivery, cashier, and barcode components appear on printed receipts.
            </Typography>

            <Grid container spacing={2}>
               {[
                  {
                     key: "showLogoOnReceipt",
                     isRoot: true,
                     label: "Print Store Logo",
                     desc: "Render store brand logo at the top of invoices",
                     defaultVal: true,
                  },
                  {
                     key: "showBarcodeOnReceipt",
                     isRoot: true,
                     label: "Print Barcode / QR Code",
                     desc: "Generate scannable order barcode at bottom of receipt",
                     defaultVal: true,
                  },
                  {
                     key: "showCustomerOnReceipt",
                     isRoot: false,
                     label: "Print Customer Details",
                     desc: "Display customer name, phone number, and address",
                     defaultVal: true,
                  },
                  {
                     key: "showCashierOnReceipt",
                     isRoot: false,
                     label: "Print Cashier / Server Name",
                     desc: "Display staff member who handled checkout",
                     defaultVal: true,
                  },
                  {
                     key: "showCourierOnReceipt",
                     isRoot: false,
                     label: "Print Courier & Tracking ID",
                     desc: "Show logistics partner name and shipment tracking number",
                     defaultVal: true,
                  },
                  {
                     key: "showSkuColumn",
                     isRoot: false,
                     label: "Print SKU Column",
                     desc: "Include product code/SKU in the line item table",
                     defaultVal: true,
                  },
                  {
                     key: "showSignatureBox",
                     isRoot: false,
                     label: "Print Signature Authorization Line",
                     desc: "Render signature blocks for cashier and customer verification",
                     defaultVal: true,
                  },
                  {
                     key: "showTermsOnReceipt",
                     isRoot: false,
                     label: "Print Return & Warranty Terms",
                     desc: "Show legal store return and exchange terms",
                     defaultVal: true,
                  },
               ].map((item) => {
                  const isChecked = item.isRoot
                     ? Boolean(values[item.key] ?? item.defaultVal)
                     : Boolean(customConfig[item.key] ?? item.defaultVal);

                  return (
                     <Grid size={{ xs: 12, md: 6 }} key={item.key}>
                        <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                           <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                              <FormControlLabel
                                 control={
                                    <CustomSwitch
                                       checked={isChecked}
                                       onChange={(e) => {
                                          if (item.isRoot) {
                                             onChange(item.key, e.target.checked);
                                          } else {
                                             onConfigChange(item.key, e.target.checked);
                                          }
                                       }}
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
                           </CardContent>
                        </Card>
                     </Grid>
                  );
               })}
            </Grid>
         </Box>

         {/* 4. LIVE PREVIEW MODAL */}
         <CustomModal
            open={previewModalOpen}
            onClose={() => setPreviewModalOpen(false)}
            title={`Invoice Preview — ${INVOICE_TEMPLATES.find((t) => t.id === previewTemplateId)?.name || "Template"}`}
            sx={{ width: { xs: "95%", sm: "85%", md: 850 }, p: 0, borderRadius: 2 }}
         >
            <Box p={3} maxHeight="80vh" overflow="auto">
               <InvoiceRenderer
                  order={SAMPLE_INVOICE_ORDER}
                  customization={{
                     ...values,
                     ...customConfig,
                     templateId: previewTemplateId,
                     accentColor: customConfig.accentColor || INVOICE_TEMPLATES.find((t) => t.id === previewTemplateId)?.accent,
                  }}
                  templateId={previewTemplateId}
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

         {/* Reset Defaults Confirmation Dialog */}
         <AlertDialog
            open={resetConfirmOpen}
            onClose={() => setResetConfirmOpen(false)}
            type="warning"
            title="Reset invoice template and printing layout to standard Classic Professional defaults?"
            confirmText="Reset Defaults"
            cancelText="Cancel"
            onConfirm={handleConfirmReset}
         />
      </Stack>
   );
}
