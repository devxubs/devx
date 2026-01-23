"use client";

import { Stack, Button, Avatar, Typography, useTheme } from "@mui/material";
import Icon from "@src/components/Icon";
import CustomTable, { TableProps, TableRow } from "@src/components/Table";
import React, { useState } from "react";
import Scrollbar from "react-browser-scrollbar";
import CustomModal from "@src/components/Modal";
import Modal from "./Modal";
import AlertDialog from "@src/components/AlertDialog";
import CustomAutocomplete from "@src/components/Autocomplete";

export const UserProfile = ({
   name,
   email,
   url,
}: {
   name: string;
   email: string;
   url?: string;
}) => {
   return (
      <Stack spacing={1} direction="row" alignItems="center">
         <Avatar src={url} />
         <Stack>
            <Typography
               variant="body1"
               fontSize={16}
               color="textPrimary"
               sx={{
                  "&:hover": {
                     cursor: "pointer",
                     textDecoration: "underline",
                  },
               }}
            >
               {name}
            </Typography>
            <Typography variant="body2" fontSize={14} color="textSecondary">
               {email}
            </Typography>
         </Stack>
      </Stack>
   );
};

const allUser = [
   {
      employee_id: "E001",
      name: "Jubayer Ahmed",
      phone_number: "01325584606",
      email: "devxub@gmail.com",
      role: "Manager",
      salary: "$80,000",
      hire_date: "2021-05-10",
   },
   {
      employee_id: "E002",
      name: "Najrul Ahmed",
      phone_number: "01818388585",
      email: "najrul787@gmail.com",
      role: "CEO",
      salary: "$120,000",
      hire_date: "2019-03-22",
   },
   {
      employee_id: "E001",
      name: "John Doe",
      role: "Sales Manager",
      phone_number: "01325584606",
      email: "john.doe@example.com",
      hire_date: "2020-03-15",
      salary: "$75,000",
   },
   {
      employee_id: "E002",
      name: "Jane Smith",
      role: "HR Specialist",
      phone_number: "01818388585",
      email: "jane.smith@example.com",
      hire_date: "2019-07-22",
      salary: "$65,000",
   },
   {
      employee_id: "E003",
      name: "Mike Johnson",
      role: "Software Developer",
      phone_number: "01711223344",
      email: "mike.johnson@example.com",
      hire_date: "2021-11-05",
      salary: "$85,000",
   },
];

export const users: Omit<TableProps, "type"> = {
   head: [
      "@check",
      "Name",
      "Phone Number",
      "Role",
      "Hire Date",
      "Salary",
      "@action",
   ],
   body: allUser.map((u) => ({
      ...u,
      full_name: u.name,
      name: <UserProfile name={u.name} email={u.email} />,
      phone_number: u.phone_number,
      role: u.role,
   })),
};

const Users = () => {
   const theme = useTheme();
   const [modalOpen, setModalOpen] = useState(false);
   const [editableUser, setEditableUser] = useState({} as TableRow);
   const actionMenu = (row: any) => [
      {
         label: "edit",
         icon: <Icon icon="solar:pen-bold" size="small" />,
         onClick: () => {
            setEditableUser({ ...row, name: row.full_name }); // store clicked user
            setMode("edit");
            setModalOpen(true);
            console.log(row);
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
            setUserToDelete(row);
            setDeleteOpen(true);
         },
      },
   ];

   const names = [
      "CEO",
      "Manager",
      "Repeat Sales Exicutive",
      "Team Leader",
      "Courier Exicutive",
      "Reseller",
   ];

   const [mode, setMode] = useState<"add" | "edit">("edit");

   // Delete dialog states
   const [deleteOpen, setDeleteOpen] = useState(false);
   const [userToDelete, setUserToDelete] = useState<any>(null);

   const handleDeleteConfirm = () => {
      console.log("Deleting user:", userToDelete);
      // 👉 Here you can call API or update state
      setDeleteOpen(false);
      setUserToDelete(null);
   };

   return (
      <Scrollbar autoHide thumbSize={6} darkMode>
         <Stack spacing={2} py={2}>
            {/* Header */}
            <Stack direction={"row"} justifyContent={"flex-end"} spacing={2}>
               <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                     <Icon
                        icon="solar:user-plus-bold-duotone"
                        style={{
                           color: theme.palette.text.primary,
                        }}
                     />
                  }
                  onClick={() => {
                     setMode("add");
                     setModalOpen(true);
                     setEditableUser({}); // store clicked user
                  }}
               >
                  Add user
               </Button>
            </Stack>
            <Stack>
               <CustomTable
                  type={"user"}
                  head={users.head}
                  body={users.body}
                  actionMenu={(row) => actionMenu(row)}
                  filter={(data, onChange) => {
                     return (
                        <Stack sx={{ width: "30%" }}>
                           <CustomAutocomplete
                              label="Role"
                              options={names}
                              value={data.userRole || ""} // controlled
                              onChange={(v: string) =>
                                 onChange?.({
                                    ...data,
                                    userRole: v || "",
                                 })
                              }
                           />
                        </Stack>
                     );
                  }}
               />
            </Stack>
         </Stack>
         <CustomModal
            sx={{ width: { xs: "90%", md: 900 } }}
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={mode === "add" ? "Add User" : "Edit User"}
         >
            <Modal
               mode={mode}
               onClose={() => setModalOpen(false)}
               userData={editableUser || {}}
               onChange={(d) => {
                  setEditableUser({ ...editableUser, ...d });
               }}
            />
         </CustomModal>
         <AlertDialog
            // sx={{ width: { xs: "90%", md: 900 } }}
            type="delete"
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            title={
               "Are you sure you want to delete" + userToDelete?.email ||
               "this user"
            }
            onConfirm={handleDeleteConfirm}
         />
      </Scrollbar>
   );
};
export default Users;
