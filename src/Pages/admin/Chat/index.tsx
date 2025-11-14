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
} from "@mui/material";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useSearchParams } from "next/navigation";

import EmojiPicker, { Theme } from "emoji-picker-react";

import Profile from "./Layout/Profile";
import Sidebar from "./Layout/Sidebar";
import Icon from "@src/components/Icon";
import ChatColorIcon from "@src/SvgIcon/ChatColorIcon";
import CustomBox from "@src/components/CustomBox";
import { users, messages, User } from "./handler/chatData";
import VoiceRecorder from "./VoiceRecorder";
import useChatState from "./handler/chatState";
import { getTimeline, toRelativeTime } from "./handler/handler";
import ChatBox from "./ChatBox";
import Replying from "./Replying";
import Writing from "./Writing";
import Header from "./Layout/Header";

const Chat = () => {
   const theme = useTheme();
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

   const scrollContainerRef = useRef<HTMLDivElement | null>(null);
   const messagesEndRef = useRef<HTMLDivElement | null>(null);
   const initialLoadRef = useRef(true);

   const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
   const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
   const isLgDown = useMediaQuery(theme.breakpoints.down("lg"));

   useEffect(() => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting("Good morning");
      else if (hour < 18) setGreeting("Good afternoon");
      else if (hour < 21) setGreeting("Good evening");
      else setGreeting("Good night");
   }, []);

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

   const findUser: User =
      users.find((cl) => cl.id.toString() === params?.get("id")) ||
      ({} as User);

   const userMessage = messages.find((m) => m.senderId === findUser.id);
   const timeline = userMessage ? getTimeline(userMessage) : [];

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
      const timeout2 = setTimeout(() => handleScrollBottom(), 400);

      return () => {
         clearTimeout(timeout);
         clearTimeout(timeout2);
      };
   }, [timeline.length, params?.get("id")]);

   return (
      <Stack
         direction="row"
         height={{ xs: 470, md: 500 }}
         width="100%"
         bgcolor="background.paper"
         borderRadius={2}
         boxShadow={14}
         my={{ xs: 0, md: 4 }}
         overflow={"hidden"}
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
                  <CustomBox sx={{ height: "100vh", overflowY: "auto", py: 8 }}>
                     <Sidebar
                        chatList={users}
                        open={smallSidebar}
                        onClose={() => setSmallSidebar(false)}
                        mobileMode={isMdDown}
                     />
                  </CustomBox>
               </Drawer>
            ) : (
               <Sidebar
                  chatList={users}
                  open={!smallSidebar}
                  mobileMode={false}
                  onClose={() => setSmallSidebar(!smallSidebar)}
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
               user={findUser}
               onClose={(c) => setProfileOpen(c)}
               open={profileOpen}
            />

            {/* Message area — use native scroll container */}
            <Stack direction="row" height={"100%"} overflow={"hidden"}>
               <Stack flex={1} height={"100%"}>
                  <Box
                     ref={scrollContainerRef}
                     sx={{
                        flex: 1,
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        scrollbarWidth: "none!important", // Firefox
                        msOverflowStyle: "none!important", // IE/Edge
                        "&::-webkit-scrollbar": {
                           display: "none!important", // Chrome/Safari
                        },
                     }}
                  >
                     <Stack p={2} spacing={1}>
                        {findUser && findUser.id ? (
                           <>
                              {[
                                 { type: "text" },
                                 {
                                    type: "attachments",
                                    attachments: {
                                       id: "a2",
                                       type: "image",
                                       url: "https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg",
                                       name: "CustomButton.tsx",
                                       size: "3KB",
                                    },
                                 },
                                 {
                                    type: "voice",
                                    attachments: {
                                       id: "a2",
                                       type: "voice",
                                       url: "/audio/videoplayback.weba",
                                       name: "CustomButton.tsx",
                                       size: "3KB",
                                    },
                                 },
                                 {
                                    type: "attachments",
                                    attachments: {
                                       id: "a2",
                                       type: "video",
                                       url: "/audio/WhatsApp Video 2025-10-19 at 23.45.44.mp4", //"/audio/THIS IS 4K ANIME  YOUR NAME 2160P 60FPS - ASH EDITS (1080p, h264).mp4",
                                       name: "CustomButton.mp4",
                                       size: "3KB",
                                    },
                                 },
                                 {
                                    type: "attachments",
                                    attachments: {
                                       id: "a2",
                                       type: "video",
                                       url: "/audio/THIS IS 4K ANIME  YOUR NAME 2160P 60FPS - ASH EDITS (1080p, h264).mp4",
                                       name: "CustomButton.mp4",
                                       size: "3KB",
                                    },
                                 },
                                 {
                                    type: "attachments",
                                    attachments: {
                                       id: "a2",
                                       type: "ai",
                                       url: "https://youtu.be/uS-VA9Q6uLM?list=RDuS-VA9Q6uLM",
                                       name: "CustomButton.mp4",
                                       size: "3KB",
                                    },
                                 },
                              ].map((item: any, idx) => {
                                 return (
                                    <ChatBox
                                       key={idx}
                                       me={true}
                                       time={toRelativeTime(
                                          new Date("10/10/2025").getTime()
                                       )}
                                       massage={"Text Message"}
                                       onReply={() =>
                                          setReplyTo({
                                             name: findUser.name,
                                             content: "Attachment",
                                          })
                                       }
                                       replyTo={replyTo}
                                       type={item.type}
                                       attachments={item.attachments}
                                    />
                                 );
                              })}

                              {/* anchor inside scroll container */}
                              <div ref={messagesEndRef} style={{ margin: 0 }} />
                           </>
                        ) : (
                           <Stack
                              p={2}
                              spacing={0.5}
                              justifyContent="center"
                              alignItems="center"
                              flex={1}
                              height={"100%"}
                           >
                              <ChatColorIcon />
                              <Typography variant="h5" color="textSecondary">
                                 {greeting}!
                              </Typography>
                              <Typography variant="body2" color="textDisabled">
                                 Write something awesome...
                              </Typography>
                           </Stack>
                        )}
                     </Stack>
                  </Box>

                  {/* Input area */}
                  {
                     <Stack
                        borderTop={1}
                        borderColor={"divider"}
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

                        {/* VOICE RECORDER */}
                        {state.get("showRecord") ? (
                           <VoiceRecorder />
                        ) : (
                           <Writing
                              attachmentUpload={attachmentUpload}
                              imageUpload={imageUpload}
                              user={findUser}
                           />
                        )}
                     </Stack>
                  }
               </Stack>

               {/* Profile */}
               {findUser &&
                  findUser.id &&
                  (isLgDown ? (
                     <Drawer
                        open={profileOpen}
                        variant="temporary"
                        anchor="right"
                        onClose={() => setProfileOpen(false)}
                     >
                        <CustomBox
                           sx={{ height: "100vh", overflowY: "auto", py: 8 }}
                        >
                           <Profile
                              open={profileOpen}
                              mobileMode
                              user={findUser}
                           />
                        </CustomBox>
                     </Drawer>
                  ) : (
                     <Profile open={!profileOpen} user={findUser} />
                  ))}
            </Stack>
         </Stack>
      </Stack>
   );
};

export default Chat;
