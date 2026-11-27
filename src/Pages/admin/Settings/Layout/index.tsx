"use client";

import {
   Stack,
   useTheme,
   Typography,
   Box,
   useMediaQuery,
   Drawer,
   CircularProgress,
   Alert,
   alpha,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Icon from "@src/components/Icon";
import useQueryParams from "@src/handler/useQueryParams";
import { usePathname, useRouter } from "next/navigation";
import Header from "./Header";
import CustomBox from "@src/components/CustomBox";
import { useSettings } from "@src/lib/settingsContext";
import { useSnackbar } from "@src/lib/snackbarContext";
import { isSettingsFormDirty } from "@src/lib/settingsDirty";
import AlertDialog from "@src/components/AlertDialog";
import { settingsDesignSx } from "./settingsDesign";

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

interface LayoutProps {
   // Embedded mode: the layout renders inside the full-screen
   // Settings modal (Layout/SettingsModal) instead of on the
   // /admin/settings page. Tab selection becomes local state
   // (the page's URL belongs to whatever app view is underneath
   // the modal, so the ?tab= machinery is not used), and the
   // root fills its container instead of the page-height calc.
   // The modal header carries no close button — the shell's
   // close requests (Escape) arrive via registerCloseHandler.
   embedded?: boolean;
   onClose?: () => void;
   // The modal shell routes its own close requests (Escape,
   // backdrop) through the handler registered here, so a dirty
   // form gets the same discard confirmation as the X button.
   registerCloseHandler?: (fn: () => void) => void;
}

const Layout = ({ embedded = false, onClose, registerCloseHandler }: LayoutProps) => {
   const theme = useTheme();
   const query = useQueryParams();
   const router = useRouter();
   const pathname = usePathname();
   // RP-1 (C6): an unknown ?tab= value used to render the General
   // tab silently under a wrong URL. Validate against tabMeta and
   // correct the URL (replace, so Back doesn't loop) to the tab
   // actually shown.
   const requestedTab = query.get("tab") || "general";
   const pageTab =
      requestedTab in tabMeta ? requestedTab : "general";
   const [embeddedTab, setEmbeddedTab] = useState("general");
   const selectedTab = embedded ? embeddedTab : pageTab;
   useEffect(() => {
      if (embedded) return;
      if (requestedTab !== pageTab) {
         const params = new URLSearchParams(query.toString());
         params.set("tab", pageTab);
         router.replace(`${pathname}?${params.toString()}`, {
            scroll: false,
         });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [requestedTab, pageTab]);
   const isSmDown = useMediaQuery((theme: any) => theme.breakpoints.down("sm"));

   const { settings, loading, updateSettings, getLastSaveError, resetSettings } = useSettings();
   // RP-3 (U3): roles without the settings update permission get
   // a read-only page — the form is disabled, the save actions
   // are hidden, and a notice explains why. The server still
   // enforces the permission on PUT/reset regardless.
   const canUpdate = settings?.canUpdateSettings === true;
   const { showSnackbar } = useSnackbar();
   const [formValues, setFormValues] = useState<any>({});
   const [isSaving, setIsSaving] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");
   // P3-2: feedback goes through the central snackbar (useSnackbar).

   const [showSidebar, setShowSidebar] = useState(false);

   // RP-4: unsaved-changes tracking. `baseline` is a deep snapshot
   // of the last loaded/saved settings, taken in the same effect
   // that (re)populates the form — so initial load and hydration
   // are never dirty, a successful save re-baselines via the
   // context round-trip, and reverting every edit compares equal
   // again. The form state is single and global across tabs, so
   // edits survive tab switches and stay tracked.
   const [baseline, setBaseline] = useState<any>(null);
   const [discardOpen, setDiscardOpen] = useState(false);

   useEffect(() => {
      if (settings) {
         setFormValues({ ...settings });
         setBaseline(JSON.parse(JSON.stringify(settings)));
      }
   }, [settings]);

   const isDirty =
      canUpdate && !loading && isSettingsFormDirty(formValues, baseline);

   // RP-4: warn on refresh / tab close / hard navigation while
   // dirty (the browser's native beforeunload prompt). The
   // listener exists only while dirty, so a clean page never
   // prompts. In-app tab switches keep the form state and need
   // no warning — nothing is lost.
   useEffect(() => {
      if (!isDirty) return;
      const handler = (e: BeforeUnloadEvent) => {
         e.preventDefault();
         e.returnValue = "";
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
   }, [isDirty]);

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
      // RP-4: no duplicate submissions while a save is in flight.
      if (isSaving) return;
      setIsSaving(true);
      try {
         const success = await updateSettings(formValues);
         if (success) {
            showSnackbar("Store settings saved and updated successfully!", "success");
            // The context now holds the saved settings; the sync
            // effect above re-populates the form and the baseline
            // from it, which clears the dirty state. On failure
            // nothing is touched — edits and the dirty state stay.
         } else {
            const serverError = getLastSaveError();
            showSnackbar(
               serverError
                  ? `Failed to save settings: ${serverError}`
                  : "Failed to save settings. Please try again.",
               "error",
            );
         }
      } catch {
         showSnackbar("An unexpected error occurred while saving.", "error");
      } finally {
         setIsSaving(false);
      }
   };

   // RP-4: Discard asks first; confirming restores the baseline
   // snapshot (the last saved values as loaded), cancelling keeps
   // every edit. The server is never touched by Discard.
   const handleDiscard = () => {
      if (!isDirty || isSaving) return;
      setDiscardOpen(true);
   };

   const confirmDiscard = () => {
      if (baseline) {
         setFormValues(JSON.parse(JSON.stringify(baseline)));
      }
      setDiscardOpen(false);
      // Embedded close flow: a close requested while dirty runs
      // through this same confirmation; confirming completes it.
      if (closeAfterDiscardRef.current) {
         closeAfterDiscardRef.current = false;
         onClose?.();
      }
   };

   // Embedded (modal) close: with unsaved changes, ask first via
   // the RP-4 discard dialog; otherwise close immediately. The
   // modal shell's Escape/backdrop requests arrive through the
   // registered handler, so every close path behaves the same.
   const closeAfterDiscardRef = React.useRef(false);
   const requestClose = () => {
      if (!onClose) return;
      if (isDirty) {
         closeAfterDiscardRef.current = true;
         setDiscardOpen(true);
      } else {
         onClose();
      }
   };
   useEffect(() => {
      registerCloseHandler?.(requestClose);
   });

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
         height={embedded ? "100%" : "calc(100vh - 64px - 44px)"}
         // Settings UI design layer — every visual rule is
         // scoped to this subtree (see settingsDesign.ts).
         sx={settingsDesignSx(theme)}
      >
         {/* Sidebar */}
         {isSmDown ? (
            <Drawer
               open={showSidebar}
               onClose={() => setShowSidebar(false)}
               // Embedded: the tab drawer must sit above the
               // full-screen modal surface (MUI modal z-index
               // 1300; the drawer default is 1200).
               sx={embedded ? { zIndex: 1350 } : undefined}
            >
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
                     <Sidebar
                        onItemClick={() => setShowSidebar(false)}
                        activeTab={embedded ? embeddedTab : undefined}
                        onSelectTab={embedded ? setEmbeddedTab : undefined}
                     />
                  </Stack>
               </CustomBox>
            </Drawer>
         ) : (
            <Stack
               className="settings-nav"
               py={2}
               pl={{ sm: 1, md: 2 }}
               pr={1}
               bgcolor={"background.default"}
               borderRadius={2}
               // RP-5: the full 260px labelled sidebar applies from
               // lg up. Between sm and lg the admin shell's own nav
               // plus a 260px settings sidebar squeezed the content
               // column to ~330px at 905px (clipped labels/values);
               // the icon rail (140px) now covers that whole band.
               width={{
                  sm: 140,
                  lg: 260,
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
               <Sidebar
                  activeTab={embedded ? embeddedTab : undefined}
                  onSelectTab={embedded ? setEmbeddedTab : undefined}
               />
            </Stack>
         )}

         {/* Content Area — RP-5: minWidth 0 lets the flex column
             actually shrink to the space left by the two navs
             instead of being forced wide by its content. */}
         <Stack flex={1} minWidth={0} bgcolor={"background.default"} borderRadius={2} overflow="hidden">
            {/* Header — Cleanup Phase 1: the single save
                location (carries Save, Discard and the dirty
                indicator since the bottom bar was removed). */}
            <Header
               onShowSidebar={() => setShowSidebar(true)}
               onSave={handleSave}
               onDiscard={handleDiscard}
               isSaving={isSaving}
               canUpdate={canUpdate}
               isDirty={isDirty}
               searchQuery={searchQuery}
               onSearchChange={setSearchQuery}
            />

            {/* Scrollable Tab Body — content is capped at a
                readable measure (GitHub-style) instead of
                stretching fields across very wide screens, and
                the scrollbar is thinned to match. */}
            <Stack
               p={{ xs: 2, sm: 3 }}
               spacing={3}
               overflow={"auto"}
               flex={1}
               sx={{
                  scrollbarWidth: "thin",
                  scrollbarColor: `${alpha(theme.palette.text.primary, 0.22)} transparent`,
                  "&::-webkit-scrollbar": { width: 8 },
                  "&::-webkit-scrollbar-thumb": {
                     backgroundColor: alpha(theme.palette.text.primary, 0.18),
                     borderRadius: 8,
                  },
                  "&::-webkit-scrollbar-thumb:hover": {
                     backgroundColor: alpha(theme.palette.text.primary, 0.3),
                  },
               }}
            >
               {/* Section Title Banner — a soft tinted icon tile
                   (not a solid block), a quieter title, and a
                   hairline under the header row to separate it
                   from the form, GitHub-settings style. */}
               <Stack
                  direction={"row"}
                  alignItems={"center"}
                  spacing={2}
                  flexWrap={"wrap"}
                  sx={{
                     width: "100%",
                     maxWidth: 1120,
                     pb: 2.5,
                     borderBottom: 1,
                     borderColor: "divider",
                  }}
               >
                  <Box
                     sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                     }}
                  >
                     <Icon
                        icon={currentMeta.icon}
                        size="large"
                        style={{
                           color: theme.palette.primary.main,
                        }}
                     />
                  </Box>
                  <Stack flex={1} spacing={0.25}>
                     <Typography variant="h5" fontWeight={650} fontSize={{ xs: "1.25rem", sm: "1.375rem" }} letterSpacing="-0.01em">
                        {currentMeta.title}
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                        {currentMeta.subtitle}
                     </Typography>
                  </Stack>
               </Stack>

               {/* RP-3 (U3): read-only notice for roles that may
                   view but not save settings. */}
               {!canUpdate && !loading && (
                  <Alert severity="info" variant="outlined" sx={{ width: "100%", maxWidth: 1120, borderRadius: "8px" }}>
                     You can view these settings, but your role does not
                     have permission to change them. Saving requires the
                     settings permission — ask an administrator if
                     something needs to change.
                  </Alert>
               )}

               {/* Render Tab Component — RP-3 (U3): the fieldset
                   disables every form control in the tab for
                   read-only roles (native fieldset semantics;
                   style reset so it adds no chrome of its own).
                   Cleanup Phase 1: the RP-1 bottom padding that
                   cleared the old fixed action bar is gone with
                   the bar — the header now carries Save, Discard
                   and the dirty indicator on every tab. */}
               <Box
                  component="fieldset"
                  disabled={!canUpdate}
                  sx={{
                     pb: 2,
                     border: 0,
                     m: 0,
                     paddingTop: 0,
                     paddingInline: 0,
                     minInlineSize: "auto",
                     width: "100%",
                     maxWidth: 1120,
                  }}
               >
                  {renderTabContent()}
               </Box>
            </Stack>

            {/* RP-4: Discard confirmation. */}
            <AlertDialog
               open={discardOpen}
               onClose={() => {
                  // Cancelling a close-triggered discard keeps
                  // the user in the (modal) settings, edits intact.
                  closeAfterDiscardRef.current = false;
                  setDiscardOpen(false);
               }}
               type="warning"
               title="Discard unsaved changes? Your edits will be replaced with the last saved values."
               onConfirm={confirmDiscard}
               confirmText="Discard changes"
               cancelText="Keep editing"
            />
         </Stack>
      </Stack>
   );
};

export default Layout;
