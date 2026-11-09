import React from "react";
import {
   Box,
   Chip,
   Grid,
   Paper,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import Icon from "@src/components/Icon";
import { QuickEditPricingData } from "../types";

interface QuickEditPricingSectionProps {
   pricing: QuickEditPricingData;
   onChangeField: (field: keyof QuickEditPricingData, value: any) => void;
   disabled?: boolean;
}

const PAYMENT_METHODS = [
   "Cash on Delivery",
   "bKash",
   "Nagad",
   "Rocket",
   "Card",
   "Bank Transfer",
];

export const QuickEditPricingSection: React.FC<
   QuickEditPricingSectionProps
> = ({ pricing, onChangeField, disabled = false }) => {
   const isPaidInFull = Number(pricing.dueAmount) <= 0;

   return (
      <Paper
         variant="outlined"
         sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 1,
            bgcolor: "background.paper",
            borderColor: "divider",
         }}
      >
         <Stack spacing={2}>
            {/* Header */}
            <Stack direction="row" spacing={1} alignItems="center">
               <Icon
                  icon="solar:card-2-bold"
                  size="small"
                  style={{
                     color: "var(--mui-palette-primary-main, #00A76F)",
                  }}
               />
               <Typography variant="subtitle2" fontWeight={700}>
                  Pricing & Settlement
               </Typography>
            </Stack>

            {/* Inputs Grid */}
            <Grid container spacing={2}>
               {/* Delivery Charge */}
               <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                     label="Delivery Charge (৳)"
                     size="small"
                     fullWidth
                     disabled={disabled}
                     type="number"
                     inputProps={{ min: 0, step: "any" }}
                     value={pricing.deliveryCharge}
                     onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onChangeField(
                           "deliveryCharge",
                           isNaN(val) ? 0 : Math.max(0, val),
                        );
                     }}
                  />
               </Grid>

               {/* Discount */}
               <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                     label="Discount (৳)"
                     size="small"
                     fullWidth
                     disabled={disabled}
                     type="number"
                     inputProps={{ min: 0, step: "any" }}
                     value={pricing.discount}
                     onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onChangeField(
                           "discount",
                           isNaN(val) ? 0 : Math.max(0, val),
                        );
                     }}
                  />
               </Grid>

               {/* Payment Method using CustomAutocomplete */}
               <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <CustomAutocomplete
                     size="small"
                     arrow
                     label="Payment Method"
                     placeholder="Select payment method..."
                     options={PAYMENT_METHODS}
                     disabled={disabled}
                     value={pricing.paymentMethod || "Cash on Delivery"}
                     onChange={(val: any) => {
                        if (val) {
                           const nextVal =
                              typeof val === "string"
                                 ? val
                                 : val.label || val.value || val;
                           onChangeField("paymentMethod", nextVal);
                        }
                     }}
                     getOptionLabel={(opt: any) =>
                        typeof opt === "string" ? opt : opt?.label || ""
                     }
                     isOptionEqualToValue={(opt: any, val: any) => {
                        if (!opt || !val) return false;
                        const optStr =
                           typeof opt === "string"
                              ? opt
                              : opt.label || opt.value;
                        const valStr =
                           typeof val === "string"
                              ? val
                              : val.label || val.value;
                        return optStr === valStr;
                     }}
                  />
               </Grid>

               {/* Advance Payment */}
               <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                     label="Advance Paid (৳)"
                     size="small"
                     fullWidth
                     disabled={disabled}
                     type="number"
                     inputProps={{ min: 0, step: "any" }}
                     value={pricing.advancePayment}
                     onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onChangeField(
                           "advancePayment",
                           isNaN(val) ? 0 : Math.max(0, val),
                        );
                     }}
                  />
               </Grid>
            </Grid>

            {/* Live Financial Breakdown Summary Panel */}
            <Box
               sx={{
                  p: 2,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
               }}
            >
               <Grid container spacing={1.5} alignItems="center">
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                     <Typography variant="caption" color="text.secondary">
                        Items Subtotal
                     </Typography>
                     <Typography variant="body2" fontWeight={700}>
                        ৳{pricing.subtotal.toLocaleString()}
                     </Typography>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                     <Typography variant="caption" color="text.secondary">
                        Delivery Fee
                     </Typography>
                     <Typography variant="body2" fontWeight={600}>
                        +৳{pricing.deliveryCharge.toLocaleString()}
                     </Typography>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                     <Typography variant="caption" color="text.secondary">
                        Discount
                     </Typography>
                     <Typography variant="body2" fontWeight={600}>
                        -৳{pricing.discount.toLocaleString()}
                     </Typography>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4, md: 2.5 }}>
                     <Typography variant="caption" color="text.secondary">
                        Grand Total
                     </Typography>
                     <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        color="primary.main"
                     >
                        ৳{pricing.total.toLocaleString()}
                     </Typography>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4, md: 1.5 }}>
                     <Typography variant="caption" color="text.secondary">
                        Paid
                     </Typography>
                     <Typography variant="body2" fontWeight={600}>
                        ৳{pricing.advancePayment.toLocaleString()}
                     </Typography>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                     <Typography variant="caption" color="text.secondary">
                        Balance Due
                     </Typography>
                     <Box sx={{ mt: 0.2 }}>
                        {isPaidInFull ? (
                           <Chip
                              label="Paid in Full"
                              size="small"
                              color="success"
                              sx={{
                                 fontWeight: 700,
                                 fontSize: "0.7rem",
                                 height: 22,
                              }}
                           />
                        ) : (
                           <Chip
                              label={`৳${pricing.dueAmount.toLocaleString()}`}
                              size="small"
                              color="warning"
                              sx={{
                                 fontWeight: 700,
                                 fontSize: "0.75rem",
                                 height: 22,
                              }}
                           />
                        )}
                     </Box>
                  </Grid>
               </Grid>
            </Box>
         </Stack>
      </Paper>
   );
};

export default QuickEditPricingSection;
