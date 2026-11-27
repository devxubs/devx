"use client";
import {
   alpha,
   Badge,
   IconButton,
   Paper,
   Stack,
   Typography,
   useMediaQuery,
   useTheme,
   Slide,
} from "@mui/material";
import Icon from "@src/components/Icon";
import React, { useState } from "react";
import SearchBar from "./SearchBar";
import NotificationDrawer from "./NotificationDrawer";
import NotificationToast from "./NotificationToast";
import SettingsDrawer from "./Settings";
import { usePathname } from "next/navigation";
import useGlobalState from "@src/handler/globalState";
import CustomBox from "@src/components/CustomBox";
import { useSettings } from "@src/lib/settingsContext";
import {
   eventPrefForCategory,
   playNotificationSound,
   resolveNotificationPrefs,
   toastAnchorOrigin,
} from "@src/lib/notificationPrefs";

const Header = () => {
   const pathname = usePathname();
   const theme = useTheme();
   const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
   const isMdDown = useMediaQuery(theme.breakpoints.down("md"));

   const [openNotification, setOpenNotification] = useState(false);
   const [unreadCount, setUnreadCount] = useState(0);
   const [openSettings, setOpenSettings] = useState(false);

   // Phase 2 (2.11): the Settings → Appearance tab delegates to this
   // drawer (the single appearance editor) via a window event.
   React.useEffect(() => {
      const open = () => setOpenSettings(true);
      window.addEventListener("devx:open-appearance", open);
      return () => window.removeEventListener("devx:open-appearance", open);
   }, []);
   const [openSearch, setOpenSearch] = useState(false);

   // Runtime-fix: toast on genuinely new notifications. The poll
   // response already carries the notification list, so detection
   // costs no extra request. `seenNotificationIds` starts null: the
   // FIRST successful fetch only seeds the set (everything already
   // there is "old" and must never toast — e.g. right after login).
   // Later fetches toast for unread, unarchived notifications whose
   // id was never seen; every fetched id joins the set, so the same
   // notification can never toast twice across polls. In-memory only
   // (a page reload re-seeds silently, which is the desired behaviour).
   const seenNotificationIds = React.useRef<Set<string> | null>(null);
   const [toast, setToast] = useState<{
      title: string;
      message: string;
      severity: "info" | "warning" | "success" | "error";
      more: number;
   } | null>(null);

   // Cleanup Phase 3: per-category toast/sound preferences and
   // the shared toast position/duration come from the store's
   // notificationPrefs. The poll callback below is stable
   // (useCallback []), so it reads the latest prefs through a
   // ref. Preferences govern PRESENTATION only — every fetched
   // id still joins the seen set (dedupe unchanged) and the
   // badge/drawer still receive every notification.
   const { settings } = useSettings();
   const notifPrefs = resolveNotificationPrefs(settings?.customConfig);
   const notifPrefsRef = React.useRef(notifPrefs);
   notifPrefsRef.current = notifPrefs;

   const refreshUnreadCount = React.useCallback(() => {
      fetch("/api/notifications")
         .then((r) => (r.ok ? r.json() : null))
         .then((data) => {
            if (data?.unreadCount != null) setUnreadCount(data.unreadCount);
            const list: any[] = Array.isArray(data?.notifications)
               ? data.notifications
               : [];
            if (seenNotificationIds.current === null) {
               seenNotificationIds.current = new Set(
                  list.map((n: any) => n.id),
               );
               return;
            }
            const seen = seenNotificationIds.current;
            // The list is newest-first, so fresh[0] is the newest.
            const fresh = list.filter(
               (n: any) => n && !n.isRead && !n.isArchived && !seen.has(n.id),
            );
            list.forEach((n: any) => n && seen.add(n.id));
            if (fresh.length > 0) {
               // Cleanup Phase 3: only categories whose toast
               // preference is on produce a toast (the badge and
               // drawer above still count everything).
               const prefs = notifPrefsRef.current;
               const toastable = fresh.filter(
                  (n: any) => eventPrefForCategory(prefs, n.category).toast,
               );
               if (toastable.length > 0) {
                  const newest = toastable[0];
                  setToast({
                     title: newest.title || "New notification",
                     message: newest.message || "",
                     severity: ["success", "warning", "error"].includes(
                        newest.type,
                     )
                        ? newest.type
                        : "info",
                     more: toastable.length - 1,
                  });
                  const newestPref = eventPrefForCategory(prefs, newest.category);
                  if (newestPref.sound) {
                     playNotificationSound(newestPref.soundId);
                  }
               }
            }
         })
         .catch(() => {});
   }, []);

   // Phase 1 (1.12): the badge previously fetched once on mount and
   // stayed stale for the whole session (new low-stock/chat alerts
   // never appeared). Refetch on route change, on window focus, and
   // on a modest 60-second poll; the drawer still reports its own
   // changes immediately via onUnreadChange.
   React.useEffect(() => {
      refreshUnreadCount();
   }, [refreshUnreadCount, pathname]);

   React.useEffect(() => {
      const onFocus = () => refreshUnreadCount();
      window.addEventListener("focus", onFocus);
      const interval = setInterval(refreshUnreadCount, 60000);
      return () => {
         window.removeEventListener("focus", onFocus);
         clearInterval(interval);
      };
   }, [refreshUnreadCount]);

   const globalState = useGlobalState();

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
                     {pathname?.slice(1).split("/")[1]?.toLowerCase() === "user"
                        ? "Employee"
                        : pathname?.slice(1).split("/")[1] || "Dashboard"}
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

               {/* The user account menu lives at the bottom of
                   the sidebar (SidebarAccount) — it was removed
                   from the header, including the old profile
                   drawer and the placeholder "Alice Johnson"
                   popover. The appearance (Settings) drawer
                   stays mounted here and is opened from the
                   account popup's Personalization item via the
                   devx:open-appearance event — the header gear
                   button itself was removed. */}
               <SettingsDrawer
                  open={openSettings}
                  onClose={() => setOpenSettings(false)}
                  onOpen={() => setOpenSettings(true)}
               />
            </Stack>
         </Paper>

         {/* New-notification toast. Presentation lives in
             NotificationToast; behaviour is unchanged — clicking
             the toast opens the notification drawer. */}
         <NotificationToast
            toast={toast}
            onClose={() => setToast(null)}
            onOpen={() => {
               setToast(null);
               setOpenNotification(true);
            }}
            anchorOrigin={toastAnchorOrigin(notifPrefs.toast.position)}
            durationMs={notifPrefs.toast.durationMs}
            clickawayDismiss={notifPrefs.toast.clickawayDismiss}
         />

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
