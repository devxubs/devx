"use client";

import React, { useEffect, useState } from "react";
import {
   Stack,
   TextField,
   Typography,
   Box,
   FormControlLabel,
   Switch,
   MenuItem,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import SettingsField from "./SettingsField";

interface ProductsTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
   onConfigChange: (key: string, value: any) => void;
}

// Phase 1 Product Settings: the order statuses at which stock
// deduction can be set to begin. Terminal/restore statuses
// (CANCELLED, FAILED) and HOLD are not deduction points, so they
// are not offered. Default CONFIRMED (owner-specified).
const DECREASE_STOCK_ON_OPTIONS = [
   { value: "PENDING", label: "Pending" },
   { value: "CONFIRMED", label: "Confirmed" },
   { value: "PROCESSING", label: "Processing" },
   { value: "SHIPPED", label: "Shipped" },
   { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
   { value: "DELIVERED", label: "Delivered" },
   { value: "COMPLETED", label: "Completed" },
];

export default function ProductsTab({ values, onChange, onConfigChange }: ProductsTabProps) {
   // Phase 1 Product Settings persist into customConfig (see
   // src/lib/customConfig.ts). Defaults below mirror the behaviour
   // audited in the existing code, so a first save changes nothing:
   // out-of-stock orders are rejected by the stock engine today,
   // courier submission has no stock gate today, and variant-less
   // lines for variable products are rejected today.
   const config = values.customConfig || {};
   const stockOutProductCanOrder = Boolean(config.stockOutProductCanOrder ?? false);
   const outOfStockCanSubmitCourier = Boolean(config.outOfStockCanSubmitCourier ?? true);
   const variationSelectOnOrder = Boolean(config.variationSelectOnOrder ?? true);
   const decreaseStockOn = config.decreaseStockOn || "CONFIRMED";

   // Default Warehouse options come from the warehouses API (the
   // same endpoint the Stock page uses). Until a value is saved,
   // the field shows the warehouse currently flagged isDefault.
   const [warehouses, setWarehouses] = useState<any[]>([]);
   useEffect(() => {
      let cancelled = false;
      fetch("/api/warehouses")
         .then((r) => r.json())
         .then((data) => {
            if (!cancelled && Array.isArray(data)) {
               setWarehouses(data.filter((w: any) => !w.isDeleted));
            }
         })
         .catch(() => {});
      return () => {
         cancelled = true;
      };
   }, []);
   const flaggedDefaultWarehouse = warehouses.find((w) => w.isDefault);
   // Phase 1C: a stored defaultWarehouseId that no longer resolves
   // (warehouse deleted since the save) must not mask the flagged
   // default — fall back to it for display.
   const storedWarehouse = config.defaultWarehouseId
      ? warehouses.find((w) => w.id === config.defaultWarehouseId)
      : undefined;
   const selectedWarehouse = storedWarehouse ?? flaggedDefaultWarehouse ?? null;

   return (
      <Stack spacing={3}>
         {/* ── Phase 1: Product Settings ─────────────────────── */}
         <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box>
               <Typography variant="h6" fontWeight={600}>
                  Product Settings
               </Typography>
               <Typography variant="body2" color="text.secondary">
                  Default warehouse and order, stock and courier behaviour for products.
               </Typography>
            </Box>
            {/* Phase 1 defaults are supplied by the resolvers
                when a key is unset: warehouse none, decrease on
                CONFIRMED, stock-out ordering off, courier stock
                check off, variation required on. (The RP-7 X2
                per-section reset button was removed in the
                global reset-actions removal.) */}
         </Stack>

         {/* Global field standard: one field per row, label
             above, helper below; switches are plain rows with
             an external label and explanatory text. */}
         <Stack spacing={2.5}>
            <SettingsField
               label="Default Warehouse"
               helper="Warehouse used as the default for stock operations."
            >
               <CustomAutocomplete
                  placeholder="Search warehouse..."
                  arrow
                  size="small"
                  options={warehouses}
                  value={selectedWarehouse}
                  onChange={(val: any) =>
                     onConfigChange("defaultWarehouseId", val?.id || "")
                  }
                  getOptionLabel={(option: any) =>
                     typeof option === "string" ? option : option?.name || ""
                  }
                  isOptionEqualToValue={(option: any, value: any) =>
                     option?.id === value?.id
                  }
               />
            </SettingsField>

            <SettingsField
               label="Decrease Stock On"
               helper="Stock is deducted when an order reaches this status."
            >
               <TextField
                  select
                  fullWidth
                  size="small"
                  value={decreaseStockOn}
                  onChange={(e) => onConfigChange("decreaseStockOn", e.target.value)}
               >
                  {DECREASE_STOCK_ON_OPTIONS.map((o) => (
                     <MenuItem key={o.value} value={o.value}>
                        {o.label}
                     </MenuItem>
                  ))}
               </TextField>
            </SettingsField>

            <FormControlLabel
               control={
                  <Switch
                     checked={stockOutProductCanOrder}
                     onChange={(e) =>
                        onConfigChange("stockOutProductCanOrder", e.target.checked)
                     }
                     color="primary"
                  />
               }
               label={
                  <Box>
                     <Typography variant="subtitle2" fontWeight={600}>
                        Allow ordering out-of-stock products
                     </Typography>
                     <Typography variant="caption" color="text.secondary">
                        Allow orders to be placed for products that are out of stock
                     </Typography>
                  </Box>
               }
            />

            <FormControlLabel
               control={
                  <Switch
                     checked={outOfStockCanSubmitCourier}
                     onChange={(e) =>
                        onConfigChange("outOfStockCanSubmitCourier", e.target.checked)
                     }
                     color="primary"
                  />
               }
               label={
                  <Box>
                     <Typography variant="subtitle2" fontWeight={600}>
                        Out Of Stock can Submit Courier
                     </Typography>
                     <Typography variant="caption" color="text.secondary">
                        Allow orders with out-of-stock products to be submitted to the courier
                     </Typography>
                  </Box>
               }
            />

            <FormControlLabel
               control={
                  <Switch
                     checked={variationSelectOnOrder}
                     onChange={(e) =>
                        onConfigChange("variationSelectOnOrder", e.target.checked)
                     }
                     color="primary"
                  />
               }
               label={
                  <Box>
                     <Typography variant="subtitle2" fontWeight={600}>
                        Variation Select on Order
                     </Typography>
                     <Typography variant="caption" color="text.secondary">
                        Require a variation to be selected when ordering variable products
                     </Typography>
                  </Box>
               }
            />
         </Stack>

         <Box>
            <Typography variant="h6" fontWeight={600}>
               Products & Inventory Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Configure stock tracking thresholds and SKU & barcode generation.
            </Typography>
         </Box>

         <SettingsField
            label="Default Low Stock Threshold"
            helper="Items with inventory below this quantity trigger low-stock alerts."
         >
            <TextField
               fullWidth
               type="number"
               size="small"
               value={values.defaultLowStockAlert ?? 10}
               onChange={(e) => onChange("defaultLowStockAlert", parseInt(e.target.value) || 0)}
               inputProps={{ min: 1, step: 1 }}
               placeholder="10"
            />
         </SettingsField>

         {/* P2-20: "Default Unit of Measurement" and "Default Product
             Category" (customConfig.defaultUnit / defaultCategory)
             were removed — the product form never read them. The
             "Real-time Stock Deduction" and "Scanner Quick-Add"
             toggles were also write-only (stock always deducts on
             order save; the scanner flow does not read a setting)
             and have been removed.
             RP-6 (D3/D4): the "SKU, Barcode & Stock Automation"
             section (Auto-generate Product SKU / Auto-generate
             EAN-UPC Barcode toggles) was removed the same way —
             product create never read autoGenerateSku or
             autoGenerateBarcode. The columns and their stored
             values are untouched. */}
      </Stack>
   );
}
