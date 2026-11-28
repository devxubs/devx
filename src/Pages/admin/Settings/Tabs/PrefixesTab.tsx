"use client";

import React from "react";
import {
   Stack,
   TextField,
   Typography,
   Box,
   Chip,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { SETTINGS_FIELD_MAX_WIDTH } from "./SettingsField";

interface PrefixesTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
}

interface PrefixItem {
   key: string;
   label: string;
   noun: string;
   defaultPrefix: string;
   icon: string;
}

// Cleanup Phase 2: the per-card descriptions and the large
// explanatory panel were removed — the label, the field and the
// live preview carry everything an admin needs here.
const prefixDefinitions: PrefixItem[] = [
   { key: "prefixEmployee", label: "Employees / Users", noun: "employee", defaultPrefix: "EP_", icon: "solar:users-group-two-rounded-bold-duotone" },
   { key: "prefixCustomer", label: "Customers", noun: "customer", defaultPrefix: "CUS_", icon: "solar:user-circle-bold-duotone" },
   { key: "prefixSupplier", label: "Suppliers & Vendors", noun: "supplier", defaultPrefix: "SUP_", icon: "solar:shop-2-bold-duotone" },
   { key: "prefixOrder", label: "Sales Orders", noun: "sales order", defaultPrefix: "ORD_", icon: "solar:cart-large-minimalistic-bold-duotone" },
   { key: "prefixPurchase", label: "Purchase Orders", noun: "purchase order", defaultPrefix: "PUR_", icon: "solar:bag-check-bold-duotone" },
   { key: "prefixProduct", label: "Products & Catalog", noun: "product", defaultPrefix: "PROD_", icon: "solar:box-bold-duotone" },
   { key: "prefixCategory", label: "Product Categories", noun: "category", defaultPrefix: "CAT_", icon: "solar:folder-bold-duotone" },
   { key: "prefixUnit", label: "Units of Measure", noun: "unit", defaultPrefix: "UNIT_", icon: "solar:ruler-bold-duotone" },
   { key: "prefixExpense", label: "Store Expenses", noun: "expense", defaultPrefix: "EXP_", icon: "solar:wallet-money-bold-duotone" },
   { key: "prefixAsset", label: "Company Assets", noun: "asset", defaultPrefix: "AST_", icon: "solar:buildings-bold-duotone" },
   { key: "prefixRole", label: "User Security Roles", noun: "role", defaultPrefix: "ROLE_", icon: "solar:shield-user-bold-duotone" },
   { key: "prefixBilling", label: "Billing Settlements", noun: "billing settlement", defaultPrefix: "BILL_", icon: "solar:card-recive-bold-duotone" },
   { key: "prefixWarehouse", label: "Warehouses", noun: "warehouse", defaultPrefix: "WH_", icon: "solar:inbox-bold-duotone" },
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
         </Stack>

         {/* Global field standard: one prefix per row — the
             entity name is the external label above the field,
             the live ID preview sits at the end of the label
             row, and the helper (or the validation error) sits
             below the field. No per-prefix cards. */}
         <Stack spacing={2.5}>
            {prefixDefinitions.map((item) => {
               const currentPrefix = values[item.key] !== undefined ? values[item.key] : item.defaultPrefix;
               const error = prefixError(String(currentPrefix ?? ""));

               return (
                  <Stack spacing={0.75} key={item.key} sx={{ width: "100%", maxWidth: SETTINGS_FIELD_MAX_WIDTH }}>
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
                        <Typography
                           variant="body2"
                           fontSize={13}
                           fontWeight={600}
                           color="textSecondary"
                           sx={{ flex: 1 }}
                        >
                           {item.label}
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                           <Chip label={`${currentPrefix || ""}1`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600, fontFamily: "monospace" }} />
                           <Chip label={`${currentPrefix || ""}2`} size="small" variant="outlined" sx={{ fontWeight: 600, fontFamily: "monospace" }} />
                           <Chip label={`${currentPrefix || ""}3`} size="small" variant="outlined" sx={{ fontWeight: 600, fontFamily: "monospace" }} />
                        </Stack>
                     </Stack>

                     <TextField
                        fullWidth
                        size="small"
                        value={currentPrefix}
                        onChange={(e) => onChange(item.key, e.target.value)}
                        placeholder={item.defaultPrefix}
                        error={!!error}
                     />
                     <Typography
                        variant="caption"
                        color={error ? "error" : "text.secondary"}
                        {...(error ? { role: "alert" as const } : {})}
                     >
                        {error ||
                           `New ${item.noun} IDs start with this prefix, e.g. ${item.defaultPrefix}12.`}
                     </Typography>
                  </Stack>
               );
            })}
         </Stack>

         <Typography variant="caption" color="text.secondary">
            The Invoice Number prefix (INV) is edited in Sales &amp; POS → Pricing &amp; Fees. Changes apply to newly generated IDs only.
         </Typography>
      </Stack>
   );
}
