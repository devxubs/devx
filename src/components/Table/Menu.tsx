import * as React from "react";
import { List, ListItemButton, ListItemIcon, Typography } from "@mui/material";

import BorderColorRoundedIcon from "@mui/icons-material/BorderColorRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import useGlobalState from "@src/handler/globalState";

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  color?: "error";
};

const menuItems: MenuItem[] = [
  {
    label: "Add note",
    icon: <AddRoundedIcon fontSize="small" />,
  },
  {
    label: "Edit",
    icon: <BorderColorRoundedIcon fontSize="small" />,
  },
  {
    label: "View",
    icon: <PreviewRoundedIcon fontSize="small" />,
  },
  {
    label: "Delete",
    icon: <DeleteOutlineRoundedIcon fontSize="small" />,
    color: "error",
  },
];

const Menu = () => {
  const globalState = useGlobalState();

  return (
    <List
      disablePadding
      sx={{
        minWidth: 140,
        "&:last-of-type": {
          marginBottom: 0,
        },
      }}
    >
      {menuItems.map(({ label, icon, color }) => (
        <ListItemButton
          key={label}
          sx={{
            borderRadius: 0.5,
            mb: 0.5,
            px: 1,
            py: 0.5,
            gap: 1,
            ...(color === "error" && {
              "& .MuiTypography-root": {
                color:
                  globalState.get("color") === "error"
                    ? "primary.main"
                    : "error.main",
              },
              "& .MuiTouchRipple-root": {
                color:
                  globalState.get("color") === "error"
                    ? "primary.main"
                    : "error.main",
                opacity: 0.3,
              },
            }),
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: "auto",
              mr: 1,
              ...(color === "error" && {
                color:
                  globalState.get("color") === "error"
                    ? "primary.main"
                    : "error.main",
              }),
            }}
          >
            {icon}
          </ListItemIcon>
          <Typography
            variant="button"
            fontWeight={400}
            textTransform="capitalize"
          >
            {label}
          </Typography>
        </ListItemButton>
      ))}
    </List>
  );
};

export default Menu;
