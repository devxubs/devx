"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
   Alert,
   Badge,
   Chip,
   Dialog,
   DialogContent,
   DialogTitle,
   Divider,
   FormControl,
   IconButton,
   InputLabel,
   MenuItem,
   Paper,
   Select,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableRow,
   Tooltip,
   Typography,
} from "@mui/material";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import DateRange from "@src/components/DateRange";
import FilterModalShell from "@src/components/FilterModalShell";
import Icon from "@src/components/Icon";
import { useFilterQuery } from "@src/handler/useFilterQuery";

// Mirror of AUDIT_ENTITY_TYPES / AUDIT_ACTIONS in src/lib/audit.ts —
// duplicated here on purpose: the lib imports Prisma (server-only),
// so a client component must not import from it.
const ENTITY_TYPE_OPTIONS = [
   "ORDER",
   "PURCHASE",
   "PURCHASE_RETURN",
   "SUPPLIER_PAYMENT",
   "EXPENSE",
   "PRODUCT",
   "USER",
];
const ACTION_OPTIONS = [
   "CREATE",
   "UPDATE",
   "DELETE",
   "RESTORE",
   "STATUS_CHANGE",
   "PAYMENT",
   "STOCK",
   "LOGIN",
];

// Phase 4 (D1): administrator-only, read-only audit trail viewer.
// Data comes from GET /api/audit-logs (requireAdmin on the server);
// there is deliberately no create/edit/delete surface for audit
// records anywhere in the app. Layout follows the Stock → Movements
// pattern: CustomTable server pagination, toolbar search, and the
// remaining filters behind the table's filter button.

interface AuditFilters {
   entityType: string;
   action: string;
   actorId: string;
   range: [Date | null, Date | null];
}

const EMPTY_FILTERS: AuditFilters = {
   entityType: "",
   action: "",
   actorId: "",
   range: [null, null],
};

const countActive = (f: AuditFilters) =>
   (f.entityType ? 1 : 0) +
   (f.action ? 1 : 0) +
   (f.actorId ? 1 : 0) +
   (f.range[0] || f.range[1] ? 1 : 0);

const actionColor = (action: string) => {
   switch (action) {
      case "CREATE":
         return "success";
      case "DELETE":
         return "error";
      case "RESTORE":
         return "info";
      case "STATUS_CHANGE":
         return "warning";
      case "LOGIN":
         return "default";
      default:
         return "primary";
   }
};

const formatValue = (value: any): string => {
   if (value === null || value === undefined) return "—";
   if (typeof value === "object") return JSON.stringify(value);
   return String(value);
};

const AuditLogs = () => {
   const { filterQueryData } = useFilterQuery();
   const search = filterQueryData.searchText || "";
   const [rows, setRows] = useState<any[]>([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(false);
   const [forbidden, setForbidden] = useState(false);
   const [paginationModel, setPaginationModel] = useState({
      page: 0,
      pageSize: 25,
   });
   const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
   const [filterOpen, setFilterOpen] = useState(false);
   const [draft, setDraft] = useState<AuditFilters>(EMPTY_FILTERS);
   const [actors, setActors] = useState<Array<{ id: string; label: string }>>(
      [],
   );
   const [selected, setSelected] = useState<any | null>(null);

   const load = useCallback(async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams();
         params.set("page", String(paginationModel.page + 1));
         params.set("limit", String(paginationModel.pageSize));
         if (search.trim()) params.set("search", search.trim());
         if (filters.entityType) params.set("entityType", filters.entityType);
         if (filters.action) params.set("action", filters.action);
         if (filters.actorId) params.set("actorId", filters.actorId);
         if (filters.range[0])
            params.set("startDate", filters.range[0].toISOString());
         if (filters.range[1])
            params.set("endDate", filters.range[1].toISOString());
         const res = await fetch(`/api/audit-logs?${params.toString()}`);
         if (res.status === 403) {
            setForbidden(true);
            setRows([]);
            setTotal(0);
            return;
         }
         if (res.ok) {
            const data = await res.json();
            setForbidden(false);
            setRows(
               (data.logs || []).map((log: any) => ({
                  ...log,
                  date: log.createdAt
                     ? new Date(log.createdAt).toLocaleString()
                     : "",
                  entity: log.entityCustomId
                     ? `${log.entityType} · ${log.entityCustomId}`
                     : log.entityType,
               })),
            );
            setTotal(Number(data.total ?? 0));
         }
      } catch {
         // Leave the table as-is; the user can retry via filters.
      } finally {
         setLoading(false);
      }
   }, [paginationModel, search, filters]);

   useEffect(() => {
      load();
   }, [load]);

   // Actor options for the filter (user list; labels only).
   useEffect(() => {
      (async () => {
         try {
            const res = await fetch("/api/users");
            if (res.ok) {
               const data = await res.json();
               const list = Array.isArray(data) ? data : data.users || [];
               setActors(
                  list.map((u: any) => ({
                     id: u.id,
                     label: u.name || u.email || u.id,
                  })),
               );
            }
         } catch {
            // Actor filter simply stays unpopulated.
         }
      })();
   }, []);

   // Filter/search changes return to the first page.
   useEffect(() => {
      setPaginationModel((prev) =>
         prev.page === 0 ? prev : { ...prev, page: 0 },
      );
   }, [search, filters]);

   const openFilters = () => {
      setDraft(filters);
      setFilterOpen(true);
   };

   const columns: ColumnConfig[] = [
      { field: "date", headerName: "Date", width: 180 },
      {
         field: "actorLabel",
         headerName: "Actor",
         width: 170,
         renderCell: (params: any) => (
            <Typography variant="body2">
               {params.row.actorLabel || "System"}
            </Typography>
         ),
      },
      {
         field: "action",
         headerName: "Action",
         width: 140,
         renderCell: (params: any) => (
            <Chip
               size="small"
               label={params.row.action}
               color={actionColor(params.row.action) as any}
               variant="outlined"
            />
         ),
      },
      { field: "entity", headerName: "Entity", width: 210 },
      { field: "summary", headerName: "Summary", flex: 1 },
      {
         field: "actions",
         headerName: "",
         width: 60,
         sortable: false,
         renderCell: (params: any) => (
            <Tooltip title="View details">
               <IconButton
                  size="small"
                  onClick={() => setSelected(params.row)}
                  sx={{ color: "text.secondary" }}
               >
                  <Icon icon="solar:eye-bold-duotone" />
               </IconButton>
            </Tooltip>
         ),
      },
   ];

   const changeEntries =
      selected?.changes && typeof selected.changes === "object"
         ? Object.entries(selected.changes)
         : [];

   return (
      <Stack spacing={2.5} p={1} height="100%">
         <Stack spacing={0.5}>
            <Typography variant="h5" fontWeight={700}>
               Audit Logs
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Who changed what, and when — financial and inventory
               mutations, payments, stock adjustments and sign-ins.
               Read-only: audit records cannot be edited or deleted.
            </Typography>
         </Stack>

         {forbidden ? (
            <Alert severity="error">
               Administrator access is required to view the audit trail.
            </Alert>
         ) : (
            <Paper sx={{ borderRadius: 1.5, boxShadow: 15, p: 2 }}>
               <CustomTable
                  rows={rows}
                  columns={columns}
                  loading={loading}
                  serverPagination
                  rowCount={total}
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  canPrint={false}
                  canExport={false}
                  hideSelectionToolbar
                  showSelectionIndicators={false}
                  hideSelectionActions
                  filter={() => (
                     <Tooltip title="Filter">
                        <Badge
                           badgeContent={countActive(filters)}
                           color="primary"
                        >
                           <IconButton
                              data-testid="audit-logs-filter-btn"
                              sx={{ color: "text.secondary" }}
                              onClick={openFilters}
                           >
                              <Icon icon="solar:filters-bold-duotone" />
                           </IconButton>
                        </Badge>
                     </Tooltip>
                  )}
               />
            </Paper>
         )}

         <FilterModalShell
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            title="Audit Filters"
            onApply={() => {
               setFilters(draft);
               setFilterOpen(false);
            }}
            onReset={() => setDraft(EMPTY_FILTERS)}
         >
            <FormControl size="small" fullWidth>
               <InputLabel>Entity Type</InputLabel>
               <Select
                  label="Entity Type"
                  value={draft.entityType}
                  onChange={(e) =>
                     setDraft({ ...draft, entityType: String(e.target.value) })
                  }
               >
                  <MenuItem value="">All types</MenuItem>
                  {ENTITY_TYPE_OPTIONS.map((t) => (
                     <MenuItem key={t} value={t}>
                        {t}
                     </MenuItem>
                  ))}
               </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
               <InputLabel>Action</InputLabel>
               <Select
                  label="Action"
                  value={draft.action}
                  onChange={(e) =>
                     setDraft({ ...draft, action: String(e.target.value) })
                  }
               >
                  <MenuItem value="">All actions</MenuItem>
                  {ACTION_OPTIONS.map((a) => (
                     <MenuItem key={a} value={a}>
                        {a}
                     </MenuItem>
                  ))}
               </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
               <InputLabel>Actor</InputLabel>
               <Select
                  label="Actor"
                  value={draft.actorId}
                  onChange={(e) =>
                     setDraft({ ...draft, actorId: String(e.target.value) })
                  }
               >
                  <MenuItem value="">All actors</MenuItem>
                  {actors.map((a) => (
                     <MenuItem key={a.id} value={a.id}>
                        {a.label}
                     </MenuItem>
                  ))}
               </Select>
            </FormControl>
            <DateRange
               size="small"
               title="Date Range"
               value={draft.range}
               onChange={(v: any) => setDraft({ ...draft, range: v })}
            />
         </FilterModalShell>

         <Dialog
            open={!!selected}
            onClose={() => setSelected(null)}
            maxWidth="sm"
            fullWidth
         >
            <DialogTitle>Audit Entry</DialogTitle>
            <DialogContent dividers>
               {selected && (
                  <Stack spacing={1.5}>
                     <Typography variant="body2">{selected.summary}</Typography>
                     <Divider />
                     <Table size="small">
                        <TableBody>
                           <TableRow>
                              <TableCell sx={{ fontWeight: 600, width: 140 }}>
                                 When
                              </TableCell>
                              <TableCell>{selected.date}</TableCell>
                           </TableRow>
                           <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>
                                 Actor
                              </TableCell>
                              <TableCell>
                                 {selected.actorLabel || "System"}
                              </TableCell>
                           </TableRow>
                           <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>
                                 Action
                              </TableCell>
                              <TableCell>{selected.action}</TableCell>
                           </TableRow>
                           <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>
                                 Entity
                              </TableCell>
                              <TableCell>{selected.entity}</TableCell>
                           </TableRow>
                           {selected.ipAddress && (
                              <TableRow>
                                 <TableCell sx={{ fontWeight: 600 }}>
                                    IP Address
                                 </TableCell>
                                 <TableCell>{selected.ipAddress}</TableCell>
                              </TableRow>
                           )}
                           {selected.userAgent && (
                              <TableRow>
                                 <TableCell sx={{ fontWeight: 600 }}>
                                    Device
                                 </TableCell>
                                 <TableCell sx={{ wordBreak: "break-all" }}>
                                    {selected.userAgent}
                                 </TableCell>
                              </TableRow>
                           )}
                        </TableBody>
                     </Table>
                     {changeEntries.length > 0 && (
                        <>
                           <Typography variant="subtitle2" fontWeight={700}>
                              Changes
                           </Typography>
                           <Table size="small">
                              <TableBody>
                                 {changeEntries.map(([field, diff]: any) => (
                                    <TableRow key={field}>
                                       <TableCell
                                          sx={{ fontWeight: 600, width: 140 }}
                                       >
                                          {field}
                                       </TableCell>
                                       <TableCell>
                                          {formatValue(diff?.from)}
                                       </TableCell>
                                       <TableCell>→</TableCell>
                                       <TableCell>
                                          {formatValue(diff?.to)}
                                       </TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        </>
                     )}
                  </Stack>
               )}
            </DialogContent>
         </Dialog>
      </Stack>
   );
};

export default AuditLogs;
