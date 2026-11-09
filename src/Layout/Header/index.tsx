"use client";
import {
   alpha,
   Avatar,
   Badge,
   IconButton,
   keyframes,
   Paper,
   Stack,
   Typography,
   useMediaQuery,
   useTheme,
   Slide,
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
import useGlobalState from "@src/handler/globalState";
import CustomBox from "@src/components/CustomBox";

const Header = () => {
   const pathname = usePathname();
   const theme = useTheme();
   const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
   const isMdDown = useMediaQuery(theme.breakpoints.down("md"));

   const [openNotification, setOpenNotification] = useState(false);
   const [unreadCount, setUnreadCount] = useState(0);
   const [openProfile, setOpenProfile] = useState(false);
   const [openSettings, setOpenSettings] = useState(false);
   const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
   const [openSearch, setOpenSearch] = useState(false);

   React.useEffect(() => {
      fetch("/api/notifications")
         .then((r) => (r.ok ? r.json() : null))
         .then((data) => {
            if (data?.unreadCount != null) setUnreadCount(data.unreadCount);
         })
         .catch(() => {});
   }, []);

   const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
   };

   const globalState = useGlobalState();

   const rotate = keyframes`
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  `;

   return (
      <>
         <Paper
            sx={{
               display: "flex",
               alignItems: "center",
               justifyContent: "space-between",
               px: { xs: 1.5, sm: 2, md: 3 },
               py: 1,
               bgcolor: "transparent",
               position: "sticky",
               height: 74,
               width: "100%",
               top: 0,
               left: "auto",
               right: 0,
               zIndex: 9,
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
                  bgcolor: (theme) =>
                     alpha(theme.palette.background.default, 0.4),
                  backdropFilter: "blur(6px)",
               },
            }}
         >
            {/* Left Section (Page Title / Menu Icon) */}
            <Stack
               direction="row"
               alignItems="center"
               sx={{ flex: { xs: 0.7, sm: "auto" }, overflow: "hidden" }}
            >
               {!isSmDown ? (
                  <Typography variant="h4" textTransform="capitalize" noWrap>
                     {pathname?.slice(1).split("/")[1] || "Dashboard"}
                  </Typography>
               ) : (
                  <IconButton
                     onClick={() => globalState.set("layoutFull", true)}
                  >
                     <Icon icon="solar:hamburger-menu-broken" />
                  </IconButton>
               )}
            </Stack>

            {/* Right Section */}
            <Stack
               direction="row"
               alignItems="center"
               spacing={isMdDown ? 0.5 : 1.5}
               flex={isSmDown ? 0.3 : 0.5}
               justifyContent="flex-end"
            >
               {/* Search toggle */}
               {!isSmDown ? (
                  <SearchBar />
               ) : (
                  <IconButton
                     sx={{ color: "text.secondary" }}
                     onClick={() => setOpenSearch(true)}
                  >
                     <Icon icon="eva:search-fill" />
                  </IconButton>
               )}

               {/* Notifications */}
               <NotificationDrawer
                  open={openNotification}
                  onClose={() => setOpenNotification(false)}
                  onUnreadChange={setUnreadCount}
               />
               <IconButton
                  data-testid="notification-bell-btn"
                  sx={{ color: "text.secondary" }}
                  onClick={() => setOpenNotification(true)}
               >
                  <Badge badgeContent={unreadCount} color="error" max={99}>
                     <Icon icon="solar:bell-bing-bold-duotone" />
                  </Badge>
               </IconButton>

               {/* User Menu */}
               <CustomPopover
                  anchorEl={anchorEl}
                  onClose={() => setAnchorEl(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
               >
                  <Menu
                     item={[
                        {
                           label: "Alice Johnson",
                           icon: (
                              <Avatar
                                 src="/images/avatar/alice.jpg"
                                 sx={{ width: 35, height: 35 }}
                              />
                           ),
                        },
                     ]}
                     size="large"
                  />
               </CustomPopover>
               {/* User Menu for Active user */}
               <IconButton
                  sx={{ color: "text.secondary" }}
                  onClick={(e) => handleMenuOpen(e)}
               >
                  <Icon icon="solar:users-group-rounded-bold" />
               </IconButton>

               {/* Settings */}
               <SettingsDrawer
                  open={openSettings}
                  onClose={() => setOpenSettings(false)}
                  onOpen={() => setOpenSettings(true)}
               />
               <IconButton
                  onClick={() => setOpenSettings(true)}
                  sx={{
                     color: "text.secondary",
                     "& svg": { animation: `${rotate} 8s linear infinite` },
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

         {/* Full-width overlay SearchBar */}
         <Slide direction="down" in={openSearch} mountOnEnter unmountOnExit>
            <CustomBox
               sx={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 1300,
                  px: 2,
                  py: 1,
                  bgcolor: "background.paper",
                  borderBottom: (theme) =>
                     `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
               }}
            >
               <SearchBar />
               <IconButton onClick={() => setOpenSearch(false)}>
                  <Icon icon="carbon:close" />
               </IconButton>
            </CustomBox>
         </Slide>
      </>
   );
};

export default Header;
