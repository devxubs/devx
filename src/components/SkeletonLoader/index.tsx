"use client";

import React from "react";
import { Stack, Skeleton, Grid, Box, Paper } from "@mui/material";

/**
 * 1. Data Tables and Filter Toolbars Skeleton
 */
export const TableSkeleton = ({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) => {
   return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, width: "100%" }}>
         {/* Top Filter Bar Skeleton */}
         <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Skeleton variant="rounded" width={220} height={36} />
            <Stack direction="row" spacing={1}>
               <Skeleton variant="rounded" width={80} height={36} />
               <Skeleton variant="rounded" width={100} height={36} />
            </Stack>
         </Stack>

         {/* Header Columns */}
         <Stack direction="row" spacing={2} py={1.5} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
            {Array.from({ length: cols }).map((_, i) => (
               <Skeleton key={i} variant="text" width={`${100 / cols}%`} height={24} />
            ))}
         </Stack>

         {/* Rows */}
         <Stack spacing={1.5} mt={1.5}>
            {Array.from({ length: rows }).map((_, r) => (
               <Stack key={r} direction="row" spacing={2} alignItems="center" py={1}>
                  {Array.from({ length: cols }).map((_, c) => (
                     <Skeleton key={c} variant="rounded" width={`${100 / cols}%`} height={28} />
                  ))}
               </Stack>
            ))}
         </Stack>
      </Paper>
   );
};

/**
 * 2. Dashboard Cards and Charts Skeleton
 */
export const DashboardSkeleton = () => {
   return (
      <Stack spacing={3} py={1} width="100%">
         {/* 3 Metric Summary Cards */}
         <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
               <Skeleton variant="rounded" height={130} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
               <Skeleton variant="rounded" height={130} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
               <Skeleton variant="rounded" height={130} sx={{ borderRadius: 2 }} />
            </Grid>

            {/* Inventory Distribution by Category (4 cols) + Yearly Chart (8 cols) */}
            <Grid size={{ xs: 12, md: 4 }}>
               <Skeleton variant="rounded" height={340} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
               <Skeleton variant="rounded" height={340} sx={{ borderRadius: 2 }} />
            </Grid>

            {/* Sales Overview (8 cols) + Balance (4 cols) */}
            <Grid size={{ xs: 12, md: 8 }}>
               <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
               <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
            </Grid>

            {/* Employee Ranking Table (12 cols) */}
            <Grid size={{ xs: 12 }}>
               <TableSkeleton rows={5} cols={5} />
            </Grid>
         </Grid>
      </Stack>
   );
};

/**
 * 3. Products and Inventory Skeleton
 */
export const ProductSkeleton = () => {
   return (
      <Stack spacing={3} py={2} width="100%">
         {/* Top action header */}
         <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Skeleton variant="text" width={180} height={36} />
            <Skeleton variant="rounded" width={130} height={40} />
         </Stack>

         {/* Product Metric Highlights */}
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
               <Skeleton variant="rounded" height={90} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <Skeleton variant="rounded" height={90} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <Skeleton variant="rounded" height={90} sx={{ borderRadius: 2 }} />
            </Grid>
         </Grid>

         {/* Product Table with thumbnails */}
         <TableSkeleton rows={7} cols={6} />
      </Stack>
   );
};

/**
 * 4. Orders and Purchases Skeleton
 */
export const OrderSkeleton = () => {
   return (
      <Stack spacing={2.5} py={2} width="100%">
         {/* Order Status Tabs */}
         <Stack direction="row" spacing={1} overflow="hidden">
            {Array.from({ length: 6 }).map((_, i) => (
               <Skeleton key={i} variant="rounded" width={90} height={36} sx={{ borderRadius: 1.5 }} />
            ))}
         </Stack>

         {/* Filter Bar */}
         <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Grid container spacing={1.5} alignItems="center">
               <Grid size={{ xs: 12, sm: 4 }}>
                  <Skeleton variant="rounded" height={38} />
               </Grid>
               <Grid size={{ xs: 6, sm: 2 }}>
                  <Skeleton variant="rounded" height={38} />
               </Grid>
               <Grid size={{ xs: 6, sm: 2 }}>
                  <Skeleton variant="rounded" height={38} />
               </Grid>
               <Grid size={{ xs: 6, sm: 2 }}>
                  <Skeleton variant="rounded" height={38} />
               </Grid>
               <Grid size={{ xs: 6, sm: 2 }}>
                  <Skeleton variant="rounded" height={38} />
               </Grid>
            </Grid>
         </Paper>

         {/* Orders Table */}
         <TableSkeleton rows={8} cols={7} />
      </Stack>
   );
};

/**
 * 5. Reports and Analytics Skeleton
 */
export const ReportSkeleton = () => {
   return (
      <Stack spacing={3} py={2} width="100%">
         {/* Reports Tab Navigation */}
         <Stack direction="row" spacing={1} overflow="hidden">
            {Array.from({ length: 8 }).map((_, i) => (
               <Skeleton key={i} variant="rounded" width={100} height={38} sx={{ borderRadius: 1.5 }} />
            ))}
         </Stack>

         {/* 3 Analytics Cards */}
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
               <Skeleton variant="rounded" height={110} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <Skeleton variant="rounded" height={110} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <Skeleton variant="rounded" height={110} sx={{ borderRadius: 2 }} />
            </Grid>

            {/* Main Graph & Secondary Chart */}
            <Grid size={{ xs: 12, md: 8 }}>
               <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
               <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
            </Grid>

            {/* Table */}
            <Grid size={{ xs: 12 }}>
               <TableSkeleton rows={6} cols={6} />
            </Grid>
         </Grid>
      </Stack>
   );
};

/**
 * 6. Chat and Conversation List Skeleton
 */
export const ChatSkeleton = () => {
   return (
      <Stack
         direction="row"
         height={{ xs: 500, md: 580 }}
         width="100%"
         bgcolor="background.paper"
         borderRadius={2}
         boxShadow={3}
         overflow="hidden"
      >
         {/* Sidebar List */}
         <Stack width={300} borderRight={1} borderColor="divider" p={2} spacing={2}>
            <Skeleton variant="rounded" height={38} sx={{ borderRadius: 1 }} />
            {Array.from({ length: 6 }).map((_, i) => (
               <Stack key={i} direction="row" spacing={1.5} alignItems="center">
                  <Skeleton variant="circular" width={42} height={42} />
                  <Stack spacing={0.5} flex={1}>
                     <Skeleton variant="text" width="70%" height={20} />
                     <Skeleton variant="text" width="40%" height={16} />
                  </Stack>
               </Stack>
            ))}
         </Stack>

         {/* Chat Area */}
         <Stack flex={1} p={2} spacing={2}>
            {/* Chat Header */}
            <Stack direction="row" spacing={1.5} alignItems="center" pb={1} borderBottom={1} borderColor="divider">
               <Skeleton variant="circular" width={40} height={40} />
               <Skeleton variant="text" width={140} height={24} />
            </Stack>

            {/* Alternating Message Bubbles */}
            <Stack spacing={2} flex={1} justifyContent="center" px={2}>
               <Skeleton variant="rounded" width={220} height={45} sx={{ borderRadius: 2, alignSelf: "flex-start" }} />
               <Skeleton variant="rounded" width={180} height={40} sx={{ borderRadius: 2, alignSelf: "flex-end" }} />
               <Skeleton variant="rounded" width={260} height={50} sx={{ borderRadius: 2, alignSelf: "flex-start" }} />
               <Skeleton variant="rounded" width={200} height={45} sx={{ borderRadius: 2, alignSelf: "flex-end" }} />
            </Stack>

            {/* Bottom Input Area */}
            <Skeleton variant="rounded" height={48} sx={{ borderRadius: 1.5 }} />
         </Stack>
      </Stack>
   );
};

/**
 * 7. Entity Detail View Skeleton
 */
export const DetailModalSkeleton = () => {
   return (
      <Stack spacing={2.5} p={1} width="100%">
         {/* Top identity banner */}
         <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={56} height={56} />
            <Stack spacing={0.5} flex={1}>
               <Skeleton variant="text" width={160} height={28} />
               <Skeleton variant="text" width={100} height={20} />
            </Stack>
         </Stack>

         {/* Key-Value Details */}
         <Grid container spacing={2}>
            {Array.from({ length: 6 }).map((_, i) => (
               <Grid size={{ xs: 6, sm: 4 }} key={i}>
                  <Skeleton variant="text" width={80} height={16} />
                  <Skeleton variant="rounded" height={32} sx={{ mt: 0.5, borderRadius: 1 }} />
               </Grid>
            ))}
         </Grid>

         {/* Secondary table or history */}
         <Skeleton variant="rounded" height={160} sx={{ borderRadius: 1.5 }} />
      </Stack>
   );
};

/**
 * Default Page Skeleton
 */
export const PageSkeleton = () => {
   return (
      <Stack spacing={3} py={2} width="100%">
         <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Skeleton variant="text" width={160} height={32} />
            <Skeleton variant="rounded" width={120} height={40} />
         </Stack>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
               <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
            </Grid>
         </Grid>

         <TableSkeleton rows={6} cols={5} />
      </Stack>
   );
};

export default PageSkeleton;
