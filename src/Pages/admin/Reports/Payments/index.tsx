"use client";

// Reports — Payment Reconciliation (Phase 3B, roadmap 3.6).
//
// Daily reconciliation over the Phase 3A order payment fields:
// per-method totals for one day, a transaction-ID search that finds
// the order, and the queue of payments not yet marked VERIFIED.
// Verification is a manual staff action (here or in Order Details) —
// nothing in the system auto-verifies a payment. All figures come
// from GET /api/reports?tab=payments; an empty day shows an honest
// empty state.
import {
   Alert,
   Button,
   Chip,
   Grid,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomTable from "@src/components/Table";
import AnalyticsCard from "@cmp/AnalyticsCard";
import { useSettings } from "@src/lib/settingsContext";
import { fetchAllReportRows, reportParams } from "../reportExport";

const todayInputValue = () => {
   const d = new Date();
   const pad = (n: number) => String(n).padStart(2, "0");
   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const STATUS_META: Record<string, { label: string; color: "success" | "warning" | "error" }> = {
   VERIFIED: { label: "Verified", color: "success" },
   MISMATCHED: { label: "Mismatched", color: "error" },
   UNVERIFIED: { label: "Unverified", color: "warning" },
};

const Payments = () => {
   const router = useRouter();
   const { formatCurrency } = useSettings();
   const [date, setDate] = useState(todayInputValue());
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [txid, setTxid] = useState("");
   const [txidResults, setTxidResults] = useState<any[] | null>(null);
   const [searching, setSearching] = useState(false);
   const [feedback, setFeedback] = useState<string | null>(null);

   const dayRange = useCallback((): [Date | null, Date | null] => {
      if (!date) return [null, null];
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59`);
      return [start, end];
   }, [date]);

   const loadReport = useCallback(async () => {
      setLoading(true);
      try {
         const [start, end] = dayRange();
         const params = new URLSearchParams();
         params.set("tab", "payments");
         if (start) params.set("startDate", start.toISOString());
         if (end) params.set("endDate", end.toISOString());
         const res = await fetch(`/api/reports?${params.toString()}`);
         if (res.ok) setReport(await res.json());
      } catch {}
      setLoading(false);
   }, [dayRange]);

   useEffect(() => {
      loadReport();
   }, [loadReport]);

   const handleTxidSearch = async () => {
      const q = txid.trim();
      if (!q) {
         setTxidResults(null);
         return;
      }
      setSearching(true);
      try {
         const res = await fetch(`/api/reports?tab=payments&txid=${encodeURIComponent(q)}`);
         if (res.ok) {
            const data = await res.json();
            setTxidResults(data.txidMatches || []);
         }
      } catch {}
      setSearching(false);
   };

   const handleVerify = async (row: any, next: "VERIFIED" | "MISMATCHED") => {
      try {
         const res = await fetch(`/api/orders/${row.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentStatus: next }),
         });
         const data = await res.json().catch(() => ({}));
         if (!res.ok) throw new Error(data.message || data.error || "Update failed");
         setFeedback(`Order ${row.orderId} marked ${next === "VERIFIED" ? "verified" : "mismatched"}.`);
         loadReport();
         if (txidResults) handleTxidSearch();
      } catch (err: any) {
         setFeedback(err?.message || "Failed to update the payment status.");
      }
   };

   const openOrder = (row: any) => router.push(`/admin/order/${row.orderId}`);

   const totals = report?.totals || {
      orders: 0,
      advanceCollected: 0,
      dueExpected: 0,
      verified: 0,
      unverified: 0,
      mismatched: 0,
   };

   const cards = [
      { title: "Orders (selected day)", value: totals.orders, isPositive: true },
      { title: "Advance Collected", value: formatCurrency(totals.advanceCollected), isPositive: true },
      { title: "Due / COD Expected", value: formatCurrency(totals.dueExpected), isPositive: true },
      { title: "Verified Payments", value: totals.verified, isPositive: true },
      { title: "Awaiting Verification", value: totals.unverified + totals.mismatched, isPositive: false },
   ];

   const methodColumns = [
      { field: "method", headerName: "Payment Method", width: 180 },
      { field: "orders", headerName: "Orders", width: 100 },
      {
         field: "advanceCollected",
         headerName: "Advance Collected",
         width: 170,
         renderCell: (p: any) => formatCurrency(p.row.advanceCollected),
      },
      {
         field: "dueExpected",
         headerName: "Due / COD Expected",
         width: 170,
         renderCell: (p: any) => formatCurrency(p.row.dueExpected),
      },
      { field: "verified", headerName: "Verified", width: 100 },
      { field: "unverified", headerName: "Unverified", width: 110 },
      { field: "mismatched", headerName: "Mismatched", width: 110 },
   ];

   const queueColumns = [
      {
         field: "orderId",
         headerName: "Order",
         width: 130,
         renderCell: (p: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => openOrder(p.row)}
            >
               {p.row.orderId}
            </Typography>
         ),
      },
      { field: "customer", headerName: "Customer", width: 160 },
      { field: "method", headerName: "Method", width: 130 },
      {
         field: "txId",
         headerName: "Transaction ID",
         width: 160,
         renderCell: (p: any) => p.row.txId || "—",
      },
      {
         field: "senderNumber",
         headerName: "Sender Number",
         width: 140,
         renderCell: (p: any) => p.row.senderNumber || "—",
      },
      {
         field: "advance",
         headerName: "Advance",
         width: 120,
         renderCell: (p: any) => formatCurrency(p.row.advance),
      },
      {
         field: "paymentStatus",
         headerName: "Status",
         width: 120,
         renderCell: (p: any) => {
            const meta = STATUS_META[p.row.paymentStatus] || STATUS_META.UNVERIFIED;
            return <Chip label={meta.label} color={meta.color} size="small" variant="outlined" />;
         },
      },
      {
         // Not "@actions" — the shared table reserves that field for
         // its overflow menu and would override this renderCell.
         field: "verifyActions",
         headerName: "Actions",
         width: 220,
         renderCell: (p: any) => (
            <Stack direction="row" spacing={1}>
               <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  onClick={() => handleVerify(p.row, "VERIFIED")}
               >
                  Verify
               </Button>
               <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => handleVerify(p.row, "MISMATCHED")}
               >
                  Mismatch
               </Button>
            </Stack>
         ),
      },
   ];

   const methodRows = (report?.methods || []).map((m: any, i: number) => ({
      id: m.method || `method-${i}`,
      ...m,
   }));
   const queueRows = report?.unverifiedRows || [];

   return (
      <Stack spacing={2}>
         <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <TextField
               type="date"
               size="small"
               label="Reconciliation date"
               value={date}
               onChange={(e) => setDate(e.target.value)}
               InputLabelProps={{ shrink: true }}
            />
            <Stack direction="row" spacing={1} flex={1} maxWidth={520}>
               <TextField
                  size="small"
                  fullWidth
                  label="Find order by Transaction ID"
                  placeholder="e.g. 9HX7K2LM1P"
                  value={txid}
                  onChange={(e) => setTxid(e.target.value)}
                  onKeyDown={(e) => {
                     if (e.key === "Enter") handleTxidSearch();
                  }}
               />
               <Button variant="contained" onClick={handleTxidSearch} disabled={searching}>
                  Search
               </Button>
            </Stack>
         </Stack>

         {feedback && (
            <Alert severity="info" onClose={() => setFeedback(null)}>
               {feedback}
            </Alert>
         )}

         {txidResults !== null && (
            <Stack spacing={1} bgcolor="background.paper" sx={{ borderRadius: 1.5, p: 2 }}>
               <Typography variant="subtitle2" fontWeight={700}>
                  Transaction search results ({txidResults.length})
               </Typography>
               {txidResults.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                     No order carries a transaction ID matching “{txid.trim()}”.
                  </Typography>
               ) : (
                  txidResults.map((row) => (
                     <Stack
                        key={row.id}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ border: 1, borderColor: "divider", borderRadius: 1, px: 1.5, py: 1 }}
                     >
                        <Stack>
                           <Typography
                              variant="body2"
                              fontWeight={600}
                              color="primary.main"
                              sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                              onClick={() => openOrder(row)}
                           >
                              {row.orderId}
                           </Typography>
                           <Typography variant="caption" color="text.secondary">
                              {row.customer} · {row.method} · TxID {row.txId}
                           </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                           <Typography variant="body2">{formatCurrency(row.advance)}</Typography>
                           <Chip
                              label={(STATUS_META[row.paymentStatus] || STATUS_META.UNVERIFIED).label}
                              color={(STATUS_META[row.paymentStatus] || STATUS_META.UNVERIFIED).color}
                              size="small"
                              variant="outlined"
                           />
                        </Stack>
                     </Stack>
                  ))
               )}
            </Stack>
         )}

         <Grid container spacing={2}>
            {cards.map((item, index) => (
               <Grid key={index} size={{ xs: 12, sm: 6, md: 2.4 }}>
                  <AnalyticsCard title={item.title} value={item.value} isPositive={item.isPositive} />
               </Grid>
            ))}
         </Grid>

         <Stack spacing={2} bgcolor="background.paper" sx={{ borderRadius: 1.5 }}>
            <Typography variant="h5" fontWeight={700} sx={{ px: 3, pt: 2 }}>
               Totals by payment method
            </Typography>
            {methodRows.length === 0 && !loading ? (
               <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 3 }}>
                  No orders were recorded for this date, so there is nothing to reconcile.
               </Typography>
            ) : (
               <CustomTable
                  rows={methodRows}
                  columns={methodColumns}
                  canExport={true}
                  exportConfig={{
                     filename: `Payment_Reconciliation_${date}`,
                     title: "DevX POS - Payment Reconciliation",
                     fetchAllData: () =>
                        fetchAllReportRows(reportParams("payments", dayRange()), (d) =>
                           (d.methods || []).map((m: any, i: number) => ({
                              id: m.method || `method-${i}`,
                              ...m,
                           })),
                        ),
                  }}
               />
            )}
         </Stack>

         <Stack spacing={2} bgcolor="background.paper" sx={{ borderRadius: 1.5 }}>
            <Typography variant="h5" fontWeight={700} sx={{ px: 3, pt: 2 }}>
               Awaiting verification
            </Typography>
            {queueRows.length === 0 && !loading ? (
               <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 3 }}>
                  {totals.orders === 0
                     ? "No payments to verify for this date."
                     : "Every payment recorded on this date has been verified."}
               </Typography>
            ) : (
               <CustomTable
                  rows={queueRows}
                  columns={queueColumns}
                  canExport={true}
                  exportConfig={{
                     filename: `Unverified_Payments_${date}`,
                     title: "DevX POS - Unverified Payments",
                     fetchAllData: () =>
                        fetchAllReportRows(reportParams("payments", dayRange()), (d) => d.unverifiedRows || []),
                  }}
               />
            )}
         </Stack>
      </Stack>
   );
};

export default Payments;
