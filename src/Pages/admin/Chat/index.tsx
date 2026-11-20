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
import { uploadImageFile } from "@src/lib/uploadImage";
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
   // P2-9: the pending attachment is the UPLOADED file's stored
   // shape ({ type, url, name }) — the dropzones below upload
   // through POST /api/uploads on drop, and the send handler
   // includes this object in the message payload, which the API
   // persists on ChatMessage.attachments and the list renders.
   const [pendingAttachment, setPendingAttachment] = useState<{
      type: string;
      url: string;
      name: string;
   } | null>(null);
   const [uploadingAttachment, setUploadingAttachment] = useState(false);
   const [attachmentError, setAttachmentError] = useState<string | null>(null);
   const [replyTo, setReplyTo] = useState<{
      name: string;
      content: string;
   } | null>(null);
   // P2-8: paging state for the message history — whether older
   // history exists, and the refs holding the oldest/newest known
   // message cursors (kept in refs so the polling interval always
   // sees the latest values without re-subscribing).
   const [hasMoreOlder, setHasMoreOlder] = useState(false);
   const [loadingOlder, setLoadingOlder] = useState(false);
   const oldestCursorRef = useRef<{ before: string; beforeId: string } | null>(null);
   const newestCursorRef = useRef<{ since: string; sinceId: string } | null>(null);
   const prependRef = useRef(false);

   // Real backend data states
   const [conversations, setConversations] = useState<any[]>([]);
   const [availableUsers, setAvailableUsers] = useState<User[]>([]);
   const [activeConversation, setActiveConversation] = useState<any | null>(null);
   const [messages, setMessages] = useState<any[]>([]);
   const [loadingConversations, setLoadingConversations] = useState(true);
   const [loadingMessages, setLoadingMessages] = useState(false);
   const [currentUser, setCurrentUser] = useState<any | null>(null);

   const currentUserRef = useRef<any | null>(null);
   useEffect(() => {
      currentUserRef.current = currentUser;
   }, [currentUser]);

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

   // Phase 1 (CHAT-02): whenever fetched messages contain unread
   // messages from other members, mark them read via the API's
   // explicit mark_read action (fire-and-forget).
   const markReadIfNeeded = useCallback((convId: string, msgs: any[]) => {
      const myId = currentUserRef.current?.id;
      const hasUnreadFromOthers =
         Array.isArray(msgs) &&
         msgs.some(
            (m: any) => !m.isRead && m.senderId && (!myId || m.senderId !== myId),
         );
      if (hasUnreadFromOthers) {
         fetch("/api/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               conversationId: convId,
               action: "mark_read",
            }),
         }).catch(() => {});
      }
   }, []);

   const rememberCursors = useCallback((msgs: any[]) => {
      if (msgs.length > 0) {
         const newest = msgs[msgs.length - 1];
         newestCursorRef.current = { since: newest.createdAt, sinceId: newest.id };
      }
   }, []);

   // 2. Fetch Messages for active conversation — P2-8: the initial
   // load fetches only the LATEST page (the API defaults to 50);
   // older history is fetched on demand by loadOlderMessages.
   const loadMessages = useCallback(
      async (convId: string, isSilent = false) => {
         if (!convId) return;
         if (!isSilent) setLoadingMessages(true);
         try {
            const res = await fetch(
               `/api/chat/messages?conversationId=${convId}&limit=50`,
            );
            if (res.ok) {
               const data = await res.json();
               const msgs = Array.isArray(data) ? data : data.messages || [];
               setMessages(msgs);
               setHasMoreOlder(Boolean(data?.hasMore));
               oldestCursorRef.current =
                  data?.nextBefore && data?.nextBeforeId
                     ? { before: data.nextBefore, beforeId: data.nextBeforeId }
                     : null;
               rememberCursors(msgs);
               markReadIfNeeded(convId, msgs);
            }
         } catch {
            // silent
         } finally {
            if (!isSilent) setLoadingMessages(false);
         }
      },
      [markReadIfNeeded, rememberCursors],
   );

   // P2-8: fetch the next older page and PREPEND it (deduplicated
   // by id in case a poll raced the page fetch).
   const loadOlderMessages = useCallback(async () => {
      const convId = activeConversation?.id;
      const cursor = oldestCursorRef.current;
      if (!convId || !cursor || loadingOlder) return;
      setLoadingOlder(true);
      try {
         const params = new URLSearchParams({
            conversationId: convId,
            limit: "50",
            before: cursor.before,
            beforeId: cursor.beforeId,
         });
         const res = await fetch(`/api/chat/messages?${params.toString()}`);
         if (res.ok) {
            const data = await res.json();
            const older = Array.isArray(data) ? data : data.messages || [];
            if (older.length > 0) {
               prependRef.current = true;
               setMessages((prev) => {
                  const seen = new Set(prev.map((m: any) => m.id));
                  return [...older.filter((m: any) => !seen.has(m.id)), ...prev];
               });
            }
            setHasMoreOlder(Boolean(data?.hasMore));
            oldestCursorRef.current =
               data?.nextBefore && data?.nextBeforeId
                  ? { before: data.nextBefore, beforeId: data.nextBeforeId }
                  : null;
         }
      } catch {
         // silent — the button stays available for a retry
      } finally {
         setLoadingOlder(false);
      }
   }, [activeConversation?.id, loadingOlder]);

   // P2-8: incremental polling — ask only for messages after the
   // newest known one and APPEND them; the full history is never
   // re-downloaded. Falls back to a page load while the
   // conversation is still empty (no cursor yet).
   const pollMessages = useCallback(
      async (convId: string) => {
         const cursor = newestCursorRef.current;
         if (!cursor) {
            loadMessages(convId, true);
            return;
         }
         try {
            const params = new URLSearchParams({
               conversationId: convId,
               since: cursor.since,
               sinceId: cursor.sinceId,
            });
            const res = await fetch(`/api/chat/messages?${params.toString()}`);
            if (res.ok) {
               const data = await res.json();
               const fresh = Array.isArray(data) ? data : data.messages || [];
               if (fresh.length > 0) {
                  setMessages((prev) => {
                     const seen = new Set(prev.map((m: any) => m.id));
                     return [...prev, ...fresh.filter((m: any) => !seen.has(m.id))];
                  });
                  rememberCursors(fresh);
                  markReadIfNeeded(convId, fresh);
               }
            }
         } catch {
            // silent
         }
      },
      [loadMessages, markReadIfNeeded, rememberCursors],
   );

   useEffect(() => {
      if (activeConversation?.id) {
         // Switching conversations resets the paging cursors.
         oldestCursorRef.current = null;
         newestCursorRef.current = null;
         setHasMoreOlder(false);
         loadMessages(activeConversation.id);
      }
   }, [activeConversation?.id, loadMessages]);

   // 3. Real-time Message Polling (every 3.5 seconds, incremental)
   useEffect(() => {
      if (!activeConversation?.id) return;
      const interval = setInterval(() => {
         pollMessages(activeConversation.id);
      }, 3500);
      return () => clearInterval(interval);
   }, [activeConversation?.id, pollMessages]);

   // 4. Send Message Handler — P2-9: a pending uploaded attachment
   // is sent with the message (and a message may consist of the
   // attachment alone, which the API accepts).
   const handleSendMessage = async (text: string) => {
      if (!activeConversation?.id) return;
      const trimmed = text.trim();
      const att = pendingAttachment;
      if (!trimmed && !att) return;

      const optimisticMsg = {
         id: `temp-${Date.now()}`,
         conversationId: activeConversation.id,
         senderId: currentUser?.id || "me",
         senderName: currentUser?.name || "Me",
         message: trimmed || null,
         attachments: att,
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
               message: trimmed || undefined,
               attachments: att || undefined,
            }),
         });

         if (res.ok) {
            const savedMsg = await res.json();
            setMessages((prev) =>
               prev.map((m) => (m.id === optimisticMsg.id ? savedMsg : m))
            );
            rememberCursors([savedMsg]);
            setPendingAttachment(null);
            setAttachmentError(null);
            // NOTE (P2-9): the reply banner clears locally, but the
            // quote is NOT persisted — ChatMessage has no reply-to
            // field (schema change needed; see the phase report).
            setReplyTo(null);
            loadConversations(); // refresh snippet & timestamps in sidebar
         }
      } catch {
         // keep optimistic or show error
      }
   };

   // P2-9: persist a reaction through the messages API (reactions
   // live on ChatMessage.reactions, keyed by user). Optimistic
   // local update; the API response is authoritative on success.
   const handleReact = async (messageId: string, unified: string) => {
      if (!activeConversation?.id || !currentUser?.id) return;
      setMessages((prev) =>
         prev.map((m: any) => {
            if (m.id !== messageId) return m;
            const reactions = { ...(m.reactions || {}) };
            if (reactions[currentUser.id] === unified) delete reactions[currentUser.id];
            else reactions[currentUser.id] = unified;
            return { ...m, reactions };
         }),
      );
      try {
         const res = await fetch("/api/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               conversationId: activeConversation.id,
               action: "react",
               messageId,
               reaction: unified,
            }),
         });
         if (res.ok) {
            const updated = await res.json();
            setMessages((prev) =>
               prev.map((m: any) => (m.id === messageId ? updated : m)),
            );
         }
      } catch {
         // optimistic state stands; next poll reconciles read state only
      }
   };

   // Scroll to bottom on new messages — except when older history
   // was just prepended (P2-8), where jumping to the bottom would
   // lose the reader's place.
   useLayoutEffect(() => {
      if (prependRef.current) {
         prependRef.current = false;
         return;
      }
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

   // P2-9: dropped files are uploaded immediately through the
   // existing uploads flow (POST /api/uploads via uploadImageFile —
   // raster images, 5 MB cap enforced server-side) and held as the
   // pending attachment until the next send. Upload failures are
   // surfaced above the composer instead of silently dropping the
   // file, which is what the previous setState-only handlers did.
   const handleFileDrop = async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setUploadingAttachment(true);
      setAttachmentError(null);
      try {
         const url = await uploadImageFile(file);
         setPendingAttachment({ type: "image", url, name: file.name });
      } catch (e: any) {
         setAttachmentError(
            e?.message || "Attachment upload failed. Please try again.",
         );
      } finally {
         setUploadingAttachment(false);
      }
   };

   const imageUpload = useDropzone({
      onDrop: handleFileDrop,
      accept: { "image/*": [] },
      maxSize: 15 * 1024 * 1024,
      maxFiles: 1,
      multiple: false,
   });

   const attachmentUpload = useDropzone({
      onDrop: handleFileDrop,
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
               users={availableUsers}
               currentUserId={currentUser?.id}
               onClose={(c) => setProfileOpen(c)}
               open={profileOpen}
               onConversationUpdated={(updated) => {
                  setActiveConversation((prev: any) => ({ ...prev, ...updated }));
                  setConversations((prev) =>
                     prev.map((c) => (c.id === (updated.id || activeConversation?.id) ? { ...c, ...updated } : c))
                  );
               }}
               onMembersChanged={(updated) => {
                  setActiveConversation((prev: any) => ({ ...prev, ...updated }));
                  loadConversations();
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
                              {/* P2-8: older-history paging */}
                              {hasMoreOlder && messages.length > 0 && (
                                 <Stack alignItems="center">
                                    <Button
                                       size="small"
                                       variant="text"
                                       onClick={loadOlderMessages}
                                       disabled={loadingOlder}
                                       startIcon={
                                          loadingOlder ? (
                                             <CircularProgress size={14} />
                                          ) : undefined
                                       }
                                    >
                                       Load older messages
                                    </Button>
                                 </Stack>
                              )}
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
                                          // P2-9: the composer's replyTo is
                                          // no longer passed to every bubble
                                          // (it made ALL messages render a
                                          // quote while composing). Quoted
                                          // replies are not persisted —
                                          // ChatMessage has no reply-to
                                          // field; see the phase report.
                                          type={m.attachments ? "attachments" : "text"}
                                          attachments={m.attachments}
                                          reactions={m.reactions}
                                          myReaction={
                                             currentUser?.id
                                                ? m.reactions?.[currentUser.id]
                                                : undefined
                                          }
                                          onReact={(unified) =>
                                             handleReact(m.id, unified)
                                          }
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

                     {/* P2-9: pending attachment (uploaded, not yet sent) */}
                     <Collapse in={uploadingAttachment || !!pendingAttachment || !!attachmentError}>
                        <Stack
                           direction="row"
                           alignItems="center"
                           spacing={1}
                           mb={1}
                           px={1}
                        >
                           {uploadingAttachment ? (
                              <>
                                 <CircularProgress size={14} />
                                 <Typography variant="body2" fontSize={12} color="textSecondary">
                                    Uploading attachment…
                                 </Typography>
                              </>
                           ) : attachmentError ? (
                              <Typography variant="body2" fontSize={12} color="error">
                                 {attachmentError}
                              </Typography>
                           ) : pendingAttachment ? (
                              <>
                                 <Icon
                                    size="small"
                                    icon="eva:attach-2-fill"
                                 />
                                 <Typography variant="body2" fontSize={12} noWrap>
                                    {pendingAttachment.name} — will be sent with your next message
                                 </Typography>
                                 <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setPendingAttachment(null)}
                                 >
                                    Remove
                                 </Button>
                              </>
                           ) : null}
                        </Stack>
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
                           canSendWithoutText={Boolean(pendingAttachment)}
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
