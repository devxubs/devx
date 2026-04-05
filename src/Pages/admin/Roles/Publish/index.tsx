"use client";

import {
   Stack,
   useTheme,
   Button,
   TextField,
   InputAdornment,
   useMediaQuery,
} from "@mui/material";
import Masonry from "@mui/lab/Masonry";

import Icon from "@src/components/Icon";
import React, { useEffect, useState } from "react";
import Item from "./Item";
import Scrollbar from "react-browser-scrollbar";
import { orderStatuses } from "../../Order/data";

export interface Permission {
   id: number;
   name: string;
   allow: boolean;
}

interface DataItem {
   id: number;
   name: string;
   permissions: Permission[];
}

const data: DataItem[] = [
   {
      id: 1,
      name: "Dashboard",
      permissions: [
         {
            id: 1,
            name: "View Dashboard",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 2,
      name: "User",
      permissions: [
         {
            id: 1,
            name: "View User",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
         {
            id: 5,
            name: "Suspend",
            allow: false,
         },
      ],
   },
   {
      id: 3,
      name: "Product",
      permissions: [
         {
            id: 1,
            name: "View Product",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 4,
      name: "Category",
      permissions: [
         {
            id: 1,
            name: "View Category",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 5,
      name: "Unit",
      permissions: [
         {
            id: 1,
            name: "View Unit",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },

   {
      id: 6,
      name: "Order",
      permissions: [
         {
            id: 1,
            name: "View Order",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
         ...orderStatuses.map((status, index) => ({
            id: 4 + index,
            name: status,
            allow: false,
         })),
      ],
   },
   {
      id: 7,
      name: "Customer",
      permissions: [
         {
            id: 1,
            name: "View Customer",
            allow: false,
         },
      ],
   },
   {
      id: 8,
      name: "Supplier",
      permissions: [
         {
            id: 1,
            name: "View Supplier",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 9,
      name: "Purchase",
      permissions: [
         {
            id: 1,
            name: "View Purchase",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 10,
      name: "Expense",
      permissions: [
         {
            id: 1,
            name: "View Expense",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 11,
      name: "Asset",
      permissions: [
         {
            id: 1,
            name: "View Asset",
            allow: false,
         },
         {
            id: 2,
            name: "Create",
            allow: false,
         },
         {
            id: 3,
            name: "Update",
            allow: false,
         },
         {
            id: 4,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 12,
      name: "Chat",
      permissions: [
         {
            id: 1,
            name: "Delete",
            allow: false,
         },
      ],
   },
   {
      id: 13,
      name: "Chat",
      permissions: [
         {
            id: 1,
            name: "View Chat",
            allow: false,
         },
         {
            id: 2,
            name: "Send Message",
            allow: false,
         },
         {
            id: 3,
            name: "Create Group",
            allow: false,
         },
         {
            id: 4,
            name: "Delete Group",
            allow: false,
         },
         {
            id: 5,
            name: "Add Member",
            allow: false,
         },
         {
            id: 6,
            name: "Remove Member",
            allow: false,
         },
      ],
   },
   {
      id: 14,
      name: "Report",
      permissions: [
         {
            id: 1,
            name: "View Report",
            allow: false,
         },
      ],
   },
   {
      id: 15,
      name: "Setting",
      permissions: [
         {
            id: 1,
            name: "View Setting",
            allow: false,
         },
         {
            id: 2,
            name: "Update Setting",
            allow: false,
         },
      ],
   },
   {
      id: 16,
      name: "Role",
      permissions: [
         {
            id: 1,
            name: "View Role",
            allow: false,
         },
         {
            id: 2,
            name: "Create Role",
            allow: false,
         },
         {
            id: 3,
            name: "Update Role",
            allow: false,
         },
         {
            id: 4,
            name: "Delete Role",
            allow: false,
         },
      ],
   },
   {
      id: 17,
      name: "Billing",
      permissions: [
         {
            id: 1,
            name: "View Billing",
            allow: false,
         },
      ],
   },
];

const Publish = () => {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

   const [role, setRole] = useState(data);

   const updatePermissions = (id: number, updater: (p: any) => any) => {
      setRole((prev) =>
         prev.map((r) =>
            r.id !== id
               ? r
               : {
                    ...r,
                    permissions: r.permissions.map(updater),
                 },
         ),
      );
   };

   useEffect(() => {
      console.log(role);
   }, [role]);

   return (
      <Scrollbar autoHide thumbSize={6} darkMode>
         <Stack spacing={2} py={2}>
            <Stack
               spacing={2}
               direction={{ xs: "column", sm: "row" }}
               alignItems="center"
               justifyContent="space-between"
               bgcolor={"background.paper"}
               borderRadius={1}
               p={2}
            >
               <TextField
                  fullWidth
                  placeholder="Search"
                  size={isMobile ? "small" : "medium"}
                  InputProps={{
                     startAdornment: (
                        <InputAdornment position="start">
                           <Icon icon="eva:search-fill" />
                        </InputAdornment>
                     ),
                  }}
                  sx={{
                     flex: !isMobile ? 0.4 : 1,
                  }}
                  onChange={(e) => {
                     // Handle search logic here
                     setRole(
                        data.filter((item) => {
                           return item.name
                              .toLowerCase()
                              .includes(e.target.value.toLowerCase());
                        }),
                     );
                  }}
               />
               <TextField
                  fullWidth
                  placeholder="Role Name"
                  size={isMobile ? "small" : "medium"}
                  sx={{
                     flex: !isMobile ? 0.4 : 1,
                  }}
                  onChange={(e) => {
                     // Handle search logic here
                     setRole(
                        data.filter((item) => {
                           return item.name
                              .toLowerCase()
                              .includes(e.target.value.toLowerCase());
                        }),
                     );
                  }}
               />
            </Stack>

            <Masonry columns={{ xs: 1, md: 2 }} spacing={2} sequential>
               {role.map((item) => (
                  <Item
                     key={item.id}
                     id={item.id}
                     title={item.name}
                     permissions={item.permissions}
                     onChecked={(PId, allow) => {
                        // Handle individual permission check/uncheck logic here
                        updatePermissions(item.id, (p) =>
                           p.id === PId ? { ...p, allow } : p,
                        );
                     }}
                     onCheckedAll={(id) => {
                        // Handle check/uncheck all logic here
                        updatePermissions(id, (p) => ({
                           ...p,
                           allow:
                              !!item.permissions?.some((p: any) => p.allow) &&
                              !item.permissions?.every((p: any) => p.allow)
                                 ? true
                                 : !item.permissions?.every(
                                      (p: any) => p.allow,
                                   ),
                        }));
                     }}
                  />
               ))}
            </Masonry>

            <Stack
               spacing={2}
               direction={"row"}
               justifyContent={"flex-end"}
               // position={"fixed"}
               // bottom={10}
               // right={10}
               // zIndex={1000}
               // borderRadius={1}
               // p={2}
               // boxShadow={15}
               // bgcolor={alpha(theme.palette.background.paper, 0.15)}
               // sx={{
               //    backdropFilter: "blur(12px) saturate(180%)",
               // }}
            >
               <Button variant="text" color="inherit">
                  Cancel
               </Button>
               <Button variant="contained" color="primary">
                  Submit
               </Button>
            </Stack>
         </Stack>
      </Scrollbar>
   );
};

export default Publish;
