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
   alpha,
   useMediaQuery,
   useTheme,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { useSettings } from "@src/lib/settingsContext";
import { isProductLowStock } from "@src/lib/lowStock";
import { fetchAllPages } from "@src/lib/fetchAllPages";
import MovementsTab from "./MovementsTab";
import AdjustTab from "./AdjustTab";
import WarehousesTab from "./WarehousesTab";
import LowStockTab from "./LowStockTab";

// Phase 3A (roadmap 3.2 / 3.3): dedicated Stock workspace — movement
// ledger, manual adjustments, warehouses and low-stock restocking.
// All figures come from the real product data: low stock uses the
// canonical rule (src/lib/lowStock — the product's own threshold,
// or the store-wide default when the product's is 0/unset), the
// same rule as the Dashboard and Product list since RP-2, and
// stock value is Σ quantity × costPrice, counted only for products
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
      lowStockAlert?: number;
      costPrice?: number | null;
      attributes?: Record<string, any> | null;
   }>;
}

const Stock = () => {
   const theme = useTheme();
   const { settings, formatCurrency } = useSettings();
   const [tab, setTab] = useState(0);
   const [products, setProducts] = useState<StockProduct[]>([]);
   const [loadingProducts, setLoadingProducts] = useState(true);
   const [refreshKey, setRefreshKey] = useState(0);

   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

   const loadProducts = useCallback(async () => {
      setLoadingProducts(true);
      try {
         // PERF-03: the overview + low-stock tabs need the whole
         // catalogue (per-product thresholds can't be filtered
         // server-side), but it is now fetched in bounded pages of
         // 100 instead of one ?all=true response (up to 10,000 rows
         // in a single payload).
         const allProducts = await fetchAllPages(
            (page, limit) => `/api/products?page=${page}&limit=${limit}`,
            (d) => d.products || [],
            (d) => d.total,
         );
         const mapped: StockProduct[] = allProducts.map((p: any) => ({
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
               // P2-19: variant-level low-stock surfacing reads
               // the variant's own threshold (schema default 5).
               lowStockAlert: Number(v.lowStockAlert ?? 5),
               costPrice: v.costPrice != null ? Number(v.costPrice) : null,
               attributes: v.attributes ?? null,
            })),
         }));
         // A failed load (empty result on a refresh) keeps the
         // previous list, matching the old behaviour; a genuinely
         // empty catalogue still clears it.
         setProducts((prev) =>
            mapped.length > 0 || prev.length === 0 ? mapped : prev,
         );
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
      // Audit M-1: the header stat uses the same canonical rule as
      // the Low Stock tab below (it previously compared against
      // the raw stored threshold and undercounted stored-0
      // products that the tab itself listed).
      const lowStock = products.filter((p) =>
         isProductLowStock(p.quantity, p.lowStockAlert, settings?.defaultLowStockAlert),
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
   }, [products, settings?.defaultLowStockAlert]);

   // Overview cards follow the project's premium summary-card tone
   // system (see AnalyticsCard): each metric carries a tone, shown
   // as a soft-tinted icon square. Values and captions are the same
   // figures the page has always computed — presentation only.
   const stats = [
      {
         label: "Total Products",
         value: String(overview.totalProducts),
         icon: "solar:box-bold-duotone",
         tone: "primary" as const,
      },
      {
         label: "Total Units in Stock",
         value: String(overview.totalUnits),
         icon: "solar:inbox-bold-duotone",
         tone: "info" as const,
      },
      {
         label: "Low Stock Products",
         value: String(overview.lowStockCount),
         icon: "solar:danger-triangle-bold",
         tone: "warning" as const,
         accent: overview.lowStockCount > 0,
      },
      {
         label: "Stock Value",
         value:
            overview.valuedCount > 0
               ? formatCurrency(overview.stockValue)
               : "—",
         icon: "solar:hand-money-bold-duotone",
         tone: "success" as const,
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
            {stats.map((s) => {
               const toneColor = theme.palette[s.tone].main;
               return (
                  <Grid key={s.label} size={{ xs: 12, sm: 6, lg: 3 }}>
                     <Paper
                        elevation={0}
                        sx={{
                           p: 2.5,
                           borderRadius: 1.5,
                           border: `1px solid ${theme.palette.divider}`,
                           height: "100%",
                        }}
                     >
                        <Stack spacing={1.5}>
                           <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1.5}
                           >
                              <Box
                                 sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 1.5,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    bgcolor: alpha(toneColor, 0.1),
                                    flexShrink: 0,
                                 }}
                              >
                                 <Icon
                                    icon={s.icon}
                                    size="22px"
                                    color={s.tone}
                                 />
                              </Box>
                              <Typography
                                 variant="subtitle2"
                                 color="text.secondary"
                              >
                                 {s.label}
                              </Typography>
                           </Stack>
                           <Typography
                              variant="h4"
                              fontWeight={700}
                              color={s.accent ? "warning.main" : "text.primary"}
                           >
                              {loadingProducts ? "…" : s.value}
                           </Typography>
                           {/* {s.caption && (
                              <Typography
                                 variant="caption"
                                 color="text.secondary"
                              >
                                 {s.caption}
                              </Typography>
                           )} */}
                        </Stack>
                     </Paper>
                  </Grid>
               );
            })}
         </Grid>

         <Paper
            elevation={0}
            sx={{
               borderRadius: 1.5,
               border: `1px solid ${theme.palette.divider}`,
            }}
         >
            <Tabs
               value={tab}
               onChange={(_, v) => setTab(v)}
               variant="scrollable"
               scrollButtons="auto"
               sx={{
                  px: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  justifyContent: isMobile ? "center" : "flex-start",
                  "& .MuiTab-root": {
                     textTransform: "none",
                     fontWeight: 600,
                     fontSize: "0.9rem",
                     minHeight: 52,
                     gap: 0.75,
                  },
               }}
            >
               <Tab
                  icon={<Icon icon="solar:history-bold-duotone" size="19px" />}
                  iconPosition="start"
                  label={!isMobile ? "Movements" : ""}
               />
               <Tab
                  icon={<Icon icon="solar:scale-linear" size="19px" />}
                  iconPosition="start"
                  label={!isMobile ? "Adjust Stock" : ""}
               />
               <Tab
                  icon={
                     <Icon icon="solar:buildings-bold-duotone" size="19px" />
                  }
                  iconPosition="start"
                  label={!isMobile ? "Warehouses" : ""}
               />
               <Tab
                  icon={<Icon icon="solar:danger-triangle-bold" size="19px" />}
                  iconPosition="start"
                  label={
                     !isMobile
                        ? `Low Stock${overview.lowStockCount ? ` (${overview.lowStockCount})` : ""}`
                        : ""
                  }
               />
            </Tabs>
            <Box p={2.5}>
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
               {tab === 3 && (
                  <LowStockTab products={products} loading={loadingProducts} />
               )}
            </Box>
         </Paper>
      </Stack>
   );
};

export default Stock;
