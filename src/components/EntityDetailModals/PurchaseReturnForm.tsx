"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
   Alert,
   Button,
   CircularProgress,
   Dialog,
   DialogActions,
   DialogContent,
   DialogTitle,
   FormControlLabel,
   Paper,
   Radio,
   RadioGroup,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableRow,
   TextField,
   Typography,
} from "@mui/material";
import { useSettings } from "@src/lib/settingsContext";
import {
   computeReturnableQuantity,
   soldOrConsumedQuantity,
} from "@src/lib/purchaseReturns";

// Phase 4 (D2): create a purchase return from the purchase detail.
// Quantities are capped client-side at the RETURNABLE quantity —
// purchased − already returned, further capped at the stock still
// on hand, because units that were already sold can never be
// returned (the shared computeReturnableQuantity in
// lib/purchaseReturns is the same function the API validates with
// under the Purchase-row lock, so the form's cap and the server's
// limit cannot drift apart). The settlement preview mirrors the
// approved server math exactly: dueAbsorbed = min(R, purchase due);
// any remainder becomes supplier credit (default) or a cash refund,
// chosen by the user only when a remainder exists.

interface PurchaseReturnFormProps {
   purchase: any | null;
   open: boolean;
   onClose: () => void;
   onSaved: () => void;
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

interface ReturnLine {
   item: any;
   alreadyReturned: number;
   /** Current stock for the line's pool; null = stock not tracked. */
   onHand: number | null;
   /** Purchased units that were already sold/consumed. */
   soldOrConsumed: number;
   /** Max quantity that can actually be returned right now. */
   returnable: number;
   qty: number;
   subtotal: number;
}

const PurchaseReturnForm = ({
   purchase,
   open,
   onClose,
   onSaved,
}: PurchaseReturnFormProps) => {
   const { formatCurrency } = useSettings();
   const [returnedByItem, setReturnedByItem] = useState<
      Record<string, number>
   >({});
   const [quantities, setQuantities] = useState<Record<string, number>>({});
   const [reason, setReason] = useState("");
   const [settlement, setSettlement] = useState<
      "SUPPLIER_CREDIT" | "CASH_REFUND"
   >("SUPPLIER_CREDIT");
   const [loadingReturns, setLoadingReturns] = useState(false);
   const [submitting, setSubmitting] = useState(false);
   const [error, setError] = useState<string | null>(null);

   // Already-returned quantities per purchase line (non-deleted
   // returns only — the API list already excludes deleted ones).
   useEffect(() => {
      if (!open || !purchase?.id) return;
      setQuantities({});
      setReason("");
      setSettlement("SUPPLIER_CREDIT");
      setError(null);
      setLoadingReturns(true);
      fetch(`/api/purchase-returns?purchaseId=${purchase.id}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => {
            const map: Record<string, number> = {};
            for (const ret of d?.returns || []) {
               for (const it of ret.items || []) {
                  if (it.purchaseItemId) {
                     map[it.purchaseItemId] =
                        (map[it.purchaseItemId] || 0) + Number(it.quantity || 0);
                  }
               }
            }
            setReturnedByItem(map);
         })
         .catch(() => setReturnedByItem({}))
         .finally(() => setLoadingReturns(false));
   }, [open, purchase?.id]);

   const due = Number(purchase?.due || 0);

   const lines: ReturnLine[] = useMemo(
      () =>
         (purchase?.items || []).map((item: any): ReturnLine => {
            const alreadyReturned = returnedByItem[item.id] || 0;
            const purchased = Number(item.quantity || 0);
            // On-hand stock for this line's pool, from the purchase
            // payload (items carry their product — and variant —
            // records). Variant lines are capped by the VARIANT's
            // stock, plain lines by the product's. Snapshot lines
            // (no product) and untracked products are not limited
            // by stock — the API applies the same rule.
            let onHand: number | null = null;
            if (item.productId && item.product && item.product.trackInventory !== false) {
               if (item.variantId) {
                  onHand = item.variant
                     ? Number(item.variant.quantity) || 0
                     : null;
               } else {
                  onHand = Number(item.product.quantity) || 0;
               }
            }
            const returnable = computeReturnableQuantity(
               purchased,
               alreadyReturned,
               onHand,
            );
            const soldOrConsumed =
               onHand != null
                  ? soldOrConsumedQuantity(purchased, alreadyReturned, onHand)
                  : 0;
            const qty = Math.min(
               Math.max(0, Math.floor(Number(quantities[item.id]) || 0)),
               returnable,
            );
            return {
               item,
               alreadyReturned,
               onHand,
               soldOrConsumed,
               returnable,
               qty,
               subtotal: round2(qty * Number(item.price || 0)),
            };
         }),
      [purchase, returnedByItem, quantities],
   );

   const anySold = lines.some((l) => l.soldOrConsumed > 0);

   const totalAmount = round2(
      lines.reduce((s: number, l) => s + l.subtotal, 0),
   );
   const dueAbsorbed = Math.min(totalAmount, due);
   const remainder = round2(totalAmount - dueAbsorbed);

   const handleSubmit = async () => {
      const selected = lines.filter((l) => l.qty > 0);
      if (selected.length === 0) {
         setError("Enter a quantity for at least one item.");
         return;
      }
      setSubmitting(true);
      setError(null);
      try {
         const res = await fetch(`/api/purchases/${purchase.id}/returns`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               items: selected.map((l) => ({
                  purchaseItemId: l.item.id,
                  quantity: l.qty,
               })),
               ...(remainder > 0 ? { settlement } : {}),
               ...(reason.trim() ? { reason: reason.trim() } : {}),
            }),
         });
         const data = await res.json().catch(() => ({}));
         if (!res.ok) {
            setError(
               data.message || data.error || "Failed to create the return.",
            );
            return;
         }
         onSaved();
         onClose();
      } catch {
         setError("Failed to create the return.");
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
         <DialogTitle>
            <Typography variant="h6" fontWeight={700}>
               Return Items — {purchase?.customId || "Purchase"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Returned stock is deducted immediately. The return value
               first reduces this purchase&apos;s outstanding due.
            </Typography>
         </DialogTitle>
         <DialogContent dividers>
            {loadingReturns ? (
               <Stack alignItems="center" py={4}>
                  <CircularProgress />
               </Stack>
            ) : (
               <Stack spacing={2}>
                  {error && <Alert severity="error">{error}</Alert>}
                  <Paper variant="outlined">
                     <Table size="small">
                        <TableHead>
                           <TableRow>
                              <TableCell>Item</TableCell>
                              <TableCell align="center">Purchased</TableCell>
                              <TableCell align="center">Returned</TableCell>
                              <TableCell align="center">Sold</TableCell>
                              <TableCell align="center">In Stock</TableCell>
                              <TableCell align="center">Returnable</TableCell>
                              <TableCell align="right">Unit Price</TableCell>
                              <TableCell align="center" sx={{ width: 110 }}>
                                 Return Qty
                              </TableCell>
                              <TableCell align="right">Subtotal</TableCell>
                           </TableRow>
                        </TableHead>
                        <TableBody>
                           {lines.map(
                              ({ item, alreadyReturned, onHand, soldOrConsumed, returnable, qty, subtotal }) => (
                                 <TableRow key={item.id}>
                                    <TableCell>
                                       {item.name ||
                                          item.product?.productName ||
                                          "Item"}
                                    </TableCell>
                                    <TableCell align="center">
                                       {item.quantity}
                                    </TableCell>
                                    <TableCell align="center">
                                       {alreadyReturned}
                                    </TableCell>
                                    <TableCell align="center">
                                       {onHand != null ? soldOrConsumed : "—"}
                                    </TableCell>
                                    <TableCell align="center">
                                       {onHand != null ? onHand : "—"}
                                    </TableCell>
                                    <TableCell
                                       align="center"
                                       sx={{ fontWeight: 700 }}
                                    >
                                       {returnable}
                                    </TableCell>
                                    <TableCell align="right">
                                       {formatCurrency(Number(item.price || 0))}
                                    </TableCell>
                                    <TableCell align="center">
                                       <TextField
                                          type="number"
                                          size="small"
                                          value={qty || ""}
                                          placeholder="0"
                                          disabled={returnable === 0}
                                          inputProps={{
                                             min: 0,
                                             max: returnable,
                                             step: 1,
                                          }}
                                          onChange={(e) =>
                                             setQuantities((prev) => ({
                                                ...prev,
                                                [item.id]: Number(
                                                   e.target.value,
                                                ),
                                             }))
                                          }
                                          sx={{ width: 84 }}
                                       />
                                    </TableCell>
                                    <TableCell
                                       align="right"
                                       sx={{ fontWeight: 700 }}
                                    >
                                       {formatCurrency(subtotal)}
                                    </TableCell>
                                 </TableRow>
                              ),
                           )}
                        </TableBody>
                     </Table>
                  </Paper>

                  {anySold && (
                     <Typography variant="caption" color="text.secondary">
                        Some purchased units were already sold, so they
                        can no longer be returned. “Returnable” is capped
                        at the stock still on hand for each item.
                     </Typography>
                  )}

                  <TextField
                     label="Reason (optional)"
                     size="small"
                     fullWidth
                     value={reason}
                     onChange={(e) => setReason(e.target.value)}
                     placeholder="e.g. Damaged goods, wrong item delivered"
                  />

                  {/* Live settlement preview — same math as the API. */}
                  <Paper
                     variant="outlined"
                     sx={{ p: 1.5, bgcolor: "action.hover" }}
                  >
                     <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between">
                           <Typography variant="body2">
                              Return value (R)
                           </Typography>
                           <Typography variant="body2" fontWeight={700}>
                              {formatCurrency(totalAmount)}
                           </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                           <Typography variant="body2">
                              Current due on this purchase
                           </Typography>
                           <Typography variant="body2">
                              {formatCurrency(due)}
                           </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                           <Typography variant="body2">
                              Due absorbed by this return
                           </Typography>
                           <Typography variant="body2" fontWeight={600}>
                              {formatCurrency(dueAbsorbed)}
                           </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                           <Typography variant="body2">Remainder</Typography>
                           <Typography variant="body2" fontWeight={600}>
                              {formatCurrency(remainder)}
                           </Typography>
                        </Stack>
                     </Stack>

                     {totalAmount > 0 && remainder === 0 && (
                        <Typography
                           variant="caption"
                           color="text.secondary"
                           display="block"
                           mt={1}
                        >
                           Fully absorbed by the outstanding due — no credit
                           or refund arises from this return.
                        </Typography>
                     )}

                     {remainder > 0 && (
                        <Stack spacing={0.5} mt={1.5}>
                           <Typography variant="subtitle2" fontWeight={600}>
                              Settle the remainder of{" "}
                              {formatCurrency(remainder)} as:
                           </Typography>
                           <RadioGroup
                              value={settlement}
                              onChange={(e) =>
                                 setSettlement(
                                    e.target.value as
                                       | "SUPPLIER_CREDIT"
                                       | "CASH_REFUND",
                                 )
                              }
                           >
                              <FormControlLabel
                                 value="SUPPLIER_CREDIT"
                                 control={<Radio size="small" />}
                                 label={
                                    <Typography variant="body2">
                                       Supplier credit — stands against future
                                       dues with this supplier
                                    </Typography>
                                 }
                              />
                              <FormControlLabel
                                 value="CASH_REFUND"
                                 control={<Radio size="small" />}
                                 label={
                                    <Typography variant="body2">
                                       Cash refund — recorded as money back in
                                       (negative expense in Finance)
                                    </Typography>
                                 }
                              />
                           </RadioGroup>
                        </Stack>
                     )}
                  </Paper>
               </Stack>
            )}
         </DialogContent>
         <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button
               onClick={onClose}
               variant="contained"
               color="inherit"
               size="small"
               disabled={submitting}
            >
               Cancel
            </Button>
            <Button
               onClick={handleSubmit}
               variant="contained"
               color="primary"
               size="small"
               disabled={submitting || totalAmount <= 0}
            >
               {submitting ? "Saving…" : "Create Return"}
            </Button>
         </DialogActions>
      </Dialog>
   );
};

export default PurchaseReturnForm;
