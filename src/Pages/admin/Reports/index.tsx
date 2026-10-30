"use client";
import { Stack, Button, useTheme, Tab, Tabs } from "@mui/material";
import Icon from "@src/components/Icon";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import PrintButton from "@src/components/PrintButton";
import ExportButton from "@src/components/ExportButton";
import Sales from "./Sales";
import Courier from "./Courier";
import Customer from "./Customer";
import Expenses from "./Expenses";
import Purchases from "./Purchases";
import Employees from "./Employees";
import Products from "./Products";
import Summary from "./Summary";

const tabs = [
   "Summary",
   "Sales",
   "Courier",
   "Customers",
   // "Expenses",
   "Purchases",
   // "Suppliers",
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
            (t) => t.toLowerCase() === tab.toLowerCase(),
         );
         if (tabIndex !== -1) {
            setVal(tabIndex);
         }
      }
   }, [params]);

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
            <Stack direction="row" spacing={1} alignItems="center">
               <PrintButton
                  label="Print Report"
                  variant="contained"
                  color="primary"
                  sx={{ whiteSpace: "nowrap", height: 50, px: 2.5 }}
               />
               <ExportButton
                  label="Export Report"
                  variant="outlined"
                  filename={`${tabs[val] || "Summary"}_Report_${new Date().toISOString().split("T")[0]}`}
                  title={`DevX POS - ${tabs[val] || "Summary"} Analytics Report`}
                  columns={[
                     { field: "metric", headerName: "Metric / Dimension", width: 30 },
                     { field: "value", headerName: "Value / Count", width: 25 },
                     { field: "status", headerName: "Performance Status", width: 25 },
                     { field: "timestamp", headerName: "Calculated At", width: 20 },
                  ]}
                  currentPageData={[
                     { metric: "Active Report Module", value: tabs[val] || "Summary", status: "VERIFIED", timestamp: new Date().toLocaleDateString() },
                     { metric: "Database Status", value: "CONNECTED", status: "HEALTHY", timestamp: new Date().toLocaleDateString() },
                  ]}
                  sx={{ whiteSpace: "nowrap", height: 50, px: 2.5 }}
               />
            </Stack>
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
            ) : tabs[val] === "Purchases" ? (
               <Purchases />
            ) : tabs[val] === "Employees" ? (
               <Employees />
            ) : tabs[val] === "Products" ? (
               <Products />
            ) : (
               <Summary />
            )}
         </Stack>
      </Stack>
   );
};

export default Report;
