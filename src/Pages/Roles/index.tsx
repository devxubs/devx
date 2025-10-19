"use client";

import { Button, Stack } from "@mui/material";
import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import CustomTable, { TableProps } from "@src/components/Table";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import Scrollbar from "react-browser-scrollbar";

const roles = [
   {
      id: 1,
      name: "Customer Support Officer",
      action: "Action",
   },
   {
      id: 2,
      name: "Warehouse Supervisor",
      action: "Action",
   },
   {
      id: 3,
      name: "Team Lead",
      action: "Action",
   },
   {
      id: 4,
      name: "Delivery Staff",
      action: "Action",
   },
   {
      id: 5,
      name: "System Admin",
      action: "Action",
   },
];

const rolesData: Omit<TableProps, "type"> = {
   head: ["@check", "Id", "Name", "@action"],
   body: roles,
};

const Roles = () => {
   const [deleteDialog, setDeleteDialog] = useState(false);
   const [roleToDelete, setRoleToDelete] = useState<any>(null);
   const router = useRouter();

   const actionMenu = (row: any) => [
      {
         label: "edit",
         icon: <Icon icon="solar:pen-bold" size="small" />,
         onClick: () => {
            router.push(`/roles/publish?id=${encodeURIComponent(row.id)}`);
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
         onClick: () => {
            setRoleToDelete(row);
            setDeleteDialog(true);
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
                  startIcon={<Icon icon="mingcute:add-line" />}
                  onClick={() => {
                     router.push("/roles/publish");
                  }}
               >
                  Add Roles
               </Button>
            </Stack>
            <Stack>
               <CustomTable
                  type={"default"}
                  head={rolesData.head}
                  body={rolesData.body}
                  actionMenu={actionMenu}
               />
               <AlertDialog
                  open={deleteDialog}
                  onClose={() => {
                     setDeleteDialog(false);
                     setRoleToDelete(null);
                  }}
                  type={"delete"}
                  title={`Are you sure you want to delete the role "${roleToDelete?.name}"?`}
               />
            </Stack>
         </Stack>
      </Scrollbar>
   );
};

export default Roles;
