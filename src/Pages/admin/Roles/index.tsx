"use client";

import { Button, Stack, useTheme } from "@mui/material";
import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import CustomTable, { MenuItem } from "@src/components/Table";
import { set } from "date-fns";
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
      field: "id",
      headerName: "Id",
      width: 100,
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

   const [rolesData, setRolesData] = useState(roles);

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
                  onConfirm={() => {
                     setRolesData((prev) =>
                        prev.filter((role) => role.id !== roleToDelete.id),
                     );
                     setRoleToDelete(null);
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
