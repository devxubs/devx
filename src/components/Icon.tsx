import React, { CSSProperties } from "react";

import { Icon as Iconify, IconProps as IconifyProps } from "@iconify/react";
import { Palette, useTheme } from "@mui/material";

interface IconProps extends Omit<IconifyProps, "icon"> {
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
}

const Icon = ({
   icon,
   size = "medium",
   style,
   color = "default",
   ...rest
}: IconProps) => {
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
