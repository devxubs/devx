"use client";

import React, { useMemo } from "react";
import { Button, Chip, Stack, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import Icon from "@src/components/Icon";
import type { StockProduct } from "./index";

// Phase 3A (3.3): low-stock restocking. A product is low when
// quantity <= lowStockAlert — the same rule the Dashboard and Product
// list use. Suggested order qty is a simple, labelled rule:
// (alert threshold − current stock + 1), i.e. restock to just above
// the alert level. "Start draft purchase" opens the existing Purchase
// create form PREFILLED (supplier + this line) for manual review —
// nothing is created or submitted automatically.
const LowStockTab = ({ products }: { products: StockProduct[] }) => {
   const router = useRouter();

   const rows = useMemo(
      () =>
         products
            .filter((p) => p.quantity <= p.lowStockAlert)
            .map((p) => ({
               id: p.id,
               productName: p.productName,
               productSku: p.productSku,
               quantity: p.quantity,
               threshold: p.lowStockAlert,
               suggestedQty: Math.max(p.lowStockAlert - p.quantity + 1, 1),
               supplierName: p.primarySupplier?.name || null,
               isVariable: p.productType === "variable",
               product: p,
            })),
      [products],
   );

   const startDraftPurchase = (row: any) => {
      const p: StockProduct = row.product;
      const prefill = {
         supplierId: p.primarySupplier?.id || null,
         supplierName: p.primarySupplier?.name || "",
         items: [
            {
               productId: p.id,
               name: p.productName,
               code: p.productSku || null,
               quantity: row.suggestedQty,
               price: p.costPrice ?? 0,
               variantId: null,
               variantName: null,
            },
         ],
      };
      router.push(
         `/admin/purchase/publish?prefill=${encodeURIComponent(JSON.stringify(prefill))}`,
      );
   };

   const columns: ColumnConfig[] = [
      {
         field: "productName",
         headerName: "Product",
         flex: 1,
         renderCell: (params: any) => (
            <Stack spacing={0} sx={{ py: 0.5 }}>
               <Typography variant="body2">{params.row.productName}</Typography>
               <Typography variant="caption" color="text.secondary">
                  SKU: {params.row.productSku}
                  {params.row.isVariable ? " · Variable product" : ""}
               </Typography>
            </Stack>
         ),
      },
      {
         field: "quantity",
         headerName: "Current Qty",
         width: 120,
         renderCell: (params: any) => (
            <Chip
               size="small"
               label={params.row.quantity}
               color={params.row.quantity <= 0 ? "error" : "warning"}
            />
         ),
      },
      { field: "threshold", headerName: "Alert Threshold", width: 140 },
      { field: "suggestedQty", headerName: "Suggested Order Qty", width: 160 },
      {
         field: "supplierName",
         headerName: "Primary Supplier",
         flex: 1,
         renderCell: (params: any) =>
            params.row.supplierName || (
               <Typography variant="body2" color="text.secondary">
                  Not set — pick in the form
               </Typography>
            ),
      },
      {
         field: "actions",
         headerName: "",
         width: 190,
         renderCell: (params: any) => (
            <Button
               size="small"
               variant="outlined"
               color="primary"
               startIcon={<Icon icon="solar:cart-plus-bold-duotone" />}
               onClick={() => startDraftPurchase(params.row)}
            >
               Start Draft Purchase
            </Button>
         ),
      },
   ];

   return (
      <Stack spacing={2}>
         <Typography variant="body2" color="text.secondary">
            Products at or below their alert threshold. Suggested qty =
            threshold − current stock + 1 (restock to just above the alert
            level). Draft purchases open prefilled for your review — they
            are never created automatically. Variable products need their
            variant picked in the purchase form.
         </Typography>
         <CustomTable
            rows={rows}
            columns={columns}
            canPrint={false}
            canExport={false}
            hideSelectionToolbar
            showSelectionIndicators={false}
            hideSelectionActions
         />
      </Stack>
   );
};

export default LowStockTab;
