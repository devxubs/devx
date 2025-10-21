import {
   Stack,
   IconButton,
   useTheme,
   alpha,
   Box,
   useMediaQuery,
   Fade,
} from "@mui/material";
import Icon from "@src/components/Icon";
import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User } from "./handler/chatData";
import useChatState from "./handler/chatState";
import CustomPopover from "@src/components/CustomPopover";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import SendIcon from "@src/SvgIcon/SendIcon";

interface WritingProps {
   user: User;
   imageUpload: any;
   attachmentUpload: any;
}

const Writing = ({ attachmentUpload, imageUpload, user }: WritingProps) => {
   const theme = useTheme();
   const state = useChatState();
   const [emojiAnchor, setEmojiAnchor] = useState<null | HTMLElement>(null);
   const [messageHTML, setMessageHTML] = useState("");
   const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
   const [fullField, setFullField] = useState(false);
   const ref = useRef<HTMLDivElement>(null);

   // 🧠 Input handler
   const handleInput = () => {
      setMessageHTML(ref.current?.innerHTML || "");
   };

   // 😀 Emoji insertion
   const handleEmojiClick = (emoji: any) => {
      if (!ref.current) return;
      ref.current.focus();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      range.deleteContents();

      const img = document.createElement("img");
      img.src = emoji.getImageUrl(EmojiStyle.GOOGLE);
      img.alt = emoji.emoji;
      img.style.width = "20px";
      img.style.height = "20px";
      img.style.verticalAlign = "middle";

      range.insertNode(img);
      range.setStartAfter(img);
      range.setEndAfter(img);
      selection.removeAllRanges();
      selection.addRange(range);

      setMessageHTML(ref.current.innerHTML);
   };

   // 🔄 Auto focus
   useEffect(() => {
      ref.current?.focus();
   }, []);

   // ⏎ Handle Enter
   const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
         e.preventDefault();
         const text = ref.current?.innerText.trim();
         if (text) {
            console.log("Send:", text);
            ref.current!.innerHTML = "";
            setMessageHTML("");
         }
      }
   };

   return (
      <>
         {/* 🧱 Main Input Bar */}
         <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={0.4}
            sx={{
               width: "100%",
               p: isSmDown ? 0.5 : 1,
               backgroundColor: theme.palette.background.paper,
               position: "sticky",
               bottom: 0,
               zIndex: 10,
               transition: "all 0.3s ease",
            }}
         >
            {/* 📎 Left Buttons */}
            <Fade in={!isSmDown || !fullField}>
               <Stack
                  direction="row"
                  alignItems="center"
                  spacing={isSmDown ? 0 : 0.5}
                  sx={{
                     flexShrink: 0,
                     transition: "all 0.3s ease",
                     opacity: !isSmDown || !fullField ? 1 : 0,
                     width: !isSmDown || !fullField ? "auto" : 0,
                     overflow: "hidden",
                  }}
               >
                  <IconButton
                     size="small"
                     {...imageUpload.getRootProps()}
                     disabled={!user.id}
                  >
                     <input {...imageUpload.getInputProps()} />
                     <Icon
                        size="small"
                        icon="solar:gallery-add-bold"
                        style={{ color: theme.palette.text.secondary }}
                     />
                  </IconButton>

                  <IconButton
                     size="small"
                     {...attachmentUpload.getRootProps()}
                     disabled={!user.id}
                  >
                     <input {...attachmentUpload.getInputProps()} />
                     <Icon
                        size="small"
                        icon="eva:attach-2-fill"
                        style={{ color: theme.palette.text.secondary }}
                     />
                  </IconButton>

                  <IconButton
                     size="small"
                     onClick={() => {
                        state.set("isRecording", true);
                        state.set("showRecord", true);
                     }}
                     disabled={!user.id}
                  >
                     <Icon
                        size="small"
                        icon="solar:microphone-bold"
                        style={{ color: theme.palette.text.secondary }}
                     />
                  </IconButton>
               </Stack>
            </Fade>

            {/* 📝 Editable Input (Animated) */}
            <motion.div
               layout
               transition={{ type: "spring", stiffness: 300, damping: 25 }}
               style={{
                  flexGrow: 1,
                  display: "flex",
                  justifyContent: "center",
               }}
            >
               <Box
                  ref={ref}
                  contentEditable={!!user.id}
                  suppressContentEditableWarning
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                  onFocus={(e) => {
                     setFullField(true);
                     e.target.innerHTML = messageHTML;
                  }}
                  onBlur={(e) => {
                     setFullField(false);
                     e.target.innerHTML =
                        messageHTML.length >= 7
                           ? isSmDown
                              ? messageHTML.slice(0, 7) + "..."
                              : messageHTML.slice(0, 30) + "..."
                           : messageHTML;
                  }}
                  sx={{
                     flex: 1,
                     minHeight: 40,
                     maxHeight: 120,
                     overflowY: "auto",
                     padding: isSmDown ? "10px 14px" : "8px 14px",
                     borderRadius: 25,
                     outline: "none",
                     wordBreak: "break-word",
                     backgroundColor: alpha(
                        theme.palette.background.default,
                        0.9
                     ),
                     color: theme.palette.text.primary,
                     fontSize: 15,
                     lineHeight: 1.4,
                     transition: "all 0.3s ease",
                     width: fullField && isSmDown ? "100%" : "auto",
                     border: 1,
                     borderColor: "transparent",
                     "&:empty:before": {
                        content: isSmDown ? '"Message"' : '"Type a message..."',
                        color: theme.palette.text.disabled,
                     },
                     "&:focus": !user.id
                        ? {}
                        : {
                             backgroundColor: theme.palette.background.paper,
                             border: `1px solid ${alpha(
                                theme.palette.primary.main,
                                0.5
                             )}`,
                             boxShadow: `0 0 0 2px ${alpha(
                                theme.palette.primary.main,
                                0.15
                             )}`,
                             borderRadius: 1,
                          },
                  }}
               />
            </motion.div>

            {/* 😀 & 🚀 Buttons */}
            <Stack direction="row" alignItems="center" spacing={0.5}>
               <IconButton
                  size="small"
                  onClick={(e) =>
                     emojiAnchor
                        ? setEmojiAnchor(null)
                        : setEmojiAnchor(e.currentTarget)
                  }
                  disabled={!user.id}
               >
                  <Icon
                     size="small"
                     icon="eva:smiling-face-fill"
                     style={{ color: theme.palette.text.secondary }}
                  />
               </IconButton>
               <IconButton size="small" disabled={!user.id}>
                  <SendIcon />
               </IconButton>
            </Stack>
         </Stack>

         {/* 🌐 Universal Emoji Picker (CustomPopover works for both desktop + mobile) */}
         <CustomPopover
            anchorEl={emojiAnchor}
            onClose={() => setEmojiAnchor(null)}
            anchorOrigin={{
               vertical: "top",
               horizontal: isSmDown ? "center" : "right",
            }}
            transformOrigin={{
               vertical: "bottom",
               horizontal: isSmDown ? "center" : "right",
            }}
            sx={{
               p: 0,
               overflow: "auto",
               width: {
                  xs: 320,
                  sm: 350,
               },
               maxHeight: 400,
               "& aside": {
                  backgroundColor: "transparent !important",
                  boxShadow: theme.shadows[4],
                  borderRadius: 2,
                  width: "100%",
               },
               "& aside .epr-header > div": {
                  p: isSmDown ? "6px!important" : 1,
               },
               "& aside .epr-emoji-category-label": {
                  height: isSmDown ? "30px!important" : 40,
                  paddingRight: "0px!important",
               },
            }}
         >
            <EmojiPicker
               onEmojiClick={(e) => {
                  handleEmojiClick(e);
                  setEmojiAnchor(null);
               }}
               theme={theme.palette.mode === "dark" ? Theme.DARK : Theme.LIGHT}
               emojiStyle={EmojiStyle.GOOGLE}
               skinTonesDisabled
               lazyLoadEmojis
               width={isSmDown ? 320 : 350}
               height={400}
               previewConfig={{
                  showPreview: false,
               }}
            />
         </CustomPopover>
      </>
   );
};

export default Writing;
