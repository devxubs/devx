"use client";

import React, { useEffect, useState } from "react";
import {
   Box,
   Button,
   Divider,
   Grid,
   IconButton,
   Paper,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableContainer,
   TableHead,
   TableRow,
   TextField,
   Tooltip,
   Typography,
   useTheme,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import { ProductBundleComponent } from "../types";

interface ProductBundleSectionProps {
   bundleItems: ProductBundleComponent[];
   onChangeBundleItems: (items: ProductBundleComponent[]) => void;
   currentProductId?: string | null;
}

export const ProductBundleSection: React.FC<ProductBundleSectionProps> = ({
   bundleItems = [],
   onChangeBundleItems,
   currentProductId,
}) => {
   const theme = useTheme();
   const [availableProducts, setAvailableProducts] = useState<any[]>([]);
   const [selectedComponentId, setSelectedComponentId] = useState<string>("");
   const [componentQty, setComponentQty] = useState<number>(1);
   const [componentPrice, setComponentPrice] = useState<number>(0);

   useEffect(() => {
      let isMounted = true;
      fetch("/api/products")
         .then((r) => (r.ok ? r.json() : []))
         .then((data) => {
            if (!isMounted) return;
            const prods = Array.isArray(data) ? data : data.products || [];
            setAvailableProducts(prods.filter((p: any) => p.id !== currentProductId));
         })
         .catch(() => {});
      return () => {
         isMounted = false;
      };
   }, [currentProductId]);

   const handleAddBundleItem = () => {
      if (!selectedComponentId) return;
      const comp = availableProducts.find((p) => p.id === selectedComponentId);
      if (!comp) return;

      const newItem: ProductBundleComponent = {
         componentProductId: comp.id,
         componentProductName: comp.productName,
         componentSku: comp.productSku || comp.productCode,
         quantity: Number(componentQty) || 1,
         unitPrice: Number(componentPrice) >= 0 ? Number(componentPrice) : Number(comp.regularPrice) || 0,
      };

      onChangeBundleItems([...bundleItems, newItem]);
      setSelectedComponentId("");
      setComponentQty(1);
      setComponentPrice(0);
   };

   const handleRemoveBundleItem = (index: number) => {
      onChangeBundleItems(bundleItems.filter((_, i) => i !== index));
   };

   const totalBundleCost = bundleItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
      0,
   );

   return (
      <Paper
         variant="outlined"
         sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 1.5,
            bgcolor: "background.paper",
            borderColor: "divider",
         }}
      >
         <Stack spacing={2.5}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
               <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                     <Icon
                        icon="solar:box-minimalistic-linear"
                        size="18px"
                        style={{ color: theme.palette.text.secondary }}
                     />
                     <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: "-0.01em" }}>
                        Bundle / Combo Component Products
                     </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                     Select individual catalog products bundled into this package with special prices
                  </Typography>
               </Stack>
               <Typography variant="caption" fontWeight={600} color="primary.main">
                  Total Composite: ৳ {totalBundleCost.toLocaleString()}
               </Typography>
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            {/* Add component controls */}
            <Grid container spacing={1.5} alignItems="flex-end">
               <Grid size={{ xs: 12, sm: 5 }}>
                  <Stack spacing={0.5}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.primary"
                        sx={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "0.72rem" }}
                     >
                        Choose Product
                     </Typography>
                     <CustomAutocomplete
                        size="small"
                        value={
                           availableProducts.find((p) => p.id === selectedComponentId)?.productName || ""
                        }
                        onChange={(val: any) => {
                           const found = availableProducts.find((p) => p.productName === val);
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
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.primary"
                        sx={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "0.72rem" }}
                     >
                        Quantity
                     </Typography>
                     <TextField
                        size="small"
                        type="number"
                        value={componentQty}
                        onChange={(e) => setComponentQty(Math.max(1, parseInt(e.target.value) || 1))}
                        sx={{
                           "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
                              display: "none",
                           },
                        }}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 6, sm: 2.5 }}>
                  <Stack spacing={0.5}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.primary"
                        sx={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "0.72rem" }}
                     >
                        Bundle Price (৳)
                     </Typography>
                     <TextField
                        size="small"
                        type="number"
                        value={componentPrice}
                        onChange={(e) => setComponentPrice(Number(e.target.value) || 0)}
                        sx={{
                           "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
                              display: "none",
                           },
                        }}
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
                     Add Item
                  </Button>
               </Grid>
            </Grid>

            {/* Bundle components list */}
            {bundleItems.length > 0 && (
               <TableContainer component={Paper} variant="outlined" sx={{ mt: 1, borderColor: "divider" }}>
                  <Table size="small">
                     <TableHead>
                        <TableRow>
                           <TableCell sx={{ fontWeight: 600 }}>Component Product</TableCell>
                           <TableCell align="center" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                           <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Price (৳)</TableCell>
                           <TableCell align="right" sx={{ fontWeight: 600 }}>Subtotal (৳)</TableCell>
                           <TableCell align="center" sx={{ fontWeight: 600 }}>Action</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {bundleItems.map((item, idx) => (
                           <TableRow key={idx} hover>
                              <TableCell>
                                 <Typography variant="body2" fontWeight={600}>
                                    {item.componentProductName}
                                 </Typography>
                                 <Typography variant="caption" color="text.secondary">
                                    SKU: {item.componentSku || "N/A"}
                                 </Typography>
                              </TableCell>
                              <TableCell align="center">{item.quantity}</TableCell>
                              <TableCell align="right">৳ {item.unitPrice}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>
                                 ৳ {(item.quantity * (item.unitPrice || 0)).toLocaleString()}
                              </TableCell>
                              <TableCell align="center">
                                 <Tooltip title="Remove item" disableInteractive>
                                    <IconButton
                                       size="small"
                                       color="error"
                                       onClick={() => handleRemoveBundleItem(idx)}
                                    >
                                       <Icon icon="solar:trash-bin-trash-bold" size="16px" />
                                    </IconButton>
                                 </Tooltip>
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               </TableContainer>
            )}
         </Stack>
      </Paper>
   );
};
