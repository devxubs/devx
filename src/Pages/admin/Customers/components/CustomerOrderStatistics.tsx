"use client";

import React from "react";
import {
   Box,
   Grid,
   Paper,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableRow,
   Typography,
   Chip,
   LinearProgress,
   alpha,
   useTheme,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { useSettings } from "@src/lib/settingsContext";
import {
   OverallCustomerStats,
   CourierStatItem,
   CourierPerformanceSummary,
} from "./customerAnalyticsHelpers";

interface CustomerOrderStatisticsProps {
   overallStats: OverallCustomerStats;
   courierStats: CourierStatItem[];
   courierPerformance: CourierPerformanceSummary;
}

export default function CustomerOrderStatistics({
   overallStats,
   courierStats,
   courierPerformance,
}: CustomerOrderStatisticsProps) {
   const theme = useTheme();
   const { formatCurrency } = useSettings();

   return (
      <Stack spacing={2.5}>
         {/* ============================================================ */}
         {/* SECTION A: OVERALL STATISTICS CARDS                          */}
         {/* ============================================================ */}
         <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.primary">
               Overall Order Statistics
            </Typography>

            <Grid container spacing={1.5}>
               {/* 1. Total Orders */}
               <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <Paper
                     variant="outlined"
                     sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "background.paper",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                     }}
                  >
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                           sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: "primary.main",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                           }}
                        >
                           <Icon icon="solar:cart-large-minimalistic-bold" size="16px" />
                        </Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                           Total Orders
                        </Typography>
                     </Stack>
                     <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                        {overallStats.totalOrders}
                     </Typography>
                  </Paper>
               </Grid>

               {/* 2. Delivered Orders */}
               <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <Paper
                     variant="outlined"
                     sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "background.paper",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                     }}
                  >
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                           sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1,
                              bgcolor: alpha(theme.palette.success.main, 0.1),
                              color: "success.main",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                           }}
                        >
                           <Icon icon="solar:check-circle-bold" size="16px" />
                        </Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                           Delivered
                        </Typography>
                     </Stack>
                     <Typography
                        variant="h6"
                        fontWeight={700}
                        color="success.main"
                        sx={{ mt: 0.5 }}
                     >
                        {overallStats.deliveredOrders}
                     </Typography>
                  </Paper>
               </Grid>

               {/* 3. Failed Orders */}
               <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <Paper
                     variant="outlined"
                     sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "background.paper",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                     }}
                  >
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                           sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1,
                              bgcolor: alpha(theme.palette.error.main, 0.1),
                              color: "error.main",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                           }}
                        >
                           <Icon icon="solar:close-circle-bold" size="16px" />
                        </Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                           Failed
                        </Typography>
                     </Stack>
                     <Typography
                        variant="h6"
                        fontWeight={700}
                        color="error.main"
                        sx={{ mt: 0.5 }}
                     >
                        {overallStats.failedOrders}
                     </Typography>
                  </Paper>
               </Grid>

               {/* 4. Pending / Processing */}
               <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <Paper
                     variant="outlined"
                     sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "background.paper",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                     }}
                  >
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                           sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1,
                              bgcolor: alpha(theme.palette.warning.main, 0.1),
                              color: "warning.main",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                           }}
                        >
                           <Icon icon="solar:clock-circle-bold" size="16px" />
                        </Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                           Pending
                        </Typography>
                     </Stack>
                     <Typography
                        variant="h6"
                        fontWeight={700}
                        color="warning.main"
                        sx={{ mt: 0.5 }}
                     >
                        {overallStats.pendingOrders}
                     </Typography>
                  </Paper>
               </Grid>

               {/* 5. Total Amount Ordered */}
               <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Paper
                     variant="outlined"
                     sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "background.paper",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                     }}
                  >
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                           sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1,
                              bgcolor: alpha(theme.palette.info.main, 0.1),
                              color: "info.main",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                           }}
                        >
                           <Icon icon="solar:wallet-money-bold" size="16px" />
                        </Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                           Total Ordered
                        </Typography>
                     </Stack>
                     <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5 }}>
                        {formatCurrency(overallStats.totalAmountOrdered)}
                     </Typography>
                  </Paper>
               </Grid>

               {/* 6. Total Amount Delivered */}
               <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Paper
                     variant="outlined"
                     sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "background.paper",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                     }}
                  >
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                           sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1,
                              bgcolor: alpha(theme.palette.success.main, 0.1),
                              color: "success.main",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                           }}
                        >
                           <Icon icon="solar:card-check-bold" size="16px" />
                        </Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                           Delivered Amt
                        </Typography>
                     </Stack>
                     <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        color="success.main"
                        sx={{ mt: 0.5 }}
                     >
                        {formatCurrency(overallStats.totalAmountDelivered)}
                     </Typography>
                  </Paper>
               </Grid>
            </Grid>
         </Box>

         {/* ============================================================ */}
         {/* SECTION D: COURIER PERFORMANCE SUMMARY                       */}
         {/* ============================================================ */}
         <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.primary">
               Courier Performance Summary
            </Typography>

            <Grid container spacing={1.5}>
               <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper
                     variant="outlined"
                     sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                     }}
                  >
                     <Typography variant="caption" color="text.secondary">
                        Most Orders Handled
                     </Typography>
                     <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                        <Icon icon="solar:delivery-bold" size="18px" color="primary" />
                        <Typography variant="body2" fontWeight={700}>
                           {courierPerformance.mostOrdersCourier}
                        </Typography>
                        {courierPerformance.mostOrdersCount > 0 && (
                           <Chip
                              label={`${courierPerformance.mostOrdersCount} orders`}
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
                           />
                        )}
                     </Stack>
                  </Paper>
               </Grid>

               <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper
                     variant="outlined"
                     sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.success.main, 0.03),
                        borderColor: alpha(theme.palette.success.main, 0.2),
                     }}
                  >
                     <Typography variant="caption" color="text.secondary">
                        Most Successful Deliveries
                     </Typography>
                     <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                        <Icon icon="solar:box-minimalistic-bold" size="18px" color="success" />
                        <Typography variant="body2" fontWeight={700} color="success.main">
                           {courierPerformance.mostSuccessfulCourier}
                        </Typography>
                        {courierPerformance.mostSuccessCount > 0 && (
                           <Chip
                              label={`${courierPerformance.mostSuccessCount} delivered`}
                              size="small"
                              color="success"
                              sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
                           />
                        )}
                     </Stack>
                  </Paper>
               </Grid>

               <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper
                     variant="outlined"
                     sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.error.main, 0.03),
                        borderColor: alpha(theme.palette.error.main, 0.2),
                     }}
                  >
                     <Typography variant="caption" color="text.secondary">
                        Most Failed Deliveries
                     </Typography>
                     <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                        <Icon icon="solar:danger-triangle-bold" size="18px" color="error" />
                        <Typography variant="body2" fontWeight={700} color="error.main">
                           {courierPerformance.mostFailedCourier}
                        </Typography>
                        {courierPerformance.mostFailedCount > 0 && (
                           <Chip
                              label={`${courierPerformance.mostFailedCount} failed`}
                              size="small"
                              color="error"
                              sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
                           />
                        )}
                     </Stack>
                  </Paper>
               </Grid>
            </Grid>
         </Box>

         {/* ============================================================ */}
         {/* SECTION B: COURIER-WISE STATISTICS BREAKDOWN                 */}
         {/* ============================================================ */}
         <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
               <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  Courier-wise Statistics
               </Typography>
               <Typography variant="caption" color="text.secondary">
                  {courierStats.length} {courierStats.length === 1 ? "courier" : "couriers"} recorded
               </Typography>
            </Stack>

            <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
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
                     {courierStats.map((item) => (
                        <TableRow key={item.courier} hover>
                           <TableCell sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                 <Icon icon="solar:delivery-bold" size="16px" />
                                 <span>{item.courier}</span>
                              </Stack>
                           </TableCell>
                           <TableCell align="center" sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                              {item.totalOrders}
                           </TableCell>
                           <TableCell
                              align="center"
                              sx={{ fontSize: "0.8rem", fontWeight: 700, color: "success.main" }}
                           >
                              {item.delivered}
                           </TableCell>
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

                     {courierStats.length === 0 && (
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
      </Stack>
   );
}
