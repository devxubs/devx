"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
   Alert,
   Box,
   Chip,
   Divider,
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
import CustomModal from "@src/components/Modal";
import Icon from "@src/components/Icon";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import AuditFilter, {
   reviveAuditFilters,
   serializeAuditFilters,
   syncAuditFilters,
} from "./AuditFilter";
import { AuditFilters, EMPTY_AUDIT_FILTERS } from "./AuditFilterModel";

// Phase 4 (D1): administrator-only, read-only audit trail viewer.
// Data comes from GET /api/audit-logs (requireAdmin on the server);
// there is deliberately no create/edit/delete surface for audit
// records anywhere in the app. Layout follows the Stock → Movements
// pattern: CustomTable server pagination and toolbar search, with
// the remaining filters on the shared CustomTable filter system
// (AuditFilter, mirroring the Orders table): the applied state rides
// in the shared filter query (FilterData.customerData — display chip
// entries plus the full state under `_raw`), so the shared Filter
// toolbar renders the chips, chip removal and Clear for this page.

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
   const { filterQueryData, setFilterQueryData } = useFilterQuery();
   const search = filterQueryData.searchText || "";
   const [rows, setRows] = useState<any[]>([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(false);
   const [forbidden, setForbidden] = useState(false);
   const [paginationModel, setPaginationModel] = useState({
      page: 0,
      pageSize: 25,
   });
   const [filters, setFilters] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS);
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

   // The filter modal, chips and Clear all write through the shared
   // filter query (FilterData.customerData — see AuditFilter.tsx).
   // Adopt its `_raw` as the applied filters and mirror chip
   // removals back into it — the same sync the Customers page
   // performs for its bucket. An emptied bucket (Clear) resets all.
   useEffect(() => {
      const custData = filterQueryData.customerData;
      if (!custData || Object.keys(custData).length === 0) {
         if (countActive(filters) > 0) setFilters(EMPTY_AUDIT_FILTERS);
         return;
      }
      const raw = reviveAuditFilters(custData._raw);
      const synced = syncAuditFilters(raw ?? filters, custData);
      if (
         JSON.stringify(serializeAuditFilters(synced)) !==
         JSON.stringify(serializeAuditFilters(filters))
      ) {
         setFilters(synced);
      }
      if (
         raw &&
         JSON.stringify(serializeAuditFilters(synced)) !==
            JSON.stringify(serializeAuditFilters(raw))
      ) {
         setFilterQueryData(
            {
               customerData: {
                  ...custData,
                  _raw: serializeAuditFilters(synced),
               },
            },
            0,
         );
      }
   }, [filterQueryData.customerData, filters, setFilterQueryData]);

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
                  filter={(data, onChange) =>
                     AuditFilter(data, onChange, actors)
                  }
               />
            </Paper>
         )}

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
