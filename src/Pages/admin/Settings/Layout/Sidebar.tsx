"use client";
import React, { useEffect, useState } from "react";

import { Stack, useMediaQuery, useTheme } from "@mui/material";
import CustomList, { SidebarItem } from "@src/components/List";
import useQueryParams from "@src/handler/useQueryParams";

interface SidebarProps {
   onItemClick?: (tab: string) => void;
}

const Sidebar = ({ onItemClick }: SidebarProps) => {
   const theme = useTheme();
   const query = useQueryParams();
   const [active, setActive] = useState<string>("general");
   const isSm = useMediaQuery(theme.breakpoints.only("sm"));

   useEffect(() => {
      const tab = query.get("tab");
      if (tab) {
         setActive(tab);
      } else {
         query.set("tab", "general", false);
         setActive("general");
      }
   }, []);

   const handleSelectTab = (tabKey: string) => {
      query.set("tab", tabKey);
      setActive(tabKey);
      if (onItemClick) {
         onItemClick(tabKey);
      }
   };

   const items: SidebarItem[] = [
      {
         label: "General Store",
         icon: "solar:shop-bold-duotone",
         selected: active === "general",
         onItemClick: () => handleSelectTab("general"),
      },
      {
         label: "Sales & POS",
         icon: "solar:cart-large-minimalistic-bold-duotone",
         selected: active === "pos",
         onItemClick: () => handleSelectTab("pos"),
      },
      {
         label: "Products & Stock",
         icon: "solar:box-bold-duotone",
         selected: active === "products",
         onItemClick: () => handleSelectTab("products"),
      },
      {
         label: "Customers & Suppliers",
         icon: "solar:users-group-two-rounded-bold-duotone",
         selected: active === "customers",
         onItemClick: () => handleSelectTab("customers"),
      },
      {
         label: "Purchases & Expenses",
         icon: "solar:wallet-money-bold-duotone",
         selected: active === "expenses",
         onItemClick: () => handleSelectTab("expenses"),
      },
      {
         label: "Invoice & Printing",
         icon: "solar:printer-bold-duotone",
         selected: active === "invoices",
         onItemClick: () => handleSelectTab("invoices"),
      },
      {
         label: "Users & Permissions",
         icon: "solar:shield-user-bold-duotone",
         selected: active === "permissions",
         onItemClick: () => handleSelectTab("permissions"),
      },
      {
         label: "Entity ID Formats",
         icon: "solar:tag-price-bold-duotone",
         selected: active === "prefixes",
         onItemClick: () => handleSelectTab("prefixes"),
      },
      {
         label: "Appearance & Theme",
         icon: "solar:palette-bold-duotone",
         selected: active === "appearance",
         onItemClick: () => handleSelectTab("appearance"),
      },
      {
         label: "Notifications & System",
         icon: "solar:settings-bold-duotone",
         selected: active === "system",
         onItemClick: () => handleSelectTab("system"),
      },
   ];

   return (
      <Stack flex={1}>
         <CustomList items={items} fullMenu={!isSm} />
      </Stack>
   );
};

export default Sidebar;
