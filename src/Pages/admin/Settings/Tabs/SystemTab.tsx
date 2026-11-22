"use client";

import React, { useEffect, useState } from "react";
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
import CustomSwitch from "@src/components/CustomSwitch";
import AlertDialog from "@src/components/AlertDialog";
import CourierProvidersCard from "./CourierProvidersCard";
import {
   COURIER_STATUSES,
   resolveDefaultCourierStatus,
} from "@src/lib/courierSubmission";
import {
   DEFAULT_RANKING_SETTINGS,
   parseRankingSettings,
   type RankingSettings,
   type RankingWeights,
} from "@src/lib/rankingSettings";

const RANKING_WEIGHT_FIELDS: { key: keyof RankingWeights; label: string }[] = [
   { key: "completedSales", label: "Completed Sales Weight (%)" },
   { key: "netRevenue", label: "Net Revenue Weight (%)" },
   { key: "confirmationRate", label: "Confirmation Rate Weight (%)" },
   { key: "handlingQuality", label: "Handling Quality Weight (%)" },
   { key: "cancellationControl", label: "Cancellation Control Weight (%)" },
];

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
   const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

   // Employee Ranking settings (plan §6): edited locally, written
   // into customConfig.employeeRankingSettings through the SAME
   // onConfigChange flow the courier default uses, and saved by the
   // page-level Save Settings (whole customConfig PUT). The server
   // validates strictly and rejects an invalid object with a 400.
   // Local state is re-seeded whenever the loaded settings change
   // (initial load / discard), falling back to the defaults.
   const [rankingSettings, setRankingSettings] = useState<RankingSettings>(
      () => parseRankingSettings(values.customConfig) || DEFAULT_RANKING_SETTINGS,
   );
   const storedRankingJson = JSON.stringify(
      values.customConfig?.employeeRankingSettings ?? null,
   );
   useEffect(() => {
      setRankingSettings(parseRankingSettings(values.customConfig));
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [storedRankingJson]);

   const updateRankingSettings = (next: RankingSettings) => {
      setRankingSettings(next);
      onConfigChange("employeeRankingSettings", next);
   };

   const rankingWeightSum = RANKING_WEIGHT_FIELDS.reduce(
      (sum, f) => sum + (Number(rankingSettings.weights[f.key]) || 0),
      0,
   );
   const rankingWeightsValid = rankingWeightSum === 100;

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
         setStatusMessage({ type: "success", text: "Data export downloaded successfully!" });
      } catch {
         setStatusMessage({ type: "error", text: "Failed to generate data export." });
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
               Configure system alerts, automated notifications, data export, and store factory reset.
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
                  helperText="Recipient for critical alerts and low-stock warnings"
               />
            </Grid>
         </Grid>

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

         {/* Employee Ranking (plan §6 / §8 Step 6) — weights, targets
             and behaviour for the Dashboard performance ranking.
             Saved through the same settings PUT as everything else
             on this page; the server validates the object and a 400
             message is surfaced by the save flow. */}
         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Employee Ranking
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
               Scoring weights and targets for the Dashboard employee
               performance ranking. Changes affect live calculations
               immediately and never alter finalized month snapshots.
            </Typography>
            <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
               <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Stack spacing={2.5}>
                     <Grid container spacing={2}>
                        {RANKING_WEIGHT_FIELDS.map((f) => (
                           <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.key}>
                              <TextField
                                 fullWidth
                                 type="number"
                                 size="small"
                                 label={f.label}
                                 value={rankingSettings.weights[f.key]}
                                 onChange={(e) =>
                                    updateRankingSettings({
                                       ...rankingSettings,
                                       weights: {
                                          ...rankingSettings.weights,
                                          [f.key]: e.target.value === "" ? 0 : Number(e.target.value),
                                       },
                                    })
                                 }
                                 inputProps={{ min: 0, step: 1 }}
                              />
                           </Grid>
                        ))}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                           <Box
                              sx={{
                                 height: "100%",
                                 display: "flex",
                                 alignItems: "center",
                                 px: 1.5,
                                 py: 1,
                                 borderRadius: 1,
                                 border: "1px solid",
                                 borderColor: rankingWeightsValid ? "success.main" : "error.main",
                                 color: rankingWeightsValid ? "success.main" : "error.main",
                              }}
                           >
                              <Typography variant="body2" fontWeight={700}>
                                 Weights total: {rankingWeightSum} / 100
                              </Typography>
                           </Box>
                        </Grid>
                     </Grid>
                     {!rankingWeightsValid && (
                        <Alert severity="error" sx={{ borderRadius: 1.5 }}>
                           employeeRankingSettings.weights must sum to exactly 100 (got {rankingWeightSum}).
                        </Alert>
                     )}

                     <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                           <TextField
                              fullWidth
                              type="number"
                              size="small"
                              label="Sales Target (monthly)"
                              value={rankingSettings.salesTargetMonthly}
                              onChange={(e) =>
                                 updateRankingSettings({
                                    ...rankingSettings,
                                    salesTargetMonthly: e.target.value === "" ? 0 : Number(e.target.value),
                                 })
                              }
                              inputProps={{ min: 0, step: 1 }}
                              helperText="Completed orders per month for a full S1 score"
                           />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                           <TextField
                              fullWidth
                              type="number"
                              size="small"
                              label="Revenue Target (monthly, ৳)"
                              value={rankingSettings.revenueTargetMonthly}
                              onChange={(e) =>
                                 updateRankingSettings({
                                    ...rankingSettings,
                                    revenueTargetMonthly: e.target.value === "" ? 0 : Number(e.target.value),
                                 })
                              }
                              inputProps={{ min: 0, step: 1000 }}
                              helperText="Net revenue per month for a full S2 score"
                           />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                           <TextField
                              fullWidth
                              type="number"
                              size="small"
                              label="Minimum Eligible Orders"
                              value={rankingSettings.minEligibleOrders}
                              onChange={(e) =>
                                 updateRankingSettings({
                                    ...rankingSettings,
                                    minEligibleOrders: e.target.value === "" ? 0 : Number(e.target.value),
                                 })
                              }
                              inputProps={{ min: 1, step: 1 }}
                              helperText="Handled orders needed to be ranked (below = Provisional)"
                           />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                           <TextField
                              fullWidth
                              type="number"
                              size="small"
                              label="Cancellation Penalty"
                              value={rankingSettings.cancellationPenalty}
                              onChange={(e) =>
                                 updateRankingSettings({
                                    ...rankingSettings,
                                    cancellationPenalty: e.target.value === "" ? 0 : Number(e.target.value),
                                 })
                              }
                              inputProps={{ min: 0, step: 0.1 }}
                              helperText="Multiplier applied to the attributable-cancellation rate"
                           />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                           <TextField
                              fullWidth
                              type="number"
                              size="small"
                              label="Processing SLA (hours)"
                              value={rankingSettings.processingSlaHours}
                              onChange={(e) =>
                                 updateRankingSettings({
                                    ...rankingSettings,
                                    processingSlaHours: e.target.value === "" ? 0 : Number(e.target.value),
                                 })
                              }
                              inputProps={{ min: 0, step: 1 }}
                              helperText="Confirm within this many hours of creation to count as on-time"
                           />
                        </Grid>
                     </Grid>

                     <FormControlLabel
                        control={
                           <CustomSwitch
                              checked={Boolean(rankingSettings.autoRecalculate)}
                              onChange={(e) =>
                                 updateRankingSettings({
                                    ...rankingSettings,
                                    autoRecalculate: e.target.checked,
                                 })
                              }
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Auto Recalculate
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 On: rankings are calculated live on every view. Off: finalized months are served from snapshots; the current month stays live.
                              </Typography>
                           </Box>
                        }
                     />
                  </Stack>
               </CardContent>
            </Card>
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
