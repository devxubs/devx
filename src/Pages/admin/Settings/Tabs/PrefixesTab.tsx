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
} from "@mui/material";
import Icon from "@src/components/Icon";
import SectionResetButton from "./SectionResetButton";

interface PrefixesTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
}

interface PrefixItem {
   key: string;
   label: string;
   defaultPrefix: string;
   icon: string;
}

// Cleanup Phase 2: the per-card descriptions and the large
// explanatory panel were removed — the label, the field and the
// live preview carry everything an admin needs here.
const prefixDefinitions: PrefixItem[] = [
   { key: "prefixEmployee", label: "Employees / Users", defaultPrefix: "EP_", icon: "solar:users-group-two-rounded-bold-duotone" },
   { key: "prefixCustomer", label: "Customers", defaultPrefix: "CUS_", icon: "solar:user-circle-bold-duotone" },
   { key: "prefixSupplier", label: "Suppliers & Vendors", defaultPrefix: "SUP_", icon: "solar:shop-2-bold-duotone" },
   { key: "prefixOrder", label: "Sales Orders", defaultPrefix: "ORD_", icon: "solar:cart-large-minimalistic-bold-duotone" },
   { key: "prefixPurchase", label: "Purchase Orders", defaultPrefix: "PUR_", icon: "solar:bag-check-bold-duotone" },
   { key: "prefixProduct", label: "Products & Catalog", defaultPrefix: "PROD_", icon: "solar:box-bold-duotone" },
   { key: "prefixCategory", label: "Product Categories", defaultPrefix: "CAT_", icon: "solar:folder-bold-duotone" },
   { key: "prefixUnit", label: "Units of Measure", defaultPrefix: "UNIT_", icon: "solar:ruler-bold-duotone" },
   { key: "prefixExpense", label: "Store Expenses", defaultPrefix: "EXP_", icon: "solar:wallet-money-bold-duotone" },
   { key: "prefixAsset", label: "Company Assets", defaultPrefix: "AST_", icon: "solar:buildings-bold-duotone" },
   { key: "prefixRole", label: "User Security Roles", defaultPrefix: "ROLE_", icon: "solar:shield-user-bold-duotone" },
   { key: "prefixBilling", label: "Billing Settlements", defaultPrefix: "BILL_", icon: "solar:card-recive-bold-duotone" },
   { key: "prefixWarehouse", label: "Warehouses", defaultPrefix: "WH_", icon: "solar:inbox-bold-duotone" },
];

// Inline mirror of the server rule (validatePrefixSettingValue
// in src/lib/idGenerator.ts — that module imports Prisma, so
// the client cannot import it; the server stays authoritative
// and rejects anything this check misses): letters, digits,
// hyphens and underscores only, max 20 characters, empty is
// allowed (generation falls back to the built-in defaults).
const PREFIX_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_PREFIX_LENGTH = 20;

function prefixError(value: string): string | null {
   const trimmed = value.trim();
   if (trimmed === "") return null;
   if (trimmed.length > MAX_PREFIX_LENGTH) {
      return `At most ${MAX_PREFIX_LENGTH} characters.`;
   }
   if (!PREFIX_PATTERN.test(trimmed)) {
      return "Letters, digits, hyphens and underscores only.";
   }
   return null;
}

export default function PrefixesTab({ values, onChange }: PrefixesTabProps) {
   return (
      <Stack spacing={2}>
         <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Typography variant="h6" fontWeight={600}>
               Entity ID Prefixes
            </Typography>
            <SectionResetButton
               section="Entity ID Formats"
               onReset={() => {
                  onChange("prefixEmployee", "EP_");
                  onChange("prefixCustomer", "CUS_");
                  onChange("prefixSupplier", "SUP_");
                  onChange("prefixOrder", "ORD_");
                  onChange("prefixPurchase", "PUR_");
                  onChange("prefixProduct", "PROD_");
                  onChange("prefixCategory", "CAT_");
                  onChange("prefixUnit", "UNIT_");
                  onChange("prefixExpense", "EXP_");
                  onChange("prefixAsset", "AST_");
                  onChange("prefixRole", "ROLE_");
                  onChange("prefixBilling", "BILL_");
                  onChange("prefixWarehouse", "WH_");
               }}
            />
         </Stack>

         <Grid container spacing={1.5}>
            {prefixDefinitions.map((item) => {
               const currentPrefix = values[item.key] !== undefined ? values[item.key] : item.defaultPrefix;
               const error = prefixError(String(currentPrefix ?? ""));

               return (
                  <Grid size={{ xs: 12, md: 6 }} key={item.key}>
                     <Card variant="outlined" sx={{ borderRadius: 1.5, height: "100%" }}>
                        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                           <Stack spacing={1.25}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                 <Box
                                    sx={{
                                       width: 28,
                                       height: 28,
                                       borderRadius: 1,
                                       bgcolor: "action.selected",
                                       display: "flex",
                                       alignItems: "center",
                                       justifyContent: "center",
                                       flexShrink: 0,
                                    }}
                                 >
                                    <Icon icon={item.icon} size="small" />
                                 </Box>
                                 <Typography variant="subtitle2" fontWeight={700}>
                                    {item.label}
                                 </Typography>
                              </Stack>

                              <Stack direction="row" spacing={1} alignItems="flex-start">
                                 <TextField
                                    fullWidth
                                    size="small"
                                    label="Prefix"
                                    value={currentPrefix}
                                    onChange={(e) => onChange(item.key, e.target.value)}
                                    placeholder={item.defaultPrefix}
                                    error={!!error}
                                    helperText={error || undefined}
                                    sx={{ flex: 1 }}
                                 />
                                 <Stack direction="row" spacing={0.5} alignItems="center" sx={{ pt: 0.75, flexShrink: 0 }}>
                                    <Chip label={`${currentPrefix || ""}1`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600, fontFamily: "monospace" }} />
                                    <Chip label={`${currentPrefix || ""}2`} size="small" variant="outlined" sx={{ fontWeight: 600, fontFamily: "monospace" }} />
                                    <Chip label={`${currentPrefix || ""}3`} size="small" variant="outlined" sx={{ fontWeight: 600, fontFamily: "monospace" }} />
                                 </Stack>
                              </Stack>
                           </Stack>
                        </CardContent>
                     </Card>
                  </Grid>
               );
            })}
         </Grid>

         <Typography variant="caption" color="text.secondary">
            The Invoice Number prefix (INV) is edited in Sales &amp; POS → Pricing &amp; Fees. Changes apply to newly generated IDs only.
         </Typography>
      </Stack>
   );
}
