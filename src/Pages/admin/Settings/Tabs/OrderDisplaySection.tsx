"use client";

import React, { useRef, useState } from "react";
import {
   Box,
   Button,
   Grid,
   IconButton,
   Stack,
   Switch,
   Tooltip,
   Typography,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import CustomModal from "@src/components/Modal";
import { SETTINGS_FIELD_MAX_WIDTH } from "./SettingsField";
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

// Shared modal presentation (RP-7 C6 refinement): the surface
// is capped to the viewport and laid out as a flex column, so
// the CustomModal title row and the modal footer stay fixed
// while only the row list scrolls. Width comes from the "md"
// size token (640px) — a sensible measure for these row lists.
const MODAL_SURFACE_SX = {
   maxHeight: "calc(100vh - 48px)",
   display: "flex",
   flexDirection: "column",
   overflow: "hidden",
} as const;

// The scrollable row region inside each modal: it takes the
// leftover height, scrolls vertically with a thin scrollbar,
// and never causes horizontal overflow.
const MODAL_SCROLL_SX = {
   flex: 1,
   minHeight: 0,
   overflowY: "auto",
   overflowX: "hidden",
   pr: 0.5,
   scrollbarWidth: "thin",
   scrollbarColor: "rgba(128, 128, 128, 0.45) transparent",
   "&::-webkit-scrollbar": { width: 6 },
   "&::-webkit-scrollbar-thumb": {
      backgroundColor: "rgba(128, 128, 128, 0.35)",
      borderRadius: 3,
   },
} as const;

// One configuration row (status or column): compact, aligned,
// subtle border, gentle hover — shared by both modals.
const MODAL_ROW_SX = {
   px: 1.5,
   py: 0.75,
   border: 1,
   borderColor: "divider",
   borderRadius: "8px",
   transition: "background-color 0.15s ease",
   "&:hover": { bgcolor: "action.hover" },
} as const;

/**
 * Phase 2 — Order Display & Sorting settings (rendered inside
 * the Sales & POS tab). Everything writes through the tab's
 * onConfigChange into customConfig and persists via the shared
 * settings Save flow; nothing here saves on its own. Reordering
 * uses move buttons — the project ships no drag-and-drop library,
 * and the ordering model (a single saved array) is identical
 * either way.
 *
 * Structure (after the Cleanup Phase 1 preview/modal split, the
 * Status Order modal split, the RP-7 C6 refinement, and the
 * RP-7 status-autocomplete redesign):
 * - The status order is shown on the page as a multiple-select
 *   autocomplete (chips in order) with an adjacent Edit button;
 *   the dedicated Status Order & Visibility modal remains the
 *   precise reorder tool (move buttons + Create/Filters
 *   visibility).
 * - "Order List — Default Statuses" is edited DIRECTLY on the
 *   page (label above the field, helper text below), no modal.
 * - Order List — Columns has its own modal (column order +
 *   visibility only), opened from its preview line's Edit.
 * - Statuses themselves are the Prisma OrderStatus enum — they
 *   cannot be created, renamed or deleted at runtime (see
 *   orderStatusDisplay.ts), so the autocomplete offers exactly
 *   the enum values and is NOT freeSolo.
 * Each modal snapshots ONLY its own config keys when it opens,
 * so cancelling one can never discard the other's edits;
 * "Done" keeps the edits in the form for the shared Settings
 * Save, exactly as the original single modal behaved.
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
   const [columnsEditOpen, setColumnsEditOpen] = useState(false);
   const columnsSnapshotRef = useRef<Record<string, any> | null>(null);

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

   const openColumnsEdit = () => {
      columnsSnapshotRef.current = {
         [ORDER_TABLE_COLUMNS_KEY]: config?.[ORDER_TABLE_COLUMNS_KEY],
      };
      setColumnsEditOpen(true);
   };

   const cancelColumnsEdit = () => {
      restoreSnapshot(columnsSnapshotRef.current);
      setColumnsEditOpen(false);
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
         {/* ── Section content on the page ── */}
         <Stack spacing={2}>
               <Box>
                  <Typography variant="h6" fontWeight={600}>
                     Order Display &amp; Sorting
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     Status order, picker visibility, list defaults and
                     table columns for orders.
                  </Typography>
               </Box>

               {/* Status order — a multiple-select autocomplete
                   whose chips ARE the current order, with the
                   Edit button beside it opening the dedicated
                   reorder modal. The order always covers every
                   status (the resolver appends any status the
                   saved order does not mention), so removing a
                   chip moves that status to the end of the
                   order; the modal's move buttons are the
                   precise reorder tool. Writes go through
                   onConfigChange like every other field here. */}
               <Stack spacing={0.75}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                     <Typography
                        variant="body2"
                        fontSize={13}
                        fontWeight={600}
                        color="textSecondary"
                     >
                        Status Order
                     </Typography>
                     <Tooltip title="Edit status order">
                        <IconButton
                           size="small"
                           aria-label="Edit status order"
                           onClick={openStatusEdit}
                        >
                           <Icon icon="solar:pen-2-bold-duotone" size="16px" />
                        </IconButton>
                     </Tooltip>
                  </Stack>
                  <Box sx={{ width: "100%", maxWidth: SETTINGS_FIELD_MAX_WIDTH }}>
                        <CustomAutocomplete
                           multiple
                           arrow
                           size="small"
                           options={statusOptions}
                           getOptionLabel={(o: any) => o.label}
                           isOptionEqualToValue={(a: any, b: any) => a.value === b.value}
                           value={statusOptions}
                           onChange={(next: any) =>
                              // Value-first (see the note in
                              // OrderCreateDefaultsSection). The
                              // selection's array order becomes
                              // the saved status order.
                              onConfigChange(
                                 ORDER_STATUS_ORDER_KEY,
                                 (next || [])
                                    .map((o: any) => o.value)
                                    .filter((v: any) =>
                                       ALL_STATUS_VALUES.includes(v),
                                    ),
                              )
                           }
                           placeholder="Select statuses"
                        />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                     Pickers and lists follow this order. Removing a
                     chip moves that status to the end — use Edit
                     to reorder precisely and to set Create/Filters
                     visibility ({hiddenInCreate.size} hidden in
                     Create, {hiddenInFilter.size} hidden in
                     Filters).
                  </Typography>
               </Stack>

               {/* Order List — Default Statuses, edited directly
                   on the page: external label above the field,
                   helper text below, one field per row like
                   every other Settings field (global field
                   standard). */}
               <Grid container spacing={2}>
                  <Grid size={12}>
                     <Stack
                        spacing={0.75}
                        sx={{ width: "100%", maxWidth: SETTINGS_FIELD_MAX_WIDTH }}
                     >
                        <Typography
                           variant="body2"
                           fontSize={13}
                           fontWeight={600}
                           color="textSecondary"
                        >
                           Order List — Default Statuses
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
                              // CustomAutocomplete calls onChange
                              // value-first (see the note in
                              // OrderCreateDefaultsSection). Only
                              // known status values are written.
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
                        <Typography variant="caption" color="text.secondary">
                           The order list opens filtered to these
                           statuses. Leave empty to show all statuses.
                        </Typography>
                     </Stack>
                  </Grid>
               </Grid>

               {/* Columns — the label carries the Edit
                   IconButton; the visible count is the helper
                   caption. Edit opens the Columns modal. */}
               <Stack spacing={0.75}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                     <Typography
                        variant="body2"
                        fontSize={13}
                        fontWeight={600}
                        color="textSecondary"
                     >
                        Order List — Columns
                     </Typography>
                     <Tooltip title="Edit columns">
                        <IconButton
                           size="small"
                           aria-label="Edit columns"
                           onClick={openColumnsEdit}
                        >
                           <Icon icon="solar:pen-2-bold-duotone" size="16px" />
                        </IconButton>
                     </Tooltip>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                     {visibleColumns} of {columnLayout.order.length}{" "}
                     columns visible in the order list.
                  </Typography>
               </Stack>
         </Stack>

         {/* ── Status Order & Visibility modal ── */}
         <CustomModal
            open={statusEditOpen}
            onClose={cancelStatusEdit}
            title="Status Order & Visibility"
            size="md"
            closeIcon
            sx={MODAL_SURFACE_SX}
         >
            <Stack spacing={2} sx={{ flex: 1, minHeight: 0, mt: 0.5 }}>
               <Typography variant="body2" color="text.secondary">
                  One global order for statuses, applied to every status
                  selector. Hiding affects only the named picker —
                  status-change menus always offer every status.
               </Typography>

               {/* Column captions, aligned with the rows below. */}
               <Stack
                  direction="row"
                  spacing={1}
                  sx={{ px: 1.5, color: "text.secondary" }}
               >
                  <Box sx={{ flex: 1 }}>
                     <Typography variant="caption">Status</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ width: 72, textAlign: "center" }}>
                     Create
                  </Typography>
                  <Typography variant="caption" sx={{ width: 72, textAlign: "center" }}>
                     Filters
                  </Typography>
                  <Box sx={{ width: 76 }} />
               </Stack>

               {/* Scrollable status list. */}
               <Box sx={MODAL_SCROLL_SX}>
                  <Stack spacing={1}>
                     {statusOrder.map((status, i) => (
                        <Stack
                           key={status}
                           direction="row"
                           alignItems="center"
                           spacing={1}
                           sx={MODAL_ROW_SX}
                        >
                           <Typography variant="body2" sx={{ flex: 1 }}>
                              <Typography
                                 component="span"
                                 variant="body2"
                                 color="text.secondary"
                              >
                                 {i + 1}.{" "}
                              </Typography>
                              {ORDER_STATUS_LABELS[status]}
                           </Typography>
                           <Box sx={{ width: 72, textAlign: "center" }}>
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
                           <Box sx={{ width: 72, textAlign: "center" }}>
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
               </Box>

               {/* Footer — stays visible while the list scrolls. */}
               <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={1.5}
                  sx={{ pt: 2, borderTop: 1, borderColor: "divider" }}
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

         {/* ── Order List — Columns modal ── */}
         <CustomModal
            open={columnsEditOpen}
            onClose={cancelColumnsEdit}
            title="Order List — Columns"
            size="md"
            closeIcon
            sx={MODAL_SURFACE_SX}
         >
            <Stack spacing={2} sx={{ flex: 1, minHeight: 0, mt: 0.5 }}>
               <Typography variant="body2" color="text.secondary">
                  Reorder or hide table columns. The actions column is
                  required and always stays at the end.
               </Typography>

               {/* Scrollable column list. */}
               <Box sx={MODAL_SCROLL_SX}>
                  <Stack spacing={1}>
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
                              sx={MODAL_ROW_SX}
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
               </Box>

               {/* Footer — stays visible while the list scrolls. */}
               <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={1.5}
                  sx={{ pt: 2, borderTop: 1, borderColor: "divider" }}
               >
                  <Button
                     variant="outlined"
                     color="inherit"
                     onClick={cancelColumnsEdit}
                  >
                     Cancel
                  </Button>
                  <Button
                     variant="contained"
                     onClick={() => setColumnsEditOpen(false)}
                  >
                     Done
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>
      </>
   );
}
