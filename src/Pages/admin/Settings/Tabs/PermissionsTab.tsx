"use client";

import React from "react";
import {
   Grid,
   Stack,
   Typography,
   Box,
   FormControlLabel,
   Switch,
   Card,
   CardContent,
   Chip,
   Button,
   Table,
   TableBody,
   TableCell,
   TableContainer,
   TableHead,
   TableRow,
   Paper,
} from "@mui/material";
import { useRouter } from "next/navigation";
import Icon from "@src/components/Icon";

interface PermissionsTabProps {
   values: any;
   onConfigChange: (key: string, value: any) => void;
}

export default function PermissionsTab({ values, onConfigChange }: PermissionsTabProps) {
   const router = useRouter();
   const customConfig = values.customConfig || {};

   const roles = [
      {
         name: "ADMIN",
         label: "Administrator",
         color: "primary" as const,
         scope: "Full system administration, financials, database backups, settings, user roles",
      },
      {
         name: "MANAGER",
         label: "Store Manager",
         color: "info" as const,
         scope: "Catalog management, order dispatch, inventory auditing, procurement, customer handling",
      },
      {
         name: "CASHIER",
         label: "Cashier / Counter Staff",
         color: "success" as const,
         scope: "POS terminal access, counter checkout, invoice printing, customer lookup",
      },
   ];

   return (
      <Stack spacing={3}>
         <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
            <Box>
               <Typography variant="h6" fontWeight={600}>
                  Users, Roles & Security Permissions
               </Typography>
               <Typography variant="body2" color="text.secondary">
                  Define operational boundaries and permissions for Cashiers, Managers, and Admins.
               </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="solar:users-group-two-rounded-bold-duotone" size="small" />}
                  onClick={() => router.push("/admin/user")}
               >
                  Manage Users
               </Button>
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="solar:shield-user-bold-duotone" size="small" />}
                  onClick={() => router.push("/admin/roles")}
               >
                  Role Matrix
               </Button>
            </Stack>
         </Box>

         {/* Standard Roles Overview */}
         <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small">
               <TableHead sx={{ bgcolor: "action.hover" }}>
                  <TableRow>
                     <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                     <TableCell sx={{ fontWeight: 600 }}>Access Tier</TableCell>
                     <TableCell sx={{ fontWeight: 600 }}>Operational Scope</TableCell>
                  </TableRow>
               </TableHead>
               <TableBody>
                  {roles.map((r) => (
                     <TableRow key={r.name}>
                        <TableCell>
                           <Chip label={r.name} size="small" color={r.color} sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{r.label}</TableCell>
                        <TableCell sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
                           {r.scope}
                        </TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </TableContainer>

         <Box sx={{ pt: 1 }}>
            <Typography variant="h6" fontWeight={600}>
               Cashier & Terminal Restrictions
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Prevent unauthorized discounts, voided orders, or cost leakage at checkout counters.
            </Typography>
         </Box>

         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <Switch
                              checked={customConfig.cashierCanDiscount ?? true}
                              onChange={(e) => onConfigChange("cashierCanDiscount", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Cashiers Can Apply Custom Discounts
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Allow cashier counter staff to apply manual discounts on the POS terminal
                              </Typography>
                           </Box>
                        }
                     />
                  </CardContent>
               </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <Switch
                              checked={customConfig.requireApprovalForVoid ?? true}
                              onChange={(e) => onConfigChange("requireApprovalForVoid", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Require Manager Approval to Void / Cancel Orders
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Mandate manager authorization before an active or completed invoice can be cancelled
                              </Typography>
                           </Box>
                        }
                     />
                  </CardContent>
               </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <Switch
                              checked={customConfig.cashiersCanViewCost ?? false}
                              onChange={(e) => onConfigChange("cashiersCanViewCost", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Allow Cashiers to View Cost Prices
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Hide purchase/wholesale cost figures from cashier terminal screens when disabled
                              </Typography>
                           </Box>
                        }
                     />
                  </CardContent>
               </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                     <FormControlLabel
                        control={
                           <Switch
                              checked={customConfig.managerCanAccessSettings ?? false}
                              onChange={(e) => onConfigChange("managerCanAccessSettings", e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                 Allow Managers Access to Store Settings
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Grant Store Managers permission to modify taxes, printers, and store profile
                              </Typography>
                           </Box>
                        }
                     />
                  </CardContent>
               </Card>
            </Grid>
         </Grid>
      </Stack>
   );
}
