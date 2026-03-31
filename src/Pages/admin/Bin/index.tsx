"use client";

import {
   IconButton,
   Paper,
   Stack,
   Tab,
   Tabs,
   Typography,
   useTheme,
} from "@mui/material";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { UserProfile, UserRows } from "../User";
import Icon from "@src/components/Icon";

const tabs = [
   "Users",
   "Products",
   "Categories",
   "Units",
   "Orders",
   "Suppliers",
   "Expenses",
   "Assets",
];

const Bin = () => {
   const theme = useTheme();
   const [val, setVal] = React.useState(0);
   const router = useRouter();
   const params = useSearchParams();
   const tab = params?.get("tab");

   const tableRows = tab === "users" ? UserRows : [];
   const tableColumns: ColumnConfig[] = [
      {
         field: "id",
         headerName: "ID",
      },
      {
         field: "name",
         headerName: "Name",
         flex: 1,
         renderCell(params) {
            return (
               <UserProfile name={params.row.name} email={params.row.email} />
            );
         },
      },
      {
         field: "deleteDate",
         headerName: "Date",
         flex: 0.8,
         renderCell: (params) => {
            const currentDate = new Date();

            const formattedDate = currentDate.toLocaleDateString("en-US", {
               year: "numeric",
               month: "long",
               day: "numeric",
            });
            return formattedDate;
         },
      },
      {
         field: "@restore",
         headerName: "",
         renderCell: () => (
            <IconButton size="small">
               <Icon icon="solar:restart-square-bold-duotone" />
            </IconButton>
         ),
      },
   ];

   useEffect(() => {
      if (tab) {
         const tabIndex = tabs.findIndex(
            (t) => t.toLowerCase() === tab.toLowerCase(),
         );
         if (tabIndex !== -1) {
            setVal(tabIndex);
         }
      }
   }, []);

   const handleChange = (event: React.SyntheticEvent, newValue: number) => {
      setVal(newValue);
      router.push(`/admin/bin?tab=${tabs[newValue].toLowerCase()}`);
   };

   return (
      <Stack spacing={2}>
         <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            justifyContent="space-between"
         >
            <Tabs
               value={val}
               onChange={handleChange}
               variant="scrollable"
               TabIndicatorProps={{
                  children: <span className="MuiTabs-indicatorSpan" />,
               }}
               sx={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 1,
                  width: "100%",
                  "& .MuiTabs-scroller": {
                     scrollbarWidth: "none!important",
                  },
                  "& .MuiTabs-indicator": {
                     display: "flex",
                     justifyContent: "center",
                     backgroundColor: "transparent",
                  },
                  "& .MuiTabs-indicatorSpan": {
                     height: 4,
                     backgroundColor: theme.palette.common.white,
                     ...theme.applyStyles("light", {
                        backgroundColor: theme.palette.common.black,
                     }),
                  },

                  "& .MuiButtonBase-root:last-child": {
                     m: 0,
                  },
               }}
            >
               {tabs.map((tab, index) => (
                  <Tab
                     key={index}
                     label={tab}
                     sx={{
                        textTransform: "none",
                        fontWeight: 500,
                        fontSize: theme.typography.pxToRem(14),
                        marginRight: theme.spacing(1),
                        color: theme.palette.text.secondary,
                        minHeight: 50,
                        width: `calc(100% / ${tabs.length} - ${theme.spacing(1)})`,
                        "&.Mui-selected": {
                           color: theme.palette.common.white,
                           ...theme.applyStyles("light", {
                              color: theme.palette.common.black,
                           }),
                        },
                     }}
                  />
               ))}
            </Tabs>
         </Stack>

         <CustomTable rows={tableRows} columns={tableColumns} />
         {/* )} */}
      </Stack>
   );
};

export default Bin;
