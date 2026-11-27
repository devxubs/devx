"use client";

import React, { useState } from "react";
import {
   Stack,
   Typography,
   Box,
   Card,
   CardContent,
   Button,
   Chip,
   Grid,
   TextField,
   ToggleButton,
   ToggleButtonGroup,
} from "@mui/material";
import Icon from "@src/components/Icon";
import AlertDialog from "@src/components/AlertDialog";
import useGlobalState from "@src/handler/globalState";
import {
   APPEARANCE_DEFAULTS,
   APPEARANCE_STORAGE_KEY,
   COLOR_PRESETS,
   FONT_OPTIONS,
   ThemeModeSetting,
   customColorTextWarning,
   isHexColor,
} from "@src/lib/appearance";

interface AppearanceTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
   onConfigChange: (key: string, value: any) => void;
}

// Cleanup Phase 3: this tab is now a full appearance editor —
// but of the SAME personal store the header appearance drawer
// uses (globalState + localStorage "customize", the Phase 2
// single source of truth), never a second store and never the
// business Settings form. Changes apply live across the whole
// app, persist on this device, and need no settings permission
// (the drawer's model). Because the tab renders inside the
// Settings read-only fieldset, staff without settings
// permission will see these controls disabled here — the
// header drawer remains their editor, exactly as before.
export default function AppearanceTab(_props: AppearanceTabProps) {
   const globalState = useGlobalState();
   const themeMode: string = globalState.get("theme") || APPEARANCE_DEFAULTS.theme;
   const colorValue: string = globalState.get("color") || APPEARANCE_DEFAULTS.color;
   const fontKey: string = globalState.get("font") || APPEARANCE_DEFAULTS.font;

   const [customHex, setCustomHex] = useState<string>(
      isHexColor(colorValue) ? colorValue : "#BE123C",
   );
   const [resetOpen, setResetOpen] = useState(false);

   // The drawer's write pattern: update the live bucket AND the
   // persisted localStorage object (merged, so keys this tab
   // does not know about — e.g. layoutFull — survive).
   const writeAppearance = (patch: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(patch)) {
         (globalState as any).set(key, value);
      }
      try {
         const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
         const stored = raw ? JSON.parse(raw) : {};
         localStorage.setItem(
            APPEARANCE_STORAGE_KEY,
            JSON.stringify({ ...stored, ...patch }),
         );
      } catch {
         // Storage unavailable (private mode) — the live bucket
         // still applied the change for this session.
      }
   };

   const openAppearanceDrawer = () => {
      window.dispatchEvent(new CustomEvent("devx:open-appearance"));
   };

   const isCustomColor = isHexColor(colorValue);
   const textWarning = isCustomColor
      ? customColorTextWarning(colorValue)
      : null;

   return (
      <Stack spacing={3}>
         <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5}>
            <Box>
               <Typography variant="h6" fontWeight={600}>
                  Appearance & Theme
               </Typography>
               <Typography variant="body2" color="text.secondary">
                  Personal display preferences for this device — the same settings as the header appearance drawer. Changes apply immediately, everywhere.
               </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
               <Button variant="outlined" color="inherit" size="small" onClick={openAppearanceDrawer} sx={{ whiteSpace: "nowrap" }}>
                  Open Drawer
               </Button>
               <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  startIcon={<Icon icon="solar:restart-bold" size="small" />}
                  onClick={() => setResetOpen(true)}
                  sx={{ whiteSpace: "nowrap" }}
               >
                  Reset to Defaults
               </Button>
            </Stack>
         </Stack>

         {/* Theme mode */}
         <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
               Theme Mode
            </Typography>
            <ToggleButtonGroup
               exclusive
               size="small"
               value={themeMode}
               onChange={(_, next: ThemeModeSetting | null) => {
                  if (next) writeAppearance({ theme: next });
               }}
            >
               <ToggleButton value="light">Light</ToggleButton>
               <ToggleButton value="dark">Dark</ToggleButton>
               <ToggleButton value="system">System</ToggleButton>
            </ToggleButtonGroup>
            {themeMode === "system" && (
               <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                  Follows your device&apos;s light/dark setting and updates live when it changes.
               </Typography>
            )}
         </Box>

         {/* Accent colour */}
         <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
               Accent Colour
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} alignItems="center">
               {COLOR_PRESETS.map((preset) => {
                  const selected = !isCustomColor && colorValue === preset.key;
                  return (
                     <Chip
                        key={preset.key}
                        label={preset.name}
                        onClick={() => writeAppearance({ color: preset.key })}
                        variant={selected ? "filled" : "outlined"}
                        color={selected ? "primary" : "default"}
                        icon={
                           <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: preset.main, border: "1px solid #FFF" }} />
                        }
                        sx={{ fontWeight: 600 }}
                     />
                  );
               })}
               <Chip
                  label="Custom"
                  variant={isCustomColor ? "filled" : "outlined"}
                  color={isCustomColor ? "primary" : "default"}
                  icon={
                     <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: isCustomColor ? colorValue : customHex, border: "1px solid #FFF" }} />
                  }
                  sx={{ fontWeight: 600 }}
               />
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center" mt={1.5} flexWrap="wrap">
               <Box
                  component="input"
                  type="color"
                  aria-label="Custom accent colour"
                  value={isHexColor(customHex) ? customHex : "#BE123C"}
                  onChange={(e: any) => setCustomHex(e.target.value)}
                  sx={{ width: 44, height: 32, p: 0, border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "transparent", cursor: "pointer" }}
               />
               <TextField
                  size="small"
                  label="Hex"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  sx={{ width: 130 }}
               />
               <Button
                  variant="contained"
                  size="small"
                  disabled={!isHexColor(customHex)}
                  onClick={() => writeAppearance({ color: customHex })}
               >
                  Apply Custom Colour
               </Button>
               {isCustomColor && (
                  <Typography variant="body2" color="text.secondary">
                     Active: {colorValue}
                  </Typography>
               )}
            </Stack>
            {textWarning && (
               <Typography variant="caption" color="warning.main" display="block" mt={0.75}>
                  {textWarning}
               </Typography>
            )}
            <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
               A custom colour changes the accent (primary) only — success, warning and error colours always stay standard.
            </Typography>
         </Box>

         {/* Font */}
         <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
               Font
            </Typography>
            <Grid container spacing={1.5}>
               {FONT_OPTIONS.map((font) => {
                  const selected = fontKey === font.key;
                  return (
                     <Grid size={{ xs: 12, md: 4 }} key={font.key}>
                        <Card
                           variant="outlined"
                           onClick={() => writeAppearance({ font: font.key })}
                           sx={{
                              borderRadius: 1.5,
                              cursor: "pointer",
                              borderWidth: selected ? 2 : 1,
                              borderColor: selected ? "primary.main" : "divider",
                              bgcolor: selected ? "action.selected" : "background.paper",
                           }}
                        >
                           <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                              <Typography variant="subtitle2" fontWeight={700}>
                                 {font.name}
                              </Typography>
                              <Typography
                                 variant="body2"
                                 sx={{ fontFamily: font.stack, mt: 0.75 }}
                              >
                                 Point of Sale — পয়েন্ট অফ সেল 123
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                                 {font.note}
                              </Typography>
                           </CardContent>
                        </Card>
                     </Grid>
                  );
               })}
            </Grid>
         </Box>

         {/* Live preview — the whole app has already re-themed;
             this card makes the current state explicit. */}
         <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
               Preview
            </Typography>
            <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
               <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
                     <Button variant="contained" size="small">Primary Action</Button>
                     <Button variant="outlined" size="small">Secondary</Button>
                     <Chip label="Accent chip" color="primary" size="small" />
                     <Typography variant="body2">
                        Body text — ইনভয়েস মোট ৳1,250.00
                     </Typography>
                  </Stack>
               </CardContent>
            </Card>
         </Box>

         <AlertDialog
            open={resetOpen}
            onClose={() => setResetOpen(false)}
            type="warning"
            title="Reset appearance to the factory defaults (Dark mode, Green accent, Inter font)?"
            confirmText="Reset Appearance"
            cancelText="Cancel"
            onConfirm={() => {
               writeAppearance({
                  theme: APPEARANCE_DEFAULTS.theme,
                  color: APPEARANCE_DEFAULTS.color,
                  font: APPEARANCE_DEFAULTS.font,
               });
               setResetOpen(false);
            }}
         />
      </Stack>
   );
}
