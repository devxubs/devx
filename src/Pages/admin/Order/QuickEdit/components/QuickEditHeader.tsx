import React from "react";
import {
   Alert,
   Chip,
   CircularProgress,
   Stack,
   Typography,
   useTheme,
} from "@mui/material";

interface QuickEditHeaderProps {
   effectiveOrderId?: string;
   invoiceNo?: string;
   status: string;
   isFetchingOrder?: boolean;
   errorMessage?: string | null;
   onClearError?: () => void;
}

export const QuickEditHeader: React.FC<QuickEditHeaderProps> = ({
   effectiveOrderId,
   invoiceNo,
   status,
   isFetchingOrder = false,
   errorMessage,
   onClearError,
}) => {
   const theme = useTheme();

   // BUG-C1 follow-through (Full Live QA Audit fix round): save
   // errors — including the server's "An order in status CANCELLED
   // cannot be changed to PENDING" rejection — were surfaced only
   // as a transient snackbar that fired and auto-cleared, so a
   // blocked save looked like it silently did nothing. The error
   // now renders as a persistent inline alert at the top of the
   // modal until the user dismisses it or saves successfully.

   const getStatusColor = (
      st: string,
   ): "success" | "error" | "info" | "warning" | "default" => {
      const upper = String(st || "").toUpperCase();
      if (upper === "DELIVERED" || upper === "COMPLETED") return "success";
      if (upper === "CANCELLED") return "error";
      if (upper === "CONFIRMED" || upper === "PROCESSING") return "info";
      return "warning";
   };

   return (
      <Stack spacing={1.5}>
         {errorMessage && (
            <Alert severity="error" onClose={onClearError}>
               {errorMessage}
            </Alert>
         )}
         {/* Order Badges Header Banner */}
         {effectiveOrderId && (
            <Stack
               direction="row"
               justifyContent="space-between"
               alignItems="center"
               flexWrap="wrap"
               gap={1}
               sx={{
                  px: 1.5,
                  py: 1,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
               }}
            >
               <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                     label={effectiveOrderId}
                     color="primary"
                     size="small"
                     sx={{
                        fontWeight: 700,
                        color: theme.palette.text.primary,
                     }}
                  />
                  {invoiceNo && (
                     <Typography variant="body2" color="text.secondary">
                        Invoice: <b>{invoiceNo}</b>
                     </Typography>
                  )}
               </Stack>

               {isFetchingOrder ? (
                  <Stack direction="row" spacing={0.8} alignItems="center">
                     <CircularProgress size={14} color="inherit" />
                     <Typography variant="caption" color="text.secondary">
                        Loading order details...
                     </Typography>
                  </Stack>
               ) : (
                  <Chip
                     label={status}
                     size="small"
                     color={getStatusColor(status)}
                     sx={{ fontWeight: 700, fontSize: "0.7rem", height: 22 }}
                  />
               )}
            </Stack>
         )}
      </Stack>
   );
};

export default QuickEditHeader;
