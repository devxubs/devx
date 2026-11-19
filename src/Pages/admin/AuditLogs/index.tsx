"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
   Alert,
   Badge,
   Box,
   Chip,
   Divider,
   Grid,
   IconButton,
   Paper,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableRow,
   Tooltip,
   Typography,
} from "@mui/material";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import CustomAutocomplete from "@src/components/Autocomplete";
import CustomModal from "@src/components/Modal";
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

// Section/field labels mirroring the Customers filter modal
// (CustomerFilters) so all filter modals share one visual language.
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
   <Typography
      variant="subtitle2"
      sx={{
         fontWeight: 700,
         fontSize: "0.85rem",
         letterSpacing: "0.03em",
         textTransform: "uppercase",
         color: "text.primary",
         mb: 1.5,
      }}
   >
      {children}
   </Typography>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
   <Typography
      variant="body2"
      sx={{
         fontSize: "0.8125rem",
         fontWeight: 600,
         color: "text.secondary",
         letterSpacing: "0.01em",
      }}
   >
      {children}
   </Typography>
);

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

   // Filter option lists for the shared Autocomplete pickers. The
   // empty-string option is the "All …" choice, exactly matching the
   // previous Select semantics ("" = no filter).
   const entityTypeOptions = [
      { label: "All types", value: "" },
      ...ENTITY_TYPE_OPTIONS.map((t) => ({ label: t, value: t })),
   ];
   const actionOptions = [
      { label: "All actions", value: "" },
      ...ACTION_OPTIONS.map((a) => ({ label: a, value: a })),
   ];
   const actorOptions = [
      { label: "All actors", value: "" },
      ...actors.map((a) => ({ label: a.label, value: a.id })),
   ];

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
            <Box>
               <SectionTitle>Event</SectionTitle>
               <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                     <Stack spacing={0.75}>
                        <FieldLabel>Entity Type</FieldLabel>
                        <CustomAutocomplete
                           size="small"
                           arrow={true}
                           placeholder="All types"
                           options={entityTypeOptions}
                           value={
                              entityTypeOptions.find(
                                 (o) => o.value === draft.entityType,
                              ) ?? entityTypeOptions[0]
                           }
                           isOptionEqualToValue={(option: any, val: any) =>
                              option.value === val?.value
                           }
                           onChange={(opt: any) =>
                              setDraft({
                                 ...draft,
                                 entityType: opt?.value ?? "",
                              })
                           }
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                     <Stack spacing={0.75}>
                        <FieldLabel>Action</FieldLabel>
                        <CustomAutocomplete
                           size="small"
                           arrow={true}
                           placeholder="All actions"
                           options={actionOptions}
                           value={
                              actionOptions.find(
                                 (o) => o.value === draft.action,
                              ) ?? actionOptions[0]
                           }
                           isOptionEqualToValue={(option: any, val: any) =>
                              option.value === val?.value
                           }
                           onChange={(opt: any) =>
                              setDraft({ ...draft, action: opt?.value ?? "" })
                           }
                        />
                     </Stack>
                  </Grid>
               </Grid>
            </Box>
            <Box>
               <SectionTitle>Actor & Date</SectionTitle>
               <Stack spacing={2}>
                  <Stack spacing={0.75}>
                     <FieldLabel>Actor</FieldLabel>
                     <CustomAutocomplete
                        size="small"
                        arrow={true}
                        placeholder="All actors"
                        options={actorOptions}
                        value={
                           actorOptions.find(
                              (o) => o.value === draft.actorId,
                           ) ?? actorOptions[0]
                        }
                        isOptionEqualToValue={(option: any, val: any) =>
                           option.value === val?.value
                        }
                        onChange={(opt: any) =>
                           setDraft({ ...draft, actorId: opt?.value ?? "" })
                        }
                     />
                  </Stack>
                  <DateRange
                     size="small"
                     title="Date Range"
                     value={draft.range}
                     onChange={(v: any) => setDraft({ ...draft, range: v })}
                  />
               </Stack>
            </Box>
         </FilterModalShell>

         <CustomModal
            open={!!selected}
            onClose={() => setSelected(null)}
            title="Audit Entry"
            closeIcon={true}
            size="md"
            sx={{
               maxHeight: "92vh",
               display: "flex",
               flexDirection: "column",
               overflow: "hidden",
            }}
         >
            {selected && (
               <Box
                  sx={{
                     maxHeight: "calc(92vh - 120px)",
                     overflowY: "auto",
                     overflowX: "hidden",
                     pr: { xs: 0.5, sm: 1 },
                  }}
               >
                  <Stack spacing={1.5}>
                     <Typography
                        variant="body2"
                        sx={{ overflowWrap: "anywhere" }}
                     >
                        {selected.summary}
                     </Typography>
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
                                       <TableCell
                                          sx={{
                                             wordBreak: "break-word",
                                             overflowWrap: "anywhere",
                                          }}
                                       >
                                          {formatValue(diff?.from)}
                                       </TableCell>
                                       <TableCell>→</TableCell>
                                       <TableCell
                                          sx={{
                                             wordBreak: "break-word",
                                             overflowWrap: "anywhere",
                                          }}
                                       >
                                          {formatValue(diff?.to)}
                                       </TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        </>
                     )}
                  </Stack>
               </Box>
            )}
         </CustomModal>
      </Stack>
   );
};

export default AuditLogs;
