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
import CustomList from "@src/components/List";
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
      url: "/dashboard",
   },
   {
      headingId: "management",
      icon: "solar:users-group-rounded-bold-duotone",
      label: "User",
      url: "/user",
   },
   {
      headingId: "management",
      icon: "solar:hanger-2-bold-duotone",
      label: "Product",
      url: "/product",
   },
   {
      headingId: "management",
      icon: "solar:clipboard-list-bold-duotone",
      label: "Categories",
      url: "/categories",
   },
   {
      headingId: "management",
      icon: "solar:cart-plus-bold-duotone",
      label: "Order",
      url: "/order",
   },
   {
      headingId: "management",
      icon: "solar:users-group-rounded-bold-duotone",
      label: "Customers",
      url: "/customers",
   },
   {
      headingId: "management",
      icon: "solar:palette-bold-duotone",
      label: "Quote",
      url: "/quote",
   },
   {
      headingId: "management",
      icon: "solar:users-group-two-rounded-bold-duotone",
      label: "Suppliers",
      url: "/suppliers",
   },
   {
      headingId: "management",
      icon: "solar:inbox-archive-bold-duotone",
      label: "Purchase",
      url: "/purchase",
   },
   {
      headingId: "management",
      icon: "solar:inbox-archive-bold-duotone",
      label: "Expenses",
      url: "/expenses",
   },
   {
      headingId: "management",
      icon: "solar:inbox-archive-bold-duotone",
      label: "Assets",
      url: "/assets",
   },
   {
      headingId: "management",
      icon: <ChatIcon />,
      label: "Chat",
      url: "/chat",
   },
   {
      headingId: "management",
      icon: "solar:pie-chart-2-bold-duotone",
      label: "Reports",
      url: "/reports",
   },
   {
      headingId: "management",
      icon: "solar:trash-bin-trash-bold-duotone",
      label: "Bin",
      url: "/bin",
   },
   {
      heading: { title: "ACCOUNT", id: "account" },
      icon: "solar:settings-bold-duotone",
      label: "Setting",
      url: "/settings",
   },
   {
      headingId: "account",
      icon: "solar:lock-keyhole-bold-duotone",
      label: "Roles",
      url: "/roles",
   },
   {
      headingId: "account",
      icon: "solar:shield-user-bold-duotone",
      label: "Admin",
      url: "/admin",
   },
   {
      headingId: "account",
      icon: "solar:wallet-money-bold-duotone",
      label: "Billing",
      url: "/billing",
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
         width={layout ? 270 : 90}
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
                     localStorage.getItem("customize") || "{}"
                  );
                  localStorage.setItem(
                     "customize",
                     JSON.stringify({ ...cd, layoutFull: !layout })
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
                  top: 24,
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
            "& .MuiDrawer-paper": {
               width: "100%",
               maxWidth: 300,
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
