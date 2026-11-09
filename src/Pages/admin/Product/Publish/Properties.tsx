"use client";

import {
   Stack,
   Typography,
   TextField,
   Grid,
   IconButton,
   Collapse,
   Paper,
   Divider,
   Switch,
   FormControlLabel,
   Box,
   Button,
   Table,
   TableBody,
   TableCell,
   TableContainer,
   TableHead,
   TableRow,
   Chip,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import { Controller, useWatch } from "react-hook-form";
import Icon from "@src/components/Icon";
import React, { useState, useEffect } from "react";

interface PropertiesProps {
   formControl: any;
   errors: any;
   setValue?: any;
   watchType?: string;
   variants?: any[];
   attributes?: any[];
   onAddAttribute?: (name: string) => void;
   onRemoveAttribute?: (index: number) => void;
   onAddAttributeValue?: (attrIndex: number, value: string) => void;
   onRemoveAttributeValue?: (attrIndex: number, valIndex: number) => void;
   onGenerateCombinations?: () => void;
   onUpdateVariant?: (index: number, updates: any) => void;
   onRemoveVariant?: (index: number) => void;
   onAddManualVariant?: () => void;
   bundleItems?: any[];
   onChangeBundleItems?: (items: any[]) => void;
   currentProductId?: string | null;
}

const Properties = ({
   formControl,
   errors,
   setValue,
   watchType,
   variants = [],
   attributes = [],
   onAddAttribute,
   onRemoveAttribute,
   onAddAttributeValue,
   onRemoveAttributeValue,
   onGenerateCombinations,
   onUpdateVariant,
   onRemoveVariant,
   onAddManualVariant,
   bundleItems = [],
   onChangeBundleItems,
   currentProductId,
}: PropertiesProps) => {
   const [expanded, setExpanded] = useState(true);
   const [type, setType] = useState(watchType || "Simple");

   // Catalog data
   const [categories, setCategories] = useState<string[]>([]);
   const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
   const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
   const [availableProducts, setAvailableProducts] = useState<any[]>([]);

   // Variant builder local inputs
   const [newAttrName, setNewAttrName] = useState("");
   const [attrValueInputs, setAttrValueInputs] = useState<Record<number, string>>({});

   // Bundle picker local inputs
   const [selectedComponentId, setSelectedComponentId] = useState<string>("");
   const [componentQty, setComponentQty] = useState<number>(1);
   const [componentPrice, setComponentPrice] = useState<number>(0);

   const isBatchEnabled = useWatch({ control: formControl, name: "hasBatchTracking" });

   // Sync type from prop
   useEffect(() => {
      if (watchType) setType(watchType);
   }, [watchType]);

   // Fetch auxiliary data
   useEffect(() => {
      let isMounted = true;
      fetch("/api/categories")
         .then((r) => (r.ok ? r.json() : []))
         .then((d) => {
            if (!isMounted) return;
            const list = Array.isArray(d) ? d : d.categories || [];
            setCategories(list.map((c: any) => c.name).filter(Boolean));
         })
         .catch(() => {});

      fetch("/api/warehouses")
         .then((r) => (r.ok ? r.json() : []))
         .then((d) => {
            if (!isMounted) return;
            setWarehouses(Array.isArray(d) ? d : []);
         })
         .catch(() => {});

      fetch("/api/suppliers")
         .then((r) => (r.ok ? r.json() : []))
         .then((d) => {
            if (!isMounted) return;
            const list = Array.isArray(d) ? d : d.suppliers || [];
            setSuppliers(list.map((s: any) => ({ id: s.id, name: s.name || s.companyName || s.id })));
         })
         .catch(() => {});

      fetch("/api/products")
         .then((r) => (r.ok ? r.json() : []))
         .then((d) => {
            if (!isMounted) return;
            const prods = Array.isArray(d) ? d : d.products || [];
            setAvailableProducts(prods.filter((p: any) => p.id !== currentProductId));
         })
         .catch(() => {});

      return () => {
         isMounted = false;
      };
   }, [currentProductId]);

   // Add component to bundle
   const handleAddBundleItem = () => {
      if (!selectedComponentId) return;
      const comp = availableProducts.find((p) => p.id === selectedComponentId);
      if (!comp) return;

      const newItem = {
         componentProductId: comp.id,
         componentProductName: comp.productName,
         componentSku: comp.productSku || comp.productCode,
         quantity: Number(componentQty) || 1,
         unitPrice: Number(componentPrice) >= 0 ? Number(componentPrice) : Number(comp.regularPrice) || 0,
      };

      onChangeBundleItems?.([...bundleItems, newItem]);
      setSelectedComponentId("");
      setComponentQty(1);
      setComponentPrice(0);
   };

   const handleRemoveBundleItem = (index: number) => {
      onChangeBundleItems?.(bundleItems.filter((_, i) => i !== index));
   };

   return (
      <Paper sx={{ borderRadius: 1.5, boxShadow: 15, overflow: "hidden" }}>
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            p={3}
         >
            <Stack spacing={1}>
               <Typography variant="body1" fontSize={18} color="textPrimary">
                  Properties
               </Typography>
               <Typography
                  variant="body2"
                  fontSize={13}
                  fontWeight={400}
                  color="textSecondary"
               >
                  Additional functions and attributes...
               </Typography>
            </Stack>
            <IconButton onClick={() => setExpanded(!expanded)}>
               <Icon
                  style={{
                     transform: `rotate(${expanded ? 90 : 0}deg)`,
                     transition: "all 0.2s",
                  }}
                  icon={"solar:alt-arrow-right-broken"}
               />
            </IconButton>
         </Stack>
         <Collapse in={expanded}>
            <Grid container spacing={3} p={2}>
               {/* Product code */}
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Product code
                     </Typography>
                     <Controller
                        name="productCode"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              error={!!errors.productCode}
                              helperText={
                                 errors.productCode?.message ||
                                 "Leave blank for auto sequential ID (e.g. PROD_6)"
                              }
                              label="Product code"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Product sku */}
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Product sku
                     </Typography>
                     <Controller
                        name="productSku"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              error={!!errors.productSku}
                              helperText={
                                 errors.productSku?.message ||
                                 "Leave blank for auto sequential SKU"
                              }
                              label="Product sku"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Barcode */}
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Barcode (ISBN, UPC, EAN-13)
                     </Typography>
                     <Controller
                        name="barcode"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              error={!!errors.barcode}
                              helperText={errors.barcode?.message}
                              label="Barcode"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Status */}
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5} flex={1}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Status
                     </Typography>
                     <Controller
                        name="status"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              {...field}
                              value={field.value || "ACTIVE"}
                              onChange={(val: any) => field.onChange(val)}
                              error={!!errors.status}
                              helperText={errors.status?.message}
                              arrow
                              label="Status"
                              options={["ACTIVE", "INACTIVE", "DRAFT"]}
                              getOptionLabel={(option) => option?.toString() || ""}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Low stock alert */}
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Low stock alert
                     </Typography>
                     <Controller
                        name="lowStockAlert"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              error={!!errors.lowStockAlert}
                              helperText={errors.lowStockAlert?.message}
                              label="Low stock alert"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Quantity */}
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Quantity
                     </Typography>
                     <Controller
                        name="quantity"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? 0}
                              error={!!errors.quantity}
                              helperText={
                                 type === "Variable"
                                    ? "Total aggregated from variant matrix"
                                    : errors.quantity?.message
                              }
                              label="Quantity"
                              variant="outlined"
                              type="number"
                              disabled={type === "Variable"}
                              sx={{
                                 "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                    {
                                       display: "none",
                                    },
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Category */}
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5} flex={1}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Category
                     </Typography>
                     <Controller
                        name="category"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              {...field}
                              value={field.value || ""}
                              onChange={(val: any) => field.onChange(val)}
                              error={!!errors.category}
                              helperText={errors.category?.message}
                              arrow
                              label="Category"
                              options={
                                 categories.length > 0
                                    ? categories
                                    : ["Electronics", "Fashion", "Grocery", "Health"]
                              }
                              getOptionLabel={(option) => option?.toString() || ""}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Product type */}
               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5} flex={1}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Product type
                     </Typography>
                     <Controller
                        name="productType"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              {...field}
                              value={field.value || "Simple"}
                              onChange={(val: any) => {
                                 field.onChange(val);
                                 setType(val);
                              }}
                              error={!!errors.productType}
                              helperText={errors.productType?.message}
                              arrow
                              label="Product type"
                              options={["Simple", "Variable", "Bundle", "Service", "Digital"]}
                              getOptionLabel={(option) => option?.toString() || ""}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Color & Unit (original multi-selects when not Simple or Variable) */}
               {type !== "Simple" && type !== "Variable" && (
                  <>
                     <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                        <Stack spacing={1.5} flex={1}>
                           <Typography
                              variant="h6"
                              fontSize={"13px!important"}
                              fontWeight={500}
                           >
                              Color
                           </Typography>
                           <Controller
                              name="color"
                              control={formControl}
                              render={({ field }) => (
                                 <CustomAutocomplete
                                    {...field}
                                    value={field.value || []}
                                    onChange={(val: any) => field.onChange(val)}
                                    error={!!errors.color}
                                    helperText={errors.color?.message}
                                    arrow
                                    label="Color"
                                    limitTags={1}
                                    options={[
                                       "Red",
                                       "Blue",
                                       "Green",
                                       "Yellow",
                                       "Black",
                                       "White",
                                       "Silver",
                                       "Gold",
                                       "Grey",
                                    ]}
                                    multiple
                                    getOptionLabel={(option) => option?.toString() || ""}
                                 />
                              )}
                           />
                        </Stack>
                     </Grid>
                     <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                        <Stack spacing={1.5} flex={1}>
                           <Typography
                              variant="h6"
                              fontSize={"13px!important"}
                              fontWeight={500}
                           >
                              Unit
                           </Typography>
                           <Controller
                              name="unit"
                              control={formControl}
                              render={({ field }) => (
                                 <CustomAutocomplete
                                    {...field}
                                    value={field.value || []}
                                    onChange={(val: any) => field.onChange(val)}
                                    error={!!errors.unit}
                                    helperText={errors.unit?.message}
                                    arrow
                                    label="Unit"
                                    limitTags={1}
                                    options={[
                                       "Piece",
                                       "Box",
                                       "Pack",
                                       "Carton",
                                       "Kg",
                                       "Gram",
                                       "Liter",
                                       "Meter",
                                    ]}
                                    multiple
                                    getOptionLabel={(option) => option?.toString() || ""}
                                 />
                              )}
                           />
                        </Stack>
                     </Grid>
                  </>
               )}

               {/* ================= CONDITIONAL: VARIABLE PRODUCT ATTRIBUTES & VARIANTS ================= */}
               {type === "Variable" && (
                  <Grid size={{ xs: 12 }}>
                     <Box sx={{ p: 2, border: "1px dashed", borderColor: "divider", borderRadius: 1.5, my: 1 }}>
                        <Stack spacing={2}>
                           <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="body1" fontWeight={600} color="textPrimary">
                                 Product Attributes & Variant Matrix
                              </Typography>
                              <Button
                                 size="small"
                                 variant="outlined"
                                 startIcon={<Icon icon="solar:refresh-linear" size="16px" />}
                                 onClick={onGenerateCombinations}
                              >
                                 Generate Combinations
                              </Button>
                           </Stack>

                           {/* Add Attribute Row */}
                           <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                              <TextField
                                 size="small"
                                 placeholder="e.g. Size, Color, Storage"
                                 value={newAttrName}
                                 onChange={(e) => setNewAttrName(e.target.value)}
                                 sx={{ flex: 1 }}
                              />
                              <Button
                                 size="small"
                                 variant="contained"
                                 onClick={() => {
                                    if (newAttrName.trim()) {
                                       onAddAttribute?.(newAttrName.trim());
                                       setNewAttrName("");
                                    }
                                 }}
                              >
                                 Add Attribute
                              </Button>
                           </Stack>

                           {/* Attributes List */}
                           {attributes.map((attr, attrIdx) => (
                              <Paper key={attrIdx} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                 <Stack spacing={1}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                       <Typography variant="body2" fontWeight={600}>
                                          {attr.name}
                                       </Typography>
                                       <IconButton
                                          size="small"
                                          onClick={() => onRemoveAttribute?.(attrIdx)}
                                          color="error"
                                       >
                                          <Icon icon="solar:trash-bin-trash-bold" size="16px" />
                                       </IconButton>
                                    </Stack>

                                    {/* Attribute values chips */}
                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                       {attr.values.map((val: any, valIdx: number) => (
                                          <Chip
                                             key={valIdx}
                                             size="small"
                                             label={val}
                                             onDelete={() => onRemoveAttributeValue?.(attrIdx, valIdx)}
                                          />
                                       ))}
                                    </Box>

                                    {/* Add value input */}
                                    <Stack direction="row" spacing={1}>
                                       <TextField
                                          size="small"
                                          placeholder={`Add ${attr.name} value`}
                                          value={attrValueInputs[attrIdx] || ""}
                                          onChange={(e) =>
                                             setAttrValueInputs({
                                                ...attrValueInputs,
                                                [attrIdx]: e.target.value,
                                             })
                                          }
                                          onKeyDown={(e) => {
                                             if (e.key === "Enter") {
                                                e.preventDefault();
                                                const v = attrValueInputs[attrIdx]?.trim();
                                                if (v) {
                                                   onAddAttributeValue?.(attrIdx, v);
                                                   setAttrValueInputs({
                                                      ...attrValueInputs,
                                                      [attrIdx]: "",
                                                   });
                                                }
                                             }
                                          }}
                                       />
                                       <Button
                                          size="small"
                                          variant="outlined"
                                          onClick={() => {
                                             const v = attrValueInputs[attrIdx]?.trim();
                                             if (v) {
                                                onAddAttributeValue?.(attrIdx, v);
                                                setAttrValueInputs({
                                                   ...attrValueInputs,
                                                   [attrIdx]: "",
                                                });
                                             }
                                          }}
                                       >
                                          Add
                                       </Button>
                                    </Stack>
                                 </Stack>
                              </Paper>
                           ))}

                           {/* Generated Variants Table */}
                           {variants.length > 0 && (
                              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320, mt: 1 }}>
                                 <Table size="small" stickyHeader>
                                    <TableHead>
                                       <TableRow>
                                          <TableCell>Variant</TableCell>
                                          <TableCell>SKU</TableCell>
                                          <TableCell>Price (৳)</TableCell>
                                          <TableCell>Cost (৳)</TableCell>
                                          <TableCell>Stock</TableCell>
                                          <TableCell align="center">Action</TableCell>
                                       </TableRow>
                                    </TableHead>
                                    <TableBody>
                                       {variants.map((v, idx) => (
                                          <TableRow key={idx}>
                                             <TableCell>
                                                <Typography variant="caption" fontWeight={600}>
                                                   {Object.entries(v.attributes || {})
                                                      .map(([k, val]) => `${k}: ${val}`)
                                                      .join(", ") || "Default"}
                                                </Typography>
                                             </TableCell>
                                             <TableCell>
                                                <TextField
                                                   size="small"
                                                   value={v.sku || ""}
                                                   onChange={(e) =>
                                                      onUpdateVariant?.(idx, { sku: e.target.value })
                                                   }
                                                   sx={{ width: 110 }}
                                                />
                                             </TableCell>
                                             <TableCell>
                                                <TextField
                                                   size="small"
                                                   type="number"
                                                   value={v.regularPrice ?? ""}
                                                   onChange={(e) =>
                                                      onUpdateVariant?.(idx, {
                                                         regularPrice: Number(e.target.value),
                                                      })
                                                   }
                                                   sx={{
                                                      width: 80,
                                                      "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                                         { display: "none" },
                                                   }}
                                                />
                                             </TableCell>
                                             <TableCell>
                                                <TextField
                                                   size="small"
                                                   type="number"
                                                   value={v.costPrice ?? ""}
                                                   onChange={(e) =>
                                                      onUpdateVariant?.(idx, {
                                                         costPrice: Number(e.target.value),
                                                      })
                                                   }
                                                   sx={{
                                                      width: 80,
                                                      "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                                         { display: "none" },
                                                   }}
                                                />
                                             </TableCell>
                                             <TableCell>
                                                <TextField
                                                   size="small"
                                                   type="number"
                                                   value={v.stockQuantity ?? 0}
                                                   onChange={(e) =>
                                                      onUpdateVariant?.(idx, {
                                                         stockQuantity: Number(e.target.value),
                                                      })
                                                   }
                                                   sx={{
                                                      width: 70,
                                                      "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                                         { display: "none" },
                                                   }}
                                                />
                                             </TableCell>
                                             <TableCell align="center">
                                                <IconButton
                                                   size="small"
                                                   color="error"
                                                   onClick={() => onRemoveVariant?.(idx)}
                                                >
                                                   <Icon icon="solar:trash-bin-trash-bold" size="16px" />
                                                </IconButton>
                                             </TableCell>
                                          </TableRow>
                                       ))}
                                    </TableBody>
                                 </Table>
                              </TableContainer>
                           )}
                        </Stack>
                     </Box>
                  </Grid>
               )}

               {/* ================= CONDITIONAL: BUNDLE COMPONENTS ================= */}
               {type === "Bundle" && (
                  <Grid size={{ xs: 12 }}>
                     <Box sx={{ p: 2, border: "1px dashed", borderColor: "divider", borderRadius: 1.5, my: 1 }}>
                        <Stack spacing={2}>
                           <Typography variant="body1" fontWeight={600} color="textPrimary">
                              Bundle Component Products
                           </Typography>

                           {/* Component Selector Row */}
                           <Grid container spacing={1.5} alignItems="flex-end">
                              <Grid size={{ xs: 12, sm: 5 }}>
                                 <Stack spacing={0.5}>
                                    <Typography variant="caption" fontWeight={500}>
                                       Select Product
                                    </Typography>
                                    <CustomAutocomplete
                                       value={
                                          availableProducts.find((p) => p.id === selectedComponentId)
                                             ?.productName || ""
                                       }
                                       onChange={(val: any) => {
                                          const found = availableProducts.find(
                                             (p) => p.productName === val,
                                          );
                                          if (found) {
                                             setSelectedComponentId(found.id);
                                             setComponentPrice(Number(found.regularPrice) || 0);
                                          }
                                       }}
                                       arrow
                                       label="Component Product"
                                       options={availableProducts.map((p) => p.productName)}
                                       getOptionLabel={(option) => option?.toString() || ""}
                                    />
                                 </Stack>
                              </Grid>
                              <Grid size={{ xs: 6, sm: 2.5 }}>
                                 <Stack spacing={0.5}>
                                    <Typography variant="caption" fontWeight={500}>
                                       Qty
                                    </Typography>
                                    <TextField
                                       size="small"
                                       type="number"
                                       value={componentQty}
                                       onChange={(e) => setComponentQty(Math.max(1, parseInt(e.target.value) || 1))}
                                       sx={{ "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": { display: "none" } }}
                                    />
                                 </Stack>
                              </Grid>
                              <Grid size={{ xs: 6, sm: 2.5 }}>
                                 <Stack spacing={0.5}>
                                    <Typography variant="caption" fontWeight={500}>
                                       Unit Price (৳)
                                    </Typography>
                                    <TextField
                                       size="small"
                                       type="number"
                                       value={componentPrice}
                                       onChange={(e) => setComponentPrice(Number(e.target.value) || 0)}
                                       sx={{ "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": { display: "none" } }}
                                    />
                                 </Stack>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 2 }}>
                                 <Button
                                    fullWidth
                                    variant="contained"
                                    onClick={handleAddBundleItem}
                                    disabled={!selectedComponentId}
                                    sx={{ height: 40 }}
                                 >
                                    Add
                                 </Button>
                              </Grid>
                           </Grid>

                           {/* Bundle Items Table */}
                           {bundleItems.length > 0 && (
                              <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                                 <Table size="small">
                                    <TableHead>
                                       <TableRow>
                                          <TableCell>Product</TableCell>
                                          <TableCell align="center">Qty</TableCell>
                                          <TableCell align="right">Unit Price</TableCell>
                                          <TableCell align="right">Subtotal</TableCell>
                                          <TableCell align="center">Action</TableCell>
                                       </TableRow>
                                    </TableHead>
                                    <TableBody>
                                       {bundleItems.map((item, idx) => (
                                          <TableRow key={idx}>
                                             <TableCell>
                                                <Typography variant="body2" fontWeight={500}>
                                                   {item.componentProductName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                   SKU: {item.componentSku || "N/A"}
                                                </Typography>
                                             </TableCell>
                                             <TableCell align="center">{item.quantity}</TableCell>
                                             <TableCell align="right">৳ {item.unitPrice}</TableCell>
                                             <TableCell align="right">
                                                ৳ {(item.quantity * item.unitPrice).toLocaleString()}
                                             </TableCell>
                                             <TableCell align="center">
                                                <IconButton
                                                   size="small"
                                                   color="error"
                                                   onClick={() => handleRemoveBundleItem(idx)}
                                                >
                                                   <Icon icon="solar:trash-bin-trash-bold" size="16px" />
                                                </IconButton>
                                             </TableCell>
                                          </TableRow>
                                       ))}
                                    </TableBody>
                                 </Table>
                              </TableContainer>
                           )}
                        </Stack>
                     </Box>
                  </Grid>
               )}

               {/* ================= UNITS & MEASUREMENT ================= */}
               <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="body2" fontWeight={600} color="textSecondary" sx={{ mt: 1 }}>
                     Units & Measurement
                  </Typography>
               </Grid>

               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                        Base Unit
                     </Typography>
                     <Controller
                        name="baseUnit"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? "Piece"}
                              label="Base Unit"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                        Purchase Unit
                     </Typography>
                     <Controller
                        name="purchaseUnit"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              label="Purchase Unit (e.g. Box, Carton)"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                        Sales Unit
                     </Typography>
                     <Controller
                        name="salesUnit"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? "Piece"}
                              label="Sales Unit"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                        Unit Conversion Rate
                     </Typography>
                     <Controller
                        name="unitConversionRate"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              type="number"
                              value={field.value ?? 1}
                              label="Conversion Rate (1 Purchase Unit = ? Base Units)"
                              variant="outlined"
                              sx={{
                                 "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                    { display: "none" },
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* ================= INVENTORY & WAREHOUSE ================= */}
               {type !== "Service" && (
                  <>
                     <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 0.5 }} />
                        <Typography variant="body2" fontWeight={600} color="textSecondary" sx={{ mt: 1 }}>
                           Warehouse & Location
                        </Typography>
                     </Grid>

                     <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                        <Stack spacing={1.5} flex={1}>
                           <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                              Primary Warehouse
                           </Typography>
                           <Controller
                              name="warehouseId"
                              control={formControl}
                              render={({ field }) => {
                                 const selected = warehouses.find((w) => w.id === field.value);
                                 return (
                                    <CustomAutocomplete
                                       value={selected ? selected.name : ""}
                                       onChange={(val: any) => {
                                          const found = warehouses.find((w) => w.name === val);
                                          field.onChange(found ? found.id : "");
                                       }}
                                       arrow
                                       label="Select Warehouse"
                                       options={warehouses.map((w) => w.name)}
                                       getOptionLabel={(option) => option?.toString() || ""}
                                    />
                                 );
                              }}
                           />
                        </Stack>
                     </Grid>

                     <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                        <Stack spacing={1.5}>
                           <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                              Min Stock Level
                           </Typography>
                           <Controller
                              name="minStockLevel"
                              control={formControl}
                              render={({ field }) => (
                                 <TextField
                                    {...field}
                                    type="number"
                                    value={field.value ?? 5}
                                    label="Min Stock Threshold"
                                    variant="outlined"
                                    sx={{
                                       "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                          { display: "none" },
                                    }}
                                 />
                              )}
                           />
                        </Stack>
                     </Grid>

                     <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                        <Stack spacing={1.5}>
                           <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                              Max Stock Level
                           </Typography>
                           <Controller
                              name="maxStockLevel"
                              control={formControl}
                              render={({ field }) => (
                                 <TextField
                                    {...field}
                                    type="number"
                                    value={field.value ?? 1000}
                                    label="Max Stock Threshold"
                                    variant="outlined"
                                    sx={{
                                       "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                          { display: "none" },
                                    }}
                                 />
                              )}
                           />
                        </Stack>
                     </Grid>

                     <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                        <Stack spacing={1.5}>
                           <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                              Rack & Shelf Location
                           </Typography>
                           <Stack direction="row" spacing={1}>
                              <Controller
                                 name="rackLocation"
                                 control={formControl}
                                 render={({ field }) => (
                                    <TextField
                                       {...field}
                                       value={field.value ?? ""}
                                       label="Rack"
                                       variant="outlined"
                                       size="small"
                                       sx={{ flex: 1 }}
                                    />
                                 )}
                              />
                              <Controller
                                 name="shelfLocation"
                                 control={formControl}
                                 render={({ field }) => (
                                    <TextField
                                       {...field}
                                       value={field.value ?? ""}
                                       label="Shelf"
                                       variant="outlined"
                                       size="small"
                                       sx={{ flex: 1 }}
                                    />
                                 )}
                              />
                           </Stack>
                        </Stack>
                     </Grid>
                  </>
               )}

               {/* ================= BATCH & EXPIRY TRACKING ================= */}
               {type !== "Service" && (
                  <>
                     <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 0.5 }} />
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                           <Typography variant="body2" fontWeight={600} color="textSecondary">
                              Batch & Expiry Date Tracking
                           </Typography>
                           <Controller
                              name="hasBatchTracking"
                              control={formControl}
                              render={({ field }) => (
                                 <FormControlLabel
                                    control={
                                       <Switch
                                          checked={Boolean(field.value)}
                                          onChange={(e) => field.onChange(e.target.checked)}
                                          color="primary"
                                          size="small"
                                       />
                                    }
                                    label="Enable Batch Tracking"
                                    sx={{ m: 0 }}
                                 />
                              )}
                           />
                        </Stack>
                     </Grid>

                     {isBatchEnabled && (
                        <>
                           <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                              <Stack spacing={1.5}>
                                 <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                                    Batch / Lot Number
                                 </Typography>
                                 <Controller
                                    name="batchNumber"
                                    control={formControl}
                                    render={({ field }) => (
                                       <TextField
                                          {...field}
                                          value={field.value ?? ""}
                                          label="Batch Number"
                                          variant="outlined"
                                       />
                                    )}
                                 />
                              </Stack>
                           </Grid>

                           <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                              <Stack spacing={1.5}>
                                 <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                                    Batch Quantity
                                 </Typography>
                                 <Controller
                                    name="batchQuantity"
                                    control={formControl}
                                    render={({ field }) => (
                                       <TextField
                                          {...field}
                                          type="number"
                                          value={field.value ?? ""}
                                          label="Batch Qty"
                                          variant="outlined"
                                          sx={{
                                             "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                                { display: "none" },
                                          }}
                                       />
                                    )}
                                 />
                              </Stack>
                           </Grid>

                           <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                              <Stack spacing={1.5}>
                                 <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                                    Manufacturing Date
                                 </Typography>
                                 <Controller
                                    name="mfgDate"
                                    control={formControl}
                                    render={({ field }) => (
                                       <TextField
                                          {...field}
                                          type="date"
                                          value={field.value ?? ""}
                                          variant="outlined"
                                          InputLabelProps={{ shrink: true }}
                                       />
                                    )}
                                 />
                              </Stack>
                           </Grid>

                           <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                              <Stack spacing={1.5}>
                                 <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                                    Expiry Date
                                 </Typography>
                                 <Controller
                                    name="expDate"
                                    control={formControl}
                                    render={({ field }) => (
                                       <TextField
                                          {...field}
                                          type="date"
                                          value={field.value ?? ""}
                                          variant="outlined"
                                          InputLabelProps={{ shrink: true }}
                                       />
                                    )}
                                 />
                              </Stack>
                           </Grid>
                        </>
                     )}
                  </>
               )}

               {/* ================= SUPPLIER & PROCUREMENT ================= */}
               <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="body2" fontWeight={600} color="textSecondary" sx={{ mt: 1 }}>
                     Supplier & Procurement
                  </Typography>
               </Grid>

               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5} flex={1}>
                     <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                        Primary Supplier
                     </Typography>
                     <Controller
                        name="primarySupplierId"
                        control={formControl}
                        render={({ field }) => {
                           const selected = suppliers.find((s) => s.id === field.value);
                           return (
                              <CustomAutocomplete
                                 value={selected ? selected.name : ""}
                                 onChange={(val: any) => {
                                    const found = suppliers.find((s) => s.name === val);
                                    field.onChange(found ? found.id : "");
                                 }}
                                 arrow
                                 label="Select Supplier"
                                 options={suppliers.map((s) => s.name)}
                                 getOptionLabel={(option) => option?.toString() || ""}
                              />
                           );
                        }}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                        Supplier Product Code
                     </Typography>
                     <Controller
                        name="supplierProductCode"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              label="Part / Model Code"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                        Supplier Price (৳)
                     </Typography>
                     <Controller
                        name="supplierPrice"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              type="number"
                              value={field.value ?? ""}
                              label="Supplier Purchase Price"
                              variant="outlined"
                              sx={{
                                 "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                    { display: "none" },
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                        Lead Time (Days)
                     </Typography>
                     <Controller
                        name="leadTimeDays"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              type="number"
                              value={field.value ?? ""}
                              label="Procurement Days"
                              variant="outlined"
                              sx={{
                                 "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                    { display: "none" },
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* ================= WARRANTY & SPECIFICATIONS ================= */}
               <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="body2" fontWeight={600} color="textSecondary" sx={{ mt: 1 }}>
                     Warranty & Specifications
                  </Typography>
               </Grid>

               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                        Warranty Period
                     </Typography>
                     <Controller
                        name="warrantyPeriod"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              label="e.g. 1 Year, 6 Months"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                        Warranty Type
                     </Typography>
                     <Controller
                        name="warrantyType"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              label="e.g. Official, Brand, Replacement"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                        Model Number
                     </Typography>
                     <Controller
                        name="modelNumber"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              label="Model Number"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, md: 6 }} spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography variant="h6" fontSize={"13px!important"} fontWeight={500}>
                        Origin Country
                     </Typography>
                     <Controller
                        name="originCountry"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              label="Origin Country"
                              variant="outlined"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12 }}>
                  <Controller
                     name="hasSerialTracking"
                     control={formControl}
                     render={({ field }) => (
                        <FormControlLabel
                           control={
                              <Switch
                                 checked={Boolean(field.value)}
                                 onChange={(e) => field.onChange(e.target.checked)}
                                 color="primary"
                              />
                           }
                           label={
                              <Typography variant="body2" fontWeight={500}>
                                 Enable Serial Number / IMEI Tracking at POS
                              </Typography>
                           }
                        />
                     )}
                  />
               </Grid>

               {/* ================= POS & SALES SETTINGS ================= */}
               <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="body2" fontWeight={600} color="textSecondary" sx={{ mt: 1 }}>
                     POS & Sales Settings
                  </Typography>
               </Grid>

               <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                     name="allowDiscount"
                     control={formControl}
                     render={({ field }) => (
                        <FormControlLabel
                           control={
                              <Switch
                                 checked={field.value !== false}
                                 onChange={(e) => field.onChange(e.target.checked)}
                                 color="primary"
                              />
                           }
                           label="Allow Cashier Discount"
                        />
                     )}
                  />
               </Grid>

               <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                     name="allowPriceChangeAtPos"
                     control={formControl}
                     render={({ field }) => (
                        <FormControlLabel
                           control={
                              <Switch
                                 checked={Boolean(field.value)}
                                 onChange={(e) => field.onChange(e.target.checked)}
                                 color="primary"
                              />
                           }
                           label="Allow Price Overrides at POS"
                        />
                     )}
                  />
               </Grid>

               <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                     name="trackInventory"
                     control={formControl}
                     render={({ field }) => (
                        <FormControlLabel
                           control={
                              <Switch
                                 checked={field.value !== false}
                                 onChange={(e) => field.onChange(e.target.checked)}
                                 color="primary"
                              />
                           }
                           label="Track Inventory Stock"
                        />
                     )}
                  />
               </Grid>

               <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                     name="availableForPos"
                     control={formControl}
                     render={({ field }) => (
                        <FormControlLabel
                           control={
                              <Switch
                                 checked={field.value !== false}
                                 onChange={(e) => field.onChange(e.target.checked)}
                                 color="primary"
                              />
                           }
                           label="Available on POS Register"
                        />
                     )}
                  />
               </Grid>
            </Grid>
         </Collapse>
      </Paper>
   );
};

export default Properties;
