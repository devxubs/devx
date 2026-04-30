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
      }
   }, []);

   const items: SidebarItem[] = [
      {
         label: "Profile",
         icon: "solar:user-circle-bold-duotone",
         selected: active === "profile",
         onItemClick() {
            query.set("tab", "profile");
            setActive("profile");
            if (onItemClick) {
               onItemClick("profile");
            }
         },
      },
      // {
      //    label: "Account",
      //    icon: "solar:user-circle-bold-duotone",
      //    selected: active === "account",
      //    onItemClick() {
      //       query.set("tab", "account");
      //       setActive("account");
      //    },
      // },
      {
         label: "Security",
         icon: "solar:lock-keyhole-bold-duotone",
         selected: active === "security",
         onItemClick() {
            query.set("tab", "security");
            setActive("security");
            if (onItemClick) {
               onItemClick("security");
            }
         },
      },
      {
         label: "Orders",
         icon: "solar:cart-large-minimalistic-bold-duotone",
         selected: active === "orders",
         onItemClick() {
            query.set("tab", "orders");
            setActive("orders");
            if (onItemClick) {
               onItemClick("orders");
            }
         },
      },
      {
         label: "Products",
         icon: "solar:box-bold-duotone",
         selected: active === "products",
         onItemClick() {
            query.set("tab", "products");
            setActive("products");
            if (onItemClick) {
               onItemClick("products");
            }
         },
      },
      {
         label: "Appearance",
         icon: "solar:pen-new-square-bold-duotone",
         selected: active === "appearance",
         onItemClick() {
            query.set("tab", "appearance");
            setActive("appearance");
            if (onItemClick) {
               onItemClick("appearance");
            }
         },
      },
      {
         label: "Notifications",
         icon: "solar:bell-bing-bold-duotone",
         selected: active === "notifications",
         onItemClick() {
            query.set("tab", "notifications");
            setActive("notifications");
            if (onItemClick) {
               onItemClick("notifications");
            }
         },
      },
      {
         label: "Shipping",
         icon: "solar:delivery-bold-duotone",
         selected: active === "shipping",
         onItemClick() {
            query.set("tab", "shipping");
            setActive("shipping");
            if (onItemClick) {
               onItemClick("shipping");
            }
         },
      },
      {
         label: "Invoices",
         icon: "solar:printer-bold-duotone",
         selected: active === "invoices",
         onItemClick() {
            query.set("tab", "invoices");
            setActive("invoices");
            if (onItemClick) {
               onItemClick("invoices");
            }
         },
      },
      {
         label: "Billing",
         icon: "solar:wallet-money-bold-duotone",
         selected: active === "billing",
         onItemClick() {
            query.set("tab", "billing");
            setActive("billing");
            if (onItemClick) {
               onItemClick("billing");
            }
         },
      },
      {
         label: "Backups",
         icon: "solar:database-bold-duotone",
         selected: active === "backups",
         onItemClick() {
            query.set("tab", "backups");
            setActive("backups");
            if (onItemClick) {
               onItemClick("backups");
            }
         },
      },
   ];
   return (
      <Stack flex={1}>
         <CustomList items={items} fullMenu={!isSm} />
      </Stack>
   );
};

export default Sidebar;
