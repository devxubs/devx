"use client";

import React, { useMemo, useState } from "react";
import {
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
import { useSnackbar } from "@src/lib/snackbarContext";
import Icon from "@src/components/Icon";
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
            <Stack
               direction="row"
               spacing={1}
               alignItems="center"
               sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: 1.5,
                  border: (t) => `1px solid ${t.palette.divider}`,
                  width: "fit-content",
               }}
            >
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
         )}

         <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup
               size="small"
               exclusive
               value={direction}
               onChange={(_, v) => v && setDirection(v)}
            >
               <ToggleButton value="increase" color="success">
                  <Icon icon="solar:add-circle-bold" size="16px" />
                  &nbsp;Increase
               </ToggleButton>
               <ToggleButton value="decrease" color="error">
                  <Icon icon="solar:minus-circle-bold" size="16px" />
                  &nbsp;Decrease
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

         {/* Display-only preview of the resulting stock, computed
             from the same figures the submit sends — the API and
             the stock engine remain the authority on save. */}
         {product &&
            available != null &&
            Number.isInteger(Number(quantity)) &&
            Number(quantity) >= 1 &&
            (() => {
               const result =
                  direction === "increase"
                     ? available + Number(quantity)
                     : available - Number(quantity);
               return result < 0 ? (
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
               );
            })()}

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

         <Stack direction="row" justifyContent="flex-end">
            <Button
               variant="contained"
               color="primary"
               onClick={handleSubmit}
               disabled={submitting}
               sx={{ height: 42, px: 3, fontWeight: 700, textTransform: "none" }}
            >
               {submitting ? "Saving..." : "Save Adjustment"}
            </Button>
         </Stack>
      </Stack>
   );
};

export default AdjustTab;
