"use client";

import {
   Stack,
   useTheme,
   Typography,
   Box,
   useMediaQuery,
   Drawer,
   CircularProgress,
   Button,
   Paper,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Icon from "@src/components/Icon";
import useQueryParams from "@src/handler/useQueryParams";
import Header from "./Header";
import CustomBox from "@src/components/CustomBox";
import { useSettings } from "@src/lib/settingsContext";
import { useSnackbar } from "@src/lib/snackbarContext";

import GeneralTab from "../Tabs/GeneralTab";
import PosTab from "../Tabs/PosTab";
import ProductsTab from "../Tabs/ProductsTab";
import CustomersTab from "../Tabs/CustomersTab";
import ExpensesTab from "../Tabs/ExpensesTab";
import InvoicesTab from "../Tabs/InvoicesTab";
import PermissionsTab from "../Tabs/PermissionsTab";
import AppearanceTab from "../Tabs/AppearanceTab";
import SystemTab from "../Tabs/SystemTab";
import PrefixesTab from "../Tabs/PrefixesTab";

const tabMeta: Record<string, { title: string; subtitle: string; icon: string }> = {
   general: {
      title: "General Store",
      subtitle: "Configure business identity, contact details, currency, and locale.",
      icon: "solar:shop-bold",
   },
   pos: {
      title: "Sales & POS Terminal",
      subtitle: "Set tax/VAT rates, delivery fees, default payment methods, and invoice prefixes.",
      icon: "solar:cart-large-minimalistic-bold",
   },
   products: {
      title: "Products & Inventory",
      subtitle: "Manage low-stock alert limits and auto-generated SKU/barcodes.",
      icon: "solar:box-bold",
   },
   customers: {
      title: "Customers & Suppliers",
      subtitle: "Customer and supplier behaviour — currently no store-level settings.",
      icon: "solar:users-group-two-rounded-bold",
   },
   expenses: {
      title: "Purchases & Expenses",
      subtitle: "Set the default expense category.",
      icon: "solar:wallet-money-bold",
   },
   invoices: {
      title: "Invoice & Thermal Printing",
      subtitle: "Customize thermal paper size (80mm/58mm/A4), receipt headers, footers, and barcodes.",
      icon: "solar:printer-bold",
   },
   permissions: {
      title: "Users & Security Permissions",
      subtitle: "Role boundaries are managed in the role matrix.",
      icon: "solar:shield-user-bold",
   },
   prefixes: {
      title: "Entity ID Formats & Prefixes",
      subtitle: "Customize sequential identifier prefixes for employees, orders, products, and customers.",
      icon: "solar:tag-price-bold",
   },
   appearance: {
      title: "Appearance & Theme",
      subtitle: "Display preferences are edited in the header appearance drawer.",
      icon: "solar:palette-bold",
   },
   system: {
      title: "Notifications & System Maintenance",
      subtitle: "Configure automated alerts, download a partial data export, and factory reset.",
      icon: "solar:settings-bold",
   },
};

const Layout = () => {
   const theme = useTheme();
   const query = useQueryParams();
   const selectedTab = query.get("tab") || "general";
   const isSmDown = useMediaQuery((theme: any) => theme.breakpoints.down("sm"));

   const { settings, loading, updateSettings, resetSettings } = useSettings();
   const { showSnackbar } = useSnackbar();
   const [formValues, setFormValues] = useState<any>({});
   const [isSaving, setIsSaving] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");
   // P3-2: feedback goes through the central snackbar (useSnackbar).

   const [showSidebar, setShowSidebar] = useState(false);

   useEffect(() => {
      if (settings) {
         setFormValues({ ...settings });
      }
   }, [settings]);

   const handleChange = (field: string, value: any) => {
      setFormValues((prev: any) => ({
         ...prev,
         [field]: value,
      }));
   };

   const handleConfigChange = (key: string, value: any) => {
      setFormValues((prev: any) => ({
         ...prev,
         customConfig: {
            ...(prev.customConfig || {}),
            [key]: value,
         },
      }));
   };

   const handleSave = async () => {
      setIsSaving(true);
      try {
         const success = await updateSettings(formValues);
         if (success) {
            showSnackbar("Store settings saved and updated successfully!", "success");
         } else {
            showSnackbar("Failed to save settings. Please try again.", "error");
         }
      } catch {
         showSnackbar("An unexpected error occurred while saving.", "error");
      } finally {
         setIsSaving(false);
      }
   };

   const handleResetDefaults = async (): Promise<boolean> => {
      const ok = await resetSettings();
      if (ok) {
         showSnackbar("Settings reset to factory defaults.", "success");
      }
      return ok;
   };

   const currentMeta = tabMeta[selectedTab] || tabMeta.general;

   const renderTabContent = () => {
      if (loading) {
         return (
            <Stack alignItems="center" justifyContent="center" height="40vh">
               <CircularProgress />
            </Stack>
         );
      }

      switch (selectedTab) {
         case "general":
            return <GeneralTab values={formValues} onChange={handleChange} />;
         case "pos":
            return <PosTab values={formValues} onChange={handleChange} onConfigChange={handleConfigChange} />;
         case "products":
            return <ProductsTab values={formValues} onChange={handleChange} onConfigChange={handleConfigChange} />;
         case "customers":
            return <CustomersTab values={formValues} onConfigChange={handleConfigChange} />;
         case "expenses":
            return <ExpensesTab values={formValues} onConfigChange={handleConfigChange} />;
         case "invoices":
            return <InvoicesTab values={formValues} onChange={handleChange} onConfigChange={handleConfigChange} />;
         case "permissions":
            return <PermissionsTab values={formValues} onConfigChange={handleConfigChange} />;
         case "prefixes":
            return <PrefixesTab values={formValues} onChange={handleChange} />;
         case "appearance":
            return <AppearanceTab values={formValues} onChange={handleChange} onConfigChange={handleConfigChange} />;
         case "system":
            return (
               <SystemTab
                  values={formValues}
                  onChange={handleChange}
                  onConfigChange={handleConfigChange}
                  onResetDefaults={handleResetDefaults}
               />
            );
         default:
            return <GeneralTab values={formValues} onChange={handleChange} />;
      }
   };

   return (
      <Stack
         spacing={1}
         px={1}
         py={1}
         direction={"row"}
         bgcolor={"background.paper"}
         flex={1}
         borderRadius={2}
         height={"calc(100vh - 64px - 44px)"}
      >
         {/* Sidebar */}
         {isSmDown ? (
            <Drawer open={showSidebar} onClose={() => setShowSidebar(false)}>
               <CustomBox
                  sx={{
                     width: 270,
                     height: "100%",
                     display: "flex",
                     flexDirection: "column",
                     justifyContent: "flex-start",
                     pt: 2,
                  }}
               >
                  <Stack
                     px={2}
                     direction={"column"}
                     width={270}
                     sx={{
                        overflowY: "auto",
                        scrollbarWidth: "none!important",
                        "&::-webkit-scrollbar": {
                           display: "none!important",
                        },
                     }}
                  >
                     <Sidebar onItemClick={() => setShowSidebar(false)} />
                  </Stack>
               </CustomBox>
            </Drawer>
         ) : (
            <Stack
               py={2}
               pl={{ sm: 1, md: 2 }}
               pr={1}
               bgcolor={"background.default"}
               borderRadius={2}
               width={{
                  sm: 140,
                  md: 260,
               }}
               height={"100%"}
               sx={{
                  overflowY: "auto",
                  scrollbarWidth: "none!important",
                  "&::-webkit-scrollbar": {
                     display: "none!important",
                  },
               }}
            >
               <Sidebar />
            </Stack>
         )}

         {/* Content Area */}
         <Stack flex={1} bgcolor={"background.default"} borderRadius={2} overflow="hidden">
            {/* Header */}
            <Header
               onShowSidebar={() => setShowSidebar(true)}
               onSave={handleSave}
               isSaving={isSaving}
               searchQuery={searchQuery}
               onSearchChange={setSearchQuery}
            />

            {/* Scrollable Tab Body */}
            <Stack p={{ xs: 2, sm: 3 }} spacing={3} overflow={"auto"} flex={1}>
               {/* Section Title Banner */}
               <Stack direction={"row"} alignItems={"center"} spacing={2} flexWrap={"wrap"}>
                  <Box
                     sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1.5,
                        bgcolor: "primary.main",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: 2,
                     }}
                  >
                     <Icon
                        icon={currentMeta.icon}
                        size="large"
                        style={{
                           color: theme.palette.common.white,
                        }}
                     />
                  </Box>
                  <Stack flex={1}>
                     <Typography variant="h5" fontWeight={700} fontSize={{ xs: "1.3rem", sm: "1.5rem" }}>
                        {currentMeta.title}
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                        {currentMeta.subtitle}
                     </Typography>
                  </Stack>
               </Stack>

               {/* Render Tab Component */}
               <Box sx={{ pb: 6 }}>{renderTabContent()}</Box>
            </Stack>

            {/* Persistent Bottom Action Bar */}
            <Paper
               elevation={3}
               sx={{
                  px: 3,
                  py: 1.5,
                  borderTop: 1,
                  borderColor: "divider",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  bgcolor: "background.paper",
               }}
            >
               <Typography variant="caption" color="text.secondary">
                  Default currency: <strong>{formValues.currency || "BDT"} ({formValues.currencySymbol || "৳"})</strong> • Changes apply across entire POS system
               </Typography>
               <Stack direction="row" spacing={1.5}>
                  <Button
                     variant="outlined"
                     color="inherit"
                     size="small"
                     onClick={() => setFormValues({ ...settings })}
                  >
                     Discard Changes
                  </Button>
                  <Button
                     variant="contained"
                     color="primary"
                     size="small"
                     startIcon={
                        isSaving ? (
                           <CircularProgress size={16} color="inherit" />
                        ) : (
                           <Icon icon="solar:diskette-bold" size="small" />
                        )
                     }
                     onClick={handleSave}
                     disabled={isSaving}
                  >
                     {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
               </Stack>
            </Paper>
         </Stack>
      </Stack>
   );
};

export default Layout;
