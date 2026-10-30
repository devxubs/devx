"use client";

import { Button, Stack, Typography, useTheme } from "@mui/material";
import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import CustomTable, { MenuItem } from "@src/components/Table";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import Scrollbar from "react-browser-scrollbar";

const roles = [
   {
      id: 1,
      name: "Customer Support Officer",
   },
   {
      id: 2,
      name: "Warehouse Supervisor",
   },
   {
      id: 3,
      name: "Team Lead",
   },
   {
      id: 4,
      name: "Delivery Staff",
   },
   {
      id: 5,
      name: "System Admin",
   },
];

const columns = [
   {
      field: "customId",
      headerName: "ID",
      width: 120,
      renderCell: (params: any) => (
         <Typography variant="body2" fontWeight={600} color="primary.main">
            {params.row.customId || params.row.id}
         </Typography>
      ),
   },
   {
      field: "name",
      headerName: "Name",
      flex: 1,
   },
   {
      field: "@actions",
      headerName: "",
      width: 150,
   },
];

const Roles = () => {
   const theme = useTheme();
   const router = useRouter();

   const [rolesData, setRolesData] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);

   const loadRoles = React.useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/roles");
         if (res.ok) {
            const data = await res.json();
            setRolesData(data);
         }
      } catch {
         // fallback
      } finally {
         setLoading(false);
      }
   }, []);

   React.useEffect(() => {
      loadRoles();
   }, [loadRoles]);

   const [roleToDelete, setRoleToDelete] = useState<any>(null);

   const actionMenu: MenuItem[] = [
      {
         label: "edit",
         icon: <Icon icon="solar:pen-bold" size="small" />,
         onClick: (params) => {
            router.push(
               `/admin/roles/publish?id=${encodeURIComponent(params.row.id)}`,
            );
         },
      },
      {
         label: "delete",
         color: "error",
         icon: (
            <Icon
               icon="solar:trash-bin-trash-bold"
               size="small"
               color="error"
            />
         ),
         onClick: (params) => {
            setRoleToDelete(params.row);
         },
      },
   ];

   return (
      <Scrollbar autoHide thumbSize={6} darkMode>
         <Stack spacing={2} py={2}>
            <Stack direction={"row"} justifyContent={"flex-end"}>
               <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                     <Icon
                        icon="mingcute:add-line"
                        style={{
                           color: theme.palette.text.primary,
                        }}
                     />
                  }
                  onClick={() => {
                     router.push("/admin/roles/publish");
                  }}
               >
                  Add Roles
               </Button>
            </Stack>
            <Stack>
               <CustomTable
                  rows={rolesData}
                  columns={columns}
                  menuItems={actionMenu}
               />
               <AlertDialog
                  open={!!roleToDelete}
                  onClose={() => {
                     setRoleToDelete(null);
                  }}
                  onConfirm={async () => {
                     if (roleToDelete) {
                        try {
                           await fetch(`/api/roles/${roleToDelete.id}`, { method: "DELETE" });
                        } catch {}
                        setRolesData((prev) =>
                           prev.filter((role) => role.id !== roleToDelete.id),
                        );
                        setRoleToDelete(null);
                     }
                  }}
                  type={"delete"}
                  title={`Are you sure you want to delete the role <b>${roleToDelete?.name}</b>?`}
               />
            </Stack>
         </Stack>
      </Scrollbar>
   );
};

export default Roles;
