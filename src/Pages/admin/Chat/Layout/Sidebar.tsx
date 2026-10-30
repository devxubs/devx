"use client";

import React, { useState } from "react";
import {
   Stack,
   TextField,
   IconButton,
   useTheme,
   List,
   ListItem,
   ListItemButton,
   ListItemText,
   ListItemIcon,
   Typography,
   Avatar,
   Box,
   Tooltip,
   Divider,
} from "@mui/material";

import AnimatedAvatar from "@src/components/AnimateAvatar";
import Icon from "@src/components/Icon";
import { useRouter, useSearchParams } from "next/navigation";
import { User } from "../handler/chatData";
import { toRelativeTime } from "../handler/handler";
import Modal from "../GroupModal";

interface SidebarProps {
   conversations: any[];
   users: User[];
   activeId?: string;
   open?: Boolean;
   mobileMode?: Boolean;
   onClose?: (open: boolean) => void;
   onSelectConversation?: (id: string) => void;
   onGroupCreated?: (newConv: any) => void;
}

const Sidebar = ({
   conversations = [],
   users = [],
   activeId,
   mobileMode,
   open = true,
   onClose,
   onSelectConversation,
   onGroupCreated,
}: SidebarProps) => {
   const theme = useTheme();
   const router = useRouter();
   const params = useSearchParams();
   const [searchText, setSearchText] = useState("");
   const [openModal, setOpenModal] = useState(false);

   const currentId = activeId || params?.get("id");

   // Filter conversations based on search text
   const filteredConversations = conversations.filter((c) => {
      const name = c.displayName || c.name || (c.type === "group" ? "Staff Group" : "Direct Message");
      return name.toLowerCase().includes(searchText.toLowerCase());
   });

   // Handle initiating a direct conversation with any employee
   const handleStartDirectChat = async (targetUser: User) => {
      try {
         const res = await fetch("/api/chat/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "direct", memberIds: [targetUser.id] }),
         });
         if (res.ok) {
            const conv = await res.json();
            if (onGroupCreated) onGroupCreated(conv);
            if (onSelectConversation) onSelectConversation(conv.id);
            else router.push(`/admin/chat?id=${conv.id}`);
         }
      } catch {}
   };

   // Employees who don't already have an active direct chat listed
   const existingDirectMemberIds = new Set(
      conversations.filter((c) => c.type === "direct").map((c) => c.otherUserId),
   );
   const otherStaffUsers = users.filter((u) => !existingDirectMemberIds.has(u.id));

   return (
      <Stack
         height="100%"
         width={open ? 300 : mobileMode ? 0 : 75}
         borderRight={mobileMode ? 0 : 1}
         borderColor="divider"
         py={2}
         sx={{
            transition: "width 0.3s ease-in-out",
            overflow: "hidden",
            position: "relative",
         }}
      >
         {/* Top controls */}
         <Stack px={2} pb={1} spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
               {open && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                     <AnimatedAvatar src="/images/avatar-25.webp" />
                     <Typography variant="subtitle2" fontWeight={700}>
                        Chat & Team
                     </Typography>
                  </Stack>
               )}

               <Stack spacing={0.5} direction="row" alignItems="center">
                  {open && (
                     <Tooltip title="Create Group Chat">
                        <IconButton
                           data-testid="create-group-btn"
                           size="small"
                           onClick={() => setOpenModal(true)}
                           sx={{ color: "text.secondary" }}
                        >
                           <Icon icon="solar:users-group-two-rounded-bold-duotone" size="small" />
                        </IconButton>
                     </Tooltip>
                  )}
                  <Modal
                     open={openModal}
                     onClose={() => setOpenModal(false)}
                     users={users}
                     onGroupCreated={onGroupCreated}
                  />

                  <IconButton size="small" onClick={() => onClose?.(!open)}>
                     <Icon
                         icon="solar:alt-arrow-left-bold-duotone"
                        style={{ color: theme.palette.text.secondary }}
                        size="small"
                     />
                  </IconButton>
               </Stack>
            </Stack>

            {open && (
               <TextField
                  fullWidth
                  placeholder="Search chats..."
                  size="small"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  sx={{
                     "& .MuiOutlinedInput-root": {
                        borderRadius: 1.5,
                        fontSize: 13,
                     },
                  }}
               />
            )}
         </Stack>

         {/* Conversation list */}
         <Stack overflow="auto" sx={{ scrollbarWidth: "none!important", flex: 1 }}>
            <List sx={{ p: 0 }}>
               {filteredConversations.map((c) => {
                  const isSelected = c.id === currentId;
                  const isGroup = c.type === "group";
                  const lastMsg = c.messages?.[0];
                  const timeStr = lastMsg?.createdAt
                     ? toRelativeTime(new Date(lastMsg.createdAt).getTime())
                     : toRelativeTime(new Date(c.updatedAt || c.createdAt).getTime());

                  const displayName = c.displayName || c.name || (isGroup ? "Staff Team" : "Direct Staff Chat");

                  return (
                     <ListItem
                        disablePadding
                        key={c.id}
                        secondaryAction={
                           open && (
                              <Stack direction="column" alignItems="flex-end" spacing={0.5}>
                                 <Typography variant="caption" fontSize={10} color="text.secondary">
                                    {timeStr}
                                 </Typography>
                                 {lastMsg && !lastMsg.isRead && (
                                    <Box
                                       component="span"
                                       sx={{
                                          width: 8,
                                          height: 8,
                                          bgcolor: "primary.main",
                                          borderRadius: "50%",
                                       }}
                                    />
                                 )}
                              </Stack>
                           )
                        }
                        sx={{ "& p": { fontSize: 12 } }}
                     >
                        <ListItemButton
                           onClick={() => {
                              if (onSelectConversation) {
                                 onSelectConversation(c.id);
                              } else {
                                 router.push(`/admin/chat?id=${c.id}`);
                              }
                           }}
                           selected={isSelected}
                           sx={{ py: 1 }}
                        >
                           <ListItemIcon sx={{ minWidth: open ? 48 : 40 }}>
                              {isGroup ? (
                                 <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
                                    <Icon icon="solar:users-group-two-rounded-bold-duotone" size="small" />
                                 </Avatar>
                              ) : (
                                 <AnimatedAvatar src={c.avatar || "/images/avatar-25.webp"} />
                              )}
                           </ListItemIcon>

                           {open && (
                              <ListItemText
                                 primary={
                                    <Typography variant="body2" fontWeight={isSelected ? 700 : 500} noWrap>
                                       {displayName}
                                    </Typography>
                                 }
                                 secondary={
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 160, display: "block" }}>
                                       {lastMsg?.message || (isGroup ? `${c.members?.length || 0} members` : "Start conversation")}
                                    </Typography>
                                 }
                              />
                           )}
                        </ListItemButton>
                     </ListItem>
                  );
               })}

               {/* Authorized Staff Members without existing chat */}
               {otherStaffUsers.length > 0 && open && (
                  <>
                     <Divider sx={{ my: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                           Team Members
                        </Typography>
                     </Divider>
                     {otherStaffUsers.map((u) => (
                        <ListItem disablePadding key={u.id}>
                           <ListItemButton onClick={() => handleStartDirectChat(u)} sx={{ py: 0.8 }}>
                              <ListItemIcon sx={{ minWidth: 44 }}>
                                 <AnimatedAvatar src={u.avatar || "/images/avatar-25.webp"} />
                              </ListItemIcon>
                              <ListItemText
                                 primary={<Typography variant="body2" fontWeight={500}>{u.name}</Typography>}
                                 secondary={<Typography variant="caption" color="text.secondary">Start chat</Typography>}
                              />
                           </ListItemButton>
                        </ListItem>
                     ))}
                  </>
               )}

               {filteredConversations.length === 0 && otherStaffUsers.length === 0 && open && (
                  <Box p={3} textAlign="center">
                     <Typography variant="caption" color="text.secondary">
                        No conversations found
                     </Typography>
                  </Box>
               )}
            </List>
         </Stack>
      </Stack>
   );
};

export default Sidebar;
