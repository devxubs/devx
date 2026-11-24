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
import { useSnackbar } from "@src/lib/snackbarContext";
import { fetchAllPages } from "@src/lib/fetchAllPages";

export interface UserProps {
   id: string;
   customId?: string;
   name: string;
   phoneNumber: string;
   email: string;
   address: string;
   role: string;
   roleId?: string;
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
   active: "success",
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
   const { showSnackbar } = useSnackbar();
   const [users, setUsers] = useState<UserProps[]>([]);
   const [rolesList, setRolesList] = useState<{ id: string; name: string }[]>([]);
   const [loading, setLoading] = useState(false);
   const [modalOpen, setModalOpen] = useState(false);
   const [editableUser, setEditableUser] = useState({} as any);
   const [detailUser, setDetailUser] = useState<string | null>(null);
   const [viewUserData, setViewUserData] = useState<any>(null);
   const [loadingDetail, setLoadingDetail] = useState(false);

   // Phase 2 (2.3): global-search deep link — /admin/user?user=<id>
   // opens that user's detail directly.
   useEffect(() => {
      const id = new URLSearchParams(window.location.search).get("user");
      if (id) setDetailUser(id);
   }, []);

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
               {/* ID-02: never show the raw database id as the employee
                   id — records without a customId (e.g. older seeds)
                   show a dash until repaired. */}
               {params.row.customId || "—"}
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

   // unsuspend dialog
   const [unsuspendUser, setUnsuspendUser] = useState<UserProps | null>(null);

   const handleStatusChange = async (
      targetUser: UserProps,
      newStatus: "ACTIVE" | "INACTIVE",
   ) => {
      try {
         const res = await fetch(`/api/users/${targetUser.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
         });
         if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to update status");
         }
         setUsers((prev) =>
            prev.map((user) =>
               user.id === targetUser.id
                  ? { ...user, status: newStatus.toLowerCase() as any }
                  : user,
            ),
         );
         showSnackbar(
            newStatus === "ACTIVE"
               ? "Employee activated."
               : "Employee deactivated.",
            "success",
         );
      } catch (err: any) {
         showSnackbar(
            err.message || "Failed to update employee status.",
            "error",
         );
      }
   };

   // Phase 2 (2.6): standard list feedback states — load errors are
   // visible with a retry; saves/deletes confirm via Snackbar.
   const [loadError, setLoadError] = useState<string | null>(null);
   // P3-2: feedback goes through the central snackbar (useSnackbar).

   const loadUsers = React.useCallback(async () => {
      setLoading(true);
      setLoadError(null);
      try {
         // P4-2: the users API is paginated by default now, so the
         // page walks the bounded pages and renders the same
         // complete staff set as the old single unbounded response.
         // A failed page throws and lands in the load-error state.
         const data = await fetchAllPages<any>(
            (page, limit) => `/api/users?page=${page}&limit=${limit}`,
            (d) => (Array.isArray(d) ? d : d.users || []),
            (d) => d.total,
         );
         const mapped = data.map((u: any) => {
            const roleName =
               typeof u.role === "string"
                  ? u.role
                  : u.role?.name || u.roleDetails?.name || "Staff";
            return {
               id: u.id,
               customId: u.customId || "",
               name: u.name || "Employee",
               phoneNumber: u.phoneNumber || "-",
               email: u.email,
               address: u.address || "-",
               role: roleName,
               roleId: u.roleId || u.roleDetails?.id || "",
               salary: u.salary || "0",
               hireDate: u.hireDate ? new Date(u.hireDate) : new Date(),
               status: (u.status ? u.status.toLowerCase() : "active") as any,
            };
         });
         setUsers(mapped);
      } catch {
         setLoadError("Failed to load employees.");
         showSnackbar("Failed to load employees. Please check connection and try again.", "error");
      } finally {
         setLoading(false);
      }
   }, [showSnackbar]);

   const loadRoles = React.useCallback(async () => {
      try {
         const res = await fetch("/api/roles");
         if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
               setRolesList(data.map((r: any) => ({ id: r.id, name: r.name })));
            }
         }
      } catch {}
   }, []);

   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
   const { filterQueryData } = useFilterQuery();

   const availableRoles = useMemo(() => {
      const fromApi = rolesList.map((r) => r.name);
      return Array.from(new Set([...roles, ...fromApi]));
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
            {loadError && users.length === 0 && !loading && (
               <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="center"
                  spacing={1.5}
                  sx={{ py: 3 }}
               >
                  <Typography variant="body2" color="text.secondary">
                     {loadError}
                  </Typography>
                  <Button
                     size="small"
                     variant="outlined"
                     startIcon={<Icon icon="solar:restart-bold" size="16px" />}
                     onClick={loadUsers}
                  >
                     Retry
                  </Button>
               </Stack>
            )}

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
                  Add Employee
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
                  menuItems={(p) => {
                     const isSuspended = p.row.status === "suspended";
                     const isActive = p.row.status === "active";
                     return [
                        {
                           label: "Edit",
                           onClick: (p) => {
                              setEditableUser(p.row);
                              setMode("edit");
                              setModalOpen(true);
                           },
                        },
                        ...(isActive
                           ? [
                                {
                                   label: "Deactivate",
                                   color: "warning" as const,
                                   onClick: (p: any) =>
                                      handleStatusChange(p.row, "INACTIVE"),
                                },
                             ]
                           : !isSuspended
                           ? [
                                {
                                   label: "Activate",
                                   color: "success" as const,
                                   onClick: (p: any) =>
                                      handleStatusChange(p.row, "ACTIVE"),
                                },
                             ]
                           : []),
                        ...(isSuspended
                           ? [
                                {
                                   label: "Unsuspend",
                                   color: "info" as const,
                                   onClick: (p: any) => {
                                      setUnsuspendUser(p.row);
                                   },
                                },
                             ]
                           : [
                                {
                                   label: "Suspend",
                                   color: "warning" as const,
                                   onClick: (p: any) => {
                                      setSuspendedUser(p.row);
                                   },
                                },
                             ]),
                        {
                           label: "Delete",
                           color: "error" as const,
                           onClick: (p) => {
                              setDeleteUser(p.row);
                           },
                        },
                     ];
                  }}
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

         {/* Add or update employee */}
         <CustomModal
            sx={{ width: { xs: "90%", md: 900 } }}
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={mode === "add" ? "Add Employee" : "Update Employee"}
         >
            <Modal
               mode={mode}
               onClose={() => setModalOpen(false)}
               editUserData={editableUser || {}}
               availableRoles={availableRoles}
               onAddUser={async (d) => {
                  try {
                     const matchedRole = rolesList.find(
                        (r) => r.name.toLowerCase() === (d.role || "").toLowerCase(),
                     );
                     const res = await fetch("/api/users", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                           name: d.name,
                           email: d.email,
                           password: d.password,
                           phoneNumber: d.phoneNumber,
                           address: d.address,
                           salary: d.salary,
                           role: d.role,
                           roleId: matchedRole?.id || undefined,
                           status: "ACTIVE",
                        }),
                     });
                     if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || "Failed to add employee");
                     }
                     showSnackbar("Employee added successfully.", "success");
                     loadUsers();
                  } catch (err: any) {
                     showSnackbar(err.message || "Failed to add the employee.", "error");
                  }
               }}
               onEditUser={async (newData) => {
                  try {
                     const matchedRole = rolesList.find(
                        (r) => r.name.toLowerCase() === (newData.role || "").toLowerCase(),
                     );
                     const payload = {
                        ...newData,
                        roleId: matchedRole?.id || (newData as any).roleId || undefined,
                        status: newData.status ? String(newData.status).toUpperCase() : undefined,
                     };
                     const res = await fetch(`/api/users/${editableUser.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                     });
                     if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || "Failed to update employee");
                     }
                     showSnackbar("Employee updated successfully.", "success");
                     loadUsers();
                  } catch (err: any) {
                     showSnackbar(err.message || "Failed to update the employee.", "error");
                  }
               }}
            />
         </CustomModal>

         {/* delete employee */}
         <AlertDialog
            type="delete"
            open={Boolean(deleteUser)}
            onClose={() => setDeleteUser(null)}
            title={`Are you sure you want to delete <b>${
               deleteUser?.name || deleteUser?.email || "this employee"
            }</b>`}
            onConfirm={async () => {
               if (!deleteUser) return;
               try {
                  const res = await fetch(`/api/users/${deleteUser.id}`, {
                     method: "DELETE",
                  });
                  if (!res.ok) {
                     const errData = await res.json().catch(() => ({}));
                     throw new Error(errData.error || "Failed to delete employee");
                  }
                  setUsers((prev) =>
                     prev.filter((user) => user.id !== deleteUser.id),
                  );
                  showSnackbar("Employee deleted successfully.", "success");
               } catch (err: any) {
                  showSnackbar(err.message || "Failed to delete the employee.", "error");
               }
               setDeleteUser(null);
            }}
         />

         {/* suspend employee */}
         <AlertDialog
            type="warning"
            open={Boolean(suspendedUser)}
            onClose={() => setSuspendedUser(null)}
            title={`Are you sure you want to suspend <b>${
               suspendedUser?.name || suspendedUser?.email || "this employee"
            }</b>`}
            onConfirm={async () => {
               if (!suspendedUser) return;
               try {
                  const res = await fetch(`/api/users/${suspendedUser.id}`, {
                     method: "PUT",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ status: "SUSPENDED" }),
                  });
                  if (!res.ok) {
                     const errData = await res.json().catch(() => ({}));
                     throw new Error(errData.error || "Failed to suspend employee");
                  }
                  setUsers((prev) =>
                     prev.map((user) =>
                        user.id === suspendedUser.id
                           ? { ...user, status: "suspended" }
                           : user,
                     ),
                  );
                  showSnackbar("Employee suspended.", "success");
               } catch (err: any) {
                  showSnackbar(err.message || "Failed to suspend the employee.", "error");
               }
               setSuspendedUser(null);
            }}
         />

         {/* unsuspend employee */}
         <AlertDialog
            type="confirm"
            open={Boolean(unsuspendUser)}
            onClose={() => setUnsuspendUser(null)}
            title={`Are you sure you want to unsuspend <b>${
               unsuspendUser?.name || unsuspendUser?.email || "this employee"
            }</b>`}
            onConfirm={async () => {
               if (!unsuspendUser) return;
               try {
                  const res = await fetch(`/api/users/${unsuspendUser.id}`, {
                     method: "PUT",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ status: "ACTIVE" }),
                  });
                  if (!res.ok) {
                     const errData = await res.json().catch(() => ({}));
                     throw new Error(errData.error || "Failed to unsuspend employee");
                  }
                  setUsers((prev) =>
                     prev.map((user) =>
                        user.id === unsuspendUser.id
                           ? { ...user, status: "active" }
                           : user,
                     ),
                  );
                  showSnackbar("Employee unsuspended successfully.", "success");
               } catch (err: any) {
                  showSnackbar(err.message || "Failed to unsuspend the employee.", "error");
               }
               setUnsuspendUser(null);
            }}
         />

         {/* Employee Details View Modal */}
         <CustomModal
            open={Boolean(detailUser)}
            onClose={() => setDetailUser(null)}
            title="Employee Details"
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
                              {viewUserData.name || "Employee"}
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
                        label={viewUserData.customId || "EMP"}
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
                  Employee not found.
               </Typography>
            )}
         </CustomModal>
      </Scrollbar>
   );
};
export default Users;
