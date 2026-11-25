"use client";

import {
   Box,
   TextField,
   ListItemText,
   ListItemButton,
   ClickAwayListener,
   useMediaQuery,
   useTheme,
   Typography,
   CircularProgress,
   Stack,
   Divider,
   Chip,
} from "@mui/material";
import CustomBox from "@src/components/CustomBox";
import { useSettings } from "@src/lib/settingsContext";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { orderDetailsPath } from "@src/lib/utils";

interface SearchResults {
   products: any[];
   categories: any[];
   units: any[];
   orders: any[];
   customers: any[];
   employees: any[];
   suppliers: any[];
   purchases: any[];
   expenses: any[];
   assets: any[];
   settings: any[];
}

export default function FullWidthSuggestions() {
   const router = useRouter();
   // Phase 2 (2.12): money in search results uses the shared
   // settings-aware formatter instead of a hard-coded ৳ literal.
   const { formatCurrency } = useSettings();
   const [query, setQuery] = useState("");
   const [open, setOpen] = useState(false);
   const [loading, setLoading] = useState(false);
   const [selectedIndex, setSelectedIndex] = useState(0);
   const [results, setResults] = useState<SearchResults>({
      products: [],
      categories: [],
      units: [],
      orders: [],
      customers: [],
      employees: [],
      suppliers: [],
      purchases: [],
      expenses: [],
      assets: [],
      settings: [],
   });
   const [totalMatches, setTotalMatches] = useState(0);

   const inputRef = useRef<HTMLInputElement | null>(null);
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

   const executeSearch = useCallback(async (searchTerm: string) => {
      if (!searchTerm.trim()) {
         setResults({
            products: [],
            categories: [],
            units: [],
            orders: [],
            customers: [],
            employees: [],
            suppliers: [],
            purchases: [],
            expenses: [],
            assets: [],
            settings: [],
         });
         setTotalMatches(0);
         return;
      }

      setLoading(true);
      try {
         const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm.trim())}`);
         if (res.ok) {
            const data = await res.json();
            setResults(data.results);
            setTotalMatches(data.totalMatches);
         }
      } catch {
         // silent fallback
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      const handler = setTimeout(() => {
         if (query.trim()) {
            executeSearch(query);
         }
      }, 250);

      return () => clearTimeout(handler);
   }, [query, executeSearch]);

   // Flatten all actionable items for keyboard navigation
   const flatItems = useMemo(() => {
      const items: Array<{ title: string; subtitle?: string; tag?: string; url: string }> = [];

      results.products.forEach((p) => {
         items.push({
            title: p.productName,
            subtitle: `${p.customId || p.productCode || ""} • Qty: ${p.quantity ?? 0} • ${formatCurrency(Number(p.regularPrice || 0))}`,
            tag: "Product",
            url: `/admin/product?id=${p.id}`,
         });
      });

      results.orders.forEach((o) => {
         items.push({
            title: o.orderCode || o.orderId || o.customId,
            subtitle: `${o.customer?.name || "Customer"} • ${formatCurrency(Number(o.total || 0))} • ${o.status}`,
            tag: "Order",
            url: orderDetailsPath(o.orderCode || o.orderId || o.id),
         });
      });

      // Phase 2 (2.3): deep links — every result opens its own record
      // (the target list pages read these params and open the matching
      // detail view) instead of landing on an unfiltered list.
      results.customers.forEach((c) => {
         items.push({
            title: c.name,
            subtitle: `${c.customId || ""} • ${c.phone || c.email || ""}`,
            tag: "Customer",
            url: `/admin/customers?customer=${c.customId || c.id}`,
         });
      });

      results.employees.forEach((e) => {
         items.push({
            title: e.name,
            subtitle: `${e.customId || ""} • ${e.role?.name || "Staff"} • ${e.email}`,
            tag: "Employee",
            url: `/admin/user?user=${e.customId || e.id}`,
         });
      });

      results.categories.forEach((cat) => {
         items.push({
            title: cat.name,
            subtitle: cat.customId || "Category",
            tag: "Category",
            url: `/admin/categories`,
         });
      });

      results.units.forEach((u) => {
         items.push({
            title: u.name,
            subtitle: u.customId || "Unit",
            tag: "Unit",
            url: `/admin/unit`,
         });
      });

      results.suppliers.forEach((s) => {
         items.push({
            title: s.name,
            subtitle: `${s.customId || ""} • ${s.phone || ""}`,
            tag: "Supplier",
            url: `/admin/suppliers?supplier=${s.customId || s.id}`,
         });
      });

      results.purchases.forEach((pu) => {
         items.push({
            title: pu.invoice || pu.customId,
            subtitle: `${pu.supplier?.name || "Supplier"} • ${formatCurrency(Number(pu.total || 0))}`,
            tag: "Purchase",
            url: `/admin/purchase?purchase=${pu.customId || pu.id}`,
         });
      });

      results.expenses.forEach((ex) => {
         items.push({
            title: ex.type,
            subtitle: `${ex.customId || ""} • ${formatCurrency(Number(ex.amount || 0))} • ${ex.note || ""}`,
            tag: "Expense",
            url: `/admin/expense?expense=${ex.customId || ex.id}`,
         });
      });

      results.assets.forEach((ast) => {
         items.push({
            title: ast.name,
            subtitle: `${ast.customId || ""} • ${ast.category || ""} • ${formatCurrency(Number(ast.value || 0))}`,
            tag: "Asset",
            url: `/admin/assets?asset=${ast.customId || ast.id}`,
         });
      });

      results.settings.forEach((st) => {
         items.push({
            title: st.name,
            subtitle: "Application Settings",
            tag: "Settings",
            url: `/admin/settings?tab=${st.tab}`,
         });
      });

      return items;
   }, [results, formatCurrency]);

   const handleSelect = (url: string) => {
      setOpen(false);
      setQuery("");
      router.push(url);
   };

   const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!open || flatItems.length === 0) return;

      if (e.key === "ArrowDown") {
         e.preventDefault();
         setSelectedIndex((prev) => (prev + 1) % flatItems.length);
      } else if (e.key === "ArrowUp") {
         e.preventDefault();
         setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      } else if (e.key === "Enter") {
         e.preventDefault();
         if (flatItems[selectedIndex]) {
            handleSelect(flatItems[selectedIndex].url);
         }
      } else if (e.key === "Escape") {
         setOpen(false);
      }
   };

   return (
      <ClickAwayListener onClickAway={() => setOpen(false)} disableReactTree>
         <Box sx={{ position: "relative", width: "100%" }}>
            {/* Search Field matching original layout */}
            <TextField
               variant="outlined"
               size="small"
               placeholder="Search..."
               value={query}
               inputRef={inputRef}
               onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(Boolean(e.target.value));
                  setSelectedIndex(0);
               }}
               onFocus={() => query && setOpen(true)}
               onKeyDown={handleKeyDown}
               sx={{
                  width: 300,
               }}
            />

            {/* Suggestions Box matching original layout */}
            {open && (
               <Box
                  sx={{
                     position: isMobile ? "fixed" : "absolute",
                     top: isMobile
                        ? inputRef.current?.getBoundingClientRect().bottom ?? 56
                        : "100%",
                     left: 0,
                     width: isMobile ? "100vw" : 380,
                     bgcolor: "background.paper",
                     boxShadow: 3,
                     borderRadius: isMobile ? 0 : 1,
                     zIndex: 1200,
                     mt: isMobile ? 0 : 1,
                     maxHeight: "50vh",
                     overflowY: "auto",
                  }}
               >
                  <CustomBox>
                     {loading && (
                        <Box p={2} textAlign="center">
                           <CircularProgress size={20} />
                        </Box>
                     )}

                     {!loading && totalMatches === 0 && (
                        <Box p={2} textAlign="center">
                           <Typography variant="body2" color="text.secondary">
                              No results found for &ldquo;{query}&rdquo;
                           </Typography>
                        </Box>
                     )}

                     {!loading &&
                        flatItems.map((item, idx) => {
                           const isSelected = idx === selectedIndex;
                           return (
                              <ListItemButton
                                 key={`${item.tag}-${item.title}-${idx}`}
                                 selected={isSelected}
                                 onMouseDown={() => handleSelect(item.url)}
                                 sx={{
                                    px: 2,
                                    py: 1,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                 }}
                              >
                                 <ListItemText
                                    primary={item.title}
                                    secondary={item.subtitle}
                                    primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                                    secondaryTypographyProps={{ variant: "caption", color: "text.secondary" }}
                                 />
                                 <Chip
                                    label={item.tag}
                                    size="small"
                                    variant="outlined"
                                    color={
                                       item.tag === "Order"
                                          ? "info"
                                          : item.tag === "Product"
                                          ? "primary"
                                          : item.tag === "Customer"
                                          ? "success"
                                          : item.tag === "Employee"
                                          ? "warning"
                                          : "default"
                                    }
                                    sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                                 />
                              </ListItemButton>
                           );
                        })}
                  </CustomBox>
               </Box>
            )}
         </Box>
      </ClickAwayListener>
   );
}
