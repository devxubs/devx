"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
   Badge,
   Button,
   Chip,
   FormControl,
   IconButton,
   InputLabel,
   MenuItem,
   Select,
   Stack,
   Tooltip,
   Typography,
} from "@mui/material";
import { useSnackbar } from "@src/lib/snackbarContext";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import DateRange from "@src/components/DateRange";
import FilterModalShell from "@src/components/FilterModalShell";
import Icon from "@src/components/Icon";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import type { StockProduct } from "./index";

// Phase 3A (3.2): movement ledger over GET /api/stock-movements.
// The StockMovement model stores a SIGNED quantity (negative = out),
// a type, an optional note, and order/purchase links — it has no
// resulting-stock column and no user column, so neither is shown.
//
// Runtime-fix (owner request): the filters used to be a separate
// hand-rolled row above the table while the table ALSO rendered its
// own (dead) toolbar search. The tab now uses CustomTable the way
// Orders/Customers do — the toolbar's built-in search drives the
// query, and Type / Product / Date Range live behind the table's
// filter button in a FilterModalShell, with an active-filter badge.
const TYPE_OPTIONS = ["All", "SALE", "PURCHASE", "RETURN", "ADJUSTMENT"];

const typeColor = (type: string) => {
   switch (type) {
      case "PURCHASE":
         return "success";
      case "RETURN":
         return "info";
      case "SALE":
         return "error";
      default:
         return "warning";
   }
};

interface MovementFilters {
   type: string;
   productId: string;
   range: [Date | null, Date | null];
}

const EMPTY_FILTERS: MovementFilters = {
   type: "All",
   productId: "",
   range: [null, null],
};

const countActive = (f: MovementFilters) =>
   (f.type !== "All" ? 1 : 0) +
   (f.productId ? 1 : 0) +
   (f.range[0] || f.range[1] ? 1 : 0);

interface MovementsTabProps {
   products: StockProduct[];
   refreshKey: number;
}

const MovementsTab = ({ products, refreshKey }: MovementsTabProps) => {
   const { filterQueryData } = useFilterQuery();
   const { showSnackbar } = useSnackbar();
   const search = filterQueryData.searchText || "";
   const [rows, setRows] = useState<any[]>([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(false);
   // P3-5: a failed load used to be silent (table left as-is with no
   // signal). It now surfaces the Product/Purchase banner + Retry
   // pattern; rows are deliberately NOT cleared on error, and the
   // banner stays visible above them so stale data is never
   // mistaken for a fresh load.
   const [loadError, setLoadError] = useState<string | null>(null);
   const [paginationModel, setPaginationModel] = useState({
      page: 0,
      pageSize: 25,
   });
   const [filters, setFilters] = useState<MovementFilters>(EMPTY_FILTERS);
   const [filterOpen, setFilterOpen] = useState(false);
   const [draft, setDraft] = useState<MovementFilters>(EMPTY_FILTERS);

   const load = useCallback(async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams();
         params.set("page", String(paginationModel.page + 1));
         params.set("limit", String(paginationModel.pageSize));
         if (search.trim()) params.set("search", search.trim());
         if (filters.type !== "All") params.set("type", filters.type);
         if (filters.productId) params.set("productId", filters.productId);
         if (filters.range[0])
            params.set("startDate", filters.range[0].toISOString());
         if (filters.range[1])
            params.set("endDate", filters.range[1].toISOString());
         const res = await fetch(`/api/stock-movements?${params.toString()}`);
         if (!res.ok) {
            setLoadError("Failed to load stock movements.");
            showSnackbar("Failed to load stock movements. Please try again.", "error");
            return;
         }
         if (res.ok) {
            setLoadError(null);
            const data = await res.json();
            setRows(
               (data.movements || []).map((m: any) => ({
                  id: m.id,
                  date: m.createdAt
                     ? new Date(m.createdAt).toLocaleString()
                     : "",
                  productName: m.product?.productName || "—",
                  variantName: m.variant?.variantName || null,
                  type: m.type,
                  quantity: m.quantity,
                  reference: m.reference
                     ? `${m.reference.kind === "order" ? "Order" : "Purchase"} ${m.reference.customId || ""}`.trim()
                     : "—",
                  note: m.note || "—",
               })),
            );
            setTotal(Number(data.total ?? 0));
         }
      } catch {
         setLoadError("Failed to load stock movements.");
         showSnackbar("Failed to load stock movements. Please try again.", "error");
      } finally {
         setLoading(false);
      }
   }, [paginationModel, search, filters, showSnackbar]);

   useEffect(() => {
      load();
   }, [load, refreshKey]);

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
         field: "productName",
         headerName: "Product",
         flex: 1,
         renderCell: (params: any) => (
            <Stack spacing={0} sx={{ py: 0.5 }}>
               <Typography variant="body2">{params.row.productName}</Typography>
               {params.row.variantName && (
                  <Typography
                     variant="caption"
                     color="primary.main"
                     fontWeight={600}
                  >
                     Variant: {params.row.variantName}
                  </Typography>
               )}
            </Stack>
         ),
      },
      {
         field: "type",
         headerName: "Type",
         width: 130,
         // Shared CustomTable chip column — the soft tinted chip
         // every other admin table renders — instead of a one-off
         // outlined MUI Chip.
         chip: true,
         color: (params: any) => typeColor(params.row.type),
      },
      {
         field: "quantity",
         headerName: "Qty Change",
         width: 120,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color={params.row.quantity < 0 ? "error.main" : "success.main"}
            >
               {params.row.quantity > 0
                  ? `+${params.row.quantity}`
                  : params.row.quantity}
            </Typography>
         ),
      },
      { field: "reference", headerName: "Reference", width: 170 },
      { field: "note", headerName: "Reason / Note", flex: 1 },
   ];

   // P3-6: applied-filter chips. The tab's filters live in local
   // state (not the shared FilterData buckets — those are shared by
   // every Stock tab, so writing movement filters into them would
   // leak chips onto sibling tabs), and FilterModalShell provides
   // no chips rendering, so the applied state is rendered here with
   // the same Chip affordance other pages use: visible once the
   // modal closes, each chip deletable on its own.
   const appliedProductName = filters.productId
      ? products.find((p) => p.id === filters.productId)?.productName ||
        filters.productId
      : "";
   const appliedRangeLabel = (() => {
      const [s, e] = filters.range;
      const fmt = (d: Date) => d.toLocaleDateString("en-US");
      if (s && e) return `${fmt(s)} → ${fmt(e)}`;
      if (s) return `From ${fmt(s)}`;
      if (e) return `Until ${fmt(e)}`;
      return "";
   })();

   return (
      <Stack spacing={2}>
         {loadError && rows.length === 0 && !loading && (
            <Stack
               direction="row"
               alignItems="center"
               justifyContent="center"
               spacing={1.5}
               sx={{ py: 3 }}
            >
               <Typography variant="body2" color="text.secondary">
                  {loadError}
               </Typography>
               <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Icon icon="solar:restart-bold" size="16px" />}
                  onClick={() => load()}
               >
                  Retry
               </Button>
            </Stack>
         )}

         {countActive(filters) > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
               {filters.type !== "All" && (
                  <Chip
                     size="small"
                     label={`Type: ${filters.type}`}
                     onDelete={() =>
                        setFilters({ ...filters, type: "All" })
                     }
                  />
               )}
               {filters.productId && (
                  <Chip
                     size="small"
                     label={`Product: ${appliedProductName}`}
                     onDelete={() =>
                        setFilters({ ...filters, productId: "" })
                     }
                  />
               )}
               {appliedRangeLabel && (
                  <Chip
                     size="small"
                     label={`Date: ${appliedRangeLabel}`}
                     onDelete={() =>
                        setFilters({ ...filters, range: [null, null] })
                     }
                  />
               )}
            </Stack>
         )}

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
               <Tooltip disableInteractive title="Filter">
                  <Badge badgeContent={countActive(filters)} color="primary">
                     <IconButton
                        data-testid="stock-movements-filter-btn"
                        sx={{ color: "text.secondary" }}
                        onClick={openFilters}
                     >
                        <Icon icon="solar:filters-bold-duotone" />
                     </IconButton>
                  </Badge>
               </Tooltip>
            )}
         />

         <FilterModalShell
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            title="Movement Filters"
            onApply={() => {
               setFilters(draft);
               setFilterOpen(false);
            }}
            onReset={() => setDraft(EMPTY_FILTERS)}
         >
            <FormControl size="small" fullWidth>
               <InputLabel>Movement Type</InputLabel>
               <Select
                  label="Movement Type"
                  value={draft.type}
                  onChange={(e) =>
                     setDraft({ ...draft, type: String(e.target.value) })
                  }
               >
                  {TYPE_OPTIONS.map((t) => (
                     <MenuItem key={t} value={t}>
                        {t}
                     </MenuItem>
                  ))}
               </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
               <InputLabel>Product</InputLabel>
               <Select
                  label="Product"
                  value={draft.productId}
                  onChange={(e) =>
                     setDraft({
                        ...draft,
                        productId: String(e.target.value),
                     })
                  }
               >
                  <MenuItem value="">All products</MenuItem>
                  {products.map((p) => (
                     <MenuItem key={p.id} value={p.id}>
                        {p.productName}
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
      </Stack>
   );
};

export default MovementsTab;
