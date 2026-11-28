"use client";

import React, { useRef, useState } from "react";
import {
   Stack,
   TextField,
   Typography,
   Box,
   ButtonBase,
   IconButton,
   LinearProgress,
   Tooltip,
   alpha,
   useTheme,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import { uploadImageFile } from "@src/lib/uploadImage";
import { useSnackbar } from "@src/lib/snackbarContext";
import SettingsField from "./SettingsField";

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

export default function GeneralTab({ values, onChange }: GeneralTabProps) {
   const theme = useTheme();
   const { showSnackbar } = useSnackbar();
   const [logoUploading, setLogoUploading] = useState(false);
   const [logoError, setLogoError] = useState<string | null>(null);
   const [logoDragging, setLogoDragging] = useState(false);
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
         </Stack>

         {/* Store Identity — global field standard: one field
             per row, label above, placeholder inside, helper
             text below (SettingsField). */}
         <Stack spacing={2.5}>
            <SettingsField
               label="Store Name"
               helper="The store name shown on invoices, receipts and exports."
            >
               <TextField
                  fullWidth
                  size="small"
                  value={values.storeName || ""}
                  onChange={(e) => onChange("storeName", e.target.value)}
                  placeholder="DevX POS"
               />
            </SettingsField>
            <SettingsField
               label="Store Tagline / Slogan"
               helper="A short line shown with the store name where the design supports it."
            >
               <TextField
                  fullWidth
                  size="small"
                  value={values.tagline || ""}
                  onChange={(e) => onChange("tagline", e.target.value)}
                  placeholder="Smart Retail & Point of Sale"
               />
            </SettingsField>
            <SettingsField
               label="Store Email"
               helper="Contact email printed on invoices and used for store correspondence."
            >
               <TextField
                  fullWidth
                  size="small"
                  type="email"
                  value={values.email || ""}
                  onChange={(e) => onChange("email", e.target.value)}
                  placeholder="contact@devxpos.com"
               />
            </SettingsField>
            <SettingsField
               label="Store Phone / Hotline"
               helper="Contact number printed on invoices and receipts."
            >
               <TextField
                  fullWidth
                  size="small"
                  value={values.phone || ""}
                  onChange={(e) => onChange("phone", e.target.value)}
                  placeholder="+880 1700-123456"
               />
            </SettingsField>
            <SettingsField
               label="Business Address"
               helper="The full business address printed on invoices and documents."
            >
               <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={1}
                  value={values.address || ""}
                  onChange={(e) => onChange("address", e.target.value)}
                  placeholder="House 42, Road 11, Banani, Dhaka-1213, Bangladesh"
               />
            </SettingsField>

            {/* Store Logo — compact upload box (drag & drop +
                click to browse), following the product media
                dropzone's visual pattern. The stored value is
                unchanged (a logo reference in values.logoUrl: an
                uploaded "/uploads/…" path, or a legacy URL/data-
                URL from before — all keep rendering in invoices,
                print and exports exactly as they did). */}
            <SettingsField
               label="Store Logo"
               helper="Used on invoices, printouts and exports. PNG, JPEG, WebP, GIF or AVIF, up to 5 MB."
            >
               <Box
                  {...logoDragHandlers}
                  sx={{
                     position: "relative",
                     // Preview state: the box fits the rendered
                     // image EXACTLY — no padding at all, so the
                     // box is the image plus its own border. The
                     // 250px image cap lives on the BOX
                     // (250 + the 2px of rendered border = 252),
                     // not on
                     // the img — a max-width on the img alone
                     // does not shrink an inline-block box's
                     // shrink-to-fit width, so the box would
                     // keep the natural width with empty space
                     // beside the capped image. Empty state: a
                     // compact fixed box (max-width 520,
                     // content height 136).
                     ...(values.logoUrl
                        ? { display: "inline-block", maxWidth: "min(252px, 100%)" }
                        : { maxWidth: 520 }),
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
                     transition: "all 0.2s ease",
                     // Preview overlay actions reveal on hover
                     // or keyboard focus within the card.
                     "&:hover .logo-actions, &:focus-within .logo-actions": {
                        opacity: 1,
                     },
                     ...(!values.logoUrl && {
                        "&:hover": {
                           borderColor: "primary.main",
                           bgcolor: alpha(theme.palette.primary.main, 0.02),
                        },
                     }),
                  }}
               >
                  <>
                     {values.logoUrl ? (
                        /* Preview state — the image renders at its
                           natural size (no fixed frame, no
                           object-fit scaling); the box's cap
                           (see above) limits it to 250px wide and
                           the available space can shrink it
                           further — both proportionally, since
                           the height stays automatic and the
                           aspect ratio is always preserved. Logos
                           narrower than 250px keep their natural
                           dimensions. Replace/Remove live in a
                           small overlay that appears on
                           hover/focus (always visible on touch
                           devices, where there is no hover). */
                        <>
                           <Box
                              component="img"
                              src={values.logoUrl}
                              alt="Store Logo"
                              sx={{
                                 display: "block",
                                 width: "auto",
                                 height: "auto",
                                 maxWidth: "100%",
                              }}
                           />
                           <Stack
                              direction="row"
                              spacing={0.75}
                              sx={{
                                 position: "absolute",
                                 top: 8,
                                 right: 8,
                                 opacity: 0,
                                 transition: "opacity 0.15s ease",
                                 "@media (hover: none)": { opacity: 1 },
                              }}
                              className="logo-actions"
                           >
                              <Tooltip title="Replace logo" disableInteractive>
                                 <span>
                                    <IconButton
                                       size="small"
                                       aria-label="Replace store logo"
                                       disabled={logoUploading}
                                       onClick={() => logoInputRef.current?.click()}
                                       sx={{
                                          bgcolor: "background.paper",
                                          boxShadow: 1,
                                          border: "1px solid",
                                          borderColor: "divider",
                                          "&:hover": { bgcolor: "background.paper" },
                                       }}
                                    >
                                       <Icon icon="solar:upload-minimalistic-bold" size="small" />
                                    </IconButton>
                                 </span>
                              </Tooltip>
                              <Tooltip title="Remove logo" disableInteractive>
                                 <span>
                                    <IconButton
                                       size="small"
                                       aria-label="Remove store logo"
                                       disabled={logoUploading}
                                       onClick={() => {
                                          // A sibling action, never
                                          // inside the upload control
                                          // — it cannot open the
                                          // file picker.
                                          setLogoError(null);
                                          onChange("logoUrl", "");
                                       }}
                                       sx={{
                                          bgcolor: "background.paper",
                                          boxShadow: 1,
                                          border: "1px solid",
                                          borderColor: "divider",
                                          color: "error.main",
                                          "&:hover": { bgcolor: "background.paper" },
                                       }}
                                    >
                                       <Icon icon="solar:trash-bin-trash-bold-duotone" size="small" />
                                    </IconButton>
                                 </span>
                              </Tooltip>
                           </Stack>
                        </>
                     ) : (
                        /* Empty state — one subtle line; the whole
                           box is the upload control (a ButtonBase,
                           so it is keyboard-operable with a
                           visible focus state). */
                        <ButtonBase
                           onClick={() => logoInputRef.current?.click()}
                           disabled={logoUploading}
                           aria-label="Upload store logo"
                           sx={{
                              width: "100%",
                              height: 136,
                              borderRadius: 1.5,
                              "&.Mui-focusVisible": {
                                 outline: "2px solid",
                                 outlineColor: "primary.main",
                                 outlineOffset: -2,
                              },
                           }}
                        >
                           <Typography variant="body2" color="text.secondary">
                              Click or drop logo here
                           </Typography>
                        </ButtonBase>
                     )}

                     {logoUploading && (
                        <Box
                           sx={{
                              position: "absolute",
                              left: 0,
                              right: 0,
                              bottom: 0,
                              px: 2,
                              pb: 1,
                           }}
                        >
                           <LinearProgress sx={{ borderRadius: 1 }} />
                        </Box>
                     )}
                  </>

                  {logoError && (
                     <Typography
                        variant="caption"
                        color="error"
                        role="alert"
                        display="block"
                        sx={{ px: 2, pb: 1.25 }}
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
            </SettingsField>
         </Stack>

         <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Currency & Localization
            </Typography>
         </Stack>

         <Stack spacing={2.5}>
            <SettingsField
               label="Default Currency"
               helper="The currency used for prices, totals and reports across the store."
            >
               <CustomAutocomplete
                  arrow
                  size="small"
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
                  placeholder="Select currency"
               />
            </SettingsField>

            <SettingsField
               label="Currency Symbol"
               helper="The symbol shown before amounts. Pick a known symbol or type a custom one."
            >
               <CustomAutocomplete
                  size="small"
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
                  placeholder="e.g. ৳"
               />
            </SettingsField>

            <SettingsField
               label="System Timezone"
               helper="The timezone used for dates and times across the store."
            >
               <CustomAutocomplete
                  arrow
                  size="small"
                  options={timezones}
                  getOptionLabel={(o: any) => o?.label || ""}
                  isOptionEqualToValue={(a: any, b: any) => a?.value === b?.value}
                  value={timezoneValue}
                  onChange={(next: any) => {
                     if (next) onChange("timezone", next.value);
                  }}
                  placeholder="Select timezone"
               />
            </SettingsField>

            <SettingsField
               label="Language"
               helper="The language used for the interface and printed documents."
            >
               <CustomAutocomplete
                  arrow
                  size="small"
                  options={languages}
                  getOptionLabel={(o: any) => o?.label || ""}
                  isOptionEqualToValue={(a: any, b: any) => a?.value === b?.value}
                  value={languageValue}
                  onChange={(next: any) => {
                     if (next) onChange("language", next.value);
                  }}
                  placeholder="Select language"
               />
            </SettingsField>
         </Stack>
      </Stack>
   );
}
