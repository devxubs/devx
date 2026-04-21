"use client";
import React, { useEffect } from "react";
import {
   Box,
   Stack,
   IconButton,
   useTheme,
   useMediaQuery,
   Drawer,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomList from "@src/Layout/List";
import useGlobalState from "@src/handler/globalState";
import Logo from "@src/SvgIcon/logo";
import LogoNameIcon from "@src/SvgIcon/logoName";
import CustomBox from "@src/components/CustomBox";
import ChatIcon from "@src/SvgIcon/ChatIcon";

const items = [
   {
      heading: { title: "MANAGEMENT", id: "management" },
      icon: "solar:widget-5-bold-duotone",
      label: "Dashboard",
      url: "/admin/dashboard",
   },
   {
      headingId: "management",
      icon: "solar:users-group-rounded-bold-duotone",
      label: "User",
      url: "/admin/user",
   },
   {
      headingId: "management",
      icon: "solar:hanger-2-bold-duotone",
      label: "Product",
      url: "/admin/product",
   },
   {
      headingId: "management",
      icon: "solar:clipboard-list-bold-duotone",
      label: "Categories",
      url: "/admin/categories",
   },
   {
      headingId: "management",
      icon: "solar:bill-list-bold-duotone",
      label: "Unit",
      url: "/admin/unit",
   },
   {
      headingId: "management",
      icon: "solar:cart-plus-bold-duotone",
      label: "Order",
      url: "/admin/order",
   },
   {
      headingId: "management",
      icon: "solar:users-group-rounded-bold-duotone",
      label: "Customers",
      url: "/admin/customers",
   },
   // {
   //    headingId: "management",
   //    icon: "solar:palette-bold-duotone",
   //    label: "Quote",
   //    url: "/admin/quote",
   // },
   {
      headingId: "management",
      icon: "solar:users-group-two-rounded-bold-duotone",
      label: "Suppliers",
      url: "/admin/suppliers",
   },
   {
      headingId: "management",
      icon: "solar:cart-large-2-bold-duotone",
      label: "Purchase",
      url: "/admin/purchase",
   },
   {
      headingId: "management",
      icon: "solar:explicit-bold-duotone",
      label: "Expenses",
      url: "/admin/expense",
   },
   {
      headingId: "management",
      icon: "solar:cassette-2-bold-duotone",
      label: "Assets",
      url: "/admin/assets",
   },
   {
      headingId: "management",
      icon: <ChatIcon />,
      label: "Chat",
      url: "/admin/chat",
   },
   {
      headingId: "management",
      icon: "solar:pie-chart-2-bold-duotone",
      label: "Reports",
      url: "/admin/reports",
   },
   {
      headingId: "management",
      icon: "solar:trash-bin-trash-bold-duotone",
      label: "Bin",
      url: "/admin/bin",
   },
   {
      heading: { title: "ACCOUNT", id: "account" },
      icon: "solar:settings-bold-duotone",
      label: "Setting",
      url: "/admin/settings",
   },
   {
      headingId: "account",
      icon: "solar:lock-keyhole-bold-duotone",
      label: "Roles",
      url: "/admin/roles",
   },
   {
      headingId: "account",
      icon: "solar:wallet-money-bold-duotone",
      label: "Billing",
      url: "/admin/billing",
   },
];

const Sidebar = () => {
   const globalState = useGlobalState();
   const theme = useTheme();
   const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
   const isMdDown = useMediaQuery(theme.breakpoints.down("md"));

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
            <IconButton
               size="small"
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
         ) : (
            <IconButton
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
                  items={items.map((i) => ({
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
