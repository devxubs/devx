import React, { CSSProperties } from "react";

import { Icon as Iconify, IconProps } from "@iconify/react";
import { Palette, useTheme } from "@mui/material";
import dynamic from "next/dynamic";

const Icon = ({
   icon,
   size = "medium",
   style,
   color = "default",
   ...rest
}: {
   icon: string;
   size?: "small" | "medium" | "large" | string;
   color?:
      | "primary"
      | "secondary"
      | "info"
      | "success"
      | "warning"
      | "error"
      | "default";
   style?: CSSProperties;
}) => {
   const theme = useTheme();
   const colorKey = color as keyof Palette;
   const paletteColor: any = theme.palette[colorKey] ?? {
      main: color || "",
   };
   return (
      <Iconify
         icon={icon}
         width={
            size === "small"
               ? 20
               : size === "medium"
                 ? 24
                 : size === "large"
                   ? 28
                   : size
         }
         height={
            size === "small"
               ? 20
               : size === "medium"
                 ? 24
                 : size === "large"
                   ? 28
                   : size
         }
         style={{
            color:
               color === "default"
                  ? theme.palette.text.secondary
                  : paletteColor.main,
            ...style,
         }}
         {...(rest as Omit<IconProps, "icon">)}
      />
   );
};

export default Icon;
