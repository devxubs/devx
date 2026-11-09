"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
   Box,
   Button,
   Chip,
   CircularProgress,
   Divider,
   Grid,
   Paper,
   Stack,
   Typography,
   Tooltip,
   LinearProgress,
} from "@mui/material";
import CustomModal from "@src/components/Modal";
import Icon from "@src/components/Icon";
import CustomerOrderStatistics from "./components/CustomerOrderStatistics";
import CustomerOrderHistoryTable from "./components/CustomerOrderHistoryTable";
import {
   calculateCustomerAnalytics,
   OrderRecord,
} from "./components/customerAnalyticsHelpers";

interface CustomerDetailModalProps {
   open: boolean;
   onClose: () => void;
   customerId?: string | null;
}

export default function CustomerDetailModal({
   open,
   onClose,
   customerId,
}: CustomerDetailModalProps) {
   const [customer, setCustomer] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [copyText, setCopyText] = useState("Copy Phone");

   useEffect(() => {
      if (!open || !customerId) return;
      setLoading(true);
      fetch(`/api/customers/${customerId}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => setCustomer(d))
         .catch(() => {})
         .finally(() => setLoading(false));
   }, [open, customerId]);

   const orders: OrderRecord[] = useMemo(() => {
      return (customer?.orders || []) as OrderRecord[];
   }, [customer]);

   // Calculate analytics from orders
   const analytics = useMemo(() => {
      if (customer?.overallStats && customer?.courierStats && customer?.courierPerformance) {
         return {
            overallStats: customer.overallStats,
            courierStats: customer.courierStats,
            courierPerformance: customer.courierPerformance,
         };
      }
      return calculateCustomerAnalytics(orders);
   }, [customer, orders]);

   const handleCopyPhone = () => {
      if (!customer?.phone) return;
      navigator.clipboard.writeText(String(customer.phone));
      setCopyText("Copied!");
      setTimeout(() => setCopyText("Copy Phone"), 2000);
   };

   return (
      <CustomModal
         open={open}
         onClose={onClose}
         title="Customer Profile & Order History"
         closeIcon={true}
         sx={{
            width: { xs: "95%", sm: "92%", md: 920 },
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            p: { xs: 2, sm: 3 },
         }}
      >
         {loading ? (
            <Stack alignItems="center" justifyContent="center" py={8}>
               <CircularProgress />
            </Stack>
         ) : customer ? (
            <Box
               sx={{
                  maxHeight: "calc(92vh - 120px)",
                  overflowY: "auto",
                  overflowX: "hidden",
                  pr: { xs: 0.5, sm: 1 },
               }}
            >
               <Stack spacing={3}>
                  {/* Top Customer Info & Quick Summary */}
                  <Paper
                     variant="outlined"
                     sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.paper" }}
                  >
                     <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, sm: 7 }}>
                           <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                              <Typography variant="h6" fontWeight={700}>
                                 {customer.name}
                              </Typography>
                              <Chip
                                 label={customer.customId || "CUS"}
                                 color="success"
                                 size="small"
                                 sx={{ fontWeight: 700 }}
                              />
                           </Stack>

                           <Stack spacing={0.5}>
                              {customer.phone && (
                                 <Stack direction="row" spacing={1} alignItems="center">
                                    <Icon icon="solar:phone-bold" size="15px" />
                                    <Typography variant="body2" fontWeight={500}>
                                       {customer.phone}
                                    </Typography>
                                    <Tooltip title={copyText}>
                                       <Button
                                          size="small"
                                          variant="text"
                                          color="inherit"
                                          sx={{ minWidth: 24, p: 0.2 }}
                                          onClick={handleCopyPhone}
                                       >
                                          <Icon icon="solar:copy-bold-duotone" size="14px" />
                                       </Button>
                                    </Tooltip>
                                    <Tooltip title="Call now">
                                       <Button
                                          size="small"
                                          variant="text"
                                          color="primary"
                                          sx={{ minWidth: 24, p: 0.2 }}
                                          onClick={() => window.open(`tel:${customer.phone}`)}
                                       >
                                          <Icon
                                             icon="solar:outgoing-call-rounded-bold"
                                             size="14px"
                                          />
                                       </Button>
                                    </Tooltip>
                                 </Stack>
                              )}

                              {customer.email && (
                                 <Stack direction="row" spacing={1} alignItems="center">
                                    <Icon icon="solar:letter-bold" size="15px" />
                                    <Typography variant="body2" color="text.secondary">
                                       {customer.email}
                                    </Typography>
                                 </Stack>
                              )}

                              {customer.address && (
                                 <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <Box sx={{ mt: 0.25 }}>
                                       <Icon icon="solar:map-point-bold" size="15px" />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                       {customer.address}
                                    </Typography>
                                 </Stack>
                              )}
                           </Stack>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 5 }}>
                           <Paper
                              variant="outlined"
                              sx={{
                                 p: 1.5,
                                 borderRadius: 1.5,
                                 bgcolor: "action.hover",
                              }}
                           >
                              <Stack
                                 direction="row"
                                 justifyContent="space-between"
                                 alignItems="center"
                                 mb={0.5}
                              >
                                 <Typography variant="caption" fontWeight={600}>
                                    Delivery Success Rate
                                 </Typography>
                                 <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    color={
                                       analytics.overallStats.successRate >= 80
                                          ? "success.main"
                                          : "warning.main"
                                    }
                                 >
                                    {analytics.overallStats.successRate}%
                                 </Typography>
                              </Stack>
                              <LinearProgress
                                 variant="determinate"
                                 value={analytics.overallStats.successRate}
                                 color={
                                    analytics.overallStats.successRate >= 80
                                       ? "success"
                                       : "warning"
                                 }
                                 sx={{ height: 8, borderRadius: 1, mb: 1.5 }}
                              />
                              <Stack
                                 direction="row"
                                 justifyContent="space-between"
                                 alignItems="center"
                              >
                                 <Box textAlign="center">
                                    <Typography variant="caption" color="text.secondary">
                                       Total
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700}>
                                       {analytics.overallStats.totalOrders}
                                    </Typography>
                                 </Box>
                                 <Box textAlign="center">
                                    <Typography variant="caption" color="success.main">
                                       Delivered
                                    </Typography>
                                    <Typography
                                       variant="body2"
                                       fontWeight={700}
                                       color="success.main"
                                    >
                                       {analytics.overallStats.deliveredOrders}
                                    </Typography>
                                 </Box>
                                 <Box textAlign="center">
                                    <Typography variant="caption" color="error.main">
                                       Failed
                                    </Typography>
                                    <Typography
                                       variant="body2"
                                       fontWeight={700}
                                       color="error.main"
                                    >
                                       {analytics.overallStats.failedOrders}
                                    </Typography>
                                 </Box>
                                 <Box textAlign="center">
                                    <Typography variant="caption" color="warning.main">
                                       Pending
                                    </Typography>
                                    <Typography
                                       variant="body2"
                                       fontWeight={700}
                                       color="warning.main"
                                    >
                                       {analytics.overallStats.pendingOrders}
                                    </Typography>
                                 </Box>
                              </Stack>
                           </Paper>
                        </Grid>
                     </Grid>
                  </Paper>

                  {/* Section 2.A, 2.B, 2.D: Customer Order Statistics & Courier Breakdown */}
                  <CustomerOrderStatistics
                     overallStats={analytics.overallStats}
                     courierStats={analytics.courierStats}
                     courierPerformance={analytics.courierPerformance}
                  />

                  <Divider />

                  {/* Section 2.C: Customer Order History Table */}
                  <CustomerOrderHistoryTable
                     orders={orders}
                     onCloseModal={onClose}
                  />

                  {/* Bottom Close Button */}
                  <Stack direction="row" justifyContent="flex-end" pt={1}>
                     <Button
                        onClick={onClose}
                        variant="contained"
                        color="inherit"
                        size="small"
                     >
                        Close
                     </Button>
                  </Stack>
               </Stack>
            </Box>
         ) : (
            <Typography variant="body2" color="text.secondary">
               Customer not found.
            </Typography>
         )}
      </CustomModal>
   );
}
