"use client";

import React, { useEffect, useRef, useState } from "react";
import {
   Box,
   Button,
   Chip,
   Divider,
   IconButton,
   Stack,
   Switch,
   TextField,
   Tooltip,
   Typography,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import CustomModal from "@src/components/Modal";
import SectionResetButton from "./SectionResetButton";
import { SETTINGS_FIELD_MAX_WIDTH } from "./SettingsField";
import {
   PAYMENT_METHODS_KEY,
   PaymentMethodConfig,
   activePaymentMethodNames,
   paymentMethodRequiresTxId,
   resolveDefaultPaymentMethod,
   resolvePaymentMethods,
} from "@src/lib/paymentMethods";

interface PaymentMethodsSectionProps {
   values: any;
   onChange: (key: string, value: any) => void;
   onConfigChange: (key: string, value: any) => void;
}

/**
 * Phase 5 — Payment Methods (rendered inside the Sales & POS
 * tab, under Order Creation Defaults). The list lives in
 * customConfig.paymentMethods and persists through the shared
 * settings Save flow (settings permission required, as for every
 * settings write).
 *
 * History safety is structural: payment records store the method
 * NAME as a string, so renaming, deactivating or removing a
 * method here never rewrites a past payment — history keeps the
 * name it was recorded with.
 *
 * Cleanup Phase 1: the section shows a compact preview (default
 * method picker + read-only method list) with an Edit button;
 * the full editor lives in a CustomModal. Cancelling the modal
 * restores the list snapshot taken when it opened, so a
 * cancelled edit never reaches the form. Text fields inside the
 * modal edit a local draft (committed on blur) so typing spaces
 * inside a name behaves normally; switches, moves, remove and
 * the add form write through immediately.
 */
export default function PaymentMethodsSection({
   values,
   onChange,
   onConfigChange,
}: PaymentMethodsSectionProps) {
   const config = values?.customConfig;
   const [methods, setMethods] = useState<PaymentMethodConfig[]>(() =>
      resolvePaymentMethods(config),
   );
   const lastWritten = useRef<PaymentMethodConfig[] | null>(null);

   // Re-sync when the saved config arrives/changes from outside
   // this section (initial load), without fighting local edits.
   useEffect(() => {
      const incoming = resolvePaymentMethods(config);
      if (JSON.stringify(incoming) !== JSON.stringify(lastWritten.current)) {
         setMethods(incoming);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [config?.[PAYMENT_METHODS_KEY]]);

   const write = (next: PaymentMethodConfig[]) => {
      lastWritten.current = next;
      setMethods(next);
      onConfigChange(PAYMENT_METHODS_KEY, next);
   };

   const patchRow = (index: number, patch: Partial<PaymentMethodConfig>) =>
      write(methods.map((m, i) => (i === index ? { ...m, ...patch } : m)));

   const move = (index: number, dir: -1 | 1) => {
      const target = index + dir;
      if (target < 0 || target >= methods.length) return;
      const next = [...methods];
      [next[index], next[target]] = [next[target], next[index]];
      write(next);
   };

   const removeRow = (index: number) => {
      // Drafts are keyed by row index; a removal shifts rows, so
      // in-flight text drafts are dropped rather than misapplied.
      setDraftNames({});
      setDraftDescriptions({});
      write(methods.filter((_, i) => i !== index));
   };

   // Text edits stay local until blur (see the header comment).
   const [draftNames, setDraftNames] = useState<Record<number, string>>({});
   const [draftDescriptions, setDraftDescriptions] = useState<Record<number, string>>({});

   const [newName, setNewName] = useState("");
   const [newDescription, setNewDescription] = useState("");
   const addMethod = () => {
      const name = newName.trim();
      if (!name) return;
      if (methods.some((m) => m.name.toLowerCase() === name.toLowerCase())) return;
      write([
         ...methods,
         {
            name,
            description: newDescription.trim() || undefined,
            active: true,
         },
      ]);
      setNewName("");
      setNewDescription("");
   };

   // ── Edit modal (snapshot on open; Cancel restores) ──
   // The snapshot keeps BOTH the resolved list (for the local
   // state) and the RAW config value: on a store that has never
   // saved the list, the raw value is undefined and the resolver
   // supplies the defaults — restoring the resolved list into
   // the form instead would leave the form dirty against the
   // baseline even though nothing semantically changed.
   const [editOpen, setEditOpen] = useState(false);
   const snapshotRef = useRef<{
      raw: any;
      methods: PaymentMethodConfig[];
   } | null>(null);
   const openEdit = () => {
      snapshotRef.current = {
         raw: config?.[PAYMENT_METHODS_KEY],
         methods: JSON.parse(JSON.stringify(methods)),
      };
      setEditOpen(true);
   };
   const cancelEdit = () => {
      const snap = snapshotRef.current;
      if (snap) {
         lastWritten.current = snap.methods;
         setMethods(snap.methods);
         onConfigChange(PAYMENT_METHODS_KEY, snap.raw);
      }
      setDraftNames({});
      setDraftDescriptions({});
      setNewName("");
      setNewDescription("");
      setEditOpen(false);
   };

   const activeNames = activePaymentMethodNames(config);
   const defaultMethod = resolveDefaultPaymentMethod(
      config,
      values?.defaultPaymentMethod,
   );

   return (
      <>
         {/* ── Section preview (independent of the modal) ──
             Sales & POS cleanup: plain section content in the
             tab's continuous form — no card wrapper; the editor
             modal below is a sibling element. */}
         <Stack spacing={2}>
               <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box>
                     <Typography variant="h6" fontWeight={600}>
                        Payment Methods
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                        Methods offered for new payments, in display order.
                     </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                     {/* RP-7 (X2): clearing the list restores the
                         built-in default methods (the resolver's
                         fallback) and Cash as the default method. */}
                     <SectionResetButton
                        section="Payment Methods"
                        onReset={() => {
                           const defaults = resolvePaymentMethods(undefined);
                           lastWritten.current = defaults;
                           setMethods(defaults);
                           setDraftNames({});
                           setDraftDescriptions({});
                           onConfigChange(PAYMENT_METHODS_KEY, undefined);
                           onChange("defaultPaymentMethod", "Cash");
                        }}
                     />
                     <Button
                        variant="outlined"
                        size="small"
                        startIcon={
                           <Icon icon="solar:pen-2-bold-duotone" size="small" />
                        }
                        onClick={openEdit}
                        sx={{ whiteSpace: "nowrap" }}
                     >
                        Edit
                     </Button>
                  </Stack>
               </Stack>

               <Stack spacing={0.75} sx={{ width: "100%", maxWidth: SETTINGS_FIELD_MAX_WIDTH }}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Default Payment Method
                  </Typography>
                  <CustomAutocomplete
                     arrow
                     size="small"
                     options={activeNames}
                     value={defaultMethod}
                     onChange={(next: any) =>
                        next && onChange("defaultPaymentMethod", next)
                     }
                     placeholder="Select default"
                  />
                  <Typography variant="caption" color="text.secondary">
                     Pre-selected when recording a payment; staff can
                     choose any other active method instead.
                  </Typography>
               </Stack>

               <Divider />

               {/* ── Compact preview list ── */}
               <Stack spacing={0.75}>
                  {methods.map((method, index) => (
                     <Stack
                        key={`${method.name}-${index}`}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        useFlexGap
                        flexWrap="wrap"
                     >
                        <Typography variant="body2" sx={{ minWidth: 22, color: "text.secondary" }}>
                           {index + 1}.
                        </Typography>
                        <Typography
                           variant="body2"
                           fontWeight={600}
                           color={method.active ? "text.primary" : "text.secondary"}
                        >
                           {method.name}
                        </Typography>
                        {method.description && (
                           <Typography variant="body2" color="text.secondary">
                              {method.description}
                           </Typography>
                        )}
                        {!method.active && (
                           <Chip label="Inactive" size="small" variant="outlined" />
                        )}
                        {paymentMethodRequiresTxId(
                           { [PAYMENT_METHODS_KEY]: methods },
                           method.name,
                        ) && (
                           <Chip label="TxID" size="small" variant="outlined" />
                        )}
                     </Stack>
                  ))}
               </Stack>
         </Stack>

         {/* ── Editor modal (sibling of the preview) ── */}
         <CustomModal
            open={editOpen}
            onClose={cancelEdit}
            title="Payment Methods"
            size="lg"
            closeIcon
         >
            <Stack spacing={2} sx={{ mt: 1 }}>
               <Typography variant="body2" color="text.secondary">
                  Renaming, deactivating or removing a method never changes
                  past payments — they keep the name they were recorded
                  with.
               </Typography>

               <Stack spacing={1.25}>
                  {methods.map((method, index) => (
                     <Stack
                        key={`${method.name}-${index}`}
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        flexWrap="wrap"
                        useFlexGap
                     >
                        <Typography
                           variant="body2"
                           color="text.secondary"
                           sx={{ width: 22, textAlign: "right" }}
                        >
                           {index + 1}.
                        </Typography>
                        <TextField
                           size="small"
                           placeholder="Method name"
                           value={draftNames[index] ?? method.name}
                           onChange={(e) =>
                              setDraftNames((d) => ({ ...d, [index]: e.target.value }))
                           }
                           onBlur={() => {
                              const name = (draftNames[index] ?? method.name).trim();
                              setDraftNames((d) => {
                                 const copy = { ...d };
                                 delete copy[index];
                                 return copy;
                              });
                              if (name && name !== method.name) {
                                 patchRow(index, { name });
                              }
                           }}
                           sx={{ width: 190 }}
                        />
                        <TextField
                           size="small"
                           placeholder="Description (optional)"
                           value={draftDescriptions[index] ?? method.description ?? ""}
                           onChange={(e) =>
                              setDraftDescriptions((d) => ({
                                 ...d,
                                 [index]: e.target.value,
                              }))
                           }
                           onBlur={() => {
                              const description = (
                                 draftDescriptions[index] ??
                                 method.description ??
                                 ""
                              ).trim();
                              setDraftDescriptions((d) => {
                                 const copy = { ...d };
                                 delete copy[index];
                                 return copy;
                              });
                              if (description !== (method.description ?? "")) {
                                 patchRow(index, {
                                    description: description || undefined,
                                 });
                              }
                           }}
                           sx={{ flex: 1, minWidth: 160 }}
                        />
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                           <Typography variant="caption" color="text.secondary">
                              Active
                           </Typography>
                           <Switch
                              size="small"
                              checked={method.active}
                              onChange={(e) => patchRow(index, { active: e.target.checked })}
                           />
                        </Stack>
                        {/* RP-7 (X1): per-method TxID flag. The switch
                            shows the EFFECTIVE value (explicit flag,
                            or the legacy bKash/Nagad/Rocket fallback);
                            toggling stores the explicit flag. */}
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                           <Typography variant="caption" color="text.secondary">
                              TxID
                           </Typography>
                           <Switch
                              size="small"
                              checked={paymentMethodRequiresTxId(
                                 { [PAYMENT_METHODS_KEY]: methods },
                                 method.name,
                              )}
                              onChange={(e) =>
                                 patchRow(index, {
                                    requiresTransactionId: e.target.checked,
                                 })
                              }
                           />
                        </Stack>
                        <Stack direction="row">
                           <Tooltip title="Move up">
                              <span>
                                 <IconButton
                                    size="small"
                                    disabled={index === 0}
                                    onClick={() => move(index, -1)}
                                 >
                                    <Icon icon="solar:alt-arrow-up-bold-duotone" size="small" />
                                 </IconButton>
                              </span>
                           </Tooltip>
                           <Tooltip title="Move down">
                              <span>
                                 <IconButton
                                    size="small"
                                    disabled={index === methods.length - 1}
                                    onClick={() => move(index, 1)}
                                 >
                                    <Icon icon="solar:alt-arrow-down-bold-duotone" size="small" />
                                 </IconButton>
                              </span>
                           </Tooltip>
                           <Tooltip title="Remove method">
                              <span>
                                 <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeRow(index)}
                                    aria-label={`Remove ${method.name}`}
                                 >
                                    <Icon icon="solar:trash-bin-trash-bold-duotone" size="small" />
                                 </IconButton>
                              </span>
                           </Tooltip>
                        </Stack>
                     </Stack>
                  ))}
               </Stack>

               <Stack direction="row" spacing={1.5} alignItems="center">
                  <TextField
                     size="small"
                     placeholder="New method name"
                     value={newName}
                     onChange={(e) => setNewName(e.target.value)}
                     sx={{ width: 190 }}
                  />
                  <TextField
                     size="small"
                     placeholder="Description (optional)"
                     value={newDescription}
                     onChange={(e) => setNewDescription(e.target.value)}
                     sx={{ flex: 1 }}
                  />
                  <Button
                     variant="outlined"
                     size="small"
                     onClick={addMethod}
                     disabled={!newName.trim()}
                  >
                     Add method
                  </Button>
               </Stack>

               <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={1.5}
                  sx={{ pt: 1 }}
               >
                  <Button
                     variant="outlined"
                     color="inherit"
                     onClick={cancelEdit}
                  >
                     Cancel
                  </Button>
                  <Button
                     variant="contained"
                     onClick={() => setEditOpen(false)}
                  >
                     Done
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>
      </>
   );
}
