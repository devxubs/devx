import React from "react";
import { Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import Icon from "@src/components/Icon";
import { QuickEditCustomerData } from "../types";

interface QuickEditCustomerSectionProps {
   customer: QuickEditCustomerData;
   onChangeCustomer: (field: keyof QuickEditCustomerData, value: string) => void;
   status: string;
   onChangeStatus: (status: string) => void;
   orderSource: string;
   onChangeOrderSource: (source: string) => void;
   courier: string;
   onChangeCourier: (courier: string) => void;
   disabled?: boolean;
}

interface StatusOption {
   label: string;
   value: string;
}

const STATUS_OPTIONS: StatusOption[] = [
   { label: "Pending", value: "PENDING" },
   { label: "Confirmed", value: "CONFIRMED" },
   { label: "Processing", value: "PROCESSING" },
   { label: "Shipped", value: "SHIPPED" },
   { label: "Delivered", value: "DELIVERED" },
   { label: "Completed", value: "COMPLETED" },
   { label: "Hold", value: "HOLD" },
   { label: "Cancelled", value: "CANCELLED" },
];

const ORDER_SOURCES = [
   "Direct Sales",
   "Online Store",
   "Facebook",
   "WhatsApp",
   "Phone Call",
   "POS Counter",
   "Website",
   "Marketplace",
   "Other",
];

const COURIER_OPTIONS = [
   "None",
   "Steadfast Courier",
   "Pathao",
   "RedX",
   "Paperfly",
   "In-House Delivery",
   "Sundarban",
   "SA Paribahan",
];

export const QuickEditCustomerSection: React.FC<
   QuickEditCustomerSectionProps
> = ({
   customer,
   onChangeCustomer,
   status,
   onChangeStatus,
   orderSource,
   onChangeOrderSource,
   courier,
   onChangeCourier,
   disabled = false,
}) => {
   // Match current status with formatted label option
   const selectedStatusOption =
      STATUS_OPTIONS.find(
         (opt) => opt.value.toUpperCase() === String(status || "").toUpperCase(),
      ) ||
      STATUS_OPTIONS.find(
         (opt) => opt.label.toUpperCase() === String(status || "").toUpperCase(),
      ) ||
      (status
         ? { label: status, value: status.toUpperCase() }
         : STATUS_OPTIONS[0]);

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
            {/* Section Header */}
            <Stack direction="row" spacing={1} alignItems="center">
               <Icon
                  icon="solar:user-bold"
                  size="small"
                  style={{ color: "var(--mui-palette-primary-main, #00A76F)" }}
               />
               <Typography variant="subtitle2" fontWeight={700}>
                  Customer & Order Info
               </Typography>
            </Stack>

            {/* Fields Grid */}
            <Grid container spacing={2}>
               {/* Customer Name */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                     label="Customer Name"
                     size="small"
                     fullWidth
                     disabled={disabled}
                     value={customer.name}
                     onChange={(e) => onChangeCustomer("name", e.target.value)}
                     placeholder="Customer full name"
                  />
               </Grid>

               {/* Customer Phone */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                     label="Phone Number"
                     size="small"
                     fullWidth
                     disabled={disabled}
                     value={customer.phone}
                     onChange={(e) => onChangeCustomer("phone", e.target.value)}
                     placeholder="+8801XXXXXXXXX"
                  />
               </Grid>

               {/* Order Status using CustomAutocomplete */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <CustomAutocomplete
                     size="small"
                     arrow
                     label="Order Status"
                     placeholder="Select status..."
                     options={STATUS_OPTIONS}
                     disabled={disabled}
                     value={selectedStatusOption}
                     onChange={(val: any) => {
                        if (val) {
                           const nextVal =
                              typeof val === "string"
                                 ? val.toUpperCase()
                                 : val.value || val.label;
                           onChangeStatus(nextVal);
                        }
                     }}
                     getOptionLabel={(opt: any) =>
                        typeof opt === "string" ? opt : opt?.label || ""
                     }
                     isOptionEqualToValue={(opt: any, val: any) => {
                        if (!opt || !val) return false;
                        const optVal =
                           typeof opt === "string" ? opt : opt.value;
                        const curVal =
                           typeof val === "string" ? val : val.value;
                        return optVal.toUpperCase() === curVal.toUpperCase();
                     }}
                  />
               </Grid>

               {/* Delivery Address */}
               <Grid size={{ xs: 12, sm: 12, md: 6 }}>
                  <TextField
                     label="Delivery Address"
                     size="small"
                     fullWidth
                     disabled={disabled}
                     value={customer.address}
                     onChange={(e) =>
                        onChangeCustomer("address", e.target.value)
                     }
                     placeholder="Street address, city, district"
                  />
               </Grid>

               {/* Order Source using CustomAutocomplete */}
               <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <CustomAutocomplete
                     size="small"
                     arrow
                     label="Sales Channel / Source"
                     placeholder="Select source..."
                     options={ORDER_SOURCES}
                     disabled={disabled}
                     value={orderSource || "Direct Sales"}
                     onChange={(val: any) => {
                        if (val) {
                           const nextVal =
                              typeof val === "string"
                                 ? val
                                 : val.label || val.value || val;
                           onChangeOrderSource(nextVal);
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

               {/* Courier Method using CustomAutocomplete */}
               <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <CustomAutocomplete
                     size="small"
                     arrow
                     label="Fulfillment / Courier"
                     placeholder="Select courier..."
                     options={COURIER_OPTIONS}
                     disabled={disabled}
                     value={courier || "None"}
                     onChange={(val: any) => {
                        if (val) {
                           const nextVal =
                              typeof val === "string"
                                 ? val
                                 : val.label || val.value || val;
                           onChangeCourier(nextVal);
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
            </Grid>
         </Stack>
      </Paper>
   );
};

export default QuickEditCustomerSection;
