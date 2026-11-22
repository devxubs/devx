"use client";

// Barcode label printing (Phase 4, §4.1).
//
// Queue products (and their variants) and print shelf/packaging
// labels through the app's print portal. Each label encodes the
// item's barcode when one is set, otherwise its SKU — both resolve
// through GET /api/products/barcode, so every printed label is
// scannable in the order form. Prices come from the live product
// data (sale price when set, else regular price).

import {
   Alert,
   Box,
   Button,
   IconButton,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useRef, useState } from "react";
import CustomModal from "@src/components/Modal";
import Icon from "@src/components/Icon";
import Barcode from "@src/components/Barcode";
import { usePrint } from "@src/components/TablePrintDocument/PrintPortal";
import type { PrintLabelItem } from "@src/components/TablePrintDocument/TablePrintDocument";
import { useSettings } from "@src/lib/settingsContext";

interface LabelQueueItem extends PrintLabelItem {
   key: string;
}

const num = (v: any) => {
   const n = Number(v);
   return Number.isNaN(n) ? 0 : n;
};

export function itemsForProduct(product: any, formatPrice: (n: number) => string): LabelQueueItem[] {
   const items: LabelQueueItem[] = [];
   const variants = Array.isArray(product.variants) ? product.variants : [];
   const isVariable = product.productType === "Variable" && variants.length > 0;
   if (!isVariable) {
      items.push({
         key: `p:${product.id}`,
         name: product.productName || "Product",
         priceLabel: formatPrice(num(product.salePrice ?? product.regularPrice)),
         code: product.barcode || product.productSku || product.productCode || "",
         copies: 1,
      });
   }
   for (const v of variants) {
      items.push({
         key: `v:${v.id}`,
         name: product.productName || "Product",
         subName: v.variantName || "",
         priceLabel: formatPrice(num(v.salePrice ?? v.regularPrice)),
         code: v.barcode || v.sku || "",
         copies: 1,
      });
   }
   return items.filter((i) => i.code);
}

interface BarcodeLabelsModalProps {
   open: boolean;
   onClose: () => void;
   /** Products selected in the Products table when the modal opens. */
   initialProducts?: any[];
}

const BarcodeLabelsModal: React.FC<BarcodeLabelsModalProps> = ({
   open,
   onClose,
   initialProducts = [],
}) => {
   const { printDocument } = usePrint();
   const { settings, formatCurrency } = useSettings();
   const formatPrice = (n: number) => formatCurrency(n);
   const [queue, setQueue] = useState<LabelQueueItem[]>([]);
   const [query, setQuery] = useState("");
   const [results, setResults] = useState<any[]>([]);
   const [searching, setSearching] = useState(false);
   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const seededRef = useRef(false);

   // Seed the queue from the table selection once per opening.
   useEffect(() => {
      if (open && !seededRef.current) {
         seededRef.current = true;
         setQueue(initialProducts.flatMap((p) => itemsForProduct(p, formatPrice)));
      }
      if (!open) {
         seededRef.current = false;
         setQuery("");
         setResults([]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [open ]);

   useEffect(() => {
      if (!open) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const q = query.trim();
      if (!q) {
         setResults([]);
         return;
      }
      debounceRef.current = setTimeout(async () => {
         setSearching(true);
         try {
            const res = await fetch(
               `/api/products?search=${encodeURIComponent(q)}&limit=20`,
            );
            const data = res.ok ? await res.json() : null;
            setResults(Array.isArray(data?.products) ? data.products : []);
         } catch {
            setResults([]);
         } finally {
            setSearching(false);
         }
      }, 300);
   }, [query, open]);

   const addProduct = (product: any) => {
      const items = itemsForProduct(product, formatPrice);
      setQueue((prev) => {
         const existing = new Set(prev.map((i) => i.key));
         return [...prev, ...items.filter((i) => !existing.has(i.key))];
      });
   };

   const totalLabels = useMemo(
      () => queue.reduce((sum, i) => sum + (Math.max(1, Math.floor(i.copies) || 1)), 0),
      [queue],
   );

   const handlePrint = () => {
      if (queue.length === 0) return;
      printDocument({
         title: "Product Barcode Labels",
         selectedRecords: [],
         columns: [],
         settings,
         isLabelSheet: true,
         labels: queue,
      });
      onClose();
   };

   return (
      <CustomModal
         open={open}
         onClose={onClose}
         title="Print Barcode Labels"
         sx={{ width: { xs: "95%", sm: "85%", md: 760 } }}
      >
         <Stack spacing={2} sx={{ p: 3 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
               Labels encode the product&apos;s barcode when one is set, otherwise
               its SKU. Both scan correctly in the order form&apos;s product search.
            </Alert>

            <TextField
               size="small"
               label="Add products"
               placeholder="Search by name, SKU or barcode…"
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               fullWidth
            />
            {searching && (
               <Typography variant="caption" color="text.secondary">
                  Searching…
               </Typography>
            )}
            {results.length > 0 && (
               <Stack
                  spacing={0.5}
                  sx={{
                     maxHeight: 180,
                     overflowY: "auto",
                     border: 1,
                     borderColor: "divider",
                     borderRadius: 1,
                     p: 1,
                  }}
               >
                  {results.map((p) => (
                     <Stack
                        key={p.id}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                     >
                        <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                           {p.productName}
                           <Typography component="span" variant="caption" color="text.secondary">
                              {" "}
                              · {p.productSku || p.productCode || "—"}
                           </Typography>
                        </Typography>
                        <Button
                           size="small"
                           variant="outlined"
                           onClick={() => addProduct(p)}
                           sx={{ textTransform: "none" }}
                        >
                           Add
                        </Button>
                     </Stack>
                  ))}
               </Stack>
            )}

            {queue.length === 0 ? (
               <Typography variant="body2" color="text.secondary">
                  No labels queued yet. Search above, or select products in the
                  table before opening this dialog.
               </Typography>
            ) : (
               <Stack spacing={1.5}>
                  {queue.map((item) => (
                     <Stack
                        key={item.key}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{
                           border: 1,
                           borderColor: "divider",
                           borderRadius: 1,
                           p: 1.5,
                        }}
                     >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                           <Typography variant="body2" fontWeight={600} noWrap>
                              {item.name}
                              {item.subName ? ` — ${item.subName}` : ""}
                           </Typography>
                           <Typography variant="caption" color="text.secondary">
                              {item.priceLabel} · code: {item.code}
                           </Typography>
                           <Box sx={{ mt: 0.5, overflowX: "auto" }}>
                              <Barcode value={item.code} height={26} moduleWidth={1.1} showText={false} />
                           </Box>
                        </Box>
                        <TextField
                           size="small"
                           type="number"
                           label="Copies"
                           value={item.copies}
                           onChange={(e) =>
                              setQueue((prev) =>
                                 prev.map((i) =>
                                    i.key === item.key
                                       ? { ...i, copies: Math.max(1, Math.floor(Number(e.target.value) || 1)) }
                                       : i,
                                 ),
                              )
                           }
                           inputProps={{ min: 1, max: 200 }}
                           sx={{ width: 90 }}
                        />
                        <IconButton
                           size="small"
                           color="error"
                           onClick={() =>
                              setQueue((prev) => prev.filter((i) => i.key !== item.key))
                           }
                        >
                           <Icon icon="solar:trash-bin-trash-linear" />
                        </IconButton>
                     </Stack>
                  ))}
               </Stack>
            )}

            <Stack direction="row" justifyContent="space-between" alignItems="center">
               <Typography variant="body2" color="text.secondary">
                  {queue.length} item(s) · {totalLabels} label(s)
               </Typography>
               <Stack direction="row" spacing={1}>
                  <Button onClick={onClose} sx={{ textTransform: "none" }}>
                     Cancel
                  </Button>
                  <Button
                     variant="contained"
                     disabled={queue.length === 0}
                     onClick={handlePrint}
                     startIcon={<Icon icon="solar:printer-linear" />}
                     sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                     Print Labels
                  </Button>
               </Stack>
            </Stack>
         </Stack>
      </CustomModal>
   );
};

export default BarcodeLabelsModal;
