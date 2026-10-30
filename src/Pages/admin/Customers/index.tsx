"use client";

import { Box, Stack, Typography } from "@mui/material";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { TableSkeleton } from "@src/components/SkeletonLoader";
import React, { useState } from "react";
import Customer from "./CustomerInfo";
import { CustomerDetailModal } from "@src/components/EntityDetailModals/EntityModals";

const Customers = () => {
   const [customers, setCustomers] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);
   const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

   const loadCustomers = React.useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/customers?limit=100");
         if (res.ok) {
            const data = await res.json();
            const mapped = (data.customers || []).map((c: any, idx: number) => {
               const ordersList = Array.isArray(c.orders) ? c.orders : [];
               const total = ordersList.length > 0 ? ordersList.length : (c._count?.orders || 0);
               const success = ordersList.filter((o: any) => o.status === "DELIVERED" || o.status === "COMPLETED").length;
               const failed = ordersList.filter((o: any) => o.status === "CANCELLED" || o.status === "FAILED" || o.status === "RETURNED").length;

               return {
                  id: c.id,
                  customId: c.customId || `CUS_${idx + 1}`,
                  name: c.name,
                  email: c.email || "-",
                  phone: c.phone || "-",
                  total,
                  success,
                  failed,
               };
            });
            setCustomers(mapped);
         }
      } catch {
         // fallback
      } finally {
         setLoading(false);
      }
   }, []);

   React.useEffect(() => {
      loadCustomers();
   }, [loadCustomers]);

   const columns: ColumnConfig[] = [
      {
         field: "id",
         headerName: "ID",
         flex: 0,
         renderCell: (p: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{
                  fontFamily: "monospace",
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
               }}
               onClick={() => setSelectedCustomerId(p.row.customId || p.row.id)}
            >
               {p.row.customId || p.row.id}
            </Typography>
         ),
      },
      {
         field: "customer",
         headerName: "Customer",
         flex: 1,
         renderCell: (p) => {
            return (
               <Box
                  sx={{ cursor: "pointer" }}
                  onClick={() => setSelectedCustomerId(p.row.customId || p.row.id)}
               >
                  <Customer
                     name={p.row.name}
                     email={p.row.email}
                     phone={p.row.phone}
                  />
               </Box>
            );
         },
      },
      { field: "total", headerName: "Total Orders" },
      { field: "success", headerName: "Success Orders" },
      { field: "failed", headerName: "Failed Orders" },
   ];

   return (
      <Stack>
         {loading ? (
            <TableSkeleton rows={5} cols={5} />
         ) : (
            <CustomTable
               rows={customers}
               columns={columns}
               checkBox={true}
               canPrint={true}
               canExport={true}
               printConfig={{
                  title: "DevX POS - Customers Directory",
               }}
               exportConfig={{
                  filename: `Customers_Directory_${new Date().toISOString().split("T")[0]}`,
                  title: "DevX POS - Customers Directory",
                  fetchAllData: async () => {
                     try {
                        const res = await fetch("/api/customers?all=true");
                        if (!res.ok) return [];
                        const d = await res.json();
                        return (d.customers || []).map((c: any, idx: number) => ({
                           id: c.customId || `CUS_${idx + 1}`,
                           name: c.name,
                           email: c.email || "-",
                           phone: c.phone || "-",
                           total: (c.orders || []).length || (c._count?.orders || 0),
                           success: (c.orders || []).filter((o: any) => o.status === "DELIVERED" || o.status === "COMPLETED").length,
                           failed: (c.orders || []).filter((o: any) => o.status === "CANCELLED" || o.status === "FAILED" || o.status === "RETURNED").length,
                        }));
                     } catch {
                        return [];
                     }
                  },
                  summaryRows: (data: any[]) => [
                     { label: "Total Customers:", value: String(data.length) },
                  ],
               }}
               menuItems={[
                  {
                     label: "View Details & Print",
                     onClick: (p) => setSelectedCustomerId(p.row.customId || p.row.id),
                  },
                  {
                     label: "Delete",
                     color: "error",
                     onClick: async (p) => {
                        try {
                           await fetch(`/api/customers/${p.row.id}`, { method: "DELETE" });
                           loadCustomers();
                        } catch {}
                     },
                  },
               ]}
            />
         )}

         <CustomerDetailModal
            open={Boolean(selectedCustomerId)}
            onClose={() => setSelectedCustomerId(null)}
            customerId={selectedCustomerId}
         />
      </Stack>
   );
};

export default Customers;
