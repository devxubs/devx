"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
   Box,
   Stack,
   IconButton,
   Tooltip,
   useTheme,
   useMediaQuery,
   Drawer,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomList from "@src/components/List";
import useGlobalState from "@src/handler/globalState";
import Logo from "@src/SvgIcon/logo";
import LogoNameIcon from "@src/SvgIcon/logoName";
import CustomBox from "@src/components/CustomBox";
import ChatIcon from "@src/SvgIcon/ChatIcon";
import SidebarAccount from "./SidebarAccount";

// Phase 2 (2.2): permission-filtered navigation. Each item names the
// permission family that governs it, using ONLY keys that exist in the
// permission model (the seeded module keys and the Roles-UI
// "<category>_<permission>" keys — see src/lib/auth.ts). An item is
// visible when the user's map grants the module key, the singular key,
// or any granular key under the module prefix (e.g. `order_create`,
// `products_read`). System Admin (`all: true`) sees everything.
// Dashboard and Chat carry no permission keys in the model (the
// dashboard is every role's landing page and chat is session-scoped),
// so they are always visible. This is a UI filter only — the APIs
// enforce the same permissions server-side (Phase 1).
type NavItem = {
   heading?: { title: string; id: string };
   headingId?: string;
   icon: any;
   label: string;
   url: string;
   module?: { plural: string; singular: string };
   always?: boolean;
   adminKeys?: string[];
   // An additional module whose grant also unlocks this item (Roles is
   // readable by user-managers — GET /api/roles accepts user-view).
   alsoModule?: { plural: string; singular: string };
};

const items: NavItem[] = [
   {
      heading: { title: "MANAGEMENT", id: "management" },
      icon: "solar:widget-5-bold-duotone",
      label: "Dashboard",
      url: "/admin/dashboard",
      always: true,
   },
   {
      headingId: "management",
      icon: "solar:users-group-rounded-bold-duotone",
      label: "Employee",
      url: "/admin/user",
      module: { plural: "users", singular: "user" },
   },
   {
      headingId: "management",
      icon: "solar:hanger-2-bold-duotone",
      label: "Product",
      url: "/admin/product",
      module: { plural: "products", singular: "product" },
   },
   {
      headingId: "management",
      icon: "solar:clipboard-list-bold-duotone",
      label: "Categories",
      url: "/admin/categories",
      module: { plural: "categories", singular: "category" },
   },
   {
      headingId: "management",
      icon: "solar:bill-list-bold-duotone",
      label: "Unit",
      url: "/admin/unit",
      module: { plural: "units", singular: "unit" },
   },
   {
      headingId: "management",
      icon: "solar:cart-plus-bold-duotone",
      label: "Order",
      url: "/admin/order",
      module: { plural: "orders", singular: "order" },
   },
   {
      headingId: "management",
      icon: "solar:users-group-rounded-bold-duotone",
      label: "Customers",
      url: "/admin/customers",
      module: { plural: "customers", singular: "customer" },
   },
   {
      headingId: "management",
      icon: "solar:users-group-two-rounded-bold-duotone",
      label: "Suppliers",
      url: "/admin/suppliers",
      module: { plural: "suppliers", singular: "supplier" },
   },
   {
      headingId: "management",
      icon: "solar:cart-large-2-bold-duotone",
      label: "Purchase",
      url: "/admin/purchase",
      module: { plural: "purchases", singular: "purchase" },
   },
   {
      // Phase 3A (3.2): Stock workspace — governed by the products
      // module permission family (no new permission keys, per the
      // Phase 1/2 convention); its APIs enforce the same server-side.
      headingId: "management",
      icon: "solar:box-bold-duotone",
      label: "Stock",
      url: "/admin/stock",
      module: { plural: "products", singular: "product" },
   },
   {
      headingId: "management",
      icon: "solar:explicit-bold-duotone",
      label: "Expenses",
      url: "/admin/expense",
      module: { plural: "expenses", singular: "expense" },
   },
   {
      headingId: "management",
      icon: "solar:cassette-2-bold-duotone",
      label: "Assets",
      url: "/admin/assets",
      module: { plural: "assets", singular: "asset" },
   },
   {
      headingId: "management",
      icon: <ChatIcon />,
      label: "Chat",
      url: "/admin/chat",
      always: true,
   },
   {
      headingId: "management",
      icon: "solar:pie-chart-2-bold-duotone",
      label: "Reports",
      url: "/admin/reports",
      module: { plural: "reports", singular: "report" },
   },
   {
      headingId: "management",
      icon: "solar:trash-bin-trash-bold-duotone",
      label: "Bin",
      url: "/admin/bin",
      adminKeys: ["bin"],
   },
   {
      // Settings is intentionally NOT a sidebar nav item: it
      // opens as the full-screen Settings modal from the
      // sidebar account popup (see SidebarAccount). The
      // /admin/settings route itself still exists for direct
      // links. This first ACCOUNT-group entry carries the
      // group heading for the items below.
      heading: { title: "ACCOUNT", id: "account" },
      icon: "solar:lock-keyhole-bold-duotone",
      label: "Roles",
      url: "/admin/roles",
      adminKeys: ["roles", "role"],
      alsoModule: { plural: "users", singular: "user" },
   },
   {
      headingId: "account",
      icon: "solar:history-bold-duotone",
      label: "Audit Logs",
      url: "/admin/audit-logs",
      // Phase 4 (D1): no role grants an "audit_logs" key, so this
      // entry is visible to administrators only — matching the
      // requireAdmin gate on GET /api/audit-logs.
      adminKeys: ["audit_logs"],
   },
   {
      headingId: "account",
      icon: "solar:wallet-money-bold-duotone",
      label: "Billing",
      url: "/admin/billing",
      adminKeys: ["billing"],
   },
];

// Client mirror of lib/auth.ts normalizePermissions (same key
// normalisation: lower-case, spaces → underscores; both stored shapes).
function normalizePermissions(raw: unknown): Record<string, boolean> {
   const out: Record<string, boolean> = {};
   if (!raw) return out;
   if (Array.isArray(raw)) {
      for (const entry of raw as any[]) {
         if (entry && typeof entry === "object") {
            const key = String(entry.key || entry.name || "")
               .trim()
               .toLowerCase()
               .replace(/\s+/g, "_");
            if (key) out[key] = entry.allow !== false && entry.value !== false;
         } else if (typeof entry === "string") {
            out[entry.trim().toLowerCase().replace(/\s+/g, "_")] = true;
         }
      }
      return out;
   }
   if (typeof raw === "object") {
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
         out[k.trim().toLowerCase().replace(/\s+/g, "_")] =
            v === true || v === "true";
      }
   }
   return out;
}

function moduleGranted(
   permissions: Record<string, boolean>,
   plural: string,
   singular: string,
): boolean {
   if (permissions[plural] === true || permissions[singular] === true) {
      return true;
   }
   // Granular Roles-UI keys live under the module prefix
   // (order_create, products_read, customer_view_customer, …).
   return Object.entries(permissions).some(
      ([key, granted]) =>
         granted &&
         (key.startsWith(`${singular}_`) || key.startsWith(`${plural}_`)),
   );
}

function canSeeItem(
   item: NavItem,
   permissions: Record<string, boolean>,
   isAdmin: boolean,
): boolean {
   if (isAdmin) return true;
   if (item.always) return true;
   if (
      item.alsoModule &&
      moduleGranted(permissions, item.alsoModule.plural, item.alsoModule.singular)
   ) {
      return true;
   }
   if (item.adminKeys) {
      return item.adminKeys.some((k) => permissions[k] === true);
   }
   if (item.module) {
      return moduleGranted(permissions, item.module.plural, item.module.singular);
   }
   return true;
}

const Sidebar = () => {
   const globalState = useGlobalState();
   const theme = useTheme();
   const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
   const isMdDown = useMediaQuery(theme.breakpoints.down("md"));

   // Phase 2 (2.2): load the signed-in user's permissions once and
   // filter the navigation.
   // OBS-G3 (Full Live QA Audit 2026-11-25): until the request
   // resolved, the FULL admin menu rendered — a cashier landing
   // directly on a page briefly saw every admin entry flash before
   // the filter landed. Fail closed instead: no items render until
   // the permissions are known.
   const [permissions, setPermissions] = useState<Record<
      string,
      boolean
   > | null>(null);
   const [isAdmin, setIsAdmin] = useState(false);
   // The sidebar account section (bottom) shows the same /me
   // identity — one fetch serves both.
   const [user, setUser] = useState<any>(null);

   useEffect(() => {
      let cancelled = false;
      fetch("/api/auth/me")
         .then((r) => (r.ok ? r.json() : null))
         .then((data) => {
            if (cancelled || !data?.user) return;
            const perms = normalizePermissions(
               data.user.roleDetails?.permissions,
            );
            setPermissions(perms);
            setIsAdmin(
               perms["all"] === true || data.user.role === "System Admin",
            );
            setUser(data.user);
         })
         .catch(() => {});
      return () => {
         cancelled = true;
      };
   }, []);

   const visibleItems = useMemo(() => {
      const visible =
         permissions === null
            ? []
            : items.filter((item) => canSeeItem(item, permissions, isAdmin));
      // Re-attach each group's heading to its first visible item (the
      // heading normally rides on the group's first entry, which may
      // have been filtered out).
      const headings: Record<string, { title: string; id: string }> = {
         management: { title: "MANAGEMENT", id: "management" },
         account: { title: "ACCOUNT", id: "account" },
      };
      const seenGroups = new Set<string>();
      return visible.map((item) => {
         const group = item.heading?.id || item.headingId || "";
         const { heading: _heading, ...rest } = item;
         if (group && headings[group] && !seenGroups.has(group)) {
            seenGroups.add(group);
            return { ...rest, heading: headings[group] };
         }
         return rest;
      });
   }, [permissions, isAdmin]);

   useEffect(() => {
      if (isMdDown) {
         globalState.set("layoutFull", false);
      } else {
         globalState.set("layoutFull", true);
      }
   }, [isMdDown]);
   const layout = globalState.get("layoutFull");

   const sidebarWidth = layout ? 270 : 90;

   const SidebarContent = (
      <Stack
         component={isSmDown ? CustomBox : "div"}
         width={sidebarWidth}
         px={layout ? 1 : 0}
         py={1}
         bgcolor="background.paper"
         height="100%"
      >
         {/* Toggle button */}
         {!isSmDown ? (
            <Tooltip
               title={layout ? "Collapse sidebar" : "Expand sidebar"}
               disableInteractive
            >
            <IconButton
               size="small"
               aria-label={layout ? "Collapse sidebar" : "Expand sidebar"}
               sx={{
                  bgcolor: (t) => `${t.palette.background.default}!important`,
                  border: 1,
                  borderColor: "divider",
                  position: "absolute",
                  top: 24,
                  right: -13,
                  zIndex: 18,
                  transition: "transform 0.3s ease",
                  transform: !layout ? "rotate(0deg)" : "rotate(180deg)",
                  p: 0.4,
               }}
               onClick={() => {
                  globalState.set("layoutFull", !layout);
                  const cd = JSON.parse(
                     localStorage.getItem("customize") || "{}",
                  );
                  localStorage.setItem(
                     "customize",
                     JSON.stringify({ ...cd, layoutFull: !layout }),
                  );
               }}
            >
               <Icon
                  icon="eva:arrow-ios-back-fill"
                  style={{ width: 18, height: 18 }}
               />
            </IconButton>
            </Tooltip>
         ) : (
            <IconButton
               aria-label="Close sidebar"
               onClick={() => globalState.set("layoutFull", false)}
               sx={{
                  position: "absolute",
                  top: 14,
                  right: 13,
                  zIndex: 18,
               }}
            >
               <Icon icon="carbon:close" />
            </IconButton>
         )}

         {/* Logo */}
         <Stack height={50} pb={1}>
            {layout ? <LogoNameIcon /> : <Logo />}
         </Stack>

         {/* Menu */}
         <Stack
            flex={1}
            height="calc(100% - 80px)"
            overflow="auto"
            sx={{
               scrollbarWidth: "none!important",
            }}
         >
            <Box
               pb={2}
               px={layout ? 0 : 1}
               sx={{ transition: "padding 0.3s ease" }}
            >
               <CustomList
                  fullMenu={layout}
                  items={visibleItems.map((i) => ({
                     ...i,
                     onItemClick: () => {
                        if (isSmDown) {
                           globalState.set("layoutFull", false);
                        }
                     },
                  }))}
               />
            </Box>
         </Stack>

         {/* Account section — pinned below the scrolling nav
             (the nav Stack above is flex:1 with overflow auto,
             so this stays at the bottom of the sidebar). The
             Settings entry inside its popup follows the same
             permission rule the old Settings nav item used
             (admin, or the settings/setting key). */}
         <SidebarAccount
            user={user}
            layout={layout}
            canSeeSettings={
               isAdmin ||
               permissions?.["settings"] === true ||
               permissions?.["setting"] === true
            }
            onNavigate={() => {
               if (isSmDown) {
                  globalState.set("layoutFull", false);
               }
            }}
         />
      </Stack>
   );

   return isSmDown ? (
      // 🔹 Mobile view → Drawer
      <Drawer
         open={layout}
         onClose={() => globalState.set("layoutFull", false)}
         ModalProps={{ keepMounted: true }}
         sx={{
            zIndex: layout ? 1300 : 1,
            "& .MuiDrawer-paper": {
               maxWidth: 270,
               bgcolor: "background.paper",
               px: 0,
            },
         }}
      >
         {SidebarContent}
      </Drawer>
   ) : (
      // 🔹 Desktop view → Persistent sidebar
      <Stack
         width={sidebarWidth}
         position="relative"
         sx={{ transition: "width 0.3s ease, padding 0.3s ease" }}
      >
         {SidebarContent}
      </Stack>
   );
};

export default Sidebar;
