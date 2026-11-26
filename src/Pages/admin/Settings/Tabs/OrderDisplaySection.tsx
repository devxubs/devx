"use client";

import React from "react";
import {
   Box,
   Button,
   Card,
   CardContent,
   IconButton,
   Stack,
   Switch,
   Tooltip,
   Typography,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
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

   return (
      <Card variant="outlined">
         <CardContent>
            <Stack spacing={3}>
               <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                     Order Display &amp; Sorting
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     One global order for order statuses, applied to every
                     status selector in the POS. Hiding a status only
                     affects the picker named — orders in that status
                     always display normally, and status-change menus
                     always offer every status.
                  </Typography>
               </Box>

               {/* ── Global status order + per-location visibility ── */}
               <Stack spacing={1}>
                  <Stack
                     direction="row"
                     alignItems="center"
                     justifyContent="space-between"
                  >
                     <Typography variant="subtitle2" fontWeight={600}>
                        Status Order &amp; Visibility
                     </Typography>
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

               {/* ── Order List default statuses ── */}
               <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={600}>
                     Order List — Default Statuses
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     The Order List opens filtered to these statuses. Staff
                     can switch to any status or All at any time — this is
                     a starting view, not a restriction. Empty means All.
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
                     onChange={(_: any, next: any) =>
                        onConfigChange(
                           ORDER_LIST_DEFAULT_STATUSES_KEY,
                           (next || []).map((o: any) => o.value),
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

               <Box>
                  <Button
                     size="small"
                     color="inherit"
                     onClick={() => {
                        onConfigChange(ORDER_STATUS_ORDER_KEY, undefined);
                        onConfigChange(ORDER_STATUS_HIDDEN_KEY, undefined);
                        onConfigChange(ORDER_LIST_DEFAULT_STATUSES_KEY, undefined);
                        onConfigChange(ORDER_TABLE_COLUMNS_KEY, undefined);
                     }}
                  >
                     Reset all order display settings
                  </Button>
               </Box>
            </Stack>
         </CardContent>
      </Card>
   );
}
