"use client";

import React from "react";
import {
   Grid,
   MenuItem,
   Stack,
   TextField,
   Typography,
   Box,
   FormControlLabel,
   Switch,
   Card,
   CardContent,
} from "@mui/material";

interface ProductsTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
   onConfigChange: (key: string, value: any) => void;
}

const standardUnits = ["Pcs", "Kg", "Box", "Ltr", "Gram", "Meter", "Pair", "Set"];

export default function ProductsTab({ values, onChange, onConfigChange }: ProductsTabProps) {
   const customConfig = values.customConfig || {};

   return (
      <Stack spacing={3}>
         <Box>
            <Typography variant="h6" fontWeight={600}>
               Products & Inventory Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Configure stock tracking thresholds, SKU & barcode generation, and default catalog properties.
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

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  select
                  fullWidth
                  label="Default Unit of Measurement"
                  size="small"
                  value={customConfig.defaultUnit || "Pcs"}
                  onChange={(e) => onConfigChange("defaultUnit", e.target.value)}
                  helperText="Initial unit selected when creating new items"
               >
                  {standardUnits.map((u) => (
                     <MenuItem key={u} value={u}>
                        {u}
                     </MenuItem>
                  ))}
               </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <TextField
                  fullWidth
                  label="Default Product Category"
                  size="small"
                  value={customConfig.defaultCategory || "General"}
                  onChange={(e) => onConfigChange("defaultCategory", e.target.value)}
                  placeholder="General"
                  helperText="Fallback category for uncategorized imports"
               />
            </Grid>
         </Grid>

         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               SKU, Barcode & Stock Automation
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Automate product identifiers and inventory management workflows.
            </Typography>
         </Box>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <Switch
                              checked={Boolean(values.autoGenerateSku)}
                              onChange={(e) => onChange("autoGenerateSku", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Auto-generate Product SKU
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Automatically generate unique SKU codes (e.g. PRD-82914) on product creation
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
                              checked={Boolean(values.autoGenerateBarcode)}
                              onChange={(e) => onChange("autoGenerateBarcode", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Auto-generate EAN/UPC Barcode
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Automatically generate standard scannable 12-digit barcodes for new items
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
                              checked={customConfig.autoDeductStock ?? true}
                              onChange={(e) => onConfigChange("autoDeductStock", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Real-time Stock Deduction
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Instantly decrement product inventory immediately upon order confirmation
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
                              checked={customConfig.enableBarcodeScannerQuickAdd ?? true}
                              onChange={(e) => onConfigChange("enableBarcodeScannerQuickAdd", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 USB / Bluetooth Scanner Quick-Add
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Add item to order cart immediately when a barcode scanner fires an enter key
                              </Typography>
                           </Box>
                        }
                     />
                  </CardContent>
               </Card>
            </Grid>
         </Grid>
      </Stack>
   );
}
