"use client";
import { Box, Stack, IconButton } from "@mui/material";
import Icon from "@src/components/Icon";
import CustomList from "@src/components/List";
import useGlobalState from "@src/handler/globalState";
import Logo from "@src/SvgIcon/logo";
import LogoNameIcon from "@src/SvgIcon/logoName";
import React, { useState } from "react";
import Scrollbar from "react-browser-scrollbar";

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
    icon: "solar:clipboard-list-bold-duotone", // Assuming this icon for Categories
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
    icon: "solar:palette-bold-duotone", // Assuming this icon for Attributes
    label: "Attributes",
    url: "/attributes",
  },
  {
    headingId: "management",
    icon: "solar:users-group-two-rounded-bold-duotone", // Assuming this icon for Suppliers
    label: "Suppliers",
    url: "/suppliers",
  },
  {
    headingId: "management",
    icon: "solar:inbox-archive-bold-duotone",
    label: "Inventory",
    url: "/inventory",
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
    url: "/recycle-bin",
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
  const layout = globalState.get("layoutFull");

  return (
    <Stack
      minWidth={layout ? 300 : 90}
      px={layout ? 1 : 0}
      py={2}
      bgcolor={"background.paper"}
      position="relative"
      sx={{
        transition: "width 0.3s ease, padding 0.3s ease",
        // overflow: "hidden",
      }}
    >
      <IconButton
        size="small"
        sx={{
          bgcolor: (theme) => theme.palette.background.default + "!important",
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
          const cd = JSON.parse(localStorage.getItem("customize") as any);
          localStorage.setItem(
            "customize",
            JSON.stringify({ ...cd, layoutFull: !layout })
          );
        }}
      >
        <Icon
          icon={"eva:arrow-ios-back-fill"}
          style={{ width: 18, height: 18 }}
        />
      </IconButton>
      {/* logo */}
      <Stack height={60} py={1}>
        {layout ? (
          <Box
            width={"100%"}
            height={"100%"}
            sx={{ opacity: 1, transition: "opacity 0.3s" }}
          >
            <LogoNameIcon />
          </Box>
        ) : (
          <Box
            width={"100%"}
            height={"100%"}
            sx={{ opacity: 1, transition: "opacity 0.3s" }}
          >
            <Logo />
          </Box>
        )}
      </Stack>
      <Stack
        flex={1}
        height={"calc(100vh - 80px)"}
        overflow="auto"
        sx={{
          scrollbarWidth: "none!important", // Firefox
          "&::-webkit-scrollbar": {
            display: "none", // Chrome, Safari, Edge
          },
        }}
      >
        {layout ? (
          <Scrollbar autoHide thumbSize={6} darkMode>
            <Box pb={2} sx={{ transition: "padding 0.3s ease" }}>
              <CustomList fullMenu={true} items={items} />
            </Box>
          </Scrollbar>
        ) : (
          <Box py={2} px={1} sx={{ transition: "padding 0.3s ease" }}>
            <CustomList fullMenu={false} items={items} />
          </Box>
        )}
      </Stack>
    </Stack>
  );
};

export default Sidebar;
