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
   Badge,
} from "@mui/material";

import AnimatedAvatar from "@src/components/AnimateAvatar";
import Icon from "@src/components/Icon";
import { useRouter, useSearchParams } from "next/navigation";
import { messages, User, users } from "../handler/chatData";
import { toRelativeTime } from "../handler/handler";
import Modal from "../GroupModal";

interface SidebarProps {
   chatList: any[];
   open?: Boolean;
   mobileMode?: Boolean;
   onClose?: (open: boolean) => void;
}

const Sidebar = ({ chatList, mobileMode, open, onClose }: SidebarProps) => {
   const theme = useTheme();
   const router = useRouter();
   const params = useSearchParams();
   const [searchText, setSearchText] = useState("");
   const [openModal, setOpenModal] = useState(false);

   // filter chat list based on search text
   const filterUser: User[] = chatList.filter((cl) =>
      cl.name.toLowerCase().includes(searchText.toLowerCase())
   );

   const shortChatList = [...filterUser]
      .sort((a, b) => {
         const timeA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
         const timeB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
         return timeB - timeA; // newest first
      })
      .map((cl) => ({
         ...cl,
         time: cl.lastActive
            ? toRelativeTime(new Date(cl.lastActive).getTime())
            : "No activity",
      }));

   return (
      <Stack
         height="100%"
         width={open ? 300 : mobileMode ? 0 : 75}
         borderRight={mobileMode ? 0 : 1}
         borderColor={"divider"}
         py={2}
         sx={{
            transition: "width 0.3s ease-in-out", // smooth width animation
            overflow: "hidden",
            position: "relative",
         }}
      >
         {/* Top controls */}
         <Stack
            px={2}
            pb={1}
            spacing={2}
            sx={{
               transition: "all 0.3s ease-in-out",
            }}
         >
            <Stack
               direction="row"
               alignItems="center"
               justifyContent="space-between"
            >
               {open && (
                  <AnimatedAvatar src="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-25.webp" />
               )}

               <Stack spacing={1} direction="row" alignItems="center">
                  {open && (
                     <IconButton
                        sx={{
                           transition: "opacity 0.3s ease-in-out",
                           opacity: open ? 1 : 0,
                        }}
                        onClick={() => {
                           setOpenModal(true);
                        }}
                     >
                        <Icon
                           icon="solar:users-group-two-rounded-bold-duotone"
                           style={{ color: theme.palette.text.secondary }}
                        />
                     </IconButton>
                  )}
                  <Modal
                     open={openModal}
                     onClose={() => setOpenModal(false)}
                     users={users}
                  />

                  <IconButton onClick={() => onClose?.(!open)}>
                     <Icon
                        icon="solar:alt-arrow-left-bold-duotone"
                        style={{ color: theme.palette.text.secondary }}
                     />
                  </IconButton>
               </Stack>
            </Stack>

            {open && (
               <TextField
                  fullWidth
                  placeholder="Search"
                  label="Search"
                  size="small"
                  sx={{
                     transition:
                        "opacity 0.3s ease-in-out, transform 0.3s ease-in-out",
                     opacity: open ? 1 : 0,
                     transform: open ? "translateY(0)" : "translateY(-10px)",
                  }}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
               />
            )}
         </Stack>

         {/* Chat list */}
         <Stack overflow="auto" sx={{ scrollbarWidth: "none!important" }}>
            <List sx={{ p: 0 }}>
               {shortChatList.map((cl, idx) => {
                  const message = messages.find((m) => m.senderId === cl.id);

                  return (
                     <ListItem
                        disablePadding
                        key={idx}
                        secondaryAction={
                           open && (
                              <Stack
                                 direction={"column"}
                                 alignItems="flex-end"
                                 spacing={1}
                              >
                                 <Typography
                                    variant="body2"
                                    fontSize={"10px!important"}
                                    fontWeight={600}
                                    color={"textSecondary"}
                                 >
                                    {cl.time}
                                 </Typography>
                                 {message?.status && (
                                    <Box
                                       component={"span"}
                                       sx={{
                                          p: "3px",
                                          bgcolor: theme.palette.primary.main,
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
                              router.push(`/chat?id=${cl.id}`);
                           }}
                           selected={cl.id == params?.get("id")}
                        >
                           <ListItemIcon>
                              {Array.isArray(cl.avatar) ? (
                                 <Badge
                                    anchorOrigin={{
                                       vertical: "bottom",
                                       horizontal: "right",
                                    }}
                                    color="primary"
                                    variant="dot"
                                    invisible={cl.isOnline}
                                    overlap="circular"
                                    badgeContent=" "
                                    sx={{
                                       "& .MuiBadge-badge": {
                                          zIndex: 2,
                                          width: 10,
                                          borderRadius: "50%",
                                       },
                                    }}
                                 >
                                    <Stack
                                       position={"relative"}
                                       height={40}
                                       width={40}
                                       borderRadius={"50%"}
                                       sx={{
                                          "& .MuiAvatar-root": {
                                             width: 29,
                                             height: 29,
                                          },
                                       }}
                                    >
                                       <Avatar
                                          src={cl.avatar[0]}
                                          sx={{
                                             position: "absolute",
                                             bottom: 0,
                                             left: 0,
                                             zIndex: 2,
                                             border: 2,
                                             borderColor:
                                                theme.palette.background.paper,
                                          }}
                                       />
                                       <Avatar
                                          src={cl.avatar[1]}
                                          sx={{
                                             position: "absolute",
                                             top: 0,
                                             right: 0,
                                             zIndex: 1,
                                          }}
                                       />
                                    </Stack>
                                 </Badge>
                              ) : (
                                 <Badge
                                    anchorOrigin={{
                                       vertical: "bottom",
                                       horizontal: "right",
                                    }}
                                    color="primary"
                                    variant="dot"
                                    invisible={cl.isOnline}
                                    overlap="circular"
                                    badgeContent=" "
                                    sx={{
                                       "& .MuiBadge-badge": {
                                          zIndex: 2,
                                          width: 10,
                                          borderRadius: "50%",
                                       },
                                    }}
                                 >
                                    <AnimatedAvatar src={cl.avatar} />
                                 </Badge>
                              )}
                           </ListItemIcon>

                           {open && (
                              <ListItemText
                                 primary={
                                    cl.name.length >= 18
                                       ? cl.name.slice(0, 18) + "..."
                                       : cl.name
                                 }
                                 secondary={
                                    <Typography
                                       color={
                                          message?.status === "sent" ||
                                          message?.status === "delivered"
                                             ? "textPrimary"
                                             : "textSecondary"
                                       }
                                       fontWeight={
                                          message?.status === "sent" ||
                                          message?.status === "delivered"
                                             ? 600
                                             : 400
                                       }
                                    >
                                       {(message?.message?.length || 0) >= 25
                                          ? (message?.message || "").slice(
                                               0,
                                               20
                                            ) + "..."
                                          : message?.message}
                                    </Typography>
                                 }
                                 sx={{
                                    transition:
                                       "opacity 0.3s ease-in-out, transform 0.3s ease-in-out",
                                    opacity: open ? 1 : 0,
                                    transform: open
                                       ? "translateX(0)"
                                       : "translateX(-20px)",
                                    "& span": {
                                       fontSize: "0.875rem",
                                       fontWeight: 600,
                                    },
                                 }}
                              />
                           )}
                        </ListItemButton>
                     </ListItem>
                  );
               })}
            </List>
         </Stack>
      </Stack>
   );
};

export default Sidebar;
