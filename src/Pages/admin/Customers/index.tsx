"use client";

// Customer Page — clean, modular architecture.
// Page-level composition, state coordination, and data fetching.
import {
   Alert,
   Button,
   Snackbar,
   Stack,
   Typography,
} from "@mui/material";
import React, {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from "react";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { fetchAllPages } from "@src/lib/fetchAllPages";
import { useSettings } from "@src/lib/settingsContext";
import { CustomerDetailModal } from "@src/components/EntityDetailModals/EntityModals";
import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import CustomerTable from "./components/CustomerTable";
import CustomerFormModal from "./components/CustomerFormModal";
import CustomerFilterModal from "./components/CustomerFilterModal";
import {
   buildCustomerFilterChips,
   buildCustomerQuery,
   countActiveFilters,
   CustomerFilterState,
   CustomerRow,
   DEFAULT_FILTERS,
   syncFiltersFromCustomerData,
   validateCustomerFilters,
} from "./components/customerFilterUtils";
import {
   exportCustomersToCsv,
   exportCustomersToExcel,
} from "./components/customerExport";
import { SnackState } from "./types";

const Customers = () => {
   const { formatCurrency, settings } = useSettings();
   const currencySymbol = settings.currencySymbol || "৳";
   const { filterQueryData, setFilterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";

   const [rows, setRows] = useState<CustomerRow[]>([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(true);
   const [loadedOnce, setLoadedOnce] = useState(false);
   const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
      null,
   );
   const [customerToDelete, setCustomerToDelete] =
      useState<CustomerRow | null>(null);
   const [snack, setSnack] = useState<SnackState>(null);
   const [exporting, setExporting] = useState(false);
   // Phase 2 (§2.2): Add / Edit customer — the page previously offered
   // only view + delete. `formCustomer` undefined = closed, null = add
   // mode, a row = edit mode.
   const [formCustomer, setFormCustomer] = useState<
      CustomerRow | null | undefined
   >(undefined);

   // Phase 2 (2.3): global-search deep link — /admin/customers?customer=<id>
   // opens that customer's detail directly.
   useEffect(() => {
      const id = new URLSearchParams(window.location.search).get("customer");
      if (id) setSelectedCustomerId(id);
   }, []);

   const [filterModalOpen, setFilterModalOpen] = useState(false);
   const [showFilterErrors, setShowFilterErrors] = useState(false);
   const [draftFilters, setDraftFilters] =
      useState<CustomerFilterState>(DEFAULT_FILTERS);
   const [appliedFilters, setAppliedFilters] =
      useState<CustomerFilterState>(DEFAULT_FILTERS);
   const draftErrors = useMemo(
      () => validateCustomerFilters(draftFilters),
      [draftFilters],
   );
   const draftValid = Object.keys(draftErrors).length === 0;

   // Preserved default sorting state for query builder
   const [sortBy] = useState("createdAt");
   const [sortDir] = useState<"asc" | "desc">("desc");

   const [debouncedSearch, setDebouncedSearch] = useState(searchText);
   useEffect(() => {
      const t = setTimeout(() => setDebouncedSearch(searchText), 300);
      return () => clearTimeout(t);
   }, [searchText]);

   const requestRef = useRef(0);
   const lastLoadOkRef = useRef(true);

   const loadCustomers = useCallback(async () => {
      const req = ++requestRef.current;
      setLoading(true);
      try {
         // Phase B4a (P1-13): the API is server-paginated (bounded
         // pages, max 100). The table still works on the full matched
         // set, so walk the pages with the shared chunked loader —
         // identical rows and order, and a failed page throws (no
         // partial set is ever shown as complete).
         let totalFromApi: number | null = null;
         const allCustomers = await fetchAllPages<any>(
            (page, limit) =>
               `/api/customers?${buildCustomerQuery(
                  appliedFilters,
                  debouncedSearch,
                  sortBy,
                  sortDir,
                  page,
                  limit,
               ).toString()}`,
            (d) => (Array.isArray(d.customers) ? d.customers : []),
            (d) => {
               const t = Number(d.total);
               if (!Number.isNaN(t)) totalFromApi = t;
               return d.total;
            },
         );
         if (req !== requestRef.current) return;
         const mapped: CustomerRow[] = allCustomers.map((c: any) => {
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
         setTotal(totalFromApi ?? mapped.length);
         lastLoadOkRef.current = true;
      } catch {
         if (req !== requestRef.current) return;
         lastLoadOkRef.current = false;
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
   const filtersActive = activeCount > 0 || debouncedSearch.trim() !== "";

   const initialRestoredRef = useRef(false);

   // Restore active filters from URL on initial page mount if present
   useEffect(() => {
      if (initialRestoredRef.current) return;
      initialRestoredRef.current = true;
      const custData = filterQueryData.customerData;
      if (custData?._raw) {
         setAppliedFilters(custData._raw);
         setDraftFilters(custData._raw);
      }
   }, [filterQueryData.customerData]);

   // Synchronize applied filters when chips are removed or cleared from Table Filter toolbar
   useEffect(() => {
      if (!initialRestoredRef.current) return;
      const custData = filterQueryData.customerData;

      // Table Clear button clicked: customerData is empty
      if (!custData || Object.keys(custData).length === 0) {
         if (countActiveFilters(appliedFilters) > 0) {
            setAppliedFilters(DEFAULT_FILTERS);
            setDraftFilters(DEFAULT_FILTERS);
         }
         return;
      }

      // Check if any filter was removed from the Table Filter toolbar
      const synced = syncFiltersFromCustomerData(appliedFilters, custData);
      if (JSON.stringify(synced) !== JSON.stringify(appliedFilters)) {
         setAppliedFilters(synced);
         setDraftFilters(synced);
         setFilterQueryData(
            {
               customerData: {
                  ...custData,
                  _raw: synced,
               },
            },
            0,
         );
      }
   }, [filterQueryData.customerData, appliedFilters, setFilterQueryData]);

   const handleReset = useCallback(() => {
      setDraftFilters(DEFAULT_FILTERS);
      setAppliedFilters(DEFAULT_FILTERS);
      setFilterQueryData(
         {
            customerData: {},
            searchText: "",
         },
         0,
      );
   }, [setFilterQueryData]);

   const handleResetFilters = useCallback(() => {
      setDraftFilters(DEFAULT_FILTERS);
      setShowFilterErrors(false);
   }, []);

   const [applyingFilters, setApplyingFilters] = useState(false);

   const handleApplyFilters = useCallback(() => {
      if (!draftValid) {
         setShowFilterErrors(true);
         return;
      }
      setShowFilterErrors(false);
      setApplyingFilters(true);
      setAppliedFilters(draftFilters);

      const chipsMap = buildCustomerFilterChips(draftFilters);
      setFilterQueryData(
         {
            customerData: {
               ...chipsMap,
               _raw: draftFilters,
            },
         },
         0,
      );
   }, [draftValid, draftFilters, setFilterQueryData]);

   useEffect(() => {
      if (!applyingFilters || loading) return;
      setApplyingFilters(false);
      if (lastLoadOkRef.current) setFilterModalOpen(false);
   }, [applyingFilters, loading]);

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
            message:
               "Export failed. Your selection is unchanged — please try again.",
         });
      } finally {
         setExporting(false);
      }
   };

   const handleDeleteCustomer = async (row: CustomerRow) => {
      try {
         const res = await fetch(`/api/customers/${row.id}`, {
            method: "DELETE",
         });
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
   };

   const handleOpenFilter = () => {
      setDraftFilters(appliedFilters);
      setShowFilterErrors(false);
      setFilterModalOpen(true);
   };

   const openDetails = (row: CustomerRow) =>
      setSelectedCustomerId(row.customId || row.id);

   return (
      <Stack
         spacing={2}
         sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
      >
         {/* Header — Add Customer (Phase 2, §2.2) */}
         <Stack direction="row" justifyContent="flex-end">
            <Button
               variant="contained"
               color="primary"
               startIcon={<Icon icon="mingcute:add-line" />}
               onClick={() => setFormCustomer(null)}
               sx={{ textTransform: "none", fontWeight: 600 }}
            >
               Add Customer
            </Button>
         </Stack>

         {/* Empty-result guidance */}
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

         {/* Modular Customer Table */}
         <CustomerTable
            rows={rows}
            loading={loading}
            loadedOnce={loadedOnce}
            activeCount={activeCount}
            exporting={exporting}
            formatCurrency={formatCurrency}
            onOpenFilter={handleOpenFilter}
            onOpenDetails={openDetails}
            onEditCustomer={(row) => setFormCustomer(row)}
            // Phase 1 (1.5): Delete asks for confirmation first (the
            // standard AlertDialog, Categories pattern) instead of
            // deleting immediately — see the dialog below.
            onDeleteCustomer={(row) => setCustomerToDelete(row)}
            onExport={handleExport}
         />

         {/* Modular Customer Filter Modal */}
         <CustomerFilterModal
            open={filterModalOpen}
            onClose={() => setFilterModalOpen(false)}
            draftFilters={draftFilters}
            onDraftChange={setDraftFilters}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
            applying={applyingFilters}
            errors={draftErrors}
            showErrors={showFilterErrors}
            currencySymbol={currencySymbol}
         />

         {/* Customer Detail & Print Modal */}
         <CustomerDetailModal
            open={Boolean(selectedCustomerId)}
            onClose={() => setSelectedCustomerId(null)}
            customerId={selectedCustomerId}
         />

         {/* Add / Edit Customer (Phase 2, §2.2) — after a save the list
             reloads from the API so the analytics columns stay exact. */}
         <CustomerFormModal
            open={formCustomer !== undefined}
            customer={formCustomer ?? null}
            onClose={() => setFormCustomer(undefined)}
            onSaved={(message) => {
               setSnack({ severity: "success", message });
               loadCustomers();
            }}
         />

         {/* Delete confirmation (Phase 1, 1.5) */}
         <AlertDialog
            type="delete"
            open={Boolean(customerToDelete)}
            onClose={() => setCustomerToDelete(null)}
            title={`Are you sure want to delete "${customerToDelete?.name || "this customer"}"?`}
            onConfirm={async () => {
               if (!customerToDelete) return;
               await handleDeleteCustomer(customerToDelete);
               setCustomerToDelete(null);
            }}
         />

         {/* Feedback Snackbar */}
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
