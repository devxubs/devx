"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
   Box,
   SwipeableDrawer,
   Typography,
   Tabs,
   Tab,
   Badge,
   Stack,
   Avatar,
   Button,
   IconButton,
   Tooltip,
   CircularProgress,
} from "@mui/material";
import Scrollbar from "react-browser-scrollbar";
import CustomBox from "@src/components/CustomBox";
import Icon from "@src/components/Icon";
import { useRouter } from "next/navigation";

export interface NotificationItem {
   id: string;
   title: string;
   message: string;
   category: string;
   type: "info" | "warning" | "success" | "error";
   link?: string | null;
   isRead: boolean;
   isArchived: boolean;
   createdAt: string;
}

interface NotificationDrawerProps {
   open: boolean;
   onClose: () => void;
   onOpen?: () => void;
   onUnreadChange?: (count: number) => void;
}

const NotificationDrawer = ({ open, onClose, onOpen, onUnreadChange }: NotificationDrawerProps) => {
   const router = useRouter();
   const [tab, setTab] = useState(0);
   const [notifications, setNotifications] = useState<NotificationItem[]>([]);
   const [loading, setLoading] = useState(false);

   const loadNotifications = useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/notifications");
         if (res.ok) {
            const data = await res.json();
            setNotifications(data.notifications || []);
            if (onUnreadChange) {
               onUnreadChange(data.unreadCount || 0);
            }
         }
      } catch {
         // silent
      } finally {
         setLoading(false);
      }
   }, [onUnreadChange]);

   useEffect(() => {
      loadNotifications();
   }, [loadNotifications]);

   useEffect(() => {
      if (open) {
         loadNotifications();
      }
   }, [open, loadNotifications]);

   const handleMarkAllAsRead = async () => {
      try {
         await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark_all_read" }),
         });
         loadNotifications();
      } catch {}
   };

   const toggleRead = async (id: string) => {
      try {
         await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "toggle_read", id }),
         });
         loadNotifications();
      } catch {}
   };

   const toggleArchive = async (id: string) => {
      try {
         await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "toggle_archive", id }),
         });
         loadNotifications();
      } catch {}
   };

   const deleteNotification = async (id: string) => {
      try {
         await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id }),
         });
         loadNotifications();
      } catch {}
   };

   const filteredNotifications = notifications.filter((n) => {
      if (tab === 1) return !n.isRead && !n.isArchived;
      if (tab === 2) return n.isArchived;
      return !n.isArchived;
   });

   const unreadCount = notifications.filter((n) => !n.isRead && !n.isArchived).length;
   const activeCount = notifications.filter((n) => !n.isArchived).length;
   const archivedCount = notifications.filter((n) => n.isArchived).length;

   const getCategoryIcon = (category: string, type: string) => {
      if (category === "Inventory") return "solar:box-bold-duotone";
      if (category === "Order") return "solar:cart-large-minimalistic-bold-duotone";
      if (category === "Settlement") return "solar:card-recive-bold-duotone";
      return "solar:bell-bing-bold-duotone";
   };

   const getTypeColor = (type: string) => {
      if (type === "warning") return "warning.main";
      if (type === "error") return "error.main";
      if (type === "success") return "success.main";
      return "primary.main";
   };

   return (
      <SwipeableDrawer
         anchor="right"
         open={open}
         onClose={onClose}
         onOpen={onOpen || (() => {})}
         PaperProps={{
            sx: {
               width: { xs: "100%", sm: 420 },
               bgcolor: "transparent",
            },
         }}
      >
         <CustomBox sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <Box
               sx={{
                  px: 2.5,
                  py: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
               }}
            >
               <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h6" fontWeight={700}>Notifications</Typography>
                  {unreadCount > 0 && (
                     <Badge badgeContent={unreadCount} color="error" sx={{ ml: 1 }} />
                  )}
               </Stack>
               <Stack direction="row" alignItems="center" spacing={1}>
                  <Tooltip title="Mark all as read">
                     <IconButton onClick={handleMarkAllAsRead} size="small">
                        <Icon icon="solar:list-check-bold-duotone" />
                     </IconButton>
                  </Tooltip>
                  <IconButton onClick={onClose} size="small">
                     <Icon icon="eva:close-fill" />
                  </IconButton>
               </Stack>
            </Box>

            {/* Tabs */}
            <Tabs
               value={tab}
               onChange={(e, val) => setTab(val)}
               variant="fullWidth"
               textColor="inherit"
               indicatorColor="primary"
               sx={{
                  px: 2,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "& .MuiTab-root": { fontSize: 13, color: "text.primary", minHeight: 48 },
               }}
            >
               <Tab label={<Badge badgeContent={activeCount} color="default">All</Badge>} />
               <Tab label={<Badge badgeContent={unreadCount} color="error">Unread</Badge>} />
               <Tab label={<Badge badgeContent={archivedCount} color="default">Archived</Badge>} />
            </Tabs>

            {/* Content List */}
            <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
               <Scrollbar autoHide darkMode>
                  <Box>
                     {loading && notifications.length === 0 ? (
                        <Stack alignItems="center" justifyContent="center" height={200}>
                           <CircularProgress size={28} />
                        </Stack>
                     ) : filteredNotifications.length === 0 ? (
                        <Box textAlign="center" py={8}>
                           <Icon icon="solar:bell-linear" size="large" />
                           <Typography variant="body2" color="text.secondary" mt={1}>
                              No notifications in this tab
                           </Typography>
                        </Box>
                     ) : (
                        filteredNotifications.map((n) => (
                           <Box
                              key={n.id}
                              data-notification-link={n.link || ""}
                              sx={{
                                 p: 2,
                                 position: "relative",
                                 transition: "all 0.2s ease",
                                 borderBottom: "1px dashed",
                                 borderColor: "divider",
                                 bgcolor: !n.isRead ? "action.hover" : "inherit",
                                 cursor: n.link ? "pointer" : "default",
                                 "&:hover": {
                                    backgroundColor: "action.selected",
                                 },
                              }}
                              onClick={() => {
                                 if (!n.isRead) toggleRead(n.id);
                                 if (n.link) {
                                    onClose();
                                    router.push(n.link);
                                 }
                              }}
                           >
                              {/* Read Indicator Bar */}
                              <Box
                                 sx={{
                                    position: "absolute",
                                    top: 10,
                                    left: 0,
                                    bottom: 10,
                                    width: 4,
                                    bgcolor: !n.isRead ? getTypeColor(n.type) : "transparent",
                                    borderRadius: "0 4px 4px 0",
                                 }}
                              />

                              <Box ml={1}>
                                 <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                    <Avatar
                                       sx={{
                                          width: 38,
                                          height: 38,
                                          bgcolor: "background.paper",
                                          color: getTypeColor(n.type),
                                          boxShadow: 2,
                                       }}
                                    >
                                       <Icon icon={getCategoryIcon(n.category, n.type)} size="small" />
                                    </Avatar>
                                    <Box flex={1}>
                                       <Typography variant="subtitle2" fontWeight={!n.isRead ? 700 : 500}>
                                          {n.title}
                                       </Typography>
                                       <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, fontSize: 13 }}>
                                          {n.message}
                                       </Typography>
                                       <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: "block" }}>
                                          {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {new Date(n.createdAt).toLocaleDateString()} • {n.category}
                                       </Typography>
                                    </Box>
                                 </Stack>

                                 <Stack direction="row" spacing={1} mt={1.5} justifyContent="flex-end">
                                    {n.link && (
                                       <Button
                                          size="small"
                                          variant="contained"
                                          onClick={() => {
                                             onClose();
                                             router.push(n.link!);
                                          }}
                                          sx={{ fontSize: 11, py: 0.2 }}
                                       >
                                          View
                                       </Button>
                                    )}
                                    <Button
                                       size="small"
                                       variant="outlined"
                                       onClick={() => toggleRead(n.id)}
                                       sx={{ fontSize: 11, py: 0.2 }}
                                    >
                                       {!n.isRead ? "Mark read" : "Mark unread"}
                                    </Button>
                                    <Button
                                       size="small"
                                       variant="text"
                                       onClick={() => toggleArchive(n.id)}
                                       sx={{ fontSize: 11, py: 0.2 }}
                                    >
                                       {n.isArchived ? "Unarchive" : "Archive"}
                                    </Button>
                                    <IconButton
                                       size="small"
                                       color="error"
                                       onClick={() => deleteNotification(n.id)}
                                       sx={{ p: 0.5 }}
                                    >
                                       <Icon icon="solar:trash-bin-trash-bold" size="small" />
                                    </IconButton>
                                 </Stack>
                              </Box>
                           </Box>
                        ))
                     )}
                  </Box>
               </Scrollbar>
            </Box>
         </CustomBox>
      </SwipeableDrawer>
   );
};

export default NotificationDrawer;
