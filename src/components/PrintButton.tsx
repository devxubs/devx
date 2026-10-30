"use client";

import React from "react";
import { Button, IconButton, Tooltip, SxProps, Theme } from "@mui/material";
import Icon from "./Icon";

export interface PrintButtonProps {
   targetId?: string;
   variant?: "contained" | "outlined" | "text" | "icon";
   color?: "primary" | "secondary" | "inherit" | "info" | "default";
   size?: "small" | "medium" | "large";
   label?: string;
   iconOnly?: boolean;
   tooltip?: string;
   onBeforePrint?: () => void;
   sx?: SxProps<Theme>;
   className?: string;
}

export const executePrint = (targetId?: string, onBeforePrint?: () => void) => {
   if (typeof window === "undefined") return;
   if (onBeforePrint) onBeforePrint();

   if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
         document.body.classList.add("print-target-active");
         el.classList.add("print-active-target");
         const cleanup = () => {
            document.body.classList.remove("print-target-active");
            el.classList.remove("print-active-target");
            window.removeEventListener("afterprint", cleanup);
         };
         window.addEventListener("afterprint", cleanup);
         window.print();
         setTimeout(cleanup, 2000);
         return;
      }
   }
   window.print();
};

export default function PrintButton({
   targetId,
   variant = "outlined",
   color = "inherit",
   size = "small",
   label = "Print",
   iconOnly = false,
   tooltip = "Print Document",
   onBeforePrint,
   sx,
   className,
}: PrintButtonProps) {
   const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      executePrint(targetId, onBeforePrint);
   };

   if (iconOnly || variant === "icon") {
      return (
         <Tooltip title={tooltip} disableInteractive>
            <IconButton
               size={size}
               color={color as any}
               onClick={handleClick}
               className={`no-print-hide ${className || ""}`}
               sx={{ ...sx }}
            >
               <Icon icon="solar:printer-minimalistic-bold" size={size === "small" ? "small" : "medium"} />
            </IconButton>
         </Tooltip>
      );
   }

   return (
      <Button
         variant={variant === ("button" as any) ? "outlined" : variant}
         color={color as any}
         size={size}
         startIcon={<Icon icon="solar:printer-minimalistic-bold" size="small" />}
         onClick={handleClick}
         className={`no-print-hide ${className || ""}`}
         sx={{ ...sx }}
      >
         {label}
      </Button>
   );
}
