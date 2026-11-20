"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
   Stack,
   Button,
   Grid,
   Typography,
   CircularProgress,
   Dialog,
   DialogTitle,
   DialogContent,
   DialogActions,
   Divider,
   Box,
} from "@mui/material";
import { GridCellParams } from "@mui/x-data-grid";

import AnalyticsCard from "@cmp/AnalyticsCard";
import Icon from "@src/components/Icon";
import { formatCompactNumber } from "@src/lib/utils";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import CustomModal from "@src/components/Modal";
import Modal from "./Modal";
import PrintButton from "@src/components/PrintButton";
import { useSettings } from "@src/lib/settingsContext";
import { useSnackbar } from "@src/lib/snackbarContext";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { filterRowsBySearch } from "@src/lib/tableSearch";

interface InfoCardProps {
   title: string;
   value: number | string;
   icon: string;
}

const InfoCard = ({ title, value, icon }: InfoCardProps) => {
   return (
      <Stack
         className="billing_info_card"
         spacing={2}
         borderRight={1}
         borderRadius={2}
         borderColor={"divider"}
         bgcolor={"background.paper"}
         boxShadow={"15"}
         p={2}
         px={3}
      >
         <Stack direction={"row"} spacing={1} alignItems="center">
            <Icon icon={icon} size="40" />
            <Typography variant="h4" fontWeight={700}>
               {typeof value === "number" ? formatCompactNumber(value) : value}
            </Typography>
         </Stack>
         <Typography variant="subtitle1" color="textSecondary">
            {title}
         </Typography>
      </Stack>
   );
};

const Billing = () => {
   const { settings, formatCurrency } = useSettings();
   const { showSnackbar } = useSnackbar();
   // Phase B4b (P1-5): consume the shared toolbar search. The billing
   // API accepts no search parameter and returns the complete
   // transaction set, so the term filters the loaded rows client-side
   // (lib/tableSearch) over the displayed fields. The metrics cards
   // keep describing the complete set — only the table rows filter.
   const { filterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";
   const [openModal, setOpenModal] = useState(false);
   const [loading, setLoading] = useState(true);
   const [billingData, setBillingData] = useState<any[]>([]);
   const [metrics, setMetrics] = useState({
      totalSettled: 0,
      totalPending: 0,
      totalCharges: 0,
   });
   // P3-2: feedback goes through the central snackbar (useSnackbar).
   const [printReceipt, setPrintReceipt] = useState<any | null>(null);

   const loadBilling = useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/billing");
         if (res.ok) {
            const data = await res.json();
            const formattedRows = (data.transactions || []).map((t: any) => ({
               id: t.id,
               customId: t.customId,
               date: t.createdAt,
               amount: t.amount,
               serviceCharge: t.serviceCharge,
               paymentMethod: t.paymentMethod,
               status: t.status === "COMPLETED" ? "Paid" : t.status === "PENDING" ? "Pending" : t.status,
               description: t.description,
            }));
            setBillingData(formattedRows);
            setMetrics({
               totalSettled: Number(data.totalSettled || 0),
               totalPending: Number(data.totalPending || 0),
               totalCharges: Number(data.totalCharges || 0),
            });
         }
      } catch {
         showSnackbar("Failed to load settlement transactions.", "error");
      } finally {
         setLoading(false);
      }
   }, [showSnackbar]);

   useEffect(() => {
      loadBilling();
   }, [loadBilling]);

   const handleCreatePayment = async (formData: any) => {
      try {
         const res = await fetch("/api/billing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               amount: formData.amount,
               paymentMethod: formData.paymentMethod?.label || formData.paymentMethod?.value || "Bank Transfer",
               description: formData.transactionId ? `TxID: ${formData.transactionId}` : "Settlement Withdrawal",
            }),
         });

         if (res.ok) {
            showSnackbar("Payout settlement recorded successfully!", "success");
            setOpenModal(false);
            loadBilling();
         } else {
            const err = await res.json();
            showSnackbar(err.error || "Failed to submit payment transaction.", "error");
         }
      } catch {
         showSnackbar("An error occurred while creating transaction.", "error");
      }
   };

   const handleDownloadInvoice = (row: any) => {
      const receiptText = `
========================================
       ${settings.storeName || "DevX POS"} - BILLING RECEIPT
========================================
Receipt ID:     ${row.customId || row.id}
Date:           ${new Date(row.date).toLocaleString()}
Status:         ${row.status}
Payment Method: ${row.paymentMethod}
Amount:         ${settings.currencySymbol || "৳"} ${Number(row.amount).toFixed(2)}
Service Charge: ${settings.currencySymbol || "৳"} ${Number(row.serviceCharge || 0).toFixed(2)}
Net Settlement: ${settings.currencySymbol || "৳"} ${(Number(row.amount) - Number(row.serviceCharge || 0)).toFixed(2)}
Description:    ${row.description || "POS Settlement Payout"}
========================================
Thank you for using DevX POS Settlement Gateway!
      `.trim();

      const blob = new Blob([receiptText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `billing_receipt_${row.customId || row.id}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
   };

   const columns: ColumnConfig[] = [
      {
         field: "customId",
         headerName: "ID",
         width: 140,
         renderCell: (params: GridCellParams) => (
            <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontFamily: "monospace" }}>
               {params.row.customId || (params.row.id ? `#${String(params.row.id).slice(0, 10)}` : "")}
            </Typography>
         ),
      },
      {
         field: "date",
         headerName: "Date",
         width: 170,
         flex: 0.4,
         renderCell: (params: GridCellParams) => {
            const date = new Date(params.value as string);
            return (
               <Stack justifyContent={"center"} height={"100%"}>
                  <Typography variant="body2" fontWeight={500}>
                     {date.toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                     {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Typography>
               </Stack>
            );
         },
      },
      {
         field: "amount",
         headerName: "Amount",
         width: 130,
         flex: 0.4,
         renderCell: (params: GridCellParams) => (
            <Typography variant="body2" fontWeight={700}>
               {formatCurrency(params.value as number)}
            </Typography>
         ),
      },
      {
         field: "paymentMethod",
         headerName: "Payment Method",
         width: 150,
         flex: 0.4,
      },
      {
         field: "status",
         headerName: "Status",
         width: 110,
         chip: true,
         color: (params) => {
            return params.row.status === "Paid" ? "success" : "warning";
         },
      },
      {
         field: "@actions",
      },
   ];

   const filteredBillingData = React.useMemo(
      () =>
         filterRowsBySearch(billingData, searchText, [
            "customId",
            "id",
            "paymentMethod",
            "status",
            "description",
         ]),
      [billingData, searchText],
   );

   const availableBalance = Math.max(metrics.totalSettled - metrics.totalCharges, 0);

   return (
      <Stack spacing={2} py={2} height={"100%"}>
         <Stack
            direction={"row"}
            justifyContent={"space-between"}
            alignItems={"center"}
            width={"100%"}
         >
            <Box>
               <Typography variant="h5" fontWeight={700}>
                  Billing & Settlement Gateway
               </Typography>
               <Typography variant="body2" color="textSecondary">
                  Track store payouts, gateway fees, and transfer settlements.
               </Typography>
            </Box>
            <Button
               variant="contained"
               color="primary"
               startIcon={<Icon icon="solar:wallet-money-bold" size="small" />}
               onClick={() => setOpenModal(true)}
            >
               Request Payout
            </Button>
         </Stack>

         {loading ? (
            <Stack alignItems="center" justifyContent="center" height="40vh">
               <CircularProgress />
            </Stack>
         ) : (
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <AnalyticsCard
                     title={"Total Settled Payouts"}
                     value={`${settings.currencySymbol || "৳"} ${formatCompactNumber(metrics.totalSettled)}`}
                     isPositive={true}
                  />
               </Grid>
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <AnalyticsCard
                     title={"Available Net Balance"}
                     value={`${settings.currencySymbol || "৳"} ${formatCompactNumber(availableBalance)}`}
                     isPositive={true}
                  />
               </Grid>
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <AnalyticsCard
                     title={"Pending Settlements"}
                     value={`${settings.currencySymbol || "৳"} ${formatCompactNumber(metrics.totalPending)}`}
                     isPositive={false}
                  />
               </Grid>

               <Grid size={{ xs: 12, sm: 4, md: 4 }}>
                  <InfoCard
                     title={"Total Transactions"}
                     value={billingData.length}
                     icon={"solar:cart-large-bold-duotone"}
                  />
               </Grid>
               <Grid size={{ xs: 12, sm: 4, md: 4 }}>
                  {/* Phase 1 (NEW-06): 1.5% is the configured rate the
                      billing API actually applies to every payout
                      (serviceCharge = amount x 0.015) — labelled as a
                      rate, not presented as measured data. The former
                      "Settlement Status: Operational" card is removed:
                      no settlement provider exists to report a status. */}
                  <InfoCard
                     title={"Settlement Fee Rate (per payout)"}
                     value={"1.5%"}
                     icon={"solar:hand-money-bold-duotone"}
                  />
               </Grid>
               <Grid size={{ xs: 12, sm: 4, md: 4 }}>
                  <InfoCard
                     title={"Total Service Charges"}
                     value={`${settings.currencySymbol || "৳"} ${Number(metrics.totalCharges).toFixed(2)}`}
                     icon={"solar:wallet-money-bold-duotone"}
                  />
               </Grid>

               <Grid size={12}>
                  <CustomTable
                     rows={filteredBillingData}
                     columns={columns}
                     checkBox={true}
                     canPrint={true}
                     canExport={true}
                     printConfig={{
                        title: "DevX POS - Merchant Settlement & Billing Transactions",
                     }}
                     exportConfig={{
                        filename: `Billing_Settlements_${new Date().toISOString().split("T")[0]}`,
                        title: "DevX POS - Merchant Settlement & Billing Transactions",
                        summaryRows: (data: any[]) => {
                           const totalAmt = data.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
                           return [
                              { label: "Total Transactions:", value: String(data.length) },
                              { label: "Grand Total Settled:", value: `৳ ${totalAmt.toFixed(2)}`, isTotal: true },
                           ];
                        },
                     }}
                     menuItems={[
                        {
                           label: "Print Invoice",
                           icon: (
                              <Icon
                                 icon="solar:printer-minimalistic-bold"
                                 size="small"
                              />
                           ),
                           onClick: (params) => {
                              setPrintReceipt(params.row);
                           },
                        },
                        {
                           label: "Download Invoice",
                           onClick: (params) => {
                              handleDownloadInvoice(params.row);
                           },
                           icon: (
                              <Icon
                                 icon="solar:download-square-bold-duotone"
                                 size="small"
                              />
                           ),
                        },
                     ]}
                  />
               </Grid>
            </Grid>
         )}

         {/* MAKE PAYMENT / PAYOUT MODAL */}
         <CustomModal
            open={openModal}
            onClose={() => setOpenModal(false)}
            title="Request Payout / Payment Settlement"
         >
            <Modal
               onSubmit={handleCreatePayment}
               onClose={() => setOpenModal(false)}
            />
         </CustomModal>

         {/* PRINT RECEIPT MODAL */}
         <Dialog open={Boolean(printReceipt)} onClose={() => setPrintReceipt(null)} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, textAlign: "center" }}>
               {settings.storeName || "DevX POS"}
            </DialogTitle>
            <DialogContent>
               {printReceipt && (
                  <Stack spacing={1.5} sx={{ fontFamily: "monospace" }}>
                     <Typography variant="body2" textAlign="center" color="text.secondary">
                        Settlement Payout Voucher
                     </Typography>
                     <Divider sx={{ my: 1, borderStyle: "dashed" }} />
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                           Voucher ID:
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                           {printReceipt.id}
                        </Typography>
                     </Stack>
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                           Date:
                        </Typography>
                        <Typography variant="caption">
                           {new Date(printReceipt.date).toLocaleString()}
                        </Typography>
                     </Stack>
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                           Method:
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                           {printReceipt.paymentMethod}
                        </Typography>
                     </Stack>
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                           Status:
                        </Typography>
                        <Typography variant="caption" fontWeight={700} color={printReceipt.status === "Paid" ? "success.main" : "warning.main"}>
                           {printReceipt.status}
                        </Typography>
                     </Stack>
                     <Divider sx={{ my: 1, borderStyle: "dashed" }} />
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Gross Amount:</Typography>
                        <Typography variant="body2" fontWeight={600}>
                           {formatCurrency(printReceipt.amount)}
                        </Typography>
                     </Stack>
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Service Charge:</Typography>
                        <Typography variant="body2" color="error.main">
                           -{formatCurrency(printReceipt.serviceCharge || 0)}
                        </Typography>
                     </Stack>
                     <Divider sx={{ my: 1 }} />
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="subtitle1" fontWeight={700}>Net Payout:</Typography>
                        <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                           {formatCurrency(Number(printReceipt.amount) - Number(printReceipt.serviceCharge || 0))}
                        </Typography>
                     </Stack>
                     <Divider sx={{ my: 1, borderStyle: "dashed" }} />
                     <Typography variant="caption" color="text.secondary" textAlign="center">
                        Authorized Electronic Settlement Slip
                     </Typography>
                  </Stack>
               )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
               <Button onClick={() => setPrintReceipt(null)} color="inherit">
                  Close
               </Button>
               <PrintButton label="Print Voucher" variant="contained" color="primary" />
            </DialogActions>
         </Dialog>
      </Stack>
   );
};

export default Billing;
