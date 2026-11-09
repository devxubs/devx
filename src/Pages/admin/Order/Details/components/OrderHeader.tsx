"use client";

import React from "react";
import {
   Box,
   Button,
   Chip,
   Paper,
   Stack,
   Typography,
   Tooltip,
   IconButton,
   useTheme,
   alpha,
} from "@mui/material";
import { useRouter } from "next/navigation";
import Icon from "@src/components/Icon";

interface OrderHeaderProps {
   displayOrderId: string;
   status: string;
   invoiceNo?: string | null;
   orderDate: Date;
   onOpenQuickEdit: () => void;
   onPrintInvoice?: () => void;
   orderId: string;
}

const statusColorMap: Record<
   string,
   | "default"
   | "primary"
   | "secondary"
   | "error"
   | "info"
   | "success"
   | "warning"
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
   RETURNED: "error",
   Returned: "error",
};

export default function OrderHeader({
   displayOrderId,
   status,
   invoiceNo,
   orderDate,
   onOpenQuickEdit,
   onPrintInvoice,
   orderId,
}: OrderHeaderProps) {
   const theme = useTheme();
   const router = useRouter();

   const statusColor = statusColorMap[status] || "default";

   return (
      <Box sx={{ "@media print": { display: "none" } }}>
         {/* Top Navigation Row */}
         <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
            <Button
               variant="text"
               color="inherit"
               size="small"
               startIcon={<Icon icon="solar:arrow-left-linear" size="16px" />}
               onClick={() => router.push("/admin/order")}
               sx={{
                  p: 0.5,
                  px: 1,
                  textTransform: "none",
                  fontSize: "0.825rem",
                  color: "text.secondary",
                  borderRadius: 1,
                  "&:hover": {
                     color: "text.primary",
                     bgcolor: "action.hover",
                  },
               }}
            >
               Back to Orders
            </Button>
            <Typography variant="caption" color="text.disabled">
               /
            </Typography>
            <Typography
               variant="caption"
               fontWeight={600}
               color="text.secondary"
            >
               {displayOrderId}
            </Typography>
         </Stack>

         {/* Main Header Row */}
         <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
         >
            {/* Left: Prominent Order ID, Status, Invoice, and Timestamp */}
            <Stack spacing={0.75}>
               <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  flexWrap="wrap"
               >
                  <Typography
                     variant="h4"
                     fontWeight={800}
                     letterSpacing="-0.02em"
                     color="text.primary"
                     sx={{ fontSize: { xs: "1.5rem", sm: "1.75rem" } }}
                  >
                     {displayOrderId}
                  </Typography>

                  <Chip
                     label={status}
                     color={statusColor}
                     size="small"
                     sx={{
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        height: 24,
                        px: 0.5,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                     }}
                  />

                  {invoiceNo && (
                     <Chip
                        label={`Invoice: ${invoiceNo}`}
                        variant="outlined"
                        size="small"
                        sx={{
                           fontWeight: 600,
                           fontFamily: "monospace",
                           fontSize: "0.75rem",
                           height: 24,
                           bgcolor: alpha(theme.palette.text.primary, 0.03),
                        }}
                     />
                  )}
               </Stack>

               {/* Date & Time metadata */}
               <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  flexWrap="wrap"
               >
                  <Stack direction="row" spacing={0.75} alignItems="center">
                     <Icon
                        icon="solar:calendar-date-bold"
                        size="15px"
                        color="primary"
                     />
                     <Typography
                        variant="body2"
                        color="text.secondary"
                        fontWeight={500}
                        sx={{ fontSize: "0.85rem" }}
                     >
                        Placed on{" "}
                        {orderDate.toLocaleDateString(undefined, {
                           year: "numeric",
                           month: "short",
                           day: "numeric",
                        })}
                     </Typography>
                  </Stack>

                  <Typography
                     variant="caption"
                     color="text.disabled"
                     sx={{ fontSize: "0.9rem" }}
                  >
                     •
                  </Typography>

                  <Stack direction="row" spacing={0.75} alignItems="center">
                     <Icon
                        icon="solar:clock-circle-bold"
                        size="15px"
                        color="primary"
                     />
                     <Typography
                        variant="body2"
                        color="text.secondary"
                        fontWeight={500}
                        sx={{ fontSize: "0.85rem" }}
                     >
                        {orderDate.toLocaleTimeString([], {
                           hour: "2-digit",
                           minute: "2-digit",
                        })}
                     </Typography>
                  </Stack>
               </Stack>
            </Stack>

            {/* Right: Compact Icon-only Actions Toolbar */}
            <Paper
               variant="outlined"
               sx={{
                  p: 0.5,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  flexWrap: "wrap",
                  bgcolor: "background.paper",
                  borderColor: "divider",
               }}
            >
               {/* Quick Edit in Modal */}
               <Tooltip title="Quick Edit" arrow>
                  <IconButton
                     color="inherit"
                     onClick={onOpenQuickEdit}
                     aria-label="Quick Edit"
                  >
                     <Icon icon="solar:pen-new-square-bold" size="18px" />
                  </IconButton>
               </Tooltip>

               {/* Full Order Edit */}
               <Tooltip title="Edit Order" arrow>
                  <IconButton
                     color="inherit"
                     onClick={() =>
                        router.push(`/admin/order/publish?id=${orderId}`)
                     }
                     aria-label="Edit Order"
                  >
                     <Icon icon="solar:pen-bold" size="18px" />
                  </IconButton>
               </Tooltip>

               {/* Print Invoice */}
               <Tooltip title="Print Invoice" arrow>
                  <IconButton
                     color="primary"
                     onClick={onPrintInvoice}
                     aria-label="Print Invoice"
                  >
                     <Icon icon="solar:printer-bold" size="18px" />
                  </IconButton>
               </Tooltip>
            </Paper>
         </Stack>
      </Box>
   );
}
