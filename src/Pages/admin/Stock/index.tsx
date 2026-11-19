"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
   Box,
   Grid,
   Paper,
   Stack,
   Tab,
   Tabs,
   Typography,
   useTheme,
} from "@mui/material";
import { useSettings } from "@src/lib/settingsContext";
import MovementsTab from "./MovementsTab";
import AdjustTab from "./AdjustTab";
import WarehousesTab from "./WarehousesTab";
import LowStockTab from "./LowStockTab";

// Phase 3A (roadmap 3.2 / 3.3): dedicated Stock workspace — movement
// ledger, manual adjustments, warehouses and low-stock restocking.
// All figures come from the real product data: low stock uses the same
// rule as the Dashboard and Product list (quantity <= lowStockAlert),
// and stock value is Σ quantity × costPrice, counted only for products
// that have a cost price set.

export interface StockProduct {
   id: string;
   productName: string;
   productSku: string;
   productCode?: string;
   quantity: number;
   lowStockAlert: number;
   costPrice: number | null;
   productType?: string | null;
   primarySupplier?: { id: string; name: string } | null;
   variants?: Array<{
      id: string;
      variantName: string;
      sku: string;
      quantity: number;
      costPrice?: number | null;
      attributes?: Record<string, any> | null;
   }>;
}

const Stock = () => {
   const theme = useTheme();
   const { formatCurrency } = useSettings();
   const [tab, setTab] = useState(0);
   const [products, setProducts] = useState<StockProduct[]>([]);
   const [loadingProducts, setLoadingProducts] = useState(true);
   const [refreshKey, setRefreshKey] = useState(0);

   const loadProducts = useCallback(async () => {
      setLoadingProducts(true);
      try {
         const res = await fetch("/api/products?all=true");
         if (res.ok) {
            const data = await res.json();
            setProducts(
               (data.products || []).map((p: any) => ({
                  id: p.id,
                  productName: p.productName,
                  productSku: p.productSku || p.productCode || "",
                  productCode: p.productCode,
                  quantity: Number(p.quantity) || 0,
                  lowStockAlert: Number(p.lowStockAlert ?? 10),
                  costPrice:
                     p.costPrice != null && Number(p.costPrice) > 0
                        ? Number(p.costPrice)
                        : null,
                  productType: p.productType || "simple",
                  primarySupplier: p.primarySupplier
                     ? {
                          id: p.primarySupplier.id,
                          name: p.primarySupplier.name,
                       }
                     : null,
                  variants: (p.variants || []).map((v: any) => ({
                     id: v.id,
                     variantName: v.variantName,
                     sku: v.sku || "",
                     quantity: Number(v.quantity) || 0,
                     costPrice:
                        v.costPrice != null ? Number(v.costPrice) : null,
                     attributes: v.attributes ?? null,
                  })),
               })),
            );
         }
      } catch {
         // Keep the previous list; tabs show their own empty states.
      } finally {
         setLoadingProducts(false);
      }
   }, []);

   useEffect(() => {
      loadProducts();
   }, [loadProducts, refreshKey]);

   const overview = useMemo(() => {
      const lowStock = products.filter(
         (p) => p.quantity <= p.lowStockAlert,
      );
      let stockValue = 0;
      let valuedCount = 0;
      for (const p of products) {
         if (p.costPrice != null) {
            stockValue += p.quantity * p.costPrice;
            valuedCount += 1;
         }
      }
      return {
         totalProducts: products.length,
         lowStockCount: lowStock.length,
         totalUnits: products.reduce((s, p) => s + p.quantity, 0),
         stockValue,
         valuedCount,
      };
   }, [products]);

   const stats = [
      { label: "Total Products", value: String(overview.totalProducts) },
      { label: "Total Units in Stock", value: String(overview.totalUnits) },
      {
         label: "Low Stock Products",
         value: String(overview.lowStockCount),
         accent: overview.lowStockCount > 0,
      },
      {
         label: "Stock Value (at cost)",
         value:
            overview.valuedCount > 0
               ? formatCurrency(overview.stockValue)
               : "—",
         caption:
            overview.valuedCount > 0
               ? `From ${overview.valuedCount} product(s) with a cost price set`
               : "No product has a cost price set",
      },
   ];

   return (
      <Stack spacing={2.5} p={1} height="100%">
         <Stack spacing={0.5}>
            <Typography variant="h5" fontWeight={700}>
               Stock
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Movement ledger, manual adjustments, warehouses and low-stock
               restocking.
            </Typography>
         </Stack>

         {/* Overview strip — real figures only. */}
         <Grid container spacing={2}>
            {stats.map((s) => (
               <Grid key={s.label} size={{ xs: 12, sm: 6, lg: 3 }}>
                  <Paper
                     sx={{
                        p: 2,
                        borderRadius: 1.5,
                        boxShadow: 15,
                        height: "100%",
                     }}
                  >
                     <Typography variant="body2" color="text.secondary">
                        {s.label}
                     </Typography>
                     <Typography
                        variant="h5"
                        fontWeight={700}
                        color={s.accent ? "warning.main" : "text.primary"}
                     >
                        {loadingProducts ? "…" : s.value}
                     </Typography>
                     {s.caption && (
                        <Typography variant="caption" color="text.secondary">
                           {s.caption}
                        </Typography>
                     )}
                  </Paper>
               </Grid>
            ))}
         </Grid>

         <Paper sx={{ borderRadius: 1.5, boxShadow: 15 }}>
            <Tabs
               value={tab}
               onChange={(_, v) => setTab(v)}
               sx={{
                  px: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`,
               }}
            >
               <Tab label="Movements" />
               <Tab label="Adjust Stock" />
               <Tab label="Warehouses" />
               <Tab
                  label={`Low Stock${overview.lowStockCount ? ` (${overview.lowStockCount})` : ""}`}
               />
            </Tabs>
            <Box p={2}>
               {tab === 0 && (
                  <MovementsTab products={products} refreshKey={refreshKey} />
               )}
               {tab === 1 && (
                  <AdjustTab
                     products={products}
                     onAdjusted={() => setRefreshKey((k) => k + 1)}
                  />
               )}
               {tab === 2 && <WarehousesTab refreshKey={refreshKey} />}
               {tab === 3 && <LowStockTab products={products} />}
            </Box>
         </Paper>
      </Stack>
   );
};

export default Stock;
