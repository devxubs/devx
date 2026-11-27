"use client";

import React, { useRef, useState } from "react";
import {
   Grid,
   Stack,
   TextField,
   Typography,
   Box,
   Button,
   ButtonBase,
   LinearProgress,
   alpha,
   useTheme,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import { uploadImageFile } from "@src/lib/uploadImage";
import { useSnackbar } from "@src/lib/snackbarContext";
import SectionResetButton from "./SectionResetButton";

interface GeneralTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
}

const currencies = [
   { code: "BDT", symbol: "৳", label: "Bangladeshi Taka (BDT ৳)" },
   { code: "USD", symbol: "$", label: "US Dollar (USD $)" },
   { code: "EUR", symbol: "€", label: "Euro (EUR €)" },
   { code: "GBP", symbol: "£", label: "British Pound (GBP £)" },
   { code: "INR", symbol: "₹", label: "Indian Rupee (INR ₹)" },
   { code: "SAR", symbol: "﷼", label: "Saudi Riyal (SAR ﷼)" },
   { code: "AED", symbol: "د.إ", label: "UAE Dirham (AED)" },
];

const timezones = [
   { value: "Asia/Dhaka", label: "(GMT+6:00) Dhaka, Bangladesh" },
   { value: "Asia/Kolkata", label: "(GMT+5:30) Kolkata, New Delhi, India" },
   { value: "Asia/Dubai", label: "(GMT+4:00) Dubai, UAE" },
   { value: "Asia/Riyadh", label: "(GMT+3:00) Riyadh, Saudi Arabia" },
   { value: "Europe/London", label: "(GMT+0:00) London, UK" },
   { value: "UTC", label: "(GMT+0:00) UTC Universal Time" },
   { value: "America/New_York", label: "(GMT-5:00) New York, USA" },
];

const languages = [
   { value: "en", label: "English (US / UK)" },
   { value: "bn", label: "বাংলা (Bengali)" },
];

// Currency Symbol options for the autocomplete — derived from
// the currency list above (each symbol is unique there). The
// label keeps the code next to the symbol so the field stays
// searchable by either ("$" or "USD").
const currencySymbols = currencies.map((c) => ({
   symbol: c.symbol,
   label: `${c.symbol} (${c.code})`,
}));

// RP-6 (D1): the Date Format select was removed — nothing in the
// app ever read StoreSetting.dateFormat (dates render in fixed
// formats). The column and its stored value are untouched.

// Phase 4: logo uploads follow the product form's conventions
// (ProductMediaSection): the same POST /api/uploads route via
// uploadImageFile, the same accepted raster types and the same
// 5 MB cap (the server re-validates type by magic bytes and
// size against the actual buffer).
const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

const formatBytes = (bytes: number) =>
   bytes < 1024
      ? `${bytes} B`
      : bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

export default function GeneralTab({ values, onChange }: GeneralTabProps) {
   const theme = useTheme();
   const { showSnackbar } = useSnackbar();
   const [logoUploading, setLogoUploading] = useState(false);
   const [logoError, setLogoError] = useState<string | null>(null);
   const [logoDragging, setLogoDragging] = useState(false);
   // Name/size of the file uploaded in this session, keyed by
   // its stored URL — a logo loaded from saved settings has no
   // File behind it, so only its filename can be derived.
   const [logoMeta, setLogoMeta] = useState<{
      name: string;
      size: number;
      url: string;
   } | null>(null);
   const logoInputRef = useRef<HTMLInputElement>(null);
   const dragCountRef = useRef(0);

   const handleLogoFile = async (file: File | undefined) => {
      if (!file) return;
      // One upload at a time — extra drops/clicks during an
      // upload are ignored.
      if (logoUploading) return;
      setLogoError(null);
      if (!LOGO_ACCEPT.split(",").includes(file.type)) {
         setLogoError("Please choose a PNG, JPEG, WebP, GIF or AVIF image.");
         return;
      }
      if (file.size > LOGO_MAX_BYTES) {
         setLogoError("Image is larger than 5 MB.");
         return;
      }
      setLogoUploading(true);
      try {
         const url = await uploadImageFile(file);
         // Only a successful upload touches the form value — a
         // failed or cancelled upload leaves the saved logo as is.
         onChange("logoUrl", url);
         setLogoMeta({ name: file.name, size: file.size, url });
         showSnackbar("Store logo uploaded successfully!", "success");
      } catch (err) {
         setLogoError(
            err instanceof Error
               ? err.message
               : "Logo upload failed. Please try again.",
         );
      } finally {
         setLogoUploading(false);
         if (logoInputRef.current) logoInputRef.current.value = "";
      }
   };

   // Drag & drop on the upload card (both states — dropping on
   // the preview replaces the logo through the same validated
   // path). The counter keeps the drag-over state from
   // flickering when the pointer crosses child elements.
   const logoDragHandlers = {
      onDragEnter: (e: React.DragEvent) => {
         e.preventDefault();
         dragCountRef.current += 1;
         setLogoDragging(true);
      },
      onDragLeave: (e: React.DragEvent) => {
         e.preventDefault();
         dragCountRef.current -= 1;
         if (dragCountRef.current <= 0) {
            dragCountRef.current = 0;
            setLogoDragging(false);
         }
      },
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
         e.preventDefault();
         dragCountRef.current = 0;
         setLogoDragging(false);
         handleLogoFile(e.dataTransfer.files?.[0]);
      },
   };

   const logoDisplayName =
      logoMeta && logoMeta.url === values.logoUrl
         ? logoMeta.name
         : values.logoUrl?.startsWith("/uploads/")
           ? values.logoUrl.split("/").pop()
           : values.logoUrl
             ? "Current logo"
             : "";
   const logoDisplaySize =
      logoMeta && logoMeta.url === values.logoUrl
         ? formatBytes(logoMeta.size)
         : null;

   const currencyValue =
      currencies.find((c) => c.code === values.currency) || currencies[0];
   // The stored symbol may be a custom value outside the known
   // list (the field is freeSolo) — then the raw string itself
   // is the value, so it displays and round-trips unchanged.
   const currencySymbolValue =
      currencySymbols.find((s) => s.symbol === values.currencySymbol) ||
      values.currencySymbol ||
      "৳";
   const timezoneValue =
      timezones.find((tz) => tz.value === values.timezone) || timezones[0];
   const languageValue =
      languages.find((l) => l.value === values.language) || languages[0];

   return (
      <Stack spacing={2}>
         <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Typography variant="h6" fontWeight={600}>
               General Store Profile
            </Typography>
            <SectionResetButton
               section="General Store Profile"
               onReset={() => {
                  onChange("storeName", "DevX POS");
                  onChange("tagline", "Smart Retail & Point of Sale");
                  onChange("logoUrl", "");
                  onChange("email", "info@devxpos.com");
                  onChange("phone", "+880 1700-000000");
                  onChange("address", "Dhaka, Bangladesh");
               }}
            />
         </Stack>

         {/* Store Identity */}
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  fullWidth
                  label="Store Name"
                  size="small"
                  value={values.storeName || ""}
                  onChange={(e) => onChange("storeName", e.target.value)}
                  placeholder="DevX POS"
               />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  fullWidth
                  label="Store Tagline / Slogan"
                  size="small"
                  value={values.tagline || ""}
                  onChange={(e) => onChange("tagline", e.target.value)}
                  placeholder="Smart Retail & Point of Sale"
               />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  fullWidth
                  label="Store Email"
                  size="small"
                  type="email"
                  value={values.email || ""}
                  onChange={(e) => onChange("email", e.target.value)}
                  placeholder="contact@devxpos.com"
               />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  fullWidth
                  label="Store Phone / Hotline"
                  size="small"
                  value={values.phone || ""}
                  onChange={(e) => onChange("phone", e.target.value)}
                  placeholder="+880 1700-123456"
               />
            </Grid>

            <Grid size={12}>
               <TextField
                  fullWidth
                  label="Business Address"
                  size="small"
                  multiline
                  rows={2}
                  value={values.address || ""}
                  onChange={(e) => onChange("address", e.target.value)}
                  placeholder="House 42, Road 11, Banani, Dhaka-1213, Bangladesh"
               />
            </Grid>

            {/* Store Logo — upload card (drag & drop + click to
                browse), following the product media dropzone's
                visual pattern. The stored value is unchanged (a
                logo reference in values.logoUrl: an uploaded
                "/uploads/…" path, or a legacy URL/data-URL from
                before — all keep rendering in invoices, print
                and exports exactly as they did). */}
            <Grid size={12}>
               <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Store Logo
               </Typography>
               <Box
                  {...logoDragHandlers}
                  sx={{
                     border: "1.5px dashed",
                     borderColor: logoError
                        ? "error.main"
                        : logoDragging
                          ? "primary.main"
                          : "divider",
                     borderRadius: 1.5,
                     bgcolor: logoDragging
                        ? alpha(theme.palette.primary.main, 0.05)
                        : alpha(theme.palette.background.default, 0.4),
                     p: { xs: 2, sm: 3 },
                     transition: "all 0.2s ease",
                     ...(!values.logoUrl && {
                        "&:hover": {
                           borderColor: "primary.main",
                           bgcolor: alpha(theme.palette.primary.main, 0.02),
                        },
                     }),
                  }}
               >
                  {values.logoUrl ? (
                     /* Preview state */
                     <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2.5}
                        alignItems={{ xs: "stretch", sm: "center" }}
                     >
                        <Box
                           sx={{
                              width: { xs: "100%", sm: 220 },
                              height: 120,
                              flexShrink: 0,
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: "divider",
                              bgcolor: "background.paper",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                           }}
                        >
                           <Box
                              component="img"
                              src={values.logoUrl}
                              alt="Store Logo"
                              sx={{
                                 maxWidth: "100%",
                                 maxHeight: "100%",
                                 objectFit: "contain",
                              }}
                           />
                        </Box>
                        <Stack spacing={1} minWidth={0}>
                           <Box minWidth={0}>
                              <Typography
                                 variant="subtitle2"
                                 fontWeight={600}
                                 sx={{ wordBreak: "break-all" }}
                              >
                                 {logoDisplayName}
                              </Typography>
                              {logoDisplaySize && (
                                 <Typography variant="caption" color="text.secondary">
                                    {logoDisplaySize}
                                 </Typography>
                              )}
                           </Box>
                           <Stack direction="row" spacing={1}>
                              <Button
                                 variant="outlined"
                                 size="small"
                                 disabled={logoUploading}
                                 startIcon={
                                    <Icon icon="solar:upload-minimalistic-bold" size="small" />
                                 }
                                 onClick={() => logoInputRef.current?.click()}
                              >
                                 Replace
                              </Button>
                              <Button
                                 variant="text"
                                 color="error"
                                 size="small"
                                 disabled={logoUploading}
                                 onClick={() => {
                                    setLogoError(null);
                                    setLogoMeta(null);
                                    onChange("logoUrl", "");
                                 }}
                              >
                                 Remove
                              </Button>
                           </Stack>
                           <Typography variant="caption" color="text.secondary">
                              PNG, JPG, WebP, GIF or AVIF, up to 5 MB. You can also drag
                              and drop a new image onto this card to replace the logo.
                           </Typography>
                        </Stack>
                     </Stack>
                  ) : (
                     /* Empty state — the whole area is the upload
                        control (a ButtonBase, so it is
                        keyboard-operable with a visible focus
                        state). */
                     <ButtonBase
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        aria-label="Upload store logo"
                        sx={{
                           width: "100%",
                           borderRadius: 1,
                           py: 1,
                           "&.Mui-focusVisible": {
                              outline: "2px solid",
                              outlineColor: "primary.main",
                              outlineOffset: 4,
                           },
                        }}
                     >
                        <Stack alignItems="center" spacing={1} textAlign="center">
                           <Box
                              sx={{
                                 width: 48,
                                 height: 48,
                                 borderRadius: "50%",
                                 bgcolor: alpha(theme.palette.primary.main, 0.1),
                                 color: "primary.main",
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "center",
                              }}
                           >
                              <Icon icon="solar:cloud-upload-bold-duotone" size="large" />
                           </Box>
                           <Typography variant="subtitle1" fontWeight={600}>
                              Upload your store logo
                           </Typography>
                           <Typography variant="body2" color="text.secondary">
                              Drag and drop your image here, or{" "}
                              <Typography
                                 component="span"
                                 variant="body2"
                                 color="primary"
                                 sx={{ textDecoration: "underline" }}
                              >
                                 browse files
                              </Typography>
                           </Typography>
                           <Typography variant="caption" color="text.secondary">
                              PNG, JPG, WebP, GIF, AVIF · Max 5 MB
                           </Typography>
                        </Stack>
                     </ButtonBase>
                  )}

                  {logoUploading && (
                     <Box sx={{ mt: 2 }}>
                        <LinearProgress sx={{ borderRadius: 1 }} />
                        <Typography
                           variant="caption"
                           color="text.secondary"
                           display="block"
                           mt={0.75}
                        >
                           Uploading...
                        </Typography>
                     </Box>
                  )}
                  {logoError && (
                     <Typography
                        variant="caption"
                        color="error"
                        role="alert"
                        display="block"
                        mt={1.5}
                     >
                        {logoError}
                     </Typography>
                  )}
                  <input
                     ref={logoInputRef}
                     type="file"
                     accept={LOGO_ACCEPT}
                     hidden
                     aria-label="Upload store logo"
                     onChange={(e) => handleLogoFile(e.target.files?.[0])}
                  />
               </Box>
            </Grid>
         </Grid>

         <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Currency & Localization
            </Typography>
            <SectionResetButton
               section="Currency & Localization"
               onReset={() => {
                  onChange("currency", "BDT");
                  onChange("currencySymbol", "৳");
                  onChange("timezone", "Asia/Dhaka");
                  onChange("language", "en");
               }}
            />
         </Stack>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <CustomAutocomplete
                  arrow
                  size="small"
                  label="Default Currency"
                  options={currencies}
                  getOptionLabel={(o: any) => o?.label || ""}
                  isOptionEqualToValue={(a: any, b: any) => a?.code === b?.code}
                  value={currencyValue}
                  onChange={(next: any) => {
                     // CustomAutocomplete is value-first (Phase 1 lesson).
                     if (!next) return;
                     onChange("currency", next.code);
                     onChange("currencySymbol", next.symbol);
                  }}
               />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
               <CustomAutocomplete
                  size="small"
                  label="Currency Symbol"
                  options={currencySymbols}
                  getOptionLabel={(o: any) =>
                     typeof o === "string" ? o : o?.label || ""
                  }
                  isOptionEqualToValue={(a: any, b: any) =>
                     (typeof a === "string" ? a : a?.symbol) ===
                     (typeof b === "string" ? b : b?.symbol)
                  }
                  value={currencySymbolValue}
                  onChange={(next: any) => {
                     // CustomAutocomplete is value-first (Phase 1
                     // lesson). Without the `arrow` prop the
                     // component is freeSolo, so `next` is an
                     // option object when picked from the list,
                     // or the typed string for a custom symbol —
                     // both are stored as the symbol string, the
                     // same shape the old text field saved.
                     if (next == null) return;
                     onChange(
                        "currencySymbol",
                        typeof next === "string" ? next : next.symbol,
                     );
                  }}
                  onInputChange={(_e: any, inputValue: string, reason: string) => {
                     // This MUI version's freeSolo does NOT
                     // commit typed text on blur (only Enter or a
                     // list pick fires onChange) — a custom symbol
                     // would silently never reach the form. Commit
                     // keystrokes directly, like the old text
                     // field did. "reset" (list picks and
                     // external value changes) is left to
                     // onChange above.
                     if (reason === "input" || reason === "clear") {
                        onChange("currencySymbol", inputValue);
                     }
                  }}
               />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 6 }}>
               <CustomAutocomplete
                  arrow
                  size="small"
                  label="System Timezone"
                  options={timezones}
                  getOptionLabel={(o: any) => o?.label || ""}
                  isOptionEqualToValue={(a: any, b: any) => a?.value === b?.value}
                  value={timezoneValue}
                  onChange={(next: any) => {
                     if (next) onChange("timezone", next.value);
                  }}
               />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 6 }}>
               <CustomAutocomplete
                  arrow
                  size="small"
                  label="Language"
                  options={languages}
                  getOptionLabel={(o: any) => o?.label || ""}
                  isOptionEqualToValue={(a: any, b: any) => a?.value === b?.value}
                  value={languageValue}
                  onChange={(next: any) => {
                     if (next) onChange("language", next.value);
                  }}
               />
            </Grid>
         </Grid>
      </Stack>
   );
}
