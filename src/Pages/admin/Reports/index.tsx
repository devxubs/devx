"use client";
import { Stack, Button, useTheme, Tab, Tabs } from "@mui/material";
import Icon from "@src/components/Icon";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import Sales from "./Sales";
import Courier from "./Courier";
import Customer from "./Customer";
import Expenses from "./Expenses";

const tabs = [
   "All",
   "Sales",
   "Courier",
   "Customers",
   "Expenses",
   "Suppliers",
   "Employees",
   "Products",
];

const Report = () => {
   const theme = useTheme();
   const [val, setVal] = React.useState(0);
   const router = useRouter();
   const params = useSearchParams();

   useEffect(() => {
      const tab = params?.get("tab");
      if (tab) {
         const tabIndex = tabs.findIndex(
            (t) => t.toLowerCase() === tab.toLowerCase()
         );
         if (tabIndex !== -1) {
            setVal(tabIndex);
         }
      }
   }, []);

   const handleChange = (event: React.SyntheticEvent, newValue: number) => {
      setVal(newValue);
      if (newValue !== 0) {
         router.push(`/admin/reports?tab=${tabs[newValue].toLowerCase()}`);
      } else {
         router.push(`/admin/reports`);
      }
   };

   return (
      <Stack spacing={3}>
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
                     maxWidth: 40,
                     width: "100%",
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
                        width: "11.7%",
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
            {/* <Button
               variant="contained"
               color="primary"
               startIcon={
                  <Icon
                     icon="solar:filters-bold-duotone"
                     style={{ color: theme.palette.text.primary }}
                  />
               }
            >
               Filter
            </Button> */}
         </Stack>

         <Stack spacing={2}>
            {/* Render report content based on selected tab */}
            {tabs[val] === "Sales" ? (
               <Sales />
            ) : tabs[val] === "Courier" ? (
               <Courier />
            ) : tabs[val] === "Customers" ? (
               <Customer />
            ) : tabs[val] === "Expenses" ? (
               <Expenses />
            ) : (
               <div>{tabs[val]} Report Content</div>
            )}
         </Stack>
      </Stack>
   );
};

export default Report;
