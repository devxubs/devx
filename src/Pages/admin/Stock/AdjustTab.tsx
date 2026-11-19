"use client";

import React, { useMemo, useState } from "react";
import {
   Alert,
   Button,
   FormControl,
   InputLabel,
   MenuItem,
   Select,
   Stack,
   TextField,
   ToggleButton,
   ToggleButtonGroup,
   Typography,
} from "@mui/material";
import type { StockProduct } from "./index";

// Phase 3A (3.2): manual stock adjustment. Posts to POST
// /api/stock/adjust, which runs the stock engine's adjustStock() in a
// transaction (product + variant quantities, warehouse mirroring and
// the movement ledger stay consistent). A reason is mandatory — it is
// stored as the movement's note.
interface AdjustTabProps {
   products: StockProduct[];
   onAdjusted: () => void;
}

const AdjustTab = ({ products, onAdjusted }: AdjustTabProps) => {
   const [productId, setProductId] = useState("");
   const [variantId, setVariantId] = useState("");
   const [direction, setDirection] = useState<"increase" | "decrease">(
      "increase",
   );
   const [quantity, setQuantity] = useState("");
   const [reason, setReason] = useState("");
   const [submitting, setSubmitting] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);

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

   const handleSubmit = async () => {
      setError(null);
      setSuccess(null);
      if (!product) {
         setError("Select a product first.");
         return;
      }
      if (isVariable && !variantId) {
         setError(`Select a variant for "${product.productName}".`);
         return;
      }
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty < 1) {
         setError("Quantity must be a whole number of at least 1.");
         return;
      }
      if (!reason.trim()) {
         setError("A reason is required for a stock adjustment.");
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
         setSuccess(`Adjustment saved. ${target}.`);
         setQuantity("");
         setReason("");
         onAdjusted();
      } catch (err: any) {
         setError(err.message || "Failed to adjust stock");
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <Stack spacing={2.5} maxWidth={560}>
         <Typography variant="body2" color="text.secondary">
            Increase or decrease stock manually — for damage, loss, found
            stock or count corrections. The adjustment is recorded in the
            movement ledger with your reason.
         </Typography>

         <FormControl fullWidth size="small">
            <InputLabel>Product</InputLabel>
            <Select
               label="Product"
               value={productId}
               onChange={(e) => {
                  setProductId(String(e.target.value));
                  setVariantId("");
               }}
            >
               {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                     {p.productName} — Stock: {p.quantity}
                  </MenuItem>
               ))}
            </Select>
         </FormControl>

         {isVariable && (
            <FormControl fullWidth size="small">
               <InputLabel>Variant</InputLabel>
               <Select
                  label="Variant"
                  value={variantId}
                  onChange={(e) => setVariantId(String(e.target.value))}
               >
                  {(product?.variants || []).map((v) => {
                     const attrs = v.attributes
                        ? Object.values(v.attributes).filter(Boolean).join(" · ")
                        : "";
                     return (
                        <MenuItem key={v.id} value={v.id}>
                           {v.variantName}
                           {attrs ? ` — ${attrs}` : ""} (SKU: {v.sku}) — Stock:{" "}
                           {v.quantity}
                        </MenuItem>
                     );
                  })}
               </Select>
            </FormControl>
         )}

         {product && (
            <Typography variant="body2" color="text.secondary">
               Current stock: <strong>{available ?? 0}</strong>
               {variant ? ` (variant ${variant.variantName})` : ""}
            </Typography>
         )}

         <Stack direction="row" spacing={2} alignItems="center">
            <ToggleButtonGroup
               size="small"
               exclusive
               value={direction}
               onChange={(_, v) => v && setDirection(v)}
            >
               <ToggleButton value="increase" color="success">
                  Increase
               </ToggleButton>
               <ToggleButton value="decrease" color="error">
                  Decrease
               </ToggleButton>
            </ToggleButtonGroup>
            <TextField
               size="small"
               label="Quantity"
               type="number"
               value={quantity}
               onChange={(e) => setQuantity(e.target.value)}
               inputProps={{ min: 1, step: 1 }}
               sx={{ width: 140 }}
            />
         </Stack>

         <TextField
            label="Reason (required)"
            placeholder="e.g. Damaged in storage, Stock count correction"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={2}
         />

         {error && <Alert severity="error">{error}</Alert>}
         {success && <Alert severity="success">{success}</Alert>}

         <Stack direction="row" justifyContent="flex-end">
            <Button
               variant="contained"
               color="primary"
               onClick={handleSubmit}
               disabled={submitting}
            >
               {submitting ? "Saving..." : "Save Adjustment"}
            </Button>
         </Stack>
      </Stack>
   );
};

export default AdjustTab;
