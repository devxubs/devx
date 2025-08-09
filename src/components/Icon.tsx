import React from "react";

import { Icon as Iconify, IconProps } from "@iconify/react";

const Icon = ({
  icon,
  size = "medium",
  style,
  ...rest
}: {
  icon: string;
  size?: "small" | "medium" | "large" | string;
  style?: any;
}) => {
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
      style={style}
      {...(rest as Omit<IconProps, "icon">)}
    />
  );
};

export default Icon;
