import * as React from "react";
import { List, ListItemButton, ListItemIcon, Typography } from "@mui/material";
import Scrollbar from "react-browser-scrollbar";

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  color?: "error" | "default";
  onClick?: (l: string) => void;
};

type Size = "small" | "medium" | "large";

export type MenuProps = {
  item: MenuItem[];
  size?: Size;
};

const Menu = ({ item, size = "medium" }: MenuProps) => {
  const sizeStyles = {
    small: {
      minWidth: 120,
      px: 1,
      py: 0.5,
      gap: 0.5,
      iconFontSize: "1rem",
      labelFontSize: "0.75rem",
      listItemMarginBottom: 0.5,
      maxHeight: 150, // set height for scrollbar container
      height: "fit-content",
    },
    medium: {
      minWidth: 140,
      px: 1.5,
      py: 1,
      gap: 0.75,
      iconFontSize: "1.2rem",
      labelFontSize: "0.875rem",
      listItemMarginBottom: 0.5,
      maxHeight: 200,
      height: "fit-content",
    },
    large: {
      minWidth: 200,
      px: 2,
      py: 1,
      gap: 1,
      iconFontSize: "1.5rem",
      labelFontSize: "1rem",
      listItemMarginBottom: 1,
      maxHeight: 250,
      height: "fit-content",
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <Scrollbar
      darkMode
      autoHide
      thumbSize={6}
      style={{ maxHeight: currentSize.maxHeight }}
    >
      <List
        disablePadding
        sx={{
          minWidth: currentSize.minWidth,
        }}
      >
        {item.map(({ label, icon, color, onClick }) => (
          <ListItemButton
            key={label}
            sx={{
              borderRadius: 0.5,
              mb: currentSize.listItemMarginBottom,
              px: currentSize.px,
              py: currentSize.py,
              gap: currentSize.gap,
              ...(color === "error" && {
                "& .MuiTypography-root": {
                  color: "error.main",
                },
                "& .MuiTouchRipple-root": {
                  color: "error.main",
                  opacity: 0.3,
                },
              }),
            }}
            onClick={() => onClick?.(label)}
          >
            <ListItemIcon
              sx={{
                minWidth: "auto",
                mr: currentSize.gap,
                fontSize: currentSize.iconFontSize,
              }}
            >
              {icon}
            </ListItemIcon>
            <Typography
              variant="body2"
              fontWeight={400}
              textTransform="capitalize"
              fontSize={currentSize.labelFontSize}
            >
              {label}
            </Typography>
          </ListItemButton>
        ))}
      </List>
    </Scrollbar>
  );
};

export default Menu;
