"use client";
import React, { useEffect, useState } from "react";

import { Stack } from "@mui/material";
import CustomList, { SidebarItem } from "@src/components/List";
import useQueryParams from "@src/handler/useQueryParams";

const Sidebar = () => {
   const query = useQueryParams();
   const [active, setActive] = useState<string>("general");

   useEffect(() => {
      const tab = query.get("tab");
      if (tab) {
         setActive(tab);
      } else {
         query.set("tab", "general", false);
      }
   }, []);

   const items: SidebarItem[] = [
      {
         label: "General Settings",
         icon: "solar:settings-bold-duotone",
         selected: active === "general",
         onItemClick() {
            query.set("tab", "general");
            setActive("general");
         },
      },
      {
         label: "Orders",
         icon: "solar:cart-large-minimalistic-bold-duotone",
         selected: active === "orders",
         onItemClick() {
            query.set("tab", "orders");
            setActive("orders");
         },
      },
      {
         label: "Products",
         icon: "solar:box-bold-duotone",
         selected: active === "products",
         onItemClick() {
            query.set("tab", "products");
            setActive("products");
         },
      },
      {
         label: "Appearance",
         icon: "solar:pen-new-square-bold-duotone",
         selected: active === "appearance",
         onItemClick() {
            query.set("tab", "appearance");
            setActive("appearance");
         },
      },
      {
         label: "Notifications",
         icon: "solar:bell-bing-bold-duotone",
         selected: active === "notifications",
         onItemClick() {
            query.set("tab", "notifications");
            setActive("notifications");
         },
      },
      {
         label: "Shipping",
         icon: "solar:delivery-bold-duotone",
         selected: active === "shipping",
         onItemClick() {
            query.set("tab", "shipping");
            setActive("shipping");
         },
      },
      {
         label: "Invoices",
         icon: "solar:printer-bold-duotone",
         selected: active === "invoices",
         onItemClick() {
            query.set("tab", "invoices");
            setActive("invoices");
         },
      },
      {
         label: "Payments",
         icon: "solar:wallet-money-bold-duotone",
         selected: active === "payments",
         onItemClick() {
            query.set("tab", "payments");
            setActive("payments");
         },
      },
      {
         label: "Backups",
         icon: "solar:database-bold-duotone",
         selected: active === "backups",
         onItemClick() {
            query.set("tab", "backups");
            setActive("backups");
         },
      },
   ];
   return (
      <Stack flex={1}>
         <CustomList items={items} fullMenu />
      </Stack>
   );
};

export default Sidebar;
