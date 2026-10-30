"use client";

import {
   Stack,
   Button,
   Avatar,
   Typography,
   useTheme,
   useMediaQuery,
   Tooltip,
   Box,
   Divider,
   Grid,
   Chip,
   CircularProgress,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import React, { useState, useMemo, useEffect } from "react";
import Scrollbar from "react-browser-scrollbar";
import CustomModal from "@src/components/Modal";
import Modal from "./Modal";
import AlertDialog from "@src/components/AlertDialog";
import CustomAutocomplete, { OptionType } from "@src/components/Autocomplete";
import { useFilterQuery } from "@src/handler/useFilterQuery";

export interface UserProps {
   id: string;
   customId?: string;
   name: string;
   phoneNumber: string;
   email: string;
   address: string;
   role: string;
   password?: string;
   confirmPassword?: string;
   profileUrl?: string;
   salary: string;
   hireDate: Date;
   status: "active" | "inactive" | "suspended";
   file?: File | null;
}

export const roles: string[] = [
   "Admin",
   "Manager",
   "Cashier",
   "Staff",
   "Accountant",
];

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
      address: "123 Main St, City, Country",
      role: "Manager",
      salary: "$80,000",
      hireDate: new Date("2021-05-10"),
      status: "active",
      profileUrl: "https://avatars.githubusercontent.com/u/22456794?v=4",
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
      profileUrl: "https://avatars.githubusercontent.com/u/22456795?v=4",
      address: "456 Elm St, City, Country",
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
      address: "789 Oak St, City, Country",
      profileUrl: "https://avatars.githubusercontent.com/u/22456796?v=4",
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
      profileUrl: "https://avatars.githubusercontent.com/u/22456797?v=4",
      address: "321 Pine St, City, Country",
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
      profileUrl: "https://avatars.githubusercontent.com/u/22456793?v=4",
      address: "654 Cedar St, City, Country",
   },
];

const Users = () => {
   const theme = useTheme();
   const [users, setUsers] = useState<UserProps[]>([]);
   const [rolesList, setRolesList] = useState<string[]>(roles);
   const [loading, setLoading] = useState(false);
   const [modalOpen, setModalOpen] = useState(false);
   const [editableUser, setEditableUser] = useState({} as any);
   const [detailUser, setDetailUser] = useState<string | null>(null);
   const [viewUserData, setViewUserData] = useState<any>(null);
   const [loadingDetail, setLoadingDetail] = useState(false);

   useEffect(() => {
      if (!detailUser) {
         setViewUserData(null);
         return;
      }
      setLoadingDetail(true);
      fetch(`/api/users/${detailUser}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => {
            if (d) {
               setViewUserData(d);
            } else {
               const found = users.find(
                  (u) => u.id === detailUser || u.customId === detailUser,
               );
               setViewUserData(found || null);
            }
         })
         .catch(() => {
            const found = users.find(
               (u) => u.id === detailUser || u.customId === detailUser,
            );
            setViewUserData(found || null);
         })
         .finally(() => setLoadingDetail(false));
   }, [detailUser, users]);

   const UserColumns: ColumnConfig[] = [
      {
         field: "id",
         headerName: "ID",
         width: 100,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{ fontFamily: "monospace", cursor: "pointer" }}
               onClick={() => setDetailUser(params.row.id)}
            >
               {params.row.customId || params.row.id}
            </Typography>
         ),
      },
      {
         field: "name",
         headerName: "Name",
         width: 250,
         renderCell: (params) => (
            <Box
               onClick={() => setDetailUser(params.row.id)}
               sx={{ cursor: "pointer" }}
            >
               <UserProfile
                  name={params.row.name}
                  email={params.row.email}
                  url={params.row.profileUrl}
               />
            </Box>
         ),
      },
      { field: "phoneNumber", headerName: "Phone", width: 150 },
      { field: "address", headerName: "Address", width: 200 },
      {
         field: "role",
         headerName: "Role",
         width: 150,
         renderCell: (params: any) => {
            const val = params.row.role;
            return typeof val === "object"
               ? val?.name || "Staff"
               : val || "Staff";
         },
      },
      {
         field: "hireDate",
         headerName: "Hire Date",
         width: 150,
         valueFormatter: (value: Date) => {
            const date = new Date(value);
            const month = date.toLocaleString("en-US", { month: "short" });
            const day = date.getDate();
            const year = date.getFullYear();
            return `${month} ${day} ${year}`;
         },
      },
      {
         field: "status",
         headerName: "Status",
         chip: true,
         width: 150,
         valueFormatter: (v: string) => v.toLocaleUpperCase(),
         color: (params) => statusColor[params.row.status] || "default",
      },
      {
         field: "@actions",
         headerName: "",
      },
   ];

   const [mode, setMode] = useState<"add" | "edit">("edit");

   // Delete dialog states
   const [deleteUser, setDeleteUser] = useState<UserProps | null>(null);

   // suspended dialog
   const [suspendedUser, setSuspendedUser] = useState<UserProps | null>(null);

   const loadUsers = React.useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/users");
         if (res.ok) {
            const data = await res.json();
            const mapped = (Array.isArray(data) ? data : []).map((u: any) => ({
               id: u.id,
               customId: u.customId || u.id,
               name: u.name || "User",
               phoneNumber: u.phoneNumber || "-",
               email: u.email,
               address: u.address || "-",
               role: u.role?.name || "Staff",
               salary: u.salary || "0",
               hireDate: u.hireDate ? new Date(u.hireDate) : new Date(),
               status: (u.status ? u.status.toLowerCase() : "active") as any,
            }));
            setUsers(mapped);
         }
      } catch {
         // fallback
      } finally {
         setLoading(false);
      }
   }, []);

   const loadRoles = React.useCallback(async () => {
      try {
         const res = await fetch("/api/roles");
         if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
               setRolesList(data.map((r: any) => r.name));
            }
         }
      } catch {}
   }, []);

   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
   const { filterQueryData } = useFilterQuery();

   const availableRoles = useMemo(() => {
      const combined = Array.from(new Set([...roles, ...rolesList]));
      return combined;
   }, [rolesList]);

   const filteredUsers = useMemo(() => {
      return users.filter((u) => {
         if (filterQueryData?.userRole && filterQueryData.userRole !== "All") {
            const targetRole = filterQueryData.userRole.toLowerCase();
            const userRole = (u.role || "").toLowerCase();
            if (userRole !== targetRole) {
               return false;
            }
         }
         if (filterQueryData?.searchText) {
            const q = filterQueryData.searchText.toLowerCase().trim();
            const match =
               (u.name || "").toLowerCase().includes(q) ||
               (u.email || "").toLowerCase().includes(q) ||
               (u.phoneNumber || "").toLowerCase().includes(q) ||
               (u.customId || "").toLowerCase().includes(q);
            if (!match) return false;
         }
         return true;
      });
   }, [users, filterQueryData?.userRole, filterQueryData?.searchText]);

   React.useEffect(() => {
      loadUsers();
      loadRoles();
   }, [loadUsers, loadRoles]);

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
                  rows={filteredUsers}
                  columns={UserColumns}
                  checkBox={true}
                  canPrint={false}
                  canExport={false}
                  hideSelectionToolbar={true}
                  showSelectionIndicators={false}
                  menuItems={[
                     {
                        label: "Edit",
                        onClick: (p) => {
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
                        <Stack
                           sx={{
                              width: { xs: "100%", sm: 240, md: 260 },
                              minWidth: { xs: 180, sm: 220, md: 240 },
                           }}
                        >
                           <CustomAutocomplete
                              label="Filter by Role"
                              placeholder="Select Role"
                              arrow={true}
                              options={availableRoles}
                              value={data.userRole || null}
                              size={isMobile ? "small" : "medium"}
                              onChange={(v: any) =>
                                 onChange?.({
                                    userRole:
                                       (typeof v === "string" ? v : v?.value) ||
                                       "",
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
               onAddUser={async (d) => {
                  try {
                     await fetch("/api/users", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                           name: d.name,
                           email: d.email,
                           password: d.password,
                           phoneNumber: d.phoneNumber,
                           address: d.address,
                           salary: d.salary,
                           status: "ACTIVE",
                        }),
                     });
                     loadUsers();
                  } catch {}
               }}
               onEditUser={async (newData) => {
                  try {
                     await fetch(`/api/users/${editableUser.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(newData),
                     });
                     loadUsers();
                  } catch {}
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
            onConfirm={async () => {
               if (!deleteUser) return;
               try {
                  await fetch(`/api/users/${deleteUser.id}`, {
                     method: "DELETE",
                  });
               } catch {}
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
            onConfirm={async () => {
               if (!suspendedUser) return;
               try {
                  await fetch(`/api/users/${suspendedUser.id}`, {
                     method: "PUT",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ status: "SUSPENDED" }),
                  });
               } catch {}
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

         {/* User Details View Modal */}
         <CustomModal
            open={Boolean(detailUser)}
            onClose={() => setDetailUser(null)}
            title="User Details"
            closeIcon={true}
            sx={{
               width: { xs: "92%", sm: 540 },
               maxHeight: "90vh",
               display: "flex",
               flexDirection: "column",
               p: { xs: 2, sm: 3 },
               overflowY: "auto",
            }}
         >
            {loadingDetail ? (
               <Stack alignItems="center" py={5}>
                  <CircularProgress />
               </Stack>
            ) : viewUserData ? (
               <Stack spacing={2.5}>
                  <Stack
                     direction="row"
                     spacing={2}
                     alignItems="center"
                     justifyContent="space-between"
                  >
                     <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                           src={viewUserData.image || viewUserData.profileUrl}
                           sx={{ width: 64, height: 64 }}
                        />
                        <Box>
                           <Typography variant="h6">
                              {viewUserData.name || "User"}
                           </Typography>
                           <Typography variant="body2" color="text.secondary">
                              {viewUserData.email}
                           </Typography>
                           <Chip
                              label={
                                 typeof viewUserData.role === "object"
                                    ? viewUserData.role?.name || "Staff"
                                    : viewUserData.role || "Staff"
                              }
                              size="small"
                              sx={{ mt: 0.5, fontWeight: 600 }}
                           />
                        </Box>
                     </Stack>
                     <Chip
                        label={viewUserData.customId || "USER"}
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 700 }}
                     />
                  </Stack>
                  <Divider />
                  <Grid container spacing={2}>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Phone Number
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                           {viewUserData.phoneNumber || "N/A"}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Account Status
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                           {viewUserData.status || "ACTIVE"}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Salary
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                           {viewUserData.salary
                              ? `৳ ${viewUserData.salary}`
                              : "N/A"}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Hire Date
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                           {viewUserData.hireDate
                              ? new Date(
                                   viewUserData.hireDate,
                                ).toLocaleDateString()
                              : "N/A"}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary">
                           Address
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                           {viewUserData.address || "N/A"}
                        </Typography>
                     </Grid>
                  </Grid>
               </Stack>
            ) : (
               <Typography variant="body2" color="text.secondary">
                  User not found.
               </Typography>
            )}
         </CustomModal>
      </Scrollbar>
   );
};
export default Users;
