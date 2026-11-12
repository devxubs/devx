"use client";

// Customer Page (upgraded) — analytics table with server-driven advanced
// filters, sorting, bulk selection and selection-only CSV/Excel export.
// Statistics come from GET /api/customers (see route): valid orders are
// non-deleted orders that are not CANCELLED/FAILED; Total Paid/Due use the
// orders' advancePayment/dueAmount fields, matching the detail modal's
// analytics conventions.
import {
   Alert,
   Badge,
   Box,
   Button,
   Chip,
   Collapse,
   FormControl,
   InputLabel,
   MenuItem,
   Select,
   Snackbar,
   Stack,
   Tooltip,
   Typography,
} from "@mui/material";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { TableSkeleton } from "@src/components/SkeletonLoader";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import Icon from "@src/components/Icon";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { useSettings } from "@src/lib/settingsContext";
import Customer from "./CustomerInfo";
import { CustomerDetailModal } from "@src/components/EntityDetailModals/EntityModals";
import CustomerFilters from "./components/CustomerFilters";
import {
   buildCustomerQuery,
   clearFilterGroup,
   countActiveFilters,
   CustomerFilterState,
   CustomerRow,
   DEFAULT_FILTERS,
   describeFilters,
   FilterChipKey,
} from "./components/customerFilterUtils";
import {
   exportCustomersToCsv,
   exportCustomersToExcel,
} from "./components/customerExport";

const SORT_OPTIONS: { value: string; label: string }[] = [
   { value: "createdAt", label: "Registration Date" },
   { value: "name", label: "Customer Name" },
   { value: "customId", label: "Customer ID" },
   { value: "totalOrders", label: "Total Orders" },
   { value: "totalPurchase", label: "Total Purchase" },
   { value: "totalPaid", label: "Total Paid" },
   { value: "totalDue", label: "Total Due" },
   { value: "lastOrderAt", label: "Last Order Date" },
];

type SnackState = { severity: "success" | "error"; message: string } | null;

const Customers = () => {
   const { formatCurrency, settings } = useSettings();
   const currencySymbol = settings.currencySymbol || "৳";
   const { filterQueryData, setFilterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";

   const [rows, setRows] = useState<CustomerRow[]>([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(true);
   const [loadedOnce, setLoadedOnce] = useState(false);
   const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
   const [snack, setSnack] = useState<SnackState>(null);
   const [exporting, setExporting] = useState(false);

   const [panelOpen, setPanelOpen] = useState(false);
   const [draftFilters, setDraftFilters] = useState<CustomerFilterState>(DEFAULT_FILTERS);
   const [appliedFilters, setAppliedFilters] = useState<CustomerFilterState>(DEFAULT_FILTERS);
   const [sortBy, setSortBy] = useState("createdAt");
   const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

   const [debouncedSearch, setDebouncedSearch] = useState(searchText);
   useEffect(() => {
      const t = setTimeout(() => setDebouncedSearch(searchText), 300);
      return () => clearTimeout(t);
   }, [searchText]);

   const requestRef = useRef(0);
   const loadCustomers = useCallback(async () => {
      const req = ++requestRef.current;
      setLoading(true);
      try {
         const q = buildCustomerQuery(appliedFilters, debouncedSearch, sortBy, sortDir);
         const res = await fetch(`/api/customers?${q.toString()}`);
         if (!res.ok) throw new Error("Failed to load customers");
         const data = await res.json();
         if (req !== requestRef.current) return;
         const mapped: CustomerRow[] = (data.customers || []).map((c: any) => {
            const s = c.stats || {};
            return {
               id: c.id,
               customId: c.customId || "",
               name: c.name || "",
               email: c.email || "",
               phone: c.phone || "",
               address: c.address || "",
               createdAt: c.createdAt,
               totalOrders: Number(s.totalOrders || 0),
               totalPurchase: Number(s.totalPurchase || 0),
               totalPaid: Number(s.totalPaid || 0),
               totalDue: Number(s.totalDue || 0),
               lastOrderAt: s.lastOrderAt ?? null,
               status: s.status === "Returning" ? "Returning" : "New",
            };
         });
         setRows(mapped);
         setTotal(Number(data.total ?? mapped.length));
      } catch {
         if (req !== requestRef.current) return;
         setRows([]);
         setTotal(0);
         setSnack({
            severity: "error",
            message: "Failed to load customers. Please try again.",
         });
      } finally {
         if (req === requestRef.current) {
            setLoading(false);
            setLoadedOnce(true);
         }
      }
   }, [appliedFilters, debouncedSearch, sortBy, sortDir]);

   useEffect(() => {
      loadCustomers();
   }, [loadCustomers]);

   const activeCount = useMemo(
      () => countActiveFilters(appliedFilters),
      [appliedFilters],
   );
   const chips = useMemo(() => describeFilters(appliedFilters), [appliedFilters]);
   const filtersActive = activeCount > 0 || debouncedSearch.trim() !== "";

   const handleReset = useCallback(() => {
      setDraftFilters(DEFAULT_FILTERS);
      setAppliedFilters(DEFAULT_FILTERS);
      setSortBy("createdAt");
      setSortDir("desc");
      if (searchText) setFilterQueryData({ searchText: "" });
   }, [searchText, setFilterQueryData]);

   const handleChipDelete = (key: FilterChipKey) => {
      const next = clearFilterGroup(appliedFilters, key);
      setAppliedFilters(next);
      setDraftFilters(next);
   };

   const handleExport = async (
      format: "csv" | "excel",
      selected: CustomerRow[],
   ) => {
      if (exporting || selected.length === 0) return;
      setExporting(true);
      try {
         if (format === "csv") exportCustomersToCsv(selected);
         else await exportCustomersToExcel(selected);
         setSnack({
            severity: "success",
            message: `${selected.length} customer(s) exported to ${format === "csv" ? "CSV" : "Excel"}.`,
         });
      } catch {
         setSnack({
            severity: "error",
            message: "Export failed. Your selection is unchanged — please try again.",
         });
      } finally {
         setExporting(false);
      }
   };

   const openDetails = (row: CustomerRow) =>
      setSelectedCustomerId(row.customId || row.id);

   const columns: ColumnConfig[] = [
      {
         field: "customId",
         headerName: "ID",
         width: 110,
         renderCell: (p: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{
                  fontFamily: "monospace",
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
               }}
               onClick={() => openDetails(p.row)}
            >
               {p.row.customId || "—"}
            </Typography>
         ),
      },
      {
         field: "customer",
         headerName: "Customer",
         flex: 1,
         minWidth: 230,
         renderCell: (p: any) => (
            <Box sx={{ cursor: "pointer" }} onClick={() => openDetails(p.row)}>
               <Customer
                  name={p.row.name}
                  email={p.row.email}
                  phone={p.row.phone || "-"}
               />
            </Box>
         ),
      },
      {
         field: "totalOrders",
         headerName: "Total Orders",
         type: "number",
         width: 120,
         align: "right",
         headerAlign: "right",
         renderCell: (p: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               sx={{
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline", color: "primary.main" },
               }}
               onClick={() => openDetails(p.row)}
            >
               {p.row.totalOrders}
            </Typography>
         ),
      },
      {
         field: "totalPurchase",
         headerName: "Total Purchase",
         type: "number",
         width: 145,
         align: "right",
         headerAlign: "right",
         renderCell: (p: any) => (
            <Typography variant="body2">{formatCurrency(p.row.totalPurchase)}</Typography>
         ),
      },
      {
         field: "totalPaid",
         headerName: "Total Paid",
         type: "number",
         width: 135,
         align: "right",
         headerAlign: "right",
         renderCell: (p: any) => (
            <Typography variant="body2">{formatCurrency(p.row.totalPaid)}</Typography>
         ),
      },
      {
         field: "totalDue",
         headerName: "Total Due",
         type: "number",
         width: 135,
         align: "right",
         headerAlign: "right",
         renderCell: (p: any) =>
            p.row.totalDue > 0 ? (
               <Typography variant="body2" fontWeight={700} color="error.main">
                  {formatCurrency(p.row.totalDue)}
               </Typography>
            ) : (
               <Typography variant="body2" color="text.secondary">
                  {formatCurrency(0)}
               </Typography>
            ),
      },
      {
         field: "lastOrderAt",
         headerName: "Last Order",
         width: 125,
         renderCell: (p: any) =>
            p.row.lastOrderAt ? (
               <Typography variant="body2">
                  {dayjs(p.row.lastOrderAt).format("DD MMM YYYY")}
               </Typography>
            ) : (
               <Typography variant="body2" color="text.secondary">
                  Never
               </Typography>
            ),
      },
      {
         field: "status",
         headerName: "Status",
         width: 120,
         chip: true,
         color: (p: any) => (p.value === "Returning" ? "info" : "success"),
      },
      { field: "@actions", headerName: "", width: 50 },
   ];

   return (
      <Stack spacing={2}>
         {/* Header: title + count, sort controls, filters toggle */}
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={1.5}
         >
            <Stack>
               <Typography variant="h5" fontWeight={700}>
                  Customers
               </Typography>
               <Typography variant="body2" color="textSecondary">
                  {total} customer{total === 1 ? "" : "s"} found
               </Typography>
            </Stack>
            <Stack
               direction="row"
               spacing={1.5}
               alignItems="center"
               flexWrap="wrap"
            >
               <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                     label="Sort By"
                     value={sortBy}
                     onChange={(e) => setSortBy(e.target.value)}
                  >
                     {SORT_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                           {o.label}
                        </MenuItem>
                     ))}
                  </Select>
               </FormControl>
               <Tooltip
                  title={sortDir === "desc" ? "Descending — click for ascending" : "Ascending — click for descending"}
                  disableInteractive
               >
                  <Button
                     size="small"
                     variant="outlined"
                     color="inherit"
                     onClick={() =>
                        setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                     }
                     startIcon={
                        <Icon
                           icon={
                              sortDir === "desc"
                                 ? "eva:arrow-downward-fill"
                                 : "eva:arrow-upward-fill"
                           }
                           size="small"
                        />
                     }
                     sx={{ textTransform: "none", fontWeight: 600, height: 40 }}
                  >
                     {sortDir === "desc" ? "Desc" : "Asc"}
                  </Button>
               </Tooltip>
               <Badge badgeContent={activeCount} color="primary">
                  <Button
                     variant={panelOpen ? "contained" : "outlined"}
                     onClick={() => setPanelOpen((o) => !o)}
                     startIcon={<Icon icon="solar:filter-bold" size="small" />}
                     sx={{ textTransform: "none", fontWeight: 600, height: 40 }}
                  >
                     Filters
                  </Button>
               </Badge>
            </Stack>
         </Stack>

         {/* Active filter chips */}
         {chips.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
               {chips.map((chip) => (
                  <Chip
                     key={chip.key}
                     label={chip.label}
                     size="small"
                     onDelete={() => handleChipDelete(chip.key)}
                     sx={{ fontWeight: 600 }}
                  />
               ))}
               <Button
                  size="small"
                  variant="text"
                  color="error"
                  onClick={handleReset}
                  sx={{ textTransform: "none", fontWeight: 600 }}
               >
                  Clear all
               </Button>
            </Stack>
         )}

         {/* Advanced filter panel */}
         <Collapse in={panelOpen} unmountOnExit>
            <CustomerFilters
               value={draftFilters}
               onChange={setDraftFilters}
               onApply={() => setAppliedFilters(draftFilters)}
               onReset={handleReset}
               currencySymbol={currencySymbol}
            />
         </Collapse>

         {/* Empty-result guidance (the grid also shows its No Data overlay) */}
         {loadedOnce && !loading && rows.length === 0 && (
            <Stack
               direction="row"
               spacing={1.5}
               alignItems="center"
               flexWrap="wrap"
               sx={{
                  border: 1,
                  borderColor: "divider",
                  borderStyle: "dashed",
                  borderRadius: 1,
                  px: 2,
                  py: 1.5,
               }}
            >
               <Typography variant="body2" color="textSecondary">
                  {filtersActive
                     ? "No customers match the current search and filters."
                     : "No customers yet. New customers will appear here."}
               </Typography>
               {filtersActive && (
                  <Button
                     size="small"
                     variant="outlined"
                     onClick={handleReset}
                     sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                     Reset Filters
                  </Button>
               )}
            </Stack>
         )}

         {/* Table */}
         {!loadedOnce && loading ? (
            <TableSkeleton rows={5} cols={5} />
         ) : (
            <CustomTable
               rows={rows}
               columns={columns}
               checkBox={true}
               canPrint={false}
               canExport={false}
               customSelectionToolbar={(selectedRows, onClearSelection) => (
                  <Stack
                     direction="row"
                     spacing={1}
                     alignItems="center"
                     flexWrap="wrap"
                     useFlexGap
                  >
                     <Chip
                        size="small"
                        color="primary"
                        label={`${selectedRows.length} customer${selectedRows.length === 1 ? "" : "s"} selected`}
                        sx={{ fontWeight: 700, borderRadius: 1 }}
                     />
                     <Button
                        size="small"
                        variant="outlined"
                        disabled={exporting}
                        onClick={() =>
                           handleExport("csv", selectedRows as CustomerRow[])
                        }
                        startIcon={
                           <Icon icon="solar:file-download-bold" size="small" />
                        }
                        sx={{ textTransform: "none", fontWeight: 600 }}
                     >
                        Export CSV
                     </Button>
                     <Button
                        size="small"
                        variant="outlined"
                        disabled={exporting}
                        onClick={() =>
                           handleExport("excel", selectedRows as CustomerRow[])
                        }
                        startIcon={
                           <Icon icon="solar:file-download-bold" size="small" />
                        }
                        sx={{ textTransform: "none", fontWeight: 600 }}
                     >
                        Export Excel
                     </Button>
                     <Button
                        size="small"
                        variant="text"
                        color="inherit"
                        disabled={exporting}
                        onClick={onClearSelection}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                     >
                        Clear Selection
                     </Button>
                  </Stack>
               )}
               menuItems={[
                  {
                     label: "View Details & Print",
                     onClick: (p) => openDetails(p.row as CustomerRow),
                  },
                  {
                     label: "Delete",
                     color: "error",
                     onClick: async (p) => {
                        try {
                           const res = await fetch(
                              `/api/customers/${p.row.id}`,
                              { method: "DELETE" },
                           );
                           if (!res.ok) throw new Error("Delete failed");
                           setSnack({
                              severity: "success",
                              message: "Customer deleted.",
                           });
                           loadCustomers();
                        } catch {
                           setSnack({
                              severity: "error",
                              message: "Failed to delete the customer.",
                           });
                        }
                     },
                  },
               ]}
            />
         )}

         <CustomerDetailModal
            open={Boolean(selectedCustomerId)}
            onClose={() => setSelectedCustomerId(null)}
            customerId={selectedCustomerId}
         />

         <Snackbar
            open={Boolean(snack)}
            autoHideDuration={4000}
            onClose={() => setSnack(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
         >
            {snack ? (
               <Alert
                  severity={snack.severity}
                  onClose={() => setSnack(null)}
                  sx={{ width: "100%" }}
               >
                  {snack.message}
               </Alert>
            ) : undefined}
         </Snackbar>
      </Stack>
   );
};

export default Customers;
