"use client";

import React, { useState } from "react";
import {
   Grid,
   Stack,
   TextField,
   Typography,
   Box,
   FormControlLabel,
   Card,
   CardContent,
   Button,
   Alert,
   CircularProgress,
   MenuItem,
   IconButton,
   Snackbar,
   Tooltip,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { useSnackbar } from "@src/lib/snackbarContext";
import CustomSwitch from "@src/components/CustomSwitch";
import CustomAutocomplete from "@src/components/Autocomplete";
import AlertDialog from "@src/components/AlertDialog";
import {
   NOTIFICATION_EVENT_ROWS,
   NOTIFICATION_PREFS_KEY,
   NOTIFICATION_SOUNDS,
   NotificationPrefs,
   TOAST_DURATION_OPTIONS,
   TOAST_POSITION_OPTIONS,
   playNotificationSound,
   resolveNotificationPrefs,
   toastAnchorOrigin,
} from "@src/lib/notificationPrefs";
import CourierProvidersCard from "./CourierProvidersCard";
import SettingsField from "./SettingsField";
import {
   COURIER_STATUSES,
   resolveDefaultCourierStatus,
} from "@src/lib/courierSubmission";

interface SystemTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
   onConfigChange: (key: string, value: any) => void;
   onResetDefaults: () => Promise<boolean>;
}

export default function SystemTab({
   values,
   onChange,
   onConfigChange,
   onResetDefaults,
}: SystemTabProps) {
   const [openResetDialog, setOpenResetDialog] = useState(false);
   const [isExporting, setIsExporting] = useState(false);
   const [isResetting, setIsResetting] = useState(false);
   const [previewToastOpen, setPreviewToastOpen] = useState(false);
   const { showSnackbar } = useSnackbar();

   // Cleanup Phase 3: notification presentation preferences
   // (customConfig.notificationPrefs) — per-event toast/sound
   // and the shared toast display configuration. Edited through
   // the settings form like everything else on this tab, so
   // Save/Discard/dirty tracking apply unchanged.
   const notifPrefs = resolveNotificationPrefs(values.customConfig);
   const writePrefs = (next: NotificationPrefs) =>
      onConfigChange(NOTIFICATION_PREFS_KEY, next);
   const setEventPref = (key: string, patch: Partial<NotificationPrefs["events"][string]>) =>
      writePrefs({
         ...notifPrefs,
         events: {
            ...notifPrefs.events,
            [key]: { ...notifPrefs.events[key], ...patch },
         },
      });
   const setToastCfg = (patch: Partial<NotificationPrefs["toast"]>) =>
      writePrefs({ ...notifPrefs, toast: { ...notifPrefs.toast, ...patch } });
   // Audit L-1: factory reset and data export are administrator
   // actions server-side (requireAdmin). The settings GET reports
   // that capability separately (canAdminSettings) so editors who
   // are not admins see them disabled instead of hitting a 403.
   const canAdmin = values?.canAdminSettings === true;

   const handleExportData = async () => {
      setIsExporting(true);
      try {
         const res = await fetch("/api/system/export");
         if (!res.ok) throw new Error("Export failed");
         const blob = await res.blob();
         const url = window.URL.createObjectURL(blob);
         const a = document.createElement("a");
         a.href = url;
         a.download = `devx_pos_export_${new Date().toISOString().slice(0, 10)}.json`;
         document.body.appendChild(a);
         a.click();
         a.remove();
         window.URL.revokeObjectURL(url);
         showSnackbar("Data export downloaded successfully!", "success");
      } catch {
         showSnackbar("Failed to generate data export.", "error");
      } finally {
         setIsExporting(false);
      }
   };

   const handleConfirmReset = async () => {
      setIsResetting(true);
      try {
         const ok = await onResetDefaults();
         if (ok) {
            showSnackbar("Settings restored to factory defaults.", "success");
         } else {
            showSnackbar("Failed to reset settings.", "error");
         }
      } catch {
         showSnackbar("An error occurred while resetting.", "error");
      } finally {
         setIsResetting(false);
         setOpenResetDialog(false);
      }
   };

   return (
      <Stack spacing={3}>
         <Box>
            <Typography variant="h6" fontWeight={600}>
               Notifications & System Maintenance
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Configure system alerts, automated notifications, data export, and store factory reset.
            </Typography>
         </Box>

         {/* RP-6 (D9): the "System Notification Email" field was
             removed — nothing ever read StoreSetting.notifyEmail
             (the app has no mailer; alerts are in-app only). The
             column and its stored value are untouched. */}

         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Automated Alert Triggers
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Choose which events trigger proactive alerts in the notification drawer.
            </Typography>
         </Box>

         <FormControlLabel
            control={
               <CustomSwitch
                  checked={Boolean(values.enableLowStockAlert)}
                  onChange={(e) => onChange("enableLowStockAlert", e.target.checked)}
               />
            }
            label={
               <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                     Low-Stock Level Warnings
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                     Trigger notification badge when any product stock drops below threshold
                  </Typography>
               </Box>
            }
         />

         {/* P2-20: the "Daily Sales & Revenue Digest" and "Order
             Void & Cancellation Alerts" toggles were removed —
             they were write-only customConfig keys: no mailer and
             no cancellation-notification producer exists, so the
             switches saved a value nothing ever read. */}

         {/* Cleanup Phase 3: per-event presentation preferences.
             Rows exist only for producers that actually create
             notifications (stock engine, chat, and a fallback for
             any other category) — see lib/notificationPrefs. */}
         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Notification Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Choose how each event is presented when it arrives. Turning a toast off never deletes the notification — it still appears in the notification drawer.
            </Typography>
         </Box>

         <Stack spacing={1.5}>
            {NOTIFICATION_EVENT_ROWS.map((row) => {
               const pref = notifPrefs.events[row.key];
               const soundOption =
                  NOTIFICATION_SOUNDS.find((s) => s.id === pref.soundId) ||
                  NOTIFICATION_SOUNDS[1];
               return (
                  <Card key={row.key} variant="outlined" sx={{ borderRadius: 1.5 }}>
                     <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Grid container spacing={2} alignItems="center">
                           <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 {row.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 {row.desc}
                              </Typography>
                           </Grid>
                           <Grid size={{ xs: 6, md: 2 }}>
                              <FormControlLabel
                                 control={
                                    <CustomSwitch
                                       checked={pref.toast}
                                       onChange={(e) => setEventPref(row.key, { toast: e.target.checked })}
                                    />
                                 }
                                 label={<Typography variant="body2">Toast</Typography>}
                              />
                           </Grid>
                           <Grid size={{ xs: 6, md: 2 }}>
                              <FormControlLabel
                                 control={
                                    <CustomSwitch
                                       checked={pref.sound}
                                       onChange={(e) => setEventPref(row.key, { sound: e.target.checked })}
                                    />
                                 }
                                 label={<Typography variant="body2">Sound</Typography>}
                              />
                           </Grid>
                           <Grid size={{ xs: 10, md: 3 }}>
                              <CustomAutocomplete
                                 arrow
                                 size="small"
                                 placeholder="Choose a sound"
                                 options={NOTIFICATION_SOUNDS}
                                 getOptionLabel={(o: any) => o?.name || ""}
                                 isOptionEqualToValue={(a: any, b: any) => a?.id === b?.id}
                                 value={soundOption}
                                 onChange={(next: any) => {
                                    // CustomAutocomplete is value-first (Phase 1 lesson).
                                    if (next) setEventPref(row.key, { soundId: next.id });
                                 }}
                              />
                           </Grid>
                           <Grid size={{ xs: 2, md: 1 }}>
                              <Tooltip disableInteractive title="Preview sound">
                                 <span>
                                    <IconButton
                                       size="small"
                                       disabled={pref.soundId === "none"}
                                       onClick={() => playNotificationSound(pref.soundId)}
                                       sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                                    >
                                       <Icon icon="solar:play-bold" size="small" />
                                    </IconButton>
                                 </span>
                              </Tooltip>
                           </Grid>
                        </Grid>
                     </CardContent>
                  </Card>
               );
            })}
         </Stack>

         {/* Cleanup Phase 3: toast display configuration — read
             by the global snackbar and the notification toast
             from the SAVED settings; the preview below renders
             the values currently in this form. */}
         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Toast Display
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Applies to pop-up messages across the app (action feedback and new-notification toasts) once saved.
            </Typography>
         </Box>

         {/* Global field standard: one field per row, label
             above, helper below. */}
         <Stack spacing={2.5}>
            <SettingsField
               label="Position"
               helper="Where pop-up messages appear on the screen."
            >
               <TextField
                  select
                  fullWidth
                  size="small"
                  value={notifPrefs.toast.position}
                  onChange={(e) => setToastCfg({ position: e.target.value as NotificationPrefs["toast"]["position"] })}
               >
                  {TOAST_POSITION_OPTIONS.map((o) => (
                     <MenuItem key={o.key} value={o.key}>{o.name}</MenuItem>
                  ))}
               </TextField>
            </SettingsField>
            <SettingsField
               label="Duration"
               helper="How long a pop-up stays visible before it dismisses itself."
            >
               <TextField
                  select
                  fullWidth
                  size="small"
                  value={notifPrefs.toast.durationMs === null ? "null" : String(notifPrefs.toast.durationMs)}
                  onChange={(e) =>
                     setToastCfg({ durationMs: e.target.value === "null" ? null : Number(e.target.value) })
                  }
               >
                  {TOAST_DURATION_OPTIONS.map((o) => (
                     <MenuItem key={o.name} value={o.value === null ? "null" : String(o.value)}>{o.name}</MenuItem>
                  ))}
               </TextField>
            </SettingsField>
            <SettingsField
               label="Style"
               helper="The visual style pop-up messages are rendered in."
            >
               <TextField
                  select
                  fullWidth
                  size="small"
                  value={notifPrefs.toast.style}
                  onChange={(e) => setToastCfg({ style: e.target.value as NotificationPrefs["toast"]["style"] })}
               >
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="filled">Filled</MenuItem>
                  <MenuItem value="outlined">Outlined</MenuItem>
               </TextField>
            </SettingsField>
            <FormControlLabel
               control={
                  <CustomSwitch
                     checked={notifPrefs.toast.showClose}
                     onChange={(e) => setToastCfg({ showClose: e.target.checked })}
                  />
               }
               label={
                  <Box>
                     <Typography variant="subtitle2" fontWeight={600}>
                        Close button
                     </Typography>
                     <Typography variant="caption" color="text.secondary">
                        Show a close (×) button on pop-up messages
                     </Typography>
                  </Box>
               }
            />
            <FormControlLabel
               control={
                  <CustomSwitch
                     checked={notifPrefs.toast.clickawayDismiss}
                     onChange={(e) => setToastCfg({ clickawayDismiss: e.target.checked })}
                  />
               }
               label={
                  <Box>
                     <Typography variant="subtitle2" fontWeight={600}>
                        Click-away dismisses
                     </Typography>
                     <Typography variant="caption" color="text.secondary">
                        Clicking anywhere else dismisses the pop-up immediately
                     </Typography>
                  </Box>
               }
            />
            <Box>
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="solar:eye-bold" size="small" />}
                  onClick={() => setPreviewToastOpen(true)}
               >
                  Preview Toast
               </Button>
               <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
                  Simultaneous toasts: pop-ups replace each other (a new one dismisses the previous) — queueing is not supported by the toast design.
               </Typography>
            </Box>
         </Stack>

         {/* Live preview of the toast configuration AS EDITED in
             the form (the app-wide systems read the saved values). */}
         <Snackbar
            open={previewToastOpen}
            autoHideDuration={notifPrefs.toast.durationMs}
            onClose={(_e, reason) => {
               if (reason === "clickaway" && !notifPrefs.toast.clickawayDismiss) return;
               setPreviewToastOpen(false);
            }}
            anchorOrigin={toastAnchorOrigin(notifPrefs.toast.position)}
         >
            <Alert
               severity="success"
               variant={notifPrefs.toast.style}
               onClose={notifPrefs.toast.showClose ? () => setPreviewToastOpen(false) : undefined}
               sx={{ width: "100%" }}
            >
               Preview — this is how toasts will look with the selected configuration.
            </Alert>
         </Snackbar>

         {/* Data Export (P2-5: this feature is a partial export, not
             a backup — the copy below states its exact scope, in
             line with the deployment guide §7.) */}
         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Data Export
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Download a partial JSON export of store data for snapshots, migration, or support evidence.
            </Typography>
         </Box>

         <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Stack spacing={2}>
               <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
                  <Stack spacing={0.5}>
                     <Typography variant="subtitle1" fontWeight={700}>
                        Export Store Data (Partial)
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                        Generates a JSON export containing: settings, products, categories, units, orders (with items and customer), customers, suppliers, expenses, assets, and roles.
                     </Typography>
                     {!canAdmin && (
                        <Typography variant="caption" color="text.secondary">
                           Administrator only.
                        </Typography>
                     )}
                  </Stack>
                  <Button
                     variant="contained"
                     color="primary"
                     startIcon={isExporting ? <CircularProgress size={18} color="inherit" /> : <Icon icon="solar:download-square-bold-duotone" size="small" />}
                     onClick={handleExportData}
                     disabled={isExporting || !canAdmin}
                     sx={{ whiteSpace: "nowrap" }}
                  >
                     {isExporting ? "Exporting..." : "Download Data Export"}
                  </Button>
               </Stack>
               <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                  This is NOT a complete backup. It does not include users/passwords, purchases, supplier payments, purchase returns, stock movements, product variants, warehouses, notifications, chat, or audit logs, and there is no restore option for this file. A full backup requires a database dump (mysqldump) run by the administrator — see the deployment guide, §7.
               </Alert>
            </Stack>
         </Card>

         {/* Default Courier Status (O4) — persisted in customConfig
             via the same mechanism as Default Expense Category;
             applied by the bulk courier submission when no explicit
             status is chosen. */}
         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Courier
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
               Choose the courier status new bulk courier submissions start
               with. Leave it unset to keep the current behaviour.
            </Typography>
            <SettingsField
               label="Default Courier Status"
               helper="Pre-selected in the bulk courier dialog and applied automatically on submission."
            >
               <TextField
                  select
                  fullWidth
                  size="small"
                  value={resolveDefaultCourierStatus(values.customConfig) || ""}
                  onChange={(e) =>
                     onConfigChange("defaultCourierStatus", e.target.value)
                  }
               >
                  <MenuItem value="">— No default —</MenuItem>
                  {COURIER_STATUSES.map((s) => (
                     <MenuItem key={s} value={s}>
                        {s}
                     </MenuItem>
                  ))}
               </TextField>
            </SettingsField>
         </Box>

         {/* Courier Providers (Phase 4, D4) — env-credential status */}
         <CourierProvidersCard />

         {/* Factory Reset */}
         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600} color="error.main">
               Factory Reset Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Reset store configuration back to initial default values (currency BDT ৳, default taxes, 80mm thermal receipt).
            </Typography>
         </Box>

         <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "error.light" }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
               <Stack spacing={0.5}>
                  <Typography variant="subtitle1" fontWeight={700} color="error.main">
                     Restore Factory Default Configuration
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     This resets tax rates, currency, store metadata, receipt templates, and defaults without deleting orders or products.
                  </Typography>
                  {!canAdmin && (
                     <Typography variant="caption" color="text.secondary">
                        Administrator only.
                     </Typography>
                  )}
               </Stack>
               <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Icon icon="solar:restart-bold" size="small" />}
                  onClick={() => setOpenResetDialog(true)}
                  disabled={!canAdmin}
                  sx={{ whiteSpace: "nowrap" }}
               >
                  Reset Defaults
               </Button>
            </Stack>
         </Card>

         {/* Reset Confirmation Dialog */}
         <AlertDialog
            open={openResetDialog}
            onClose={() => setOpenResetDialog(false)}
            type="warning"
            title="Reset store settings to factory defaults? Standard BDT currency, delivery rates, and thermal layout will be restored."
            confirmText={isResetting ? "Resetting..." : "Confirm Reset"}
            cancelText="Cancel"
            onConfirm={handleConfirmReset}
         />
      </Stack>
   );
}
