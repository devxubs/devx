"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
   Chip,
   FormControl,
   InputLabel,
   MenuItem,
   Select,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import DateRange from "@src/components/DateRange";
import type { StockProduct } from "./index";

// Phase 3A (3.2): movement ledger over GET /api/stock-movements.
// The StockMovement model stores a SIGNED quantity (negative = out),
// a type, an optional note, and order/purchase links — it has no
// resulting-stock column and no user column, so neither is shown.
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

interface MovementsTabProps {
   products: StockProduct[];
   refreshKey: number;
}

const MovementsTab = ({ products, refreshKey }: MovementsTabProps) => {
   const [rows, setRows] = useState<any[]>([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(false);
   const [paginationModel, setPaginationModel] = useState({
      page: 0,
      pageSize: 25,
   });
   const [search, setSearch] = useState("");
   const [type, setType] = useState("All");
   const [productId, setProductId] = useState("");
   const [range, setRange] = useState<[Date | null, Date | null]>([
      null,
      null,
   ]);

   const load = useCallback(async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams();
         params.set("page", String(paginationModel.page + 1));
         params.set("limit", String(paginationModel.pageSize));
         if (search.trim()) params.set("search", search.trim());
         if (type !== "All") params.set("type", type);
         if (productId) params.set("productId", productId);
         if (range[0]) params.set("startDate", range[0].toISOString());
         if (range[1]) params.set("endDate", range[1].toISOString());
         const res = await fetch(`/api/stock-movements?${params.toString()}`);
         if (res.ok) {
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
         // Leave the table empty; the user can retry via filters.
      } finally {
         setLoading(false);
      }
   }, [paginationModel, search, type, productId, range]);

   useEffect(() => {
      load();
   }, [load, refreshKey]);

   // Filter changes return to the first page.
   useEffect(() => {
      setPaginationModel((prev) =>
         prev.page === 0 ? prev : { ...prev, page: 0 },
      );
   }, [search, type, productId, range]);

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
         renderCell: (params: any) => (
            <Chip
               size="small"
               label={params.row.type}
               color={typeColor(params.row.type) as any}
               variant="outlined"
            />
         ),
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

   return (
      <Stack spacing={2}>
         <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ md: "center" }}
            flexWrap="wrap"
         >
            <TextField
               size="small"
               label="Search reference or product"
               placeholder="e.g. ORD_12, PUR_3, product name"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               sx={{ minWidth: 240 }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
               <InputLabel>Movement Type</InputLabel>
               <Select
                  label="Movement Type"
                  value={type}
                  onChange={(e) => setType(String(e.target.value))}
               >
                  {TYPE_OPTIONS.map((t) => (
                     <MenuItem key={t} value={t}>
                        {t}
                     </MenuItem>
                  ))}
               </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
               <InputLabel>Product</InputLabel>
               <Select
                  label="Product"
                  value={productId}
                  onChange={(e) => setProductId(String(e.target.value))}
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
               value={range}
               onChange={(v: any) => setRange(v)}
            />
         </Stack>

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
         />
      </Stack>
   );
};

export default MovementsTab;
