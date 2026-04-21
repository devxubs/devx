"use client";
import React, { useState } from "react";

import { Box, Stack } from "@mui/material";
import CustomList, { SidebarItem } from "@src/Layout/List";

const items: SidebarItem[] = [
   {
      heading: { title: "MANAGEMENT", id: "management" },
      icon: "solar:calendar-bold-duotone",
      label: "General",

      children: [
         {
            label: "Analytics",
         },
         {
            label: "Sales",
         },
      ],
   },
   {
      headingId: "management",
      icon: "solar:shop-bold-duotone",
      label: "Store",
   },
   {
      headingId: "management",
      icon: "solar:user-circle-bold-duotone",
      label: "Users",
   },
   {
      headingId: "management",
      icon: "solar:wallet-money-bold-duotone",
      label: "Payments",
   },
   {
      headingId: "management",
      icon: "solar:notebook-bold-duotone",
      label: "Invoice",
   },
   {
      headingId: "management",
      icon: "solar:box-bold-duotone",
      label: "Products",
   },
   {
      headingId: "management",
      icon: "solar:sale-square-bold-duotone",
      label: "Sales",
   },
   {
      headingId: "management",
      icon: "solar:users-group-two-rounded-bold-duotone",
      label: "Notifications",
   },
   {
      headingId: "management",
      icon: "solar:cart-large-2-bold-duotone",
      label: "Purchase",
   },
   {
      headingId: "management",
      icon: "solar:explicit-bold-duotone",
      label: "Expenses",
   },
   {
      headingId: "management",
      icon: "solar:cassette-2-bold-duotone",
      label: "Assets",
   },
   {
      headingId: "management",
      icon: "solar:pie-chart-2-bold-duotone",
      label: "Reports",
   },
   {
      headingId: "management",
      icon: "solar:trash-bin-trash-bold-duotone",
      label: "Bin",
   },
   {
      heading: { title: "ACCOUNT", id: "account" },
      icon: "solar:settings-bold-duotone",
      label: "Setting",
   },
   {
      headingId: "account",
      icon: "solar:lock-keyhole-bold-duotone",
      label: "Roles",
   },
   {
      headingId: "account",
      icon: "solar:wallet-money-bold-duotone",
      label: "Billing",
   },
];

const Sidebar = () => {
   return (
      <Stack flex={1}>
         <Box pb={2} sx={{ transition: "padding 0.3s ease" }}>
            <CustomList items={items} fullMenu />
         </Box>
      </Stack>
   );
};

export default Sidebar;
