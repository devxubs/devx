"use client";

// Supplier Payment Ledger (Phase 3B, roadmap 3.7).
//
// Real payment history for one supplier, backed by
// GET/POST /api/suppliers/[id]/payments (+ DELETE to void). An
// allocated payment reduces the chosen purchase's due (the API does
// it in the same transaction); an unallocated payment stands as
// supplier credit. Outstanding payable = Σ purchase due − credit,
// and the three figures are shown separately so the math is
// auditable. Nothing here is fabricated: before the first payment is
// recorded the section honestly says so.
import {
   Autocomplete,
   Button,
   Grid,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import AlertDialog from "@src/components/AlertDialog";
import { useSettings } from "@src/lib/settingsContext";
import { useSnackbar } from "@src/lib/snackbarContext";

const PAYMENT_METHODS = [
   "Cash",
   "bKash",
   "Nagad",
   "Rocket",
   "Bank Transfer",
   "Card",
   "Other",
];

interface SupplierPaymentLedgerProps {
   /** Resolved database id of the supplier (not the customId). */
   supplierId: string;
   /** Purchases from the supplier fetch — allocation picker source. */
   purchases: any[];
   /** Called after a payment is recorded/voided so the parent can
    * refetch the supplier (purchase dues change). */
   onDataChanged?: () => void;
   /** Reports the API payable summary upward (net payable display). */
   onSummaryChange?: (summary: any) => void;
}

const todayInputValue = () => {
   const d = new Date();
   const pad = (n: number) => String(n).padStart(2, "0");
   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const SupplierPaymentLedger = ({
   supplierId,
   purchases,
   onDataChanged,
   onSummaryChange,
}: SupplierPaymentLedgerProps) => {
   const { formatCurrency } = useSettings();
   const { showSnackbar } = useSnackbar();
   const [payments, setPayments] = useState<any[]>([]);
   const [summary, setSummary] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [loadError, setLoadError] = useState(false);
   const [startDate, setStartDate] = useState("");
   const [endDate, setEndDate] = useState("");

   const [formOpen, setFormOpen] = useState(false);
   const [amount, setAmount] = useState("");
   const [method, setMethod] = useState<string>("Cash");
   const [payDate, setPayDate] = useState(todayInputValue());
   const [txId, setTxId] = useState("");
   const [note, setNote] = useState("");
   const [allocation, setAllocation] = useState<any>(null);
   // B2-3 (audit C-9 / P1-7): standing return credit the operator
   // chooses to apply to the allocated purchase's due.
   const [applyCredit, setApplyCredit] = useState("");
   const [formError, setFormError] = useState<string | null>(null);
   const [saving, setSaving] = useState(false);
   const [voidTarget, setVoidTarget] = useState<any>(null);

   const loadPayments = useCallback(async () => {
      if (!supplierId) return;
      setLoading(true);
      try {
         // P4-2: the ledger API paginates its rows by default now
         // (100/page + total) — walk the bounded pages, carrying the
         // active date range, and render the same complete list as
         // the old single unbounded response. The summary is a
         // global aggregate, identical on every page.
         const allPayments: any[] = [];
         let summaryData: any = null;
         let page = 1;
         for (;;) {
            const params = new URLSearchParams();
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);
            params.set("page", String(page));
            params.set("limit", "100");
            const res = await fetch(
               `/api/suppliers/${supplierId}/payments?${params.toString()}`,
            );
            if (!res.ok) throw new Error("load failed");
            const data = await res.json();
            const rows = data.payments || [];
            allPayments.push(...rows);
            summaryData = data.summary || null;
            const total = Number(data.total ?? allPayments.length);
            if (allPayments.length >= total || rows.length === 0) break;
            page += 1;
         }
         setPayments(allPayments);
         setSummary(summaryData);
         onSummaryChange?.(summaryData);
         setLoadError(false);
      } catch {
         setLoadError(true);
      } finally {
         setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [supplierId, startDate, endDate]);

   useEffect(() => {
      loadPayments();
   }, [loadPayments]);

   const duePurchases = (purchases || []).filter((p) => Number(p.due || 0) > 0);
   const allocationOptions = [
      { id: "", label: "Unallocated — advance / supplier credit" },
      ...duePurchases.map((p: any) => ({
         id: p.id,
         label: `${p.customId || p.id}${p.invoice ? ` · Inv ${p.invoice}` : ""} — due ${formatCurrency(Number(p.due || 0))}`,
         due: Number(p.due || 0),
      })),
   ];

   const standingReturnCredit = Number(summary?.returnCredit || 0);
   const creditValue = Number(applyCredit || 0);

   const handleRecord = async () => {
      const value = amount.trim() === "" ? 0 : Number(amount);
      const credit = Number.isFinite(creditValue) ? creditValue : NaN;
      if (!Number.isFinite(credit) || credit < 0) {
         setFormError("Return credit to apply cannot be negative.");
         return;
      }
      if (credit > 0 && !allocation?.id) {
         setFormError("Return credit can only be applied when a purchase is allocated.");
         return;
      }
      if (credit > standingReturnCredit) {
         setFormError(
            `Return credit exceeds this supplier's standing credit (${formatCurrency(standingReturnCredit)}).`,
         );
         return;
      }
      if (!Number.isFinite(value) || value < 0 || value + credit <= 0) {
         setFormError("Enter a payment amount greater than zero.");
         return;
      }
      if (allocation?.id && value + credit > Number(allocation.due || 0)) {
         setFormError(
            `Amount exceeds the due on the selected purchase (${formatCurrency(Number(allocation.due || 0))}). Record the rest as a separate unallocated payment.`,
         );
         return;
      }
      setSaving(true);
      setFormError(null);
      try {
         const res = await fetch(`/api/suppliers/${supplierId}/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               amount: value,
               applyReturnCredit: credit > 0 ? credit : undefined,
               paymentMethod: method || null,
               paymentTxId: txId.trim() || null,
               paymentDate: payDate || undefined,
               note: note.trim() || null,
               purchaseId: allocation?.id || null,
            }),
         });
         const data = await res.json().catch(() => ({}));
         if (!res.ok) throw new Error(data.message || data.error || "Failed to record payment");
         showSnackbar(
            credit > 0
               ? `Payment recorded — ${formatCurrency(credit)} of return credit applied.`
               : `Payment ${data.payment?.customId || ""} recorded.`,
            "success"
         );
         setAmount("");
         setApplyCredit("");
         setTxId("");
         setNote("");
         setAllocation(null);
         setFormOpen(false);
         await loadPayments();
         onDataChanged?.();
      } catch (err: any) {
         setFormError(err?.message || "Failed to record the payment.");
      } finally {
         setSaving(false);
      }
   };

   const handleVoid = async () => {
      if (!voidTarget) return;
      try {
         const res = await fetch(
            `/api/suppliers/${supplierId}/payments/${voidTarget.id}`,
            { method: "DELETE" },
         );
         if (!res.ok) throw new Error("void failed");
         showSnackbar(`Payment ${voidTarget.customId || ""} voided.`, "success");
         await loadPayments();
         onDataChanged?.();
      } catch {
         showSnackbar("Failed to void the payment. Please try again.", "error");
      } finally {
         setVoidTarget(null);
      }
   };

   return (
      <Stack spacing={1.5}>
         <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={600}>
               Payment Ledger
            </Typography>
            <Button
               size="small"
               variant={formOpen ? "outlined" : "contained"}
               onClick={() => setFormOpen((v) => !v)}
            >
               {formOpen ? "Cancel" : "Record Payment"}
            </Button>
         </Stack>

         {summary && (
            <Typography variant="caption" color="text.secondary">
               Purchase due {formatCurrency(summary.totalDue)} − unallocated credit{" "}
               {formatCurrency(summary.credit)}
               {summary.returnCredit > 0 && (
                  <>
                     {" "}
                     − return credit {formatCurrency(summary.returnCredit)}
                  </>
               )}{" "}
               = <b>net payable {formatCurrency(summary.netPayable)}</b>
            </Typography>
         )}

         {formOpen && (
            <Stack
               spacing={1.5}
               sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}
            >
               <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6 }}>
                     <TextField
                        label="Amount"
                        type="number"
                        size="small"
                        fullWidth
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputProps={{ min: 0, step: "0.01" }}
                     />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                     <TextField
                        label="Payment date"
                        type="date"
                        size="small"
                        fullWidth
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                     />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                     <Autocomplete
                        options={PAYMENT_METHODS}
                        value={method}
                        onChange={(_, v) => setMethod(v || "Cash")}
                        renderInput={(params) => (
                           <TextField {...params} label="Method" size="small" />
                        )}
                     />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                     <TextField
                        label="Transaction ID (optional)"
                        size="small"
                        fullWidth
                        value={txId}
                        onChange={(e) => setTxId(e.target.value)}
                     />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                     <Autocomplete
                        options={allocationOptions}
                        value={allocation}
                        onChange={(_, v) => setAllocation(v)}
                        getOptionLabel={(o: any) => o.label}
                        isOptionEqualToValue={(o: any, v: any) => o.id === v?.id}
                        renderInput={(params) => (
                           <TextField {...params} label="Allocate to purchase" size="small" />
                        )}
                     />
                  </Grid>
                  {allocation?.id && standingReturnCredit > 0 && (
                     <Grid size={{ xs: 12 }}>
                        <TextField
                           label="Apply return credit (optional)"
                           type="number"
                           size="small"
                           fullWidth
                           value={applyCredit}
                           onChange={(e) => setApplyCredit(e.target.value)}
                           inputProps={{ min: 0, step: "0.01" }}
                           helperText={`Standing return credit: ${formatCurrency(standingReturnCredit)} — at most ${formatCurrency(Math.min(standingReturnCredit, Number(allocation.due || 0)))} can settle this purchase. Credit is not cash: it is recorded as a separate “Return Credit” ledger entry.`}
                        />
                     </Grid>
                  )}
                  <Grid size={{ xs: 12 }}>
                     <TextField
                        label="Note (optional)"
                        size="small"
                        fullWidth
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                     />
                  </Grid>
               </Grid>
               {formError && (
                  <Typography variant="caption" color="error.main">
                     {formError}
                  </Typography>
               )}
               <Stack direction="row" justifyContent="flex-end">
                  <Button
                     variant="contained"
                     size="small"
                     onClick={handleRecord}
                     disabled={saving}
                  >
                     {saving ? "Saving…" : "Save Payment"}
                  </Button>
               </Stack>
            </Stack>
         )}

         <Stack direction="row" spacing={1} alignItems="center">
            <TextField
               type="date"
               size="small"
               label="From"
               value={startDate}
               onChange={(e) => setStartDate(e.target.value)}
               InputLabelProps={{ shrink: true }}
            />
            <TextField
               type="date"
               size="small"
               label="To"
               value={endDate}
               onChange={(e) => setEndDate(e.target.value)}
               InputLabelProps={{ shrink: true }}
            />
            {(startDate || endDate) && (
               <Button
                  size="small"
                  onClick={() => {
                     setStartDate("");
                     setEndDate("");
                  }}
               >
                  Clear
               </Button>
            )}
         </Stack>

         {loadError ? (
            <Typography variant="body2" color="error.main">
               Failed to load the payment history.{" "}
               <Button size="small" onClick={loadPayments}>
                  Retry
               </Button>
            </Typography>
         ) : loading && payments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
               Loading payments…
            </Typography>
         ) : payments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
               No payments recorded for this supplier yet
               {startDate || endDate ? " in the selected date range" : ""}. Use
               “Record Payment” to add the first one.
            </Typography>
         ) : (
            <Stack spacing={1}>
               {payments.map((p) => (
                  <Stack
                     key={p.id}
                     direction="row"
                     justifyContent="space-between"
                     alignItems="center"
                     sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        px: 1.5,
                        py: 1,
                     }}
                  >
                     <Stack>
                        <Typography variant="body2" fontWeight={600}>
                           {p.customId || p.id}
                           {p.paymentMethod ? ` · ${p.paymentMethod}` : ""}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                           {p.paymentDate
                              ? new Date(p.paymentDate).toLocaleDateString()
                              : ""}
                           {" · "}
                           {p.purchaseCustomId
                              ? `Allocated to ${p.purchaseCustomId}`
                              : "Unallocated / credit"}
                           {p.paymentTxId ? ` · TxID ${p.paymentTxId}` : ""}
                           {p.createdByName ? ` · by ${p.createdByName}` : ""}
                           {p.note ? ` · ${p.note}` : ""}
                        </Typography>
                     </Stack>
                     <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={700}>
                           {formatCurrency(p.amount)}
                        </Typography>
                        <Button
                           size="small"
                           color="error"
                           onClick={() => setVoidTarget(p)}
                        >
                           Void
                        </Button>
                     </Stack>
                  </Stack>
               ))}
            </Stack>
         )}

         <AlertDialog
            open={Boolean(voidTarget)}
            type={"delete"}
            title={`Void payment "${voidTarget?.customId || "this payment"}" (${formatCurrency(Number(voidTarget?.amount || 0))})? Its allocation will be reversed.`}
            onConfirm={handleVoid}
            onClose={() => setVoidTarget(null)}
         />
      </Stack>
   );
};

export default SupplierPaymentLedger;
