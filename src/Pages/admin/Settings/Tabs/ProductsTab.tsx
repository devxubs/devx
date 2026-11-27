"use client";

import React, { useEffect, useState } from "react";
import {
   Grid,
   Stack,
   TextField,
   Typography,
   Box,
   FormControlLabel,
   Switch,
   Card,
   CardContent,
   MenuItem,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import SectionResetButton from "./SectionResetButton";

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
            {/* RP-7 (X2): clearing the keys restores the audited
                Phase 1 defaults (resolvers supply them when a key
                is unset): warehouse none, decrease on CONFIRMED,
                stock-out ordering off, courier stock check off,
                variation required on. */}
            <SectionResetButton
               section="Product Settings"
               onReset={() => {
                  onConfigChange("defaultWarehouseId", undefined);
                  onConfigChange("decreaseStockOn", undefined);
                  onConfigChange("stockOutProductCanOrder", undefined);
                  onConfigChange("outOfStockCanSubmitCourier", undefined);
                  onConfigChange("variationSelectOnOrder", undefined);
               }}
            />
         </Stack>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.75 }}>
                  Default Warehouse
               </Typography>
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
               <Typography variant="caption" color="text.secondary">
                  Warehouse used as the default for stock operations.
               </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <TextField
                  select
                  fullWidth
                  label="Decrease Stock On"
                  size="small"
                  value={decreaseStockOn}
                  onChange={(e) => onConfigChange("decreaseStockOn", e.target.value)}
                  helperText="Stock is deducted when an order reaches this status."
               >
                  {DECREASE_STOCK_ON_OPTIONS.map((o) => (
                     <MenuItem key={o.value} value={o.value}>
                        {o.label}
                     </MenuItem>
                  ))}
               </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
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
                  </CardContent>
               </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
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
                  </CardContent>
               </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
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
                  </CardContent>
               </Card>
            </Grid>
         </Grid>

         <Box>
            <Typography variant="h6" fontWeight={600}>
               Products & Inventory Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Configure stock tracking thresholds and SKU & barcode generation.
            </Typography>
         </Box>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  fullWidth
                  label="Default Low Stock Threshold"
                  type="number"
                  size="small"
                  value={values.defaultLowStockAlert ?? 10}
                  onChange={(e) => onChange("defaultLowStockAlert", parseInt(e.target.value) || 0)}
                  helperText="Items with inventory below this quantity trigger low-stock alerts"
                  inputProps={{ min: 1, step: 1 }}
               />
            </Grid>


         </Grid>

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
