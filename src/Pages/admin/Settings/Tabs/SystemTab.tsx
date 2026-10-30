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
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomSwitch from "@src/components/CustomSwitch";
import AlertDialog from "@src/components/AlertDialog";

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
   const customConfig = values.customConfig || {};
   const [openResetDialog, setOpenResetDialog] = useState(false);
   const [isExporting, setIsExporting] = useState(false);
   const [isResetting, setIsResetting] = useState(false);
   const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

   const handleExportBackup = async () => {
      setIsExporting(true);
      try {
         const res = await fetch("/api/system/export");
         if (!res.ok) throw new Error("Export failed");
         const blob = await res.blob();
         const url = window.URL.createObjectURL(blob);
         const a = document.createElement("a");
         a.href = url;
         a.download = `devx_pos_backup_${new Date().toISOString().slice(0, 10)}.json`;
         document.body.appendChild(a);
         a.click();
         a.remove();
         window.URL.revokeObjectURL(url);
         setStatusMessage({ type: "success", text: "Database backup downloaded successfully!" });
      } catch {
         setStatusMessage({ type: "error", text: "Failed to generate database backup." });
      } finally {
         setIsExporting(false);
      }
   };

   const handleConfirmReset = async () => {
      setIsResetting(true);
      try {
         const ok = await onResetDefaults();
         if (ok) {
            setStatusMessage({ type: "success", text: "Settings restored to factory defaults." });
         } else {
            setStatusMessage({ type: "error", text: "Failed to reset settings." });
         }
      } catch {
         setStatusMessage({ type: "error", text: "An error occurred while resetting." });
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
               Configure system alerts, automated notifications, database backups, and store factory reset.
            </Typography>
         </Box>

         {statusMessage && (
            <Alert
               severity={statusMessage.type}
               onClose={() => setStatusMessage(null)}
               sx={{ borderRadius: 1.5 }}
            >
               {statusMessage.text}
            </Alert>
         )}

         {/* Alert Recipients */}
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  fullWidth
                  label="System Notification Email"
                  type="email"
                  size="small"
                  value={values.notifyEmail || ""}
                  onChange={(e) => onChange("notifyEmail", e.target.value)}
                  placeholder="admin@devxpos.com"
                  helperText="Recipient for critical alerts, low-stock warnings, and backup confirmations"
               />
            </Grid>
         </Grid>

         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Automated Alert Triggers
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Choose which events trigger proactive alerts in the notification drawer and email.
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

            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <CustomSwitch
                              checked={customConfig.dailySalesEmail ?? false}
                              onChange={(e) => onConfigChange("dailySalesEmail", e.target.checked)}
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Daily Sales & Revenue Digest
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Send an automated evening revenue summary report to the notification email
                              </Typography>
                           </Box>
                        }
                     />
                  </CardContent>
               </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <CustomSwitch
                              checked={customConfig.notifyOnCancelledOrder ?? true}
                              onChange={(e) => onConfigChange("notifyOnCancelledOrder", e.target.checked)}
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Order Void & Cancellation Alerts
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Instantly alert store administrator whenever a cashier voids an active order
                              </Typography>
                           </Box>
                        }
                     />
                  </CardContent>
               </Card>
            </Grid>
         </Grid>

         {/* Backup & Disaster Recovery */}
         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Data Backup & Disaster Recovery
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Download full database snapshots of orders, inventory, customers, suppliers, and billing records.
            </Typography>
         </Box>

         <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
               <Stack spacing={0.5}>
                  <Typography variant="subtitle1" fontWeight={700}>
                     Export Complete MySQL Database
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     Generates an instant, complete JSON export containing all tables and relation records.
                  </Typography>
               </Stack>
               <Button
                  variant="contained"
                  color="primary"
                  startIcon={isExporting ? <CircularProgress size={18} color="inherit" /> : <Icon icon="solar:download-square-bold-duotone" size="small" />}
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  sx={{ whiteSpace: "nowrap" }}
               >
                  {isExporting ? "Exporting..." : "Download Backup"}
               </Button>
            </Stack>
         </Card>

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
