"use client";

import {
   Stack,
   Avatar,
   Typography,
   IconButton,
   useTheme,
   FormControlLabel,
   Radio,
   RadioGroup,
   Button,
   Tooltip,
   CircularProgress,
} from "@mui/material";
import AnimatedAvatar from "@src/components/AnimateAvatar";
import Icon from "@src/components/Icon";
import SidebarRightIcon from "@src/SvgIcon/SidebarRightIcon";
import React, { useState, useEffect } from "react";
import { getLastActiveTime, toRelativeTime } from "../handler/handler";
import { User } from "../handler/chatData";
import CustomModal from "@src/components/Modal";
import EditGroupModal from "../EditGroupModal";

interface HeaderProps {
   user: User & { isMuted?: boolean; type?: string; description?: string };
   conversation?: any;
   open?: Boolean;
   mobileMode?: Boolean;
   onClose?: (open: boolean) => void;
   onConversationUpdated?: (updated: any) => void;
}

const Header = ({ user, conversation, onClose, open, onConversationUpdated }: HeaderProps) => {
   const theme = useTheme();
   const [openModal, setOpenModal] = useState(false);
   const [openEditGroup, setOpenEditGroup] = useState(false);
   const [isMuted, setIsMuted] = useState(Boolean(user.isMuted || conversation?.isMuted));
   const [muteDuration, setMuteDuration] = useState("Until I change it");
   const [savingMute, setSavingMute] = useState(false);

   useEffect(() => {
      setIsMuted(Boolean(user.isMuted || conversation?.isMuted));
   }, [user.isMuted, conversation?.isMuted]);

   const handleMuteAction = async (targetMute: boolean) => {
      setSavingMute(true);
      try {
         const convId = conversation?.id || user.id;
         const res = await fetch("/api/chat/conversations", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               conversationId: convId,
               action: targetMute ? "mute" : "unmute",
               isMuted: targetMute,
            }),
         });
         if (res.ok) {
            setIsMuted(targetMute);
            setOpenModal(false);
            onConversationUpdated?.({ ...(conversation || {}), isMuted: targetMute });
         }
      } catch {}
      setSavingMute(false);
   };

   const isGroup = user.type === "group" || conversation?.type === "group";

   return (
      <Stack
         direction={"row"}
         alignItems={"center"}
         justifyContent={"space-between"}
         py={1}
         px={2}
         borderBottom={1}
         borderColor={"divider"}
      >
         <Stack spacing={1} direction="row" alignItems="center">
            {Array.isArray(user.avatar) ? (
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
                     src={user.avatar[0]}
                     sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        zIndex: 2,
                        border: 2,
                        borderColor: theme.palette.background.paper,
                     }}
                  />
                  <Avatar
                     src={user.avatar[1]}
                     sx={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        zIndex: 1,
                     }}
                  />
               </Stack>
            ) : (
               <AnimatedAvatar src={user.avatar} />
            )}
            <Stack>
               <Stack direction="row" spacing={1} alignItems="center">
                  <Typography
                     variant="body1"
                     fontSize={14}
                     fontWeight={600}
                     color="textPrimary"
                     textTransform="capitalize"
                  >
                     {user && !user.id ? "Select a user to chat" : user.name}
                  </Typography>
                  {isMuted && (
                     <Tooltip title="Muted">
                        <span style={{ display: "inline-flex" }}>
                           <Icon
                              icon="solar:muted-bold"
                              size="small"
                              style={{ color: theme.palette.text.disabled, fontSize: 16 }}
                           />
                        </span>
                     </Tooltip>
                  )}
               </Stack>
               <Typography variant="body2" fontSize={12} color="textSecondary">
                  {user && user.id
                     ? isGroup
                        ? user.description || "Group Conversation"
                        : user.isOnline
                        ? "Online"
                        : getLastActiveTime(user.id)
                        ? toRelativeTime(
                             new Date(getLastActiveTime(user.id)!).getTime()
                          )
                        : "No recent activity"
                     : "No user selected"}
               </Typography>
            </Stack>
         </Stack>

         {user && user.id && (
            <Stack spacing={1} direction="row" alignItems="center">
               {/* Edit Group Profile Option */}
               {isGroup && (
                  <>
                     <Tooltip title="Edit Group Profile">
                        <IconButton
                           size="small"
                           onClick={() => setOpenEditGroup(true)}
                           data-testid="edit-group-profile-btn"
                        >
                           <Icon
                              size="small"
                              icon="solar:pen-new-square-linear"
                              style={{ color: theme.palette.text.secondary }}
                           />
                        </IconButton>
                     </Tooltip>
                     <EditGroupModal
                        open={openEditGroup}
                        conversation={conversation || user}
                        onClose={() => setOpenEditGroup(false)}
                        onUpdated={(updated) => {
                           onConversationUpdated?.(updated);
                        }}
                     />
                  </>
               )}

               <IconButton size="small" onClick={() => onClose?.(!open)}>
                  <SidebarRightIcon
                     fontSize="small"
                     style={{ color: theme.palette.text.secondary }}
                  />
               </IconButton>

               {/* Mute Modal */}
               <CustomModal
                  open={openModal}
                  onClose={() => setOpenModal(false)}
                  title={isMuted ? "Unmute this chat?" : "Mute this chat?"}
                  sx={{
                     width: {
                        xs: 300,
                        sm: 350,
                     },
                  }}
               >
                  {!isMuted ? (
                     <RadioGroup
                        aria-labelledby="mute-chat-radio-group"
                        value={muteDuration}
                        onChange={(e) => setMuteDuration(e.target.value)}
                        name="radio-buttons-group"
                        sx={{ ml: 2, my: 1 }}
                     >
                        <FormControlLabel value="For 15 minutes" control={<Radio />} label="For 15 minutes" />
                        <FormControlLabel value="For 1 hour" control={<Radio />} label="For 1 hour" />
                        <FormControlLabel value="For 8 hours" control={<Radio />} label="For 8 hours" />
                        <FormControlLabel value="For 24 hours" control={<Radio />} label="For 24 hours" />
                        <FormControlLabel value="Until I change it" control={<Radio />} label="Until I change it" />
                     </RadioGroup>
                  ) : (
                     <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                        Unmuting will restore message notifications and alerts for this conversation.
                     </Typography>
                  )}
                  <Stack
                     spacing={2}
                     direction={"row"}
                     justifyContent={"flex-end"}
                     width={"100%"}
                     mt={2}
                  >
                     <Button
                        variant="text"
                        color="inherit"
                        onClick={() => setOpenModal(false)}
                        disabled={savingMute}
                     >
                        Cancel
                     </Button>

                     <Button
                        variant="contained"
                        color="primary"
                        disabled={savingMute}
                        data-testid="confirm-mute-btn"
                        onClick={() => handleMuteAction(!isMuted)}
                        startIcon={savingMute ? <CircularProgress size={16} /> : undefined}
                     >
                        {isMuted ? "Unmute" : "Mute"}
                     </Button>
                  </Stack>
               </CustomModal>

               {/* Mute Button */}
               <Tooltip title={isMuted ? "Unmute Chat" : "Mute Chat"}>
                  <IconButton
                     size="small"
                     onClick={() => setOpenModal(true)}
                     data-testid="mute-chat-btn"
                     color={isMuted ? "primary" : "default"}
                  >
                     <Icon
                        size="small"
                        icon={isMuted ? "solar:muted-bold" : "solar:muted-line-duotone"}
                        style={{
                           color: isMuted ? theme.palette.primary.main : theme.palette.text.secondary,
                        }}
                     />
                  </IconButton>
               </Tooltip>
            </Stack>
         )}
      </Stack>
   );
};

export default Header;