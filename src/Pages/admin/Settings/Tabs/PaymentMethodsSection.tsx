"use client";

import React, { useEffect, useRef, useState } from "react";
import {
   Box,
   Button,
   Card,
   CardContent,
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
import SectionResetButton from "./SectionResetButton";
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
 * NAME as a string, so renaming or deactivating a method here
 * never rewrites a past payment — history keeps the name it was
 * recorded with. There is deliberately no hard delete:
 * deactivation is the removal path.
 *
 * Text fields edit a local draft (committed on blur) so typing
 * spaces inside a name behaves normally; switches, moves and the
 * add form write through immediately.
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

   const activeNames = activePaymentMethodNames(config);
   const defaultMethod = resolveDefaultPaymentMethod(
      config,
      values?.defaultPaymentMethod,
   );

   return (
      <Card variant="outlined">
         <CardContent>
            <Stack spacing={2.5}>
               <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box>
                     <Typography variant="subtitle1" fontWeight={600}>
                        Payment Methods
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                        The methods offered for NEW payments, in display order.
                        Deactivate a method to remove it from new transactions —
                        past payments always keep the name they were recorded
                        with, and renaming a method never rewrites history.
                        There is no hard delete, by design.
                     </Typography>
                  </Box>
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
               </Stack>

               <Stack spacing={0.75}>
                  <Typography variant="body2" fontSize={13} fontWeight={600} color="textSecondary">
                     Default Payment Method
                  </Typography>
                  <CustomAutocomplete
                     arrow
                     size="small"
                     options={activeNames}
                     value={defaultMethod}
                     onChange={(_: any, next: any) =>
                        next && onChange("defaultPaymentMethod", next)
                     }
                     placeholder="Select default"
                  />
                  <Typography variant="caption" color="text.secondary">
                     Preselected on new orders. If it is deactivated, new
                     orders fall back to Cash or the first active method.
                  </Typography>
               </Stack>

               <Divider />

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
                           sx={{ flex: 1 }}
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

               <Typography variant="caption" color="text.secondary">
                  Note: the TxID switch controls whether order forms ask
                  for a transaction ID with that method, and the server
                  enforces the same rule on order writes. Methods saved
                  before this switch existed keep their previous
                  behaviour (bKash, Nagad and Rocket use TxIDs) until
                  you set the switch explicitly — so renaming a wallet
                  no longer removes its TxID fields.
               </Typography>
            </Stack>
         </CardContent>
      </Card>
   );
}
