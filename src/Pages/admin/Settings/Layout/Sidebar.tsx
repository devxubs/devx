"use client";
import React, { useState } from "react";

import { Stack, useMediaQuery } from "@mui/material";
import CustomList, { SidebarItem } from "@src/Layout/List";

const items: SidebarItem[] = [
   {
      label: "General Settings",
      icon: "solar:settings-bold-duotone",
      children: [
         {
            label: "Analytics",
         },
         {
            label: "Sales",
         },
      ],
      onItemClick() {
         console.log("General Settings clicked");
      },
   },
   {
      label: "Orders",
      icon: "solar:cart-plus-bold-duotone",
   },
   {
      label: "Products",
      icon: "solar:box-bold-duotone",
   },
   {
      label: "Appearance",
      icon: "solar:pen-new-square-bold-duotone",
   },
   {
      label: "Notifications",
      icon: "solar:bell-bing-bold-duotone",
   },
   {
      label: "Shipping",
      icon: "solar:delivery-bold-duotone",
   },
   {
      label: "Invoices",
      icon: "solar:printer-bold-duotone",
   },
   {
      label: "Payments",
      icon: "solar:wallet-money-bold-duotone",
   },
   {
      label: "Backups",
      icon: "solar:database-bold-duotone",
   },
];

const Sidebar = () => {
   return (
      <Stack flex={1}>
         <CustomList items={items} fullMenu />
      </Stack>
   );
};

export default Sidebar;
