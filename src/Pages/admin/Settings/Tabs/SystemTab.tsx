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
} from "@mui/material";
import Icon from "@src/components/Icon";
import { useSnackbar } from "@src/lib/snackbarContext";
import CustomSwitch from "@src/components/CustomSwitch";
import AlertDialog from "@src/components/AlertDialog";
import CourierProvidersCard from "./CourierProvidersCard";
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
   const { showSnackbar } = useSnackbar();

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

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
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
                  </CardContent>
               </Card>
            </Grid>

            {/* P2-20: the "Daily Sales & Revenue Digest" and "Order
                Void & Cancellation Alerts" toggles were removed —
                they were write-only customConfig keys: no mailer and
                no cancellation-notification producer exists, so the
                switches saved a value nothing ever read. */}
         </Grid>

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
                  </Stack>
                  <Button
                     variant="contained"
                     color="primary"
                     startIcon={isExporting ? <CircularProgress size={18} color="inherit" /> : <Icon icon="solar:download-square-bold-duotone" size="small" />}
                     onClick={handleExportData}
                     disabled={isExporting}
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
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                     select
                     fullWidth
                     label="Default Courier Status"
                     size="small"
                     value={resolveDefaultCourierStatus(values.customConfig) || ""}
                     onChange={(e) =>
                        onConfigChange("defaultCourierStatus", e.target.value)
                     }
                     helperText="Pre-selected in the bulk courier dialog and applied automatically on submission"
                  >
                     <MenuItem value="">— No default —</MenuItem>
                     {COURIER_STATUSES.map((s) => (
                        <MenuItem key={s} value={s}>
                           {s}
                        </MenuItem>
                     ))}
                  </TextField>
               </Grid>
            </Grid>
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
               </Stack>
               <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Icon icon="solar:restart-bold" size="small" />}
                  onClick={() => setOpenResetDialog(true)}
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
