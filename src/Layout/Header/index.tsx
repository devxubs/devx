"use client";
import {
  alpha,
  Avatar,
  IconButton,
  keyframes,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AnimatedAvatar from "@src/components/AnimateAvatar";
import Icon from "@src/components/Icon";
import React, { useState } from "react";
import SearchBar from "./SearchBar";
import NotificationDrawer from "./NotificationDrawer";
import CustomPopover from "@src/components/CustomPopover";
import Menu from "@src/components/Menu";
import SettingsDrawer from "./Settings";
import Profile from "./Profile";
import { usePathname } from "next/navigation";

const Header = () => {
  const pathname = usePathname();

  const [openNotification, setOpenNotification] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const userMenu = [
    {
      label: "Alice Johnson",
      icon: (
        <Avatar src="/images/avatar/alice.jpg" sx={{ width: 35, height: 35 }} />
      ),
    },
    {
      label: "Brandon Lee",
      icon: (
        <Avatar src="/images/avatar/alice.jpg" sx={{ width: 35, height: 35 }} />
      ),
    },
    {
      label: "Cynthia Adams",
      icon: (
        <Avatar src="/images/avatar/alice.jpg" sx={{ width: 35, height: 35 }} />
      ),
    },
    {
      label: "Daniel Martinez",
      icon: (
        <Avatar src="/images/avatar/alice.jpg" sx={{ width: 35, height: 35 }} />
      ),
    },
    {
      label: "Emily Chen",
      icon: (
        <Avatar src="/images/avatar/alice.jpg" sx={{ width: 35, height: 35 }} />
      ),
    },
    {
      label: "Farhan Qureshi",
      icon: (
        <Avatar src="/images/avatar/alice.jpg" sx={{ width: 35, height: 35 }} />
      ),
    },
    {
      label: "Grace Kim",
      icon: (
        <Avatar src="/images/avatar/alice.jpg" sx={{ width: 35, height: 35 }} />
      ),
    },
    {
      label: "Hassan Ali",
      icon: (
        <Avatar src="/images/avatar/alice.jpg" sx={{ width: 35, height: 35 }} />
      ),
    },
    {
      label: "Isabella Rossi",
      icon: (
        <Avatar src="/images/avatar/alice.jpg" sx={{ width: 35, height: 35 }} />
      ),
    },
    {
      label: "Jack Nguyen",
      icon: (
        <Avatar src="/images/avatar/alice.jpg" sx={{ width: 35, height: 35 }} />
      ),
    },
  ];

  const rotate = keyframes`
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  `;

  return (
    <Paper
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 3,
        py: 1,

        bgcolor: "transparent",
        position: "sticky",
        height: 74,
        width: "100%",
        top: 0,
        left: "auto",
        right: 0,
        zIndex: 1,
        boxShadow: "none",
        transition: "box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1);",

        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: "100%",
          zIndex: -1,
          bgcolor: (theme) => alpha(theme.palette.background.default, 0.4),
          backdropFilter: "blur(6px)",
          transition:
            "opacity 200ms cubic-bezier(0.4, 0, 0.2, 1), visibility 200ms cubic-bezier(0.4, 0, 0.2, 1);",
        },
      }}
    >
      <Stack direction="row" alignItems="center">
        <Typography variant="h4" textTransform="capitalize">
          {pathname?.slice(1, pathname.length)}
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={0.5} flex={0.5}>
        <SearchBar />
        <NotificationDrawer
          open={openNotification}
          onClose={() => {
            setOpenNotification(false);
          }}
        />
        <IconButton
          sx={{ color: "text.secondary" }}
          onClick={() => setOpenNotification(true)}
        >
          <Icon icon="solar:bell-bing-bold-duotone" />
        </IconButton>
        <CustomPopover
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Menu item={userMenu} size="large" />
        </CustomPopover>
        <IconButton
          sx={{ color: "text.secondary" }}
          onClick={(e) => {
            handleMenuOpen(e);
          }}
        >
          <Icon icon="solar:users-group-rounded-bold" />
        </IconButton>
        <SettingsDrawer
          open={openSettings}
          onClose={() => setOpenSettings(false)}
          onOpen={() => setOpenSettings(true)}
        />
        <IconButton
          onClick={() => setOpenSettings(true)}
          sx={{
            color: "text.secondary",
            "& svg": {
              animation: `${rotate} 8s linear infinite`,
            },
          }}
        >
          <Icon icon="solar:settings-bold-duotone" />
        </IconButton>
        {/* Profile */}
        <Profile
          open={openProfile}
          onOpen={() => setOpenProfile(true)}
          onClose={() => setOpenProfile(false)}
        />
        <IconButton
          disableRipple
          disableFocusRipple
          disableTouchRipple
          sx={{ p: 0 }}
          onClick={() => setOpenProfile(!openProfile)}
        >
          <AnimatedAvatar src="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-25.webp" />
        </IconButton>
      </Stack>
    </Paper>
  );
};

export default Header;
