"use client";

import React from "react";
import {
   Stack,
   Typography,
   Box,
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

export default function PermissionsTab(_props: PermissionsTabProps) {
   const router = useRouter();

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
                  Role boundaries for Cashiers, Managers, and Admins are managed in the role matrix.
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

         {/* P2-20: the four "Cashier & Terminal Restrictions" toggles
             (cashierCanDiscount, requireApprovalForVoid,
             cashiersCanViewCost, managerCanAccessSettings) were
             removed — write-only customConfig keys. Real permissions
             live in the role matrix (Roles page); these switches
             saved values no permission check ever read. */}
      </Stack>
   );
}
