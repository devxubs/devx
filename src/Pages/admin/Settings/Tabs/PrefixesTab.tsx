"use client";

import React from "react";
import {
   Grid,
   Stack,
   TextField,
   Typography,
   Box,
   Card,
   CardContent,
   Chip,
   Divider,
   Paper,
} from "@mui/material";
import Icon from "@src/components/Icon";

interface PrefixesTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
}

interface PrefixItem {
   key: string;
   label: string;
   description: string;
   defaultPrefix: string;
   icon: string;
}

const prefixDefinitions: PrefixItem[] = [
   {
      key: "prefixEmployee",
      label: "Employees / Users",
      description: "Identifiers assigned to cashiers, managers, and staff accounts",
      defaultPrefix: "EP_",
      icon: "solar:users-group-two-rounded-bold-duotone",
   },
   {
      key: "prefixCustomer",
      label: "Customers",
      description: "Customer directory accounts and walk-in shopper IDs",
      defaultPrefix: "CUS_",
      icon: "solar:user-circle-bold-duotone",
   },
   {
      key: "prefixSupplier",
      label: "Suppliers & Vendors",
      description: "Wholesale suppliers, manufacturers, and trade vendor IDs",
      defaultPrefix: "SUP_",
      icon: "solar:shop-2-bold-duotone",
   },
   {
      key: "prefixOrder",
      label: "Sales Orders",
      description: "Counter and retail POS sales invoice order numbers",
      defaultPrefix: "ORD_",
      icon: "solar:cart-large-minimalistic-bold-duotone",
   },
   {
      key: "prefixPurchase",
      label: "Purchase Orders",
      description: "Procurement bills, receiving vouchers, and purchase invoices",
      defaultPrefix: "PUR_",
      icon: "solar:bag-check-bold-duotone",
   },
   {
      key: "prefixProduct",
      label: "Products & Catalog",
      description: "Inventory items, merchandise SKU codes, and barcodes",
      defaultPrefix: "PROD_",
      icon: "solar:box-bold-duotone",
   },
   {
      key: "prefixCategory",
      label: "Product Categories",
      description: "Classification groups and merchandise taxonomy IDs",
      defaultPrefix: "CAT_",
      icon: "solar:folder-bold-duotone",
   },
   {
      key: "prefixUnit",
      label: "Units of Measure",
      description: "Measurement standards (Pcs, Kg, Box, Liters, etc.)",
      defaultPrefix: "UNIT_",
      icon: "solar:ruler-bold-duotone",
   },
   {
      key: "prefixExpense",
      label: "Store Expenses",
      description: "Operational cost vouchers, petty cash slips, and overheads",
      defaultPrefix: "EXP_",
      icon: "solar:wallet-money-bold-duotone",
   },
   {
      key: "prefixAsset",
      label: "Company Assets",
      description: "Store equipment, machinery, fixtures, and capital assets",
      defaultPrefix: "AST_",
      icon: "solar:buildings-bold-duotone",
   },
   {
      key: "prefixRole",
      label: "User Security Roles",
      description: "Access permission levels and staff role classifications",
      defaultPrefix: "ROLE_",
      icon: "solar:shield-user-bold-duotone",
   },
   {
      key: "prefixBilling",
      label: "Billing Settlements",
      description: "Payment gateway payouts, transfer settlements, and slips",
      defaultPrefix: "BILL_",
      icon: "solar:card-recive-bold-duotone",
   },
];

export default function PrefixesTab({ values, onChange }: PrefixesTabProps) {
   return (
      <Stack spacing={3}>
         <Box>
            <Typography variant="h6" fontWeight={600}>
               Sequential Entity ID Formats & Prefixes
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Configure custom prefix codes for each entity type. IDs are generated automatically and sequentially starting from 1 (e.g. EP_1, CUS_1, ORD_1).
            </Typography>
         </Box>

         <Paper
            variant="outlined"
            sx={{
               p: 2,
               borderRadius: 2,
               bgcolor: "action.hover",
               display: "flex",
               alignItems: "center",
               gap: 1.5,
            }}
         >
            <Icon icon="solar:info-circle-bold" color="primary" size="large" />
            <Typography variant="body2" color="text.secondary">
               Prefixes standardize human-friendly identifiers across receipts, order previews, table listings, and search. Changing a prefix will apply to all newly generated entity IDs while preserving database primary keys and foreign-key integrity.
            </Typography>
         </Paper>

         <Grid container spacing={2}>
            {prefixDefinitions.map((item) => {
               const currentPrefix = values[item.key] !== undefined ? values[item.key] : item.defaultPrefix;
               const sample1 = `${currentPrefix || ""}1`;
               const sample2 = `${currentPrefix || ""}2`;
               const sample3 = `${currentPrefix || ""}3`;

               return (
                  <Grid size={{ xs: 12, md: 6 }} key={item.key}>
                     <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
                        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                           <Stack spacing={2}>
                              <Stack direction="row" alignItems="center" spacing={1.5}>
                                 <Box
                                    sx={{
                                       width: 36,
                                       height: 36,
                                       borderRadius: 1,
                                       bgcolor: "action.selected",
                                       display: "flex",
                                       alignItems: "center",
                                       justifyContent: "center",
                                    }}
                                 >
                                    <Icon icon={item.icon} size="small" />
                                 </Box>
                                 <Box flex={1}>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                       {item.label}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                       {item.description}
                                    </Typography>
                                 </Box>
                              </Stack>

                              <Grid container spacing={1.5} alignItems="center">
                                 <Grid size={{ xs: 12, sm: 5 }}>
                                    <TextField
                                       fullWidth
                                       size="small"
                                       label="Prefix Format"
                                       value={currentPrefix}
                                       onChange={(e) => onChange(item.key, e.target.value)}
                                       placeholder={item.defaultPrefix}
                                    />
                                 </Grid>
                                 <Grid size={{ xs: 12, sm: 7 }}>
                                    <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
                                       <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                                          Preview:
                                       </Typography>
                                       <Chip label={sample1} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600, fontFamily: "monospace" }} />
                                       <Chip label={sample2} size="small" variant="outlined" sx={{ fontWeight: 600, fontFamily: "monospace" }} />
                                       <Chip label={sample3} size="small" variant="outlined" sx={{ fontWeight: 600, fontFamily: "monospace" }} />
                                    </Stack>
                                 </Grid>
                              </Grid>
                           </Stack>
                        </CardContent>
                     </Card>
                  </Grid>
               );
            })}
         </Grid>
      </Stack>
   );
}
