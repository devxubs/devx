"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
   Box,
   Button,
   Chip,
   CircularProgress,
   Divider,
   Grid,
   IconButton,
   Paper,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableRow,
   Typography,
   LinearProgress,
   Tooltip,
} from "@mui/material";
import { useRouter } from "next/navigation";
import CustomModal from "@src/components/Modal";
import Icon from "@src/components/Icon";
import Autocomplete, { CustomAutocompleteOptionType } from "@src/components/Autocomplete";
import { useSettings } from "@src/lib/settingsContext";
import {
   calculateCustomerAnalytics,
   OrderRecord,
   CourierStatItem,
} from "@src/Pages/admin/Customers/components/customerAnalyticsHelpers";

interface CustomerProfileModalProps {
   open: boolean;
   onClose: () => void;
   customerId?: string | null;
}

const statusColorMap: Record<
   string,
   "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
> = {
   PENDING: "warning",
   Pending: "warning",
   CONFIRMED: "info",
   Confirmed: "info",
   PROCESSING: "info",
   Processing: "info",
   SHIPPED: "primary",
   Shipped: "primary",
   OUT_FOR_DELIVERY: "primary",
   "Out for Delivery": "primary",
   DELIVERED: "success",
   Delivered: "success",
   COMPLETED: "success",
   Completed: "success",
   CANCELLED: "error",
   Cancelled: "error",
   FAILED: "error",
   Failed: "error",
   HOLD: "default",
   Hold: "default",
};

const statusFilterOptions: CustomAutocompleteOptionType[] = [
   { label: "All Statuses", value: "ALL" },
   { label: "Delivered", value: "DELIVERED" },
   { label: "Processing", value: "PROCESSING" },
   { label: "Confirmed", value: "CONFIRMED" },
   { label: "Pending", value: "PENDING" },
   { label: "Shipped", value: "SHIPPED" },
   { label: "Cancelled", value: "CANCELLED" },
   { label: "Failed", value: "FAILED" },
];

export default function CustomerProfileModal({
   open,
   onClose,
   customerId,
}: CustomerProfileModalProps) {
   const router = useRouter();
   const { formatCurrency } = useSettings();

   const [customer, setCustomer] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [copyText, setCopyText] = useState("Copy Phone Number");

   // Filters using shared Autocomplete
   const [statusFilter, setStatusFilter] = useState<CustomAutocompleteOptionType>(
      statusFilterOptions[0],
   );
   const [courierFilter, setCourierFilter] = useState<CustomAutocompleteOptionType>({
      label: "All Couriers",
      value: "ALL",
   });

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

   // Calculate analytics from customer and orders
   const analytics = useMemo(() => {
      if (customer?.overallStats && customer?.courierStats) {
         return {
            overallStats: customer.overallStats,
            courierStats: customer.courierStats as CourierStatItem[],
         };
      }
      return calculateCustomerAnalytics(orders);
   }, [customer, orders]);

   // Unique couriers available in this customer's orders
   const courierFilterOptions: CustomAutocompleteOptionType[] = useMemo(() => {
      const set = new Set<string>();
      for (const o of orders) {
         if (o.courier && o.courier.trim() !== "") {
            set.add(o.courier.trim());
         }
      }
      return [
         { label: "All Couriers", value: "ALL" },
         ...Array.from(set)
            .sort()
            .map((c) => ({ label: c, value: c })),
      ];
   }, [orders]);

   // Identify most-used courier and best delivery success rate based on actual data
   const { mostUsedCourier, bestRateCourier } = useMemo(() => {
      const stats = analytics.courierStats || [];
      if (stats.length === 0) return { mostUsedCourier: null, bestRateCourier: null };

      let maxOrders = 0;
      let mostUsed: string | null = null;
      let maxRate = -1;
      let bestRate: string | null = null;

      for (const item of stats) {
         if (item.totalOrders > maxOrders) {
            maxOrders = item.totalOrders;
            mostUsed = item.courier;
         }
         const finished = item.delivered + item.failed;
         if (finished > 0 && item.successRate > maxRate) {
            maxRate = item.successRate;
            bestRate = item.courier;
         }
      }

      return {
         mostUsedCourier: maxOrders > 0 ? mostUsed : null,
         bestRateCourier: maxRate > 0 ? bestRate : null,
      };
   }, [analytics.courierStats]);

   // Filtered orders list
   const filteredOrders = useMemo(() => {
      return orders.filter((o) => {
         // Status Filter
         if (statusFilter.value !== "ALL") {
            const ordStatus = (o.status || "").toUpperCase();
            if (ordStatus !== statusFilter.value.toUpperCase()) {
               return false;
            }
         }

         // Courier Filter
         if (courierFilter.value !== "ALL") {
            const ordCourier = (o.courier || "").trim().toUpperCase();
            if (ordCourier !== courierFilter.value.trim().toUpperCase()) {
               return false;
            }
         }

         return true;
      });
   }, [orders, statusFilter, courierFilter]);

   const handleCopyPhone = () => {
      if (!customer?.phone) return;
      navigator.clipboard.writeText(String(customer.phone));
      setCopyText("Copied!");
      setTimeout(() => setCopyText("Copy Phone Number"), 2000);
   };

   const handleOpenOrderDetails = (order: OrderRecord) => {
      onClose();
      const targetId = order.orderCode || order.orderId || order.customId || order.id;
      router.push(`/admin/order/${targetId}`);
   };

   // Display customer ID as CUS_ANALYTICS_TEST without modifying DB ID
   const displayCustomerId = customer?.customId || "CUS_ANALYTICS_TEST";

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
            borderRadius: 1,
            p: { xs: 2, sm: 2.5 },
         }}
      >
         {loading ? (
            <Stack alignItems="center" justifyContent="center" py={8}>
               <CircularProgress />
            </Stack>
         ) : customer ? (
            <Box
               sx={{
                  maxHeight: "calc(92vh - 110px)",
                  overflowY: "auto",
                  overflowX: "hidden",
                  pr: { xs: 0.5, sm: 1 },
               }}
            >
               <Stack spacing={2.5}>
                  {/* ============================================================ */}
                  {/* 1. CUSTOMER INFO & CONTACT ACTIONS                           */}
                  {/* ============================================================ */}
                  <Paper
                     variant="outlined"
                     sx={{ p: 2, borderRadius: 1, bgcolor: "background.paper" }}
                  >
                     <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, sm: 7 }}>
                           {/* Customer Name & ID Header */}
                           <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                              <Typography variant="h6" fontWeight={700}>
                                 {customer.name}
                              </Typography>
                              <Chip
                                 label={displayCustomerId}
                                 color="success"
                                 size="small"
                                 sx={{ fontWeight: 700, borderRadius: 1 }}
                              />
                           </Stack>

                           {/* Contact Buttons & Details */}
                           <Stack spacing={1}>
                              {customer.phone && (
                                 <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                                    <Icon icon="solar:phone-bold" size="16px" />
                                    <Typography variant="body2" fontWeight={600}>
                                       {customer.phone}
                                    </Typography>

                                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 0.5 }}>
                                       <Tooltip title={copyText} arrow>
                                          <IconButton
                                             size="small"
                                             onClick={handleCopyPhone}
                                             aria-label="Copy Phone Number"
                                             sx={{
                                                p: 0.5,
                                                borderRadius: 1,
                                                color: "text.secondary",
                                                "&:hover": {
                                                   color: "text.primary",
                                                   bgcolor: "action.hover",
                                                },
                                             }}
                                          >
                                             <Icon icon="solar:copy-bold-duotone" size="16px" />
                                          </IconButton>
                                       </Tooltip>

                                       <Tooltip title="Call Now" arrow>
                                          <IconButton
                                             size="small"
                                             color="primary"
                                             onClick={() => window.open(`tel:${customer.phone}`)}
                                             aria-label="Call Now"
                                             sx={{
                                                p: 0.5,
                                                borderRadius: 1,
                                                "&:hover": {
                                                   bgcolor: "action.hover",
                                                },
                                             }}
                                          >
                                             <Icon icon="solar:phone-bold" size="16px" />
                                          </IconButton>
                                       </Tooltip>
                                    </Stack>
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

                        {/* Delivery Success Rate Progress */}
                        <Grid size={{ xs: 12, sm: 5 }}>
                           <Paper
                              variant="outlined"
                              sx={{
                                 p: 1.5,
                                 borderRadius: 1,
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
                                 sx={{ height: 7, borderRadius: 1, mb: 1.5 }}
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

                  {/* ============================================================ */}
                  {/* 2. REFINED OVERALL ORDER STATISTICS CARDS                     */}
                  {/* ============================================================ */}
                  <Box>
                     <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        mb={1.25}
                        color="text.primary"
                     >
                        Overall Order Statistics
                     </Typography>

                     <Grid container spacing={1.5}>
                        {/* Total Orders */}
                        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                           <Paper
                              variant="outlined"
                              sx={{
                                 p: 1.5,
                                 borderRadius: 1,
                                 bgcolor: "background.paper",
                                 height: "100%",
                                 display: "flex",
                                 flexDirection: "column",
                                 justifyContent: "space-between",
                              }}
                           >
                              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                 Total Orders
                              </Typography>
                              <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                                 {analytics.overallStats.totalOrders}
                              </Typography>
                           </Paper>
                        </Grid>

                        {/* Delivered Orders */}
                        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                           <Paper
                              variant="outlined"
                              sx={{
                                 p: 1.5,
                                 borderRadius: 1,
                                 bgcolor: "background.paper",
                                 height: "100%",
                                 display: "flex",
                                 flexDirection: "column",
                                 justifyContent: "space-between",
                              }}
                           >
                              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                 Delivered
                              </Typography>
                              <Typography
                                 variant="h6"
                                 fontWeight={700}
                                 color="success.main"
                                 sx={{ mt: 0.5 }}
                              >
                                 {analytics.overallStats.deliveredOrders}
                              </Typography>
                           </Paper>
                        </Grid>

                        {/* Failed Orders */}
                        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                           <Paper
                              variant="outlined"
                              sx={{
                                 p: 1.5,
                                 borderRadius: 1,
                                 bgcolor: "background.paper",
                                 height: "100%",
                                 display: "flex",
                                 flexDirection: "column",
                                 justifyContent: "space-between",
                              }}
                           >
                              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                 Failed
                              </Typography>
                              <Typography
                                 variant="h6"
                                 fontWeight={700}
                                 color="error.main"
                                 sx={{ mt: 0.5 }}
                              >
                                 {analytics.overallStats.failedOrders}
                              </Typography>
                           </Paper>
                        </Grid>

                        {/* Pending Orders */}
                        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                           <Paper
                              variant="outlined"
                              sx={{
                                 p: 1.5,
                                 borderRadius: 1,
                                 bgcolor: "background.paper",
                                 height: "100%",
                                 display: "flex",
                                 flexDirection: "column",
                                 justifyContent: "space-between",
                              }}
                           >
                              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                 Pending
                              </Typography>
                              <Typography
                                 variant="h6"
                                 fontWeight={700}
                                 color="warning.main"
                                 sx={{ mt: 0.5 }}
                              >
                                 {analytics.overallStats.pendingOrders}
                              </Typography>
                           </Paper>
                        </Grid>

                        {/* Total Amount Ordered */}
                        <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                           <Paper
                              variant="outlined"
                              sx={{
                                 p: 1.5,
                                 borderRadius: 1,
                                 bgcolor: "background.paper",
                                 height: "100%",
                                 display: "flex",
                                 flexDirection: "column",
                                 justifyContent: "space-between",
                              }}
                           >
                              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                 Total Ordered
                              </Typography>
                              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5 }}>
                                 {formatCurrency(analytics.overallStats.totalAmountOrdered)}
                              </Typography>
                           </Paper>
                        </Grid>

                        {/* Total Amount Delivered */}
                        <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                           <Paper
                              variant="outlined"
                              sx={{
                                 p: 1.5,
                                 borderRadius: 1,
                                 bgcolor: "background.paper",
                                 height: "100%",
                                 display: "flex",
                                 flexDirection: "column",
                                 justifyContent: "space-between",
                              }}
                           >
                              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                 Delivered Amt
                              </Typography>
                              <Typography
                                 variant="subtitle2"
                                 fontWeight={700}
                                 color="success.main"
                                 sx={{ mt: 0.5 }}
                              >
                                 {formatCurrency(analytics.overallStats.totalAmountDelivered)}
                              </Typography>
                           </Paper>
                        </Grid>
                     </Grid>
                  </Box>

                  {/* ============================================================ */}
                  {/* 3. MERGED COURIER PERFORMANCE SECTION                        */}
                  {/* ============================================================ */}
                  <Box>
                     <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                           Courier Performance
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                           {analytics.courierStats.length}{" "}
                           {analytics.courierStats.length === 1 ? "courier" : "couriers"} logged
                        </Typography>
                     </Stack>

                     <Paper variant="outlined" sx={{ borderRadius: 1, overflow: "hidden" }}>
                        <Table size="small">
                           <TableHead>
                              <TableRow sx={{ bgcolor: "action.hover" }}>
                                 <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Courier Company
                                 </TableCell>
                                 <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Total Orders
                                 </TableCell>
                                 <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Delivered
                                 </TableCell>
                                 <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Failed
                                 </TableCell>
                                 <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Pending
                                 </TableCell>
                                 <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Success Rate
                                 </TableCell>
                              </TableRow>
                           </TableHead>
                           <TableBody>
                              {analytics.courierStats.map((item) => (
                                 <TableRow key={item.courier} hover>
                                    {/* Courier Name & Badges */}
                                    <TableCell sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                                       <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                          <Icon icon="solar:delivery-bold" size="16px" />
                                          <Typography variant="body2" fontWeight={600}>
                                             {item.courier}
                                          </Typography>
                                          {item.courier === mostUsedCourier && (
                                             <Chip
                                                label="Most Used"
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                sx={{
                                                   height: 18,
                                                   fontSize: "0.65rem",
                                                   fontWeight: 700,
                                                   borderRadius: 1,
                                                }}
                                             />
                                          )}
                                          {item.courier === bestRateCourier && (
                                             <Chip
                                                label="Best Rate"
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                                sx={{
                                                   height: 18,
                                                   fontSize: "0.65rem",
                                                   fontWeight: 700,
                                                   borderRadius: 1,
                                                }}
                                             />
                                          )}
                                       </Stack>
                                    </TableCell>

                                    {/* Total Orders */}
                                    <TableCell align="center" sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                                       {item.totalOrders}
                                    </TableCell>

                                    {/* Delivered */}
                                    <TableCell
                                       align="center"
                                       sx={{ fontSize: "0.8rem", fontWeight: 700, color: "success.main" }}
                                    >
                                       {item.delivered}
                                    </TableCell>

                                    {/* Failed */}
                                    <TableCell
                                       align="center"
                                       sx={{
                                          fontSize: "0.8rem",
                                          fontWeight: 700,
                                          color: item.failed > 0 ? "error.main" : "text.secondary",
                                       }}
                                    >
                                       {item.failed}
                                    </TableCell>

                                    {/* Pending */}
                                    <TableCell
                                       align="center"
                                       sx={{
                                          fontSize: "0.8rem",
                                          fontWeight: 600,
                                          color: item.pending > 0 ? "warning.main" : "text.secondary",
                                       }}
                                    >
                                       {item.pending}
                                    </TableCell>

                                    {/* Success Rate */}
                                    <TableCell align="right" sx={{ fontSize: "0.8rem" }}>
                                       <Stack
                                          direction="row"
                                          spacing={1}
                                          alignItems="center"
                                          justifyContent="flex-end"
                                       >
                                          <Box sx={{ width: 60 }}>
                                             <LinearProgress
                                                variant="determinate"
                                                value={item.successRate}
                                                color={
                                                   item.successRate >= 80
                                                      ? "success"
                                                      : item.successRate >= 50
                                                        ? "warning"
                                                        : "error"
                                                }
                                                sx={{ height: 6, borderRadius: 1 }}
                                             />
                                          </Box>
                                          <Typography
                                             variant="caption"
                                             fontWeight={700}
                                             sx={{ minWidth: 35, textAlign: "right" }}
                                             color={
                                                item.successRate >= 80
                                                   ? "success.main"
                                                   : item.successRate >= 50
                                                     ? "warning.main"
                                                     : "error.main"
                                             }
                                          >
                                             {item.successRate}%
                                          </Typography>
                                       </Stack>
                                    </TableCell>
                                 </TableRow>
                              ))}

                              {analytics.courierStats.length === 0 && (
                                 <TableRow>
                                    <TableCell
                                       colSpan={6}
                                       align="center"
                                       sx={{ py: 3, color: "text.secondary" }}
                                    >
                                       No courier shipments logged for this customer.
                                    </TableCell>
                                 </TableRow>
                              )}
                           </TableBody>
                        </Table>
                     </Paper>
                  </Box>

                  <Divider />

                  {/* ============================================================ */}
                  {/* 4. CUSTOMER ORDER HISTORY (SHARED AUTOCOMPLETE FILTERS)     */}
                  {/* ============================================================ */}
                  <Box>
                     <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "stretch", sm: "center" }}
                        gap={1.5}
                        mb={1.5}
                     >
                        <Stack direction="row" spacing={1} alignItems="center">
                           <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                              Customer Order History
                           </Typography>
                           <Chip
                              label={`${filteredOrders.length} of ${orders.length}`}
                              size="small"
                              sx={{ height: 20, fontSize: "0.75rem", fontWeight: 600, borderRadius: 1 }}
                           />
                        </Stack>

                        {/* Filters using Shared Autocomplete (NO Search Bar) */}
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                           {/* Status Autocomplete */}
                           <Box sx={{ width: { xs: "100%", sm: 160 } }}>
                              <Autocomplete
                                 size="small"
                                 arrow={true}
                                 options={statusFilterOptions}
                                 value={statusFilter}
                                 onChange={(val: any) => {
                                    setStatusFilter(val || statusFilterOptions[0]);
                                 }}
                                 getOptionLabel={(opt: any) => opt?.label || ""}
                                 isOptionEqualToValue={(opt: any, val: any) => opt?.value === val?.value}
                                 label="Order Status"
                                 sx={{ borderRadius: 1 }}
                              />
                           </Box>

                           {/* Courier Company Autocomplete */}
                           <Box sx={{ width: { xs: "100%", sm: 170 } }}>
                              <Autocomplete
                                 size="small"
                                 arrow={true}
                                 options={courierFilterOptions}
                                 value={courierFilter}
                                 onChange={(val: any) => {
                                    setCourierFilter(val || courierFilterOptions[0]);
                                 }}
                                 getOptionLabel={(opt: any) => opt?.label || ""}
                                 isOptionEqualToValue={(opt: any, val: any) => opt?.value === val?.value}
                                 label="Courier Company"
                                 sx={{ borderRadius: 1 }}
                              />
                           </Box>
                        </Stack>
                     </Stack>

                     {/* Orders History Table */}
                     <Paper variant="outlined" sx={{ borderRadius: 1, overflow: "hidden" }}>
                        <Table size="small">
                           <TableHead>
                              <TableRow sx={{ bgcolor: "action.hover" }}>
                                 <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Order ID
                                 </TableCell>
                                 <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Date & Time
                                 </TableCell>
                                 <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Amount
                                 </TableCell>
                                 <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Payment Status
                                 </TableCell>
                                 <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Order Status
                                 </TableCell>
                                 <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Courier Company
                                 </TableCell>
                                 <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Action
                                 </TableCell>
                              </TableRow>
                           </TableHead>
                           <TableBody>
                              {filteredOrders.map((ord) => {
                                 const isPaid = Number(ord.dueAmount || 0) <= 0;
                                 const displayId = ord.orderCode || ord.orderId || ord.customId || `ORD_${ord.id}`;
                                 return (
                                    <TableRow key={ord.id} hover>
                                       {/* Order ID - Clickable link */}
                                       <TableCell sx={{ fontSize: "0.8rem", fontWeight: 700 }}>
                                          <Typography
                                             variant="body2"
                                             fontWeight={700}
                                             color="primary.main"
                                             sx={{
                                                cursor: "pointer",
                                                display: "inline-block",
                                                "&:hover": { textDecoration: "underline" },
                                             }}
                                             onClick={() => handleOpenOrderDetails(ord)}
                                          >
                                             {displayId}
                                          </Typography>
                                          {ord.invoiceNo && (
                                             <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                                sx={{ fontSize: "0.7rem" }}
                                             >
                                                {ord.invoiceNo}
                                             </Typography>
                                          )}
                                       </TableCell>

                                       {/* Date & Time */}
                                       <TableCell sx={{ fontSize: "0.8rem" }}>
                                          <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                                             {new Date(ord.createdAt).toLocaleDateString()}
                                          </Typography>
                                          <Typography
                                             variant="caption"
                                             color="text.secondary"
                                             sx={{ fontSize: "0.7rem" }}
                                          >
                                             {new Date(ord.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                             })}
                                          </Typography>
                                       </TableCell>

                                       {/* Amount */}
                                       <TableCell
                                          align="right"
                                          sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                                       >
                                          {formatCurrency(Number(ord.total || 0))}
                                       </TableCell>

                                       {/* Payment Status */}
                                       <TableCell align="center" sx={{ fontSize: "0.8rem" }}>
                                          <Chip
                                             label={
                                                isPaid
                                                   ? "PAID"
                                                   : `DUE: ${formatCurrency(Number(ord.dueAmount || 0))}`
                                             }
                                             size="small"
                                             color={isPaid ? "success" : "warning"}
                                             sx={{
                                                fontWeight: 700,
                                                height: 22,
                                                fontSize: "0.7rem",
                                                borderRadius: 1,
                                             }}
                                          />
                                       </TableCell>

                                       {/* Order Status */}
                                       <TableCell align="center" sx={{ fontSize: "0.8rem" }}>
                                          <Chip
                                             label={ord.status}
                                             size="small"
                                             color={statusColorMap[ord.status] || "default"}
                                             sx={{
                                                fontWeight: 700,
                                                height: 22,
                                                fontSize: "0.7rem",
                                                borderRadius: 1,
                                             }}
                                          />
                                       </TableCell>

                                       {/* Courier Company */}
                                       <TableCell sx={{ fontSize: "0.8rem" }}>
                                          {ord.courier && ord.courier.trim() !== "" ? (
                                             <Stack direction="row" spacing={0.75} alignItems="center">
                                                <Icon icon="solar:delivery-bold" size="14px" />
                                                <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                                                   {ord.courier}
                                                </Typography>
                                             </Stack>
                                          ) : (
                                             <Typography variant="caption" color="text.secondary">
                                                Not Assigned
                                             </Typography>
                                          )}
                                       </TableCell>

                                       {/* Action button */}
                                       <TableCell align="right">
                                          <Tooltip title="View Order Details Page">
                                             <Button
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                                startIcon={<Icon icon="solar:eye-bold" size="14px" />}
                                                sx={{
                                                   textTransform: "none",
                                                   py: 0.25,
                                                   px: 1,
                                                   fontSize: "0.75rem",
                                                   fontWeight: 600,
                                                   borderRadius: 1,
                                                }}
                                                onClick={() => handleOpenOrderDetails(ord)}
                                             >
                                                View
                                             </Button>
                                          </Tooltip>
                                       </TableCell>
                                    </TableRow>
                                 );
                              })}

                              {filteredOrders.length === 0 && (
                                 <TableRow>
                                    <TableCell
                                       colSpan={7}
                                       align="center"
                                       sx={{ py: 3, color: "text.secondary" }}
                                    >
                                       {orders.length === 0
                                          ? "No orders found for this customer."
                                          : "No orders match the selected filters."}
                                    </TableCell>
                                 </TableRow>
                              )}
                           </TableBody>
                        </Table>
                     </Paper>
                  </Box>

                  {/* Bottom Close Button */}
                  <Stack direction="row" justifyContent="flex-end" pt={1}>
                     <Button
                        onClick={onClose}
                        variant="contained"
                        color="inherit"
                        size="small"
                        sx={{ borderRadius: 1 }}
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
