"use client";

import {
   Stack,
   Button,
   Avatar,
   Typography,
   useTheme,
   Tooltip,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import React, { useState } from "react";
import Scrollbar from "react-browser-scrollbar";
import CustomModal from "@src/components/Modal";
import Modal from "./Modal";
import AlertDialog from "@src/components/AlertDialog";
import CustomAutocomplete from "@src/components/Autocomplete";

export interface UserProps {
   id: string;
   name: string;
   phoneNumber: string;
   email: string;
   role: string;
   password: string;
   confirmPassword: string;
   salary: string;
   hireDate: Date;
   status: "active" | "inactive" | "suspended";
}

const statusColor: Record<
   string,
   "default" | "warning" | "success" | "info" | "error"
> = {
   active: "default",
   inactive: "warning",
   suspended: "error",
} as const;

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
      <Stack spacing={1} direction="row" alignItems="center" height={"100%"}>
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
            <Tooltip title={email} disableInteractive>
               <Typography variant="body2" fontSize={14} color="textSecondary">
                  {email.length >= 20 ? email.slice(0, 15) + "..." : email}
               </Typography>
            </Tooltip>
         </Stack>
      </Stack>
   );
};

export const UserRows: UserProps[] = [
   {
      id: "UR001",
      name: "Jubayer Ahmed",
      phoneNumber: "01325584606",
      email: "devxub@gmail.com",
      role: "Manager",
      salary: "$80,000",
      hireDate: new Date("2021-05-10"),
      status: "active",
      password: "12345",
      confirmPassword: "12345",
   },
   {
      id: "UR002",
      name: "Najrul Ahmed",
      phoneNumber: "01818388585",
      email: "najrul787@gmail.com",
      role: "CEO",
      salary: "$120,000",
      hireDate: new Date("2019-03-22"),
      status: "active",
      password: "65432",
      confirmPassword: "65432",
   },
   {
      id: "UR003",
      name: "John Doe",
      role: "Sales Manager",
      phoneNumber: "01325584606",
      email: "john.doe@example.com",
      hireDate: new Date("2020-03-15"),
      salary: "$75,000",
      status: "active",
      password: "34567",
      confirmPassword: "34567",
   },
   {
      id: "UR004",
      name: "Jane Smith",
      role: "HR Specialist",
      phoneNumber: "01818388585",
      email: "jane.smith@example.com",
      hireDate: new Date("2019-07-22"),
      salary: "$65,000",
      status: "inactive",
      password: "98765",
      confirmPassword: "98765",
   },
   {
      id: "UR005",
      name: "Mike Johnson",
      role: "Software Developer",
      phoneNumber: "01711223344",
      email: "mike.johnson@example.com",
      hireDate: new Date("2021-11-05"),
      salary: "$85,000",
      status: "suspended",
      password: "23452",
      confirmPassword: "23452",
   },
];

const UserColumns: ColumnConfig[] = [
   { field: "id", headerName: "ID", flex: 0.3 },
   {
      field: "name",
      headerName: "Name",
      flex: 1,
      renderCell: (params) => (
         <UserProfile name={params.row.name} email={params.row.email} />
      ),
   },
   { field: "phoneNumber", headerName: "Phone" },
   {
      field: "role",
      headerName: "Role",
   },
   {
      field: "hireDate",
      headerName: "Hire Date",
      valueFormatter: (value: Date) => {
         const date = new Date(value);

         const month = date.toLocaleString("en-US", { month: "short" });
         const day = date.getDate();
         const year = date.getFullYear();

         return `${month} ${day} ${year}`;
      },
   },
   // { field: "salary", headerName: "Salary" },
   {
      field: "status",
      headerName: "Status",
      chip: true,
      flex: 0.5,
      valueFormatter: (v: string) => v.toLocaleUpperCase(),
      color: (params) => statusColor[params.row.status] || "default",
   },

   {
      field: "@actions",
      headerName: "",
   },
];

export const roles = [
   "CEO",
   "Manager",
   "Repeat Sales Exicutive",
   "Team Leader",
   "Courier Exicutive",
   "Reseller",
];

const Users = () => {
   const theme = useTheme();
   const [users, setUsers] = useState<UserProps[]>(UserRows);
   const [modalOpen, setModalOpen] = useState(false);
   const [editableUser, setEditableUser] = useState({} as any);

   const [mode, setMode] = useState<"add" | "edit">("edit");

   // Delete dialog states
   const [deleteUser, setDeleteUser] = useState<UserProps | null>(null);

   // suspended dialog
   const [suspendedUser, setSuspendedUser] = useState<UserProps | null>(null);

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
                  rows={users}
                  columns={UserColumns}
                  checkBox={true}
                  menuItems={[
                     {
                        label: "Edit",
                        onClick: (p) => {
                           console.log(p);

                           setEditableUser(p.row);
                           setMode("edit");
                           setModalOpen(true);
                        },
                     },
                     {
                        label: "Suspended",
                        color: "warning",
                        onClick: (p) => {
                           setSuspendedUser(p.row);
                        },
                     },
                     {
                        label: "Delete",
                        color: "error",
                        onClick: (p) => {
                           setDeleteUser(p.row);
                        },
                     },
                  ]}
                  filter={(data, onChange) => {
                     return (
                        <Stack sx={{ width: "30%" }}>
                           <CustomAutocomplete
                              label="Role"
                              options={roles}
                              value={data.userRole || ""} // controlled
                              onChange={(v: string) =>
                                 onChange?.({
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

         {/* Add or update user */}
         <CustomModal
            sx={{ width: { xs: "90%", md: 900 } }}
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={mode === "add" ? "Add User" : "Update User"}
         >
            <Modal
               mode={mode}
               onClose={() => setModalOpen(false)}
               editUserData={editableUser || {}}
               onAddUser={(d) => {
                  const URId =
                     users.length >= 10
                        ? "0" + (users.length + 1)
                        : "00" + (users.length + 1);
                  setUsers([
                     {
                        ...d,
                        id: `UR${URId}`,
                        hireDate: new Date(),
                        status: "inactive",
                     },
                     ...users,
                  ]);
               }}
               onEditUser={(newData, old) => {
                  setUsers((prev) =>
                     prev.map((user) =>
                        user.id === old.id ? { ...user, ...newData } : user,
                     ),
                  );
               }}
            />
         </CustomModal>

         {/* delete user */}
         <AlertDialog
            type="delete"
            open={Boolean(deleteUser)}
            onClose={() => setDeleteUser(null)}
            title={`Are you sure you want to delete <b>${
               deleteUser?.email || "this user"
            }</b>`}
            onConfirm={() => {
               if (!deleteUser) return;

               setUsers((prev) =>
                  prev.filter((user) => user.id !== deleteUser.id),
               );

               setDeleteUser(null);
            }}
         />

         {/* suspended user */}
         <AlertDialog
            type="warning"
            open={Boolean(suspendedUser)}
            onClose={() => setSuspendedUser(null)}
            title={`Are you sure you want to suspend <b>${
               suspendedUser?.email || "this user"
            }</b>`}
            onConfirm={() => {
               if (!suspendedUser) return;

               setUsers((prev) =>
                  prev.map((user) =>
                     user.id === suspendedUser.id
                        ? { ...user, status: "suspended" }
                        : user,
                  ),
               );

               setSuspendedUser(null);
            }}
         />
      </Scrollbar>
   );
};
export default Users;
