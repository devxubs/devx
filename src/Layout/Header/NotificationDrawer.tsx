"use client";

import React, { useState } from "react";
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
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import Scrollbar from "react-browser-scrollbar";
import CustomBox from "@src/components/CustomBox";
import { Icon } from "@iconify/react";

const initialNotifications = [
  {
    id: 1,
    user: "Deja Brady",
    avatar: "/avatars/avatar-1.jpg",
    time: "an hour ago",
    category: "Communication",
    message: "sent you a friend request",
    actions: ["Accept", "Decline"],
    unread: true,
    archived: false,
  },
  {
    id: 2,
    user: "Jayvon Hull",
    avatar: "/avatars/avatar-2.jpg",
    time: "a day ago",
    category: "Project UI",
    message: "mentioned you in Minimal UI",
    comment:
      "@Jaydon Frankie feedback by asking questions or just leave a note of appreciation.",
    actions: ["Reply"],
    unread: true,
    archived: false,
  },
  {
    id: 3,
    user: "Lainey Davidson",
    avatar: "/avatars/avatar-3.jpg",
    time: "2 days ago",
    category: "File manager",
    message: "added file to File manager",
    file: {
      name: "design-suriname-2015.pdf",
      size: "2.3 Mb",
    },
    actions: ["Download"],
    unread: false,
    archived: true,
  },
];

const NotificationDrawer = ({ open, onClose, onOpen }: any) => {
  const [tab, setTab] = useState(0);
  const [notifications, setNotifications] = useState(initialNotifications);

  const filteredNotifications = notifications.filter((n) => {
    if (tab === 1) return n.unread && !n.archived;
    if (tab === 2) return n.archived;
    return !n.archived;
  });

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => (n.unread && !n.archived ? { ...n, unread: false } : n))
    );
  };

  const toggleRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    );
  };

  const toggleArchive = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, archived: !n.archived } : n))
    );
  };

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    if (tab === 2) {
      setNotifications((prev) => prev.filter((n) => !n.archived));
    }
  };

  const unreadCount = notifications.filter(
    (n) => n.unread && !n.archived
  ).length;

  return (
    <SwipeableDrawer
      anchor="right"
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      PaperProps={{
        sx: {
          width: 400,
          bgcolor: "transparent",
        },
      }}
    >
      <CustomBox
        sx={{ height: "100vh", display: "flex", flexDirection: "column" }}
      >
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
          <Typography variant="h6">Notifications</Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Mark all as read">
              <IconButton onClick={handleMarkAllAsRead}>
                <Icon icon="solar:list-check-bold-duotone" />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose}>
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
            "& .MuiTab-root": { fontSize: 13, color: "text.primary" },
          }}
        >
          <Tab
            label={
              <Badge
                badgeContent={notifications.filter((n) => !n.archived).length}
              >
                All
              </Badge>
            }
          />
          <Tab label={<Badge badgeContent={unreadCount}>Unread</Badge>} />
          <Tab
            label={
              <Badge
                badgeContent={notifications.filter((n) => n.archived).length}
              >
                Archived
              </Badge>
            }
          />
        </Tabs>

        {/* Scrollable Notifications */}
        <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
          <Scrollbar autoHide darkMode>
            <Box>
              {filteredNotifications.map((n) => (
                <Box
                  key={n.id}
                  sx={{
                    p: 2,
                    position: "relative",
                    transition: "all 0.2s ease",
                    borderBottom: "1px dashed",
                    borderColor: "divider",
                    "&:hover": {
                      backgroundColor: "background.paper",
                      boxShadow: 8,
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 10,
                      left: 0,
                      bottom: 10,
                      transition: "all 0.2s ease",
                      bgcolor: n.unread ? "primary.main" : "divider",
                      p: 0.5,
                      borderRadius: "0 8px 8px 0",
                    }}
                  />
                  <Box ml={1}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar src={n.avatar} alt={n.user} />
                      <Box>
                        <Typography variant="subtitle2" color="text.primary">
                          {n.user} <b>{n.message}</b>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {n.time} • {n.category}
                        </Typography>
                      </Box>
                    </Stack>

                    {n.comment && (
                      <Box
                        sx={{
                          bgcolor: "background.default",
                          mt: 1.5,
                          p: 1.5,
                          borderRadius: 1,
                          color: "text.secondary",
                        }}
                      >
                        <Typography variant="body2">{n.comment}</Typography>
                      </Box>
                    )}

                    {n.file && (
                      <Box
                        sx={{
                          bgcolor: "background.default",
                          mt: 1.5,
                          p: 1,
                          borderRadius: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box>
                          <Typography variant="body2">{n.file.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {n.file.size}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                        >
                          Download
                        </Button>
                      </Box>
                    )}

                    <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => toggleRead(n.id)}
                        sx={{ borderRadius: 0.5 }}
                      >
                        {n.unread ? "Mark as Read" : "Mark as Unread"}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => toggleArchive(n.id)}
                        sx={{ borderRadius: 0.5 }}
                        color="secondary"
                      >
                        {n.archived ? "Unarchive" : "Archive"}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => deleteNotification(n.id)}
                        sx={{ borderRadius: 0.5 }}
                        color="error"
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              ))}

              {tab === 2 && filteredNotifications.length > 0 && (
                <Box textAlign="center" mt={2}>
                  <Button size="small" color="error" onClick={clearAll}>
                    Clear All Archived
                  </Button>
                </Box>
              )}

              {filteredNotifications.length === 0 && (
                <Box textAlign="center" py={4}>
                  <Typography variant="body2" color="text.secondary">
                    No notifications found.
                  </Typography>
                </Box>
              )}
            </Box>
          </Scrollbar>
        </Box>
      </CustomBox>
    </SwipeableDrawer>
  );
};

export default NotificationDrawer;
