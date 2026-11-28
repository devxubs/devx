"use client";

import React, { useRef, useState } from "react";
import {
   Box,
   Button,
   Chip,
   IconButton,
   Stack,
   Switch,
   Tooltip,
   Typography,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import CustomModal from "@src/components/Modal";
import Icon from "@src/components/Icon";
import {
   ORDER_LIST_DEFAULT_STATUSES_KEY,
   ORDER_STATUS_HIDDEN_KEY,
   ORDER_STATUS_LABELS,
   ORDER_STATUS_ORDER_KEY,
   ORDER_TABLE_COLUMNS_KEY,
   ORDER_TABLE_CONFIGURABLE_FIELDS,
   resolveHiddenStatuses,
   resolveOrderListDefaultStatuses,
   resolveOrderStatusOrder,
   resolveOrderTableColumns,
} from "@src/lib/orderStatusDisplay";
import type { OrderStatusValue } from "@src/lib/orderStatus";

interface OrderDisplaySectionProps {
   values: any;
   onConfigChange: (key: string, value: any) => void;
}

const ALL_COLUMN_FIELDS = ORDER_TABLE_CONFIGURABLE_FIELDS.map((f) => f.field);
const ALL_STATUS_VALUES = Object.keys(ORDER_STATUS_LABELS) as OrderStatusValue[];

function move<T>(list: T[], index: number, delta: number): T[] {
   const next = [...list];
   const target = index + delta;
   if (target < 0 || target >= next.length) return list;
   [next[index], next[target]] = [next[target], next[index]];
   return next;
}

function MoveButtons({
   index,
   count,
   onMove,
}: {
   index: number;
   count: number;
   onMove: (delta: number) => void;
}) {
   return (
      <Stack direction="row" spacing={0.5}>
         <Tooltip title="Move up">
            <span>
               <IconButton
                  size="small"
                  disabled={index === 0}
                  onClick={() => onMove(-1)}
                  aria-label="Move up"
               >
                  <Icon icon="solar:alt-arrow-up-bold-duotone" size="16px" />
               </IconButton>
            </span>
         </Tooltip>
         <Tooltip title="Move down">
            <span>
               <IconButton
                  size="small"
                  disabled={index === count - 1}
                  onClick={() => onMove(1)}
                  aria-label="Move down"
               >
                  <Icon icon="solar:alt-arrow-down-bold-duotone" size="16px" />
               </IconButton>
            </span>
         </Tooltip>
      </Stack>
   );
}

/**
 * Phase 2 — Order Display & Sorting settings (rendered inside
 * the Sales & POS tab). Everything writes through the tab's
 * onConfigChange into customConfig and persists via the shared
 * settings Save flow; nothing here saves on its own. Reordering
 * uses move buttons — the project ships no drag-and-drop library,
 * and the ordering model (a single saved array) is identical
 * either way.
 *
 * Cleanup Phase 1: the section now shows a compact preview with
 * an Edit button; the full editor lives in a CustomModal.
 * Cancelling the modal restores the four config keys to the
 * values they had when it opened, so a cancelled edit never
 * reaches the form (and therefore never the server). "Done"
 * keeps the edits in the form for the normal Settings Save.
 *
 * Sales & POS cleanup: the preview and the editor modal are
 * independent sibling elements — the preview is plain section
 * content in the tab's continuous form (no card wrapper), and
 * the modal (configuration controls only, no preview inside)
 * renders separately through its portal.
 *
 * Status Order split: the editor is TWO modals — Status Order
 * & Visibility has its own dedicated modal (order + picker
 * visibility only), and List Defaults & Columns (default
 * statuses + table columns) keeps a separate one. Each modal
 * snapshots ONLY its own config keys when it opens, so
 * cancelling one can never discard the other's edits; "Done"
 * on either keeps the edits in the form for the shared
 * Settings Save, exactly as the single modal behaved.
 */
export default function OrderDisplaySection({
   values,
   onConfigChange,
}: OrderDisplaySectionProps) {
   const config = values?.customConfig;

   const statusOrder = resolveOrderStatusOrder(config);
   const hiddenInCreate = resolveHiddenStatuses(config, "create");
   const hiddenInFilter = resolveHiddenStatuses(config, "filter");
   const defaultStatuses = resolveOrderListDefaultStatuses(config);
   const columnLayout = resolveOrderTableColumns(config, ALL_COLUMN_FIELDS);

   const [statusEditOpen, setStatusEditOpen] = useState(false);
   const statusSnapshotRef = useRef<Record<string, any> | null>(null);
   const [displayEditOpen, setDisplayEditOpen] = useState(false);
   const displaySnapshotRef = useRef<Record<string, any> | null>(null);

   const restoreSnapshot = (snap: Record<string, any> | null) => {
      if (!snap) return;
      for (const key of Object.keys(snap)) {
         onConfigChange(key, snap[key]);
      }
   };

   const openStatusEdit = () => {
      statusSnapshotRef.current = {
         [ORDER_STATUS_ORDER_KEY]: config?.[ORDER_STATUS_ORDER_KEY],
         [ORDER_STATUS_HIDDEN_KEY]: config?.[ORDER_STATUS_HIDDEN_KEY],
      };
      setStatusEditOpen(true);
   };

   const cancelStatusEdit = () => {
      restoreSnapshot(statusSnapshotRef.current);
      setStatusEditOpen(false);
   };

   const openDisplayEdit = () => {
      displaySnapshotRef.current = {
         [ORDER_LIST_DEFAULT_STATUSES_KEY]:
            config?.[ORDER_LIST_DEFAULT_STATUSES_KEY],
         [ORDER_TABLE_COLUMNS_KEY]: config?.[ORDER_TABLE_COLUMNS_KEY],
      };
      setDisplayEditOpen(true);
   };

   const cancelDisplayEdit = () => {
      restoreSnapshot(displaySnapshotRef.current);
      setDisplayEditOpen(false);
   };

   const writeHidden = (
      location: "create" | "filter",
      status: OrderStatusValue,
      hidden: boolean,
   ) => {
      const current = {
         create: [...resolveHiddenStatuses(config, "create")],
         filter: [...resolveHiddenStatuses(config, "filter")],
      };
      const list = current[location];
      current[location] = hidden
         ? [...list, status]
         : list.filter((s) => s !== status);
      onConfigChange(ORDER_STATUS_HIDDEN_KEY, current);
   };

   const statusOptions = statusOrder.map((s) => ({
      value: s,
      label: ORDER_STATUS_LABELS[s],
   }));

   const visibleColumns =
      columnLayout.order.length - columnLayout.hidden.length;

   return (
      <>
         {/* ── Section preview (independent of the modals) ── */}
         <Stack spacing={1.5}>
               <Box>
                  <Typography variant="h6" fontWeight={600}>
                     Order Display &amp; Sorting
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     Status order, picker visibility, list defaults and
                     table columns for orders.
                  </Typography>
               </Box>

               {/* Status order preview — Edit opens the dedicated
                   Status Order modal. */}
               <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={2}
               >
                  <Typography variant="body2" sx={{ pt: 0.75 }}>
                     <strong>Status order:</strong>{" "}
                     {statusOrder
                        .map((s) => ORDER_STATUS_LABELS[s])
                        .join(" · ")}
                  </Typography>
                  <Button
                     variant="outlined"
                     size="small"
                     aria-label="Edit status order"
                     startIcon={
                        <Icon icon="solar:pen-2-bold-duotone" size="small" />
                     }
                     onClick={openStatusEdit}
                     sx={{ whiteSpace: "nowrap" }}
                  >
                     Edit
                  </Button>
               </Stack>

               {/* List defaults + columns preview — Edit opens the
                   List Defaults & Columns modal. */}
               <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={2}
               >
                  <Stack spacing={0.75}>
                     <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        useFlexGap
                        flexWrap="wrap"
                     >
                        <Typography variant="body2">
                           <strong>List opens with:</strong>
                        </Typography>
                        {defaultStatuses.length === 0 ? (
                           <Typography variant="body2" color="text.secondary">
                              All statuses
                           </Typography>
                        ) : (
                           defaultStatuses.map((s) => (
                              <Chip
                                 key={s}
                                 label={ORDER_STATUS_LABELS[s]}
                                 size="small"
                                 variant="outlined"
                              />
                           ))
                        )}
                     </Stack>
                     <Typography variant="body2">
                        <strong>Visibility:</strong>{" "}
                        {hiddenInCreate.size} hidden in Create,{" "}
                        {hiddenInFilter.size} hidden in Filters ·{" "}
                        <strong>Columns:</strong> {visibleColumns} of{" "}
                        {columnLayout.order.length} visible
                     </Typography>
                  </Stack>
                  <Button
                     variant="outlined"
                     size="small"
                     aria-label="Edit list defaults and columns"
                     startIcon={
                        <Icon icon="solar:pen-2-bold-duotone" size="small" />
                     }
                     onClick={openDisplayEdit}
                     sx={{ whiteSpace: "nowrap" }}
                  >
                     Edit
                  </Button>
               </Stack>
         </Stack>

         {/* ── Status Order modal (dedicated: order + visibility
             controls only; the preview stays on the page) ── */}
         <CustomModal
            open={statusEditOpen}
            onClose={cancelStatusEdit}
            title="Status Order & Visibility"
            size="lg"
            closeIcon
         >
            <Stack spacing={2.5} sx={{ mt: 1 }}>
               {/* ── Global status order + per-location visibility ── */}
               <Stack spacing={1}>
                  <Stack
                     direction="row"
                     alignItems="center"
                     justifyContent="flex-end"
                  >
                     <Button
                        size="small"
                        onClick={() => {
                           onConfigChange(ORDER_STATUS_ORDER_KEY, undefined);
                           onConfigChange(ORDER_STATUS_HIDDEN_KEY, undefined);
                        }}
                     >
                        Reset order
                     </Button>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                     One global order for statuses, applied to every status
                     selector. Hiding affects only the named picker —
                     status-change menus always offer every status.
                  </Typography>
                  <Stack
                     direction="row"
                     spacing={1}
                     sx={{ px: 1, color: "text.secondary" }}
                  >
                     <Box sx={{ flex: 1 }}>
                        <Typography variant="caption">Status</Typography>
                     </Box>
                     <Typography variant="caption" sx={{ width: 64, textAlign: "center" }}>
                        Create
                     </Typography>
                     <Typography variant="caption" sx={{ width: 64, textAlign: "center" }}>
                        Filters
                     </Typography>
                     <Box sx={{ width: 76 }} />
                  </Stack>
                  {statusOrder.map((status, i) => (
                     <Stack
                        key={status}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                           px: 1,
                           py: 0.5,
                           border: 1,
                           borderColor: "divider",
                           borderRadius: 1,
                        }}
                     >
                        <Typography variant="body2" sx={{ flex: 1 }}>
                           {i + 1}. {ORDER_STATUS_LABELS[status]}
                        </Typography>
                        <Box sx={{ width: 64, textAlign: "center" }}>
                           <Switch
                              size="small"
                              checked={!hiddenInCreate.has(status)}
                              onChange={(e) =>
                                 writeHidden("create", status, !e.target.checked)
                              }
                              inputProps={{
                                 "aria-label": `Show ${ORDER_STATUS_LABELS[status]} in create pickers`,
                              }}
                           />
                        </Box>
                        <Box sx={{ width: 64, textAlign: "center" }}>
                           <Switch
                              size="small"
                              checked={!hiddenInFilter.has(status)}
                              onChange={(e) =>
                                 writeHidden("filter", status, !e.target.checked)
                              }
                              inputProps={{
                                 "aria-label": `Show ${ORDER_STATUS_LABELS[status]} in filters`,
                              }}
                           />
                        </Box>
                        <MoveButtons
                           index={i}
                           count={statusOrder.length}
                           onMove={(delta) =>
                              onConfigChange(
                                 ORDER_STATUS_ORDER_KEY,
                                 move(statusOrder, i, delta),
                              )
                           }
                        />
                     </Stack>
                  ))}
               </Stack>

               {/* ── Status modal footer ── */}
               <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={1.5}
                  sx={{ pt: 1 }}
               >
                  <Button
                     variant="outlined"
                     color="inherit"
                     onClick={cancelStatusEdit}
                  >
                     Cancel
                  </Button>
                  <Button
                     variant="contained"
                     onClick={() => setStatusEditOpen(false)}
                  >
                     Done
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>

         {/* ── List Defaults & Columns modal ── */}
         <CustomModal
            open={displayEditOpen}
            onClose={cancelDisplayEdit}
            title="List Defaults & Columns"
            size="lg"
            closeIcon
         >
            <Stack spacing={2.5} sx={{ mt: 1 }}>
               {/* ── Order List default statuses ── */}
               <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={600}>
                     Order List — Default Statuses
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     The Order List opens filtered to these statuses. Empty
                     means All.
                  </Typography>
                  <CustomAutocomplete
                     multiple
                     arrow
                     size="small"
                     options={statusOptions}
                     getOptionLabel={(o: any) => o.label}
                     isOptionEqualToValue={(a: any, b: any) => a.value === b.value}
                     value={statusOptions.filter((o) =>
                        defaultStatuses.includes(o.value),
                     )}
                     onChange={(next: any) =>
                        // Cleanup Phase 1: CustomAutocomplete calls
                        // onChange value-first (see the note in
                        // OrderCreateDefaultsSection). Only known
                        // status values are written to the form.
                        onConfigChange(
                           ORDER_LIST_DEFAULT_STATUSES_KEY,
                           (next || [])
                              .map((o: any) => o.value)
                              .filter((v: any) =>
                                 ALL_STATUS_VALUES.includes(v),
                              ),
                        )
                     }
                     placeholder="All statuses"
                  />
               </Stack>

               {/* ── Order List columns ── */}
               <Stack spacing={1}>
                  <Stack
                     direction="row"
                     alignItems="center"
                     justifyContent="space-between"
                  >
                     <Typography variant="subtitle2" fontWeight={600}>
                        Order List — Columns
                     </Typography>
                     <Button
                        size="small"
                        onClick={() =>
                           onConfigChange(ORDER_TABLE_COLUMNS_KEY, undefined)
                        }
                     >
                        Reset columns
                     </Button>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                     Reorder or hide table columns. The actions column is
                     required and always stays at the end.
                  </Typography>
                  {columnLayout.order.map((field, i) => {
                     const meta = ORDER_TABLE_CONFIGURABLE_FIELDS.find(
                        (f) => f.field === field,
                     );
                     if (!meta) return null;
                     const visible = !columnLayout.hidden.includes(field);
                     return (
                        <Stack
                           key={field}
                           direction="row"
                           alignItems="center"
                           spacing={1}
                           sx={{
                              px: 1,
                              py: 0.5,
                              border: 1,
                              borderColor: "divider",
                              borderRadius: 1,
                           }}
                        >
                           <Typography variant="body2" sx={{ flex: 1 }}>
                              {meta.label}
                           </Typography>
                           <Switch
                              size="small"
                              checked={visible}
                              onChange={(e) =>
                                 onConfigChange(ORDER_TABLE_COLUMNS_KEY, {
                                    order: columnLayout.order,
                                    hidden: e.target.checked
                                       ? columnLayout.hidden.filter((f) => f !== field)
                                       : [...columnLayout.hidden, field],
                                 })
                              }
                              inputProps={{ "aria-label": `Show ${meta.label} column` }}
                           />
                           <MoveButtons
                              index={i}
                              count={columnLayout.order.length}
                              onMove={(delta) =>
                                 onConfigChange(ORDER_TABLE_COLUMNS_KEY, {
                                    order: move(columnLayout.order, i, delta),
                                    hidden: columnLayout.hidden,
                                 })
                              }
                           />
                        </Stack>
                     );
                  })}
               </Stack>

               {/* ── Footer ── */}
               <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={2}
                  sx={{ pt: 1 }}
               >
                  <Button
                     size="small"
                     color="inherit"
                     onClick={() => {
                        onConfigChange(ORDER_LIST_DEFAULT_STATUSES_KEY, undefined);
                        onConfigChange(ORDER_TABLE_COLUMNS_KEY, undefined);
                     }}
                  >
                     Reset list &amp; columns
                  </Button>
                  <Stack direction="row" spacing={1.5}>
                     <Button
                        variant="outlined"
                        color="inherit"
                        onClick={cancelDisplayEdit}
                     >
                        Cancel
                     </Button>
                     <Button
                        variant="contained"
                        onClick={() => setDisplayEditOpen(false)}
                     >
                        Done
                     </Button>
                  </Stack>
               </Stack>
            </Stack>
         </CustomModal>
      </>
   );
}
