"use client";

import React, { useMemo, useState } from "react";
import {
   Box,
   Button,
   FormControl,
   Grid,
   MenuItem,
   Select,
   Stack,
   TextField,
   ToggleButton,
   ToggleButtonGroup,
   Typography,
} from "@mui/material";
import { useSnackbar } from "@src/lib/snackbarContext";
import Icon from "@src/components/Icon";
import FieldLabel from "./FieldLabel";
import type { StockProduct } from "./index";

// Phase 3A (3.2): manual stock adjustment. Posts to POST
// /api/stock/adjust, which runs the stock engine's adjustStock() in a
// transaction (product + variant quantities, warehouse mirroring and
// the movement ledger stay consistent). A reason is mandatory — it is
// stored as the movement's note.
//
// UI refinement: the form now follows the create-page form system
// (labels above small fields, responsive grid, segmented direction
// control, bottom-right primary action) instead of one narrow
// floating-label column. All state, validation and the POST are
// unchanged.
interface AdjustTabProps {
   products: StockProduct[];
   onAdjusted: () => void;
}

const AdjustTab = ({ products, onAdjusted }: AdjustTabProps) => {
   const { showSnackbar } = useSnackbar();
   const [productId, setProductId] = useState("");
   const [variantId, setVariantId] = useState("");
   const [direction, setDirection] = useState<"increase" | "decrease">(
      "increase",
   );
   const [quantity, setQuantity] = useState("");
   const [reason, setReason] = useState("");
   const [submitting, setSubmitting] = useState(false);

   const product = useMemo(
      () => products.find((p) => p.id === productId) || null,
      [products, productId],
   );
   const isVariable =
      !!product &&
      (product.productType === "variable" || (product.variants?.length ?? 0) > 0);
   const variant = useMemo(
      () => product?.variants?.find((v) => v.id === variantId) || null,
      [product, variantId],
   );
   const available = variant ? variant.quantity : product?.quantity;

   // Display-only preview figures, computed from the same values
   // the submit sends — the API and the stock engine remain the
   // authority on save.
   const qtyNumber = Number(quantity);
   const qtyValid = Number.isInteger(qtyNumber) && qtyNumber >= 1;
   const result =
      product && available != null && qtyValid
         ? direction === "increase"
            ? available + qtyNumber
            : available - qtyNumber
         : null;

   const handleSubmit = async () => {
      if (!product) {
         showSnackbar("Select a product first.", "error");
         return;
      }
      if (isVariable && !variantId) {
         showSnackbar(`Select a variant for "${product.productName}".`, "error");
         return;
      }
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty < 1) {
         showSnackbar("Quantity must be a whole number of at least 1.", "error");
         return;
      }
      if (!reason.trim()) {
         showSnackbar("A reason is required for a stock adjustment.", "warning");
         return;
      }
      setSubmitting(true);
      try {
         const res = await fetch("/api/stock/adjust", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               productId,
               variantId: variantId || null,
               direction,
               quantity: qty,
               reason: reason.trim(),
            }),
         });
         const data = await res.json().catch(() => ({}));
         if (!res.ok) {
            throw new Error(data.error || "Failed to adjust stock");
         }
         const target = variant
            ? `${product.productName} (${variant.variantName}) — new variant stock: ${data.variantQuantity}`
            : `${product.productName} — new stock: ${data.productQuantity}`;
         showSnackbar(`Adjustment saved. ${target}.`, "success");
         setQuantity("");
         setReason("");
         onAdjusted();
      } catch (err: any) {
         showSnackbar(err.message || "Failed to adjust stock", "error");
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <Stack spacing={2.5}>
         <Typography variant="body2" color="text.secondary">
            Increase or decrease stock manually — for damage, loss, found
            stock or count corrections. The adjustment is recorded in the
            movement ledger with your reason.
         </Typography>

         <Grid container spacing={2} sx={{ maxWidth: 920 }}>
            <Grid size={{ xs: 12, md: isVariable ? 7 : 12 }}>
               <FieldLabel>Product</FieldLabel>
               <FormControl fullWidth size="small">
                  <Select
                     displayEmpty
                     value={productId}
                     onChange={(e) => {
                        setProductId(String(e.target.value));
                        setVariantId("");
                     }}
                     renderValue={(v) => {
                        const p = products.find((x) => x.id === v);
                        return p ? (
                           p.productName
                        ) : (
                           <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                           >
                              Select a product
                           </Typography>
                        );
                     }}
                  >
                     {products.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                           {p.productName} — Stock: {p.quantity}
                        </MenuItem>
                     ))}
                  </Select>
               </FormControl>
            </Grid>

            {isVariable && (
               <Grid size={{ xs: 12, md: 5 }}>
                  <FieldLabel>Variant</FieldLabel>
                  <FormControl fullWidth size="small">
                     <Select
                        displayEmpty
                        value={variantId}
                        onChange={(e) => setVariantId(String(e.target.value))}
                        renderValue={(v) => {
                           const vr = (product?.variants || []).find(
                              (x) => x.id === v,
                           );
                           return vr ? (
                              vr.variantName
                           ) : (
                              <Typography
                                 component="span"
                                 variant="body2"
                                 color="text.secondary"
                              >
                                 Select a variant
                              </Typography>
                           );
                        }}
                     >
                        {(product?.variants || []).map((v) => {
                           const attrs = v.attributes
                              ? Object.values(v.attributes)
                                   .filter(Boolean)
                                   .join(" · ")
                              : "";
                           return (
                              <MenuItem key={v.id} value={v.id}>
                                 {v.variantName}
                                 {attrs ? ` — ${attrs}` : ""} (SKU: {v.sku}) —
                                 Stock: {v.quantity}
                              </MenuItem>
                           );
                        })}
                     </Select>
                  </FormControl>
               </Grid>
            )}

            {product && (
               <Grid size={{ xs: 12 }}>
                  {/* Compact stock information: current stock on the
                      left, the resulting-stock preview (or the
                      exceeds-stock warning) on the right once a
                      valid quantity is entered. */}
                  <Stack
                     direction={{ xs: "column", sm: "row" }}
                     spacing={1}
                     alignItems={{ xs: "flex-start", sm: "center" }}
                     justifyContent="space-between"
                     sx={{
                        px: 2,
                        py: 1.5,
                        borderRadius: 1.5,
                        border: (t) => `1px solid ${t.palette.divider}`,
                     }}
                  >
                     <Stack direction="row" spacing={1} alignItems="center">
                        <Icon icon="solar:box-linear" size="16px" />
                        <Typography variant="body2" color="text.secondary">
                           Current stock:{" "}
                           <Typography
                              component="span"
                              variant="body2"
                              fontWeight={700}
                              color="text.primary"
                           >
                              {available ?? 0}
                           </Typography>
                           {variant ? ` (variant ${variant.variantName})` : ""}
                        </Typography>
                     </Stack>
                     {result != null &&
                        (result < 0 ? (
                           <Typography variant="body2" color="error.main">
                              This decrease exceeds the current stock by{" "}
                              {Math.abs(result)}.
                           </Typography>
                        ) : (
                           <Typography variant="body2" color="text.secondary">
                              New stock after adjustment:{" "}
                              <Typography
                                 component="span"
                                 variant="body2"
                                 fontWeight={700}
                                 color="text.primary"
                              >
                                 {result}
                              </Typography>
                           </Typography>
                        ))}
                  </Stack>
               </Grid>
            )}

            <Grid size={{ xs: 12, md: 7 }}>
               <FieldLabel>Direction</FieldLabel>
               <ToggleButtonGroup
                  size="small"
                  exclusive
                  fullWidth
                  value={direction}
                  onChange={(_, v) => v && setDirection(v)}
                  sx={{
                     height: 40,
                     "& .MuiToggleButton-root": {
                        flex: 1,
                        textTransform: "none",
                        fontWeight: 600,
                        gap: 0.75,
                     },
                  }}
               >
                  <ToggleButton value="increase" color="success">
                     <Icon icon="solar:add-circle-bold" size="16px" />
                     Increase
                  </ToggleButton>
                  <ToggleButton value="decrease" color="error">
                     <Icon icon="solar:minus-circle-bold" size="16px" />
                     Decrease
                  </ToggleButton>
               </ToggleButtonGroup>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
               <FieldLabel>Quantity</FieldLabel>
               <TextField
                  size="small"
                  fullWidth
                  type="number"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  inputProps={{ min: 1, step: 1 }}
               />
            </Grid>

            <Grid size={{ xs: 12 }}>
               <FieldLabel>Reason (required)</FieldLabel>
               <TextField
                  placeholder="e.g. Damaged in storage, Stock count correction"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  minRows={3}
               />
            </Grid>

            <Grid size={{ xs: 12 }}>
               <Stack direction="row" justifyContent="flex-end">
                  <Button
                     variant="contained"
                     color="primary"
                     onClick={handleSubmit}
                     disabled={submitting}
                     sx={{
                        height: 42,
                        px: 3,
                        fontWeight: 700,
                        textTransform: "none",
                        width: { xs: "100%", sm: "auto" },
                     }}
                  >
                     {submitting ? "Saving..." : "Save Adjustment"}
                  </Button>
               </Stack>
            </Grid>
         </Grid>
      </Stack>
   );
};

export default AdjustTab;
