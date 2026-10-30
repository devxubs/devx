"use client";

import {
   Box,
   Button,
   Collapse,
   Drawer,
   Stack,
   Typography,
   useMediaQuery,
   useTheme,
   CircularProgress,
} from "@mui/material";
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useSearchParams, useRouter } from "next/navigation";

import Profile from "./Layout/Profile";
import Sidebar from "./Layout/Sidebar";
import Icon from "@src/components/Icon";
import ChatColorIcon from "@src/SvgIcon/ChatColorIcon";
import CustomBox from "@src/components/CustomBox";
import { User } from "./handler/chatData";
import VoiceRecorder from "./VoiceRecorder";
import useChatState from "./handler/chatState";
import { toRelativeTime } from "./handler/handler";
import ChatBox from "./ChatBox";
import Replying from "./Replying";
import Writing from "./Writing";
import Header from "./Layout/Header";

const Chat = () => {
   const theme = useTheme();
   const router = useRouter();
   const state = useChatState();
   const params = useSearchParams();

   const [greeting, setGreeting] = useState("");
   const [profileOpen, setProfileOpen] = useState(false);
   const [smallSidebar, setSmallSidebar] = useState(false);
   const [images, setImages] = useState<File | null>(null);
   const [attachment, setAttachment] = useState<File | null>(null);
   const [replyTo, setReplyTo] = useState<{
      name: string;
      content: string;
   } | null>(null);

   // Real backend data states
   const [conversations, setConversations] = useState<any[]>([]);
   const [availableUsers, setAvailableUsers] = useState<User[]>([]);
   const [activeConversation, setActiveConversation] = useState<any | null>(null);
   const [messages, setMessages] = useState<any[]>([]);
   const [loadingConversations, setLoadingConversations] = useState(true);
   const [loadingMessages, setLoadingMessages] = useState(false);
   const [currentUser, setCurrentUser] = useState<any | null>(null);

   const scrollContainerRef = useRef<HTMLDivElement | null>(null);
   const messagesEndRef = useRef<HTMLDivElement | null>(null);
   const initialLoadRef = useRef(true);

   const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
   const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
   const isLgDown = useMediaQuery(theme.breakpoints.down("lg"));

   // Greet
   useEffect(() => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting("Good morning");
      else if (hour < 18) setGreeting("Good afternoon");
      else if (hour < 21) setGreeting("Good evening");
      else setGreeting("Good night");
   }, []);

   // Load Current User
   useEffect(() => {
      fetch("/api/auth/me")
         .then((r) => (r.ok ? r.json() : null))
         .then((data) => {
            if (data?.user) setCurrentUser(data.user);
         })
         .catch(() => {});
   }, []);

   // 1. Fetch Conversations
   const loadConversations = useCallback(async () => {
      try {
         const res = await fetch("/api/chat/conversations");
         if (res.ok) {
            const data = await res.json();
            setConversations(data.conversations || []);
            const mappedUsers: User[] = (data.users || []).map((u: any) => ({
               id: u.id,
               name: u.name || "Staff Member",
               avatar: u.image || "/images/avatar-25.webp",
               isOnline: u.status === "ACTIVE",
            }));
            setAvailableUsers(mappedUsers);
         }
      } catch {
         // silent
      } finally {
         setLoadingConversations(false);
      }
   }, []);

   useEffect(() => {
      loadConversations();
   }, [loadConversations]);

   // Determine active conversation
   useEffect(() => {
      if (!conversations.length) return;
      const paramId = params?.get("id");
      if (paramId) {
         const found = conversations.find((c) => c.id === paramId);
         if (found) {
            setActiveConversation(found);
            return;
         }
      }
      // Default to first conversation
      setActiveConversation(conversations[0]);
   }, [conversations, params]);

   // 2. Fetch Messages for active conversation
   const loadMessages = useCallback(async (convId: string, isSilent = false) => {
      if (!convId) return;
      if (!isSilent) setLoadingMessages(true);
      try {
         const res = await fetch(`/api/chat/messages?conversationId=${convId}`);
         if (res.ok) {
            const data = await res.json();
            setMessages(data);
         }
      } catch {
         // silent
      } finally {
         if (!isSilent) setLoadingMessages(false);
      }
   }, []);

   useEffect(() => {
      if (activeConversation?.id) {
         loadMessages(activeConversation.id);
      }
   }, [activeConversation?.id, loadMessages]);

   // 3. Real-time Message Polling (every 3.5 seconds)
   useEffect(() => {
      if (!activeConversation?.id) return;
      const interval = setInterval(() => {
         loadMessages(activeConversation.id, true);
      }, 3500);
      return () => clearInterval(interval);
   }, [activeConversation?.id, loadMessages]);

   // 4. Send Message Handler
   const handleSendMessage = async (text: string) => {
      if (!activeConversation?.id || !text.trim()) return;

      const optimisticMsg = {
         id: `temp-${Date.now()}`,
         conversationId: activeConversation.id,
         senderId: currentUser?.id || "me",
         senderName: currentUser?.name || "Me",
         message: text.trim(),
         createdAt: new Date().toISOString(),
         isRead: false,
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      try {
         const res = await fetch("/api/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               conversationId: activeConversation.id,
               message: text.trim(),
            }),
         });

         if (res.ok) {
            const savedMsg = await res.json();
            setMessages((prev) =>
               prev.map((m) => (m.id === optimisticMsg.id ? savedMsg : m))
            );
            loadConversations(); // refresh snippet & timestamps in sidebar
         }
      } catch {
         // keep optimistic or show error
      }
   };

   // Scroll to bottom on new messages
   useLayoutEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const handleScrollBottom = () => {
         requestAnimationFrame(() => {
            const maxScroll = container.scrollHeight - container.clientHeight;
            container.scrollTo({
               top: maxScroll > 0 ? maxScroll : 0,
               behavior: initialLoadRef.current ? "auto" : "smooth",
            });
            if (initialLoadRef.current) initialLoadRef.current = false;
         });
      };

      handleScrollBottom();
      const timeout = setTimeout(() => handleScrollBottom(), 100);
      return () => clearTimeout(timeout);
   }, [messages.length, activeConversation?.id]);

   const imageUpload = useDropzone({
      onDrop: (acceptedFiles: File[]) => {
         if (acceptedFiles.length === 0) return;
         setImages(acceptedFiles[0]);
      },
      accept: { "image/*": [] },
      maxSize: 15 * 1024 * 1024,
      maxFiles: 1,
      multiple: false,
   });

   const attachmentUpload = useDropzone({
      onDrop: (acceptedFiles: File[]) => {
         if (acceptedFiles.length === 0) return;
         setAttachment(acceptedFiles[0]);
      },
      maxSize: 15 * 1024 * 1024,
      maxFiles: 1,
      multiple: false,
   });

   // Construct virtual user for Header & Profile
   const displayUser: User & { isMuted?: boolean; type?: string; description?: string } = {
      id: activeConversation?.id || "",
      name:
         activeConversation?.displayName ||
         activeConversation?.name ||
         (activeConversation?.type === "group" ? "Staff Group" : "Direct Staff Chat"),
      avatar: activeConversation?.avatar || "/images/avatar-25.webp",
      isOnline: true,
      lastActive: activeConversation?.updatedAt,
      isMuted: Boolean(activeConversation?.isMuted),
      type: activeConversation?.type,
      description: activeConversation?.description,
   };

   return (
      <Stack
         direction="row"
         height={{ xs: 500, md: 580 }}
         width="100%"
         bgcolor="background.paper"
         borderRadius={2}
         boxShadow={14}
         my={{ xs: 0, md: 3 }}
         overflow="hidden"
      >
         {/* Sidebar */}
         <Stack position="relative" zIndex={1}>
            {isMdDown ? (
               <Drawer
                  open={smallSidebar}
                  variant="temporary"
                  anchor="left"
                  onClose={() => setSmallSidebar(false)}
               >
                  <CustomBox sx={{ height: "100vh", overflowY: "auto", py: 4 }}>
                     <Sidebar
                        conversations={conversations}
                        users={availableUsers}
                        activeId={activeConversation?.id}
                        open={smallSidebar}
                        onClose={() => setSmallSidebar(false)}
                        mobileMode={isMdDown}
                        onSelectConversation={(id) => {
                           router.push(`/admin/chat?id=${id}`);
                           setSmallSidebar(false);
                        }}
                        onGroupCreated={(newConv) => {
                           loadConversations();
                           router.push(`/admin/chat?id=${newConv.id}`);
                        }}
                     />
                  </CustomBox>
               </Drawer>
            ) : (
               <Sidebar
                  conversations={conversations}
                  users={availableUsers}
                  activeId={activeConversation?.id}
                  open={!smallSidebar}
                  mobileMode={false}
                  onClose={() => setSmallSidebar(!smallSidebar)}
                  onSelectConversation={(id) => router.push(`/admin/chat?id=${id}`)}
                  onGroupCreated={(newConv) => {
                     loadConversations();
                     router.push(`/admin/chat?id=${newConv.id}`);
                  }}
               />
            )}

            {!smallSidebar && isMdDown && (
               <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setSmallSidebar(true)}
                  sx={{ position: "absolute", top: 60, left: -13, zIndex: 99 }}
               >
                  <Icon
                     icon="solar:users-group-rounded-bold-duotone"
                     style={{ color: theme.palette.text.primary }}
                  />
               </Button>
            )}
         </Stack>

         {/* Chat content */}
         <Stack flex={1}>
            {/* Header */}
            <Header
               user={displayUser}
               conversation={activeConversation}
               onClose={(c) => setProfileOpen(c)}
               open={profileOpen}
               onConversationUpdated={(updated) => {
                  setActiveConversation((prev: any) => ({ ...prev, ...updated }));
                  setConversations((prev) =>
                     prev.map((c) => (c.id === (updated.id || activeConversation?.id) ? { ...c, ...updated } : c))
                  );
               }}
            />

            {/* Message area */}
            <Stack direction="row" height="100%" overflow="hidden">
               <Stack flex={1} height="100%">
                  <Box
                     ref={scrollContainerRef}
                     sx={{
                        flex: 1,
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        scrollbarWidth: "none!important",
                        msOverflowStyle: "none!important",
                        "&::-webkit-scrollbar": { display: "none!important" },
                     }}
                  >
                     <Stack p={2} spacing={1.5}>
                        {activeConversation ? (
                           <>
                              {loadingMessages && messages.length === 0 ? (
                                 <Stack alignItems="center" justifyContent="center" height={200}>
                                    <CircularProgress size={28} />
                                 </Stack>
                              ) : messages.length === 0 ? (
                                 <Stack alignItems="center" justifyContent="center" py={8} spacing={1}>
                                    <Icon icon="solar:chat-round-line-bold" size="large" />
                                    <Typography variant="body2" color="text.secondary">
                                       No messages yet. Send a message to start the conversation!
                                    </Typography>
                                 </Stack>
                              ) : (
                                 messages.map((m: any) => {
                                    const isMe =
                                       m.senderId === currentUser?.id ||
                                       m.senderName === currentUser?.name ||
                                       m.senderId === "me";

                                    return (
                                       <ChatBox
                                          key={m.id}
                                          id={m.id}
                                          me={isMe}
                                          time={toRelativeTime(new Date(m.createdAt).getTime())}
                                          massage={m.message || ""}
                                          onReply={() =>
                                             setReplyTo({
                                                name: m.senderName || (isMe ? "You" : "Staff"),
                                                content: m.message || "Message",
                                             })
                                          }
                                          replyTo={replyTo}
                                          type={m.attachments ? "attachments" : "text"}
                                          attachments={m.attachments}
                                       />
                                    );
                                 })
                              )}
                              <div ref={messagesEndRef} style={{ margin: 0 }} />
                           </>
                        ) : (
                           <Stack
                              p={2}
                              spacing={0.5}
                              justifyContent="center"
                              alignItems="center"
                              flex={1}
                              height="100%"
                           >
                              <ChatColorIcon />
                              <Typography variant="h5" color="textSecondary">
                                 {greeting}!
                              </Typography>
                              <Typography variant="body2" color="textDisabled">
                                 Select or create a conversation to start chatting...
                              </Typography>
                           </Stack>
                        )}
                     </Stack>
                  </Box>

                  {/* Input area */}
                  <Stack
                     borderTop={1}
                     borderColor="divider"
                     py={1}
                     px={{ xs: 0.7, md: 2 }}
                  >
                     {/* Replying to */}
                     <Collapse in={!!replyTo}>
                        <Replying
                           reply={replyTo}
                           onCancel={() => setReplyTo(null)}
                        />
                     </Collapse>

                     {/* VOICE RECORDER OR WRITING */}
                     {state.get("showRecord") ? (
                        <VoiceRecorder />
                     ) : (
                        <Writing
                           attachmentUpload={attachmentUpload}
                           imageUpload={imageUpload}
                           user={displayUser}
                           onSendMessage={handleSendMessage}
                        />
                     )}
                  </Stack>
               </Stack>

               {/* Profile */}
               {displayUser && displayUser.id && (
                  isLgDown ? (
                     <Drawer
                        open={profileOpen}
                        variant="temporary"
                        anchor="right"
                        onClose={() => setProfileOpen(false)}
                     >
                        <CustomBox sx={{ height: "100vh", overflowY: "auto", py: 8 }}>
                           <Profile
                              open={profileOpen}
                              mobileMode
                              user={displayUser}
                           />
                        </CustomBox>
                     </Drawer>
                  ) : (
                     <Profile open={!profileOpen} user={displayUser} />
                  )
               )}
            </Stack>
         </Stack>
      </Stack>
   );
};

export default Chat;
