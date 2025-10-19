import {
   Stack,
   Typography,
   IconButton,
   useTheme,
   Box,
   alpha,
   Fade,
} from "@mui/material";
import Icon from "@src/components/Icon";
import {
   PdfIcon,
   AiIcon,
   AudioIcon,
   ExcelIcon,
   PowerPointIcon,
   PsdIcon,
   UnknownIcon,
   WordIcon,
   ZipIcon,
} from "@Icon/files";
import AlertDialog from "@src/components/AlertDialog";
import { useState } from "react";
import { Attachment } from "../handler/chatData";
import ImagePreview from "./ImagePreview";
import VideoPlayer from "./VideoPlayer";
import VoiceMessage from "./VoiceMessage";

import { Emoji, EmojiStyle } from "emoji-picker-react";
import CustomPopover from "@src/components/CustomPopover";
import Attachments from "./Attachments";

interface ChatBoxProps {
   id?: any;
   massage: string;
   time: string;
   me: boolean;
   onReply?: () => void;
   type?: "text" | "voice" | "attachments";
   replyTo?: {
      name: string;
      content: string;
   } | null;
   attachments?: Attachment;
}

const ChatBox = ({
   id,
   massage,
   me,
   time,
   attachments,
   onReply,
   replyTo,
   type,
}: ChatBoxProps) => {
   const theme = useTheme();
   const [deleteChatOpen, setDeleteChatOpen] = useState(false);
   const [showImage, setShowImage] = useState(false);
   const [openReact, setOpenReact] = useState<null | HTMLElement>(null);
   const [selectedReact, setSelectedReact] = useState("");

   const attachmentName =
      (attachments && (attachments.name || "").split(".")) || [];

   return (
      <Stack alignItems={me ? "flex-end" : "flex-start"}>
         {/* Timestamp */}
         <Typography
            variant="caption"
            fontSize={11}
            color="textSecondary"
            sx={{ mb: 0.5 }}
         >
            {time}
         </Typography>

         {/* Message Bubble */}
         <Stack
            spacing={0.3}
            width="fit-content"
            maxWidth={{ xs: "90%", md: "70%" }}
            pb={0.5}
            alignItems={me ? "flex-end" : "flex-start"}
            sx={{
               "&:hover + .chat-box-action": {
                  visibility: "visible",
                  opacity: 1,
               },
            }}
         >
            {/* Replying To */}
            {replyTo && (
               <Stack
                  px={1.5}
                  py={1}
                  spacing={0.3}
                  borderRadius={1}
                  bgcolor={alpha(theme.palette.grey[500], 0.2)}
                  width={"fit-content"}
                  borderLeft={4}
                  borderColor={"primary.main"}
               >
                  <Typography
                     variant="caption"
                     color="textSecondary"
                     fontWeight={600}
                  >
                     Replying to {replyTo.name}
                  </Typography>
                  <Typography
                     variant="body2"
                     color="textSecondary"
                     noWrap
                     sx={{ maxWidth: "100%" }}
                  >
                     {replyTo.content}
                  </Typography>
               </Stack>
            )}

            {/* Main Message */}
            <Stack
               px={type === "attachments" || type === "voice" ? 0 : 1.5}
               py={type === "attachments" || type === "voice" ? 0 : 1}
               spacing={attachments?.url ? 1 : 0.5}
               alignItems={me ? "flex-end" : "flex-start"}
               width={"fit-content"}
               bgcolor={
                  type === "attachments"
                     ? "transparent"
                     : type === "voice"
                     ? alpha(theme.palette.primary.main, 0.4)
                     : me
                     ? theme.palette.primary.main
                     : theme.palette.grey[700]
               }
               borderRadius={1.5}
               sx={{
                  position: "relative",
                  ...(type !== "voice" &&
                     (me
                        ? { borderBottomRightRadius: 0 }
                        : { borderBottomLeftRadius: 0 })),
                  color: me
                     ? theme.palette.primary.contrastText
                     : theme.palette.text.primary,
               }}
            >
               {/* Message Text */}
               {type === "text" && (
                  <Typography variant="body2">{massage}</Typography>
               )}

               {/* Attachments */}
               {attachments && type === "attachments" && (
                  <Stack spacing={1} mt={0.5}>
                     <Fade in={showImage}>
                        <Stack>
                           <ImagePreview
                              attachments={{
                                 url: Array.isArray(attachments.url)
                                    ? attachments.url[0]
                                    : attachments.url,
                              }}
                              onClose={() => {
                                 setShowImage(false);
                              }}
                              close={showImage}
                           />
                        </Stack>
                     </Fade>

                     {attachments.type === "image" ? (
                        <Box
                           component="img"
                           src={attachments.url as string}
                           onClick={() => setShowImage(true)}
                           sx={{
                              width: "100%",
                              maxWidth: 300,
                              borderRadius: 1,
                              objectFit: "cover",
                           }}
                        />
                     ) : attachments.type === "video" ? (
                        <VideoPlayer url={attachments.url} />
                     ) : (
                        <Attachments
                           attachments={attachments}
                           attachmentName={attachmentName}
                        />
                     )}
                  </Stack>
               )}

               {/* Voice */}
               {type === "voice" && (
                  <VoiceMessage
                     url={attachments?.url as string}
                     name={attachments?.name || ""}
                  />
               )}
               {/* Reaction */}
               {selectedReact && (
                  <Stack
                     alignItems={"center"}
                     justifyContent={"center"}
                     sx={{
                        position: "absolute",
                        bottom: -10,
                        right: 0,
                        bgcolor: theme.palette.background.default,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                     }}
                  >
                     <Emoji
                        unified={selectedReact}
                        emojiStyle={EmojiStyle.GOOGLE}
                        size={15}
                     />
                  </Stack>
               )}
            </Stack>
         </Stack>

         {/* Hover Actions */}
         <Stack
            direction="row"
            alignItems="center"
            justifyContent={me ? "flex-end" : "flex-start"}
            className="chat-box-action"
            sx={{
               visibility: openReact ? "visible" : "hidden",
               opacity: openReact ? 1 : 0,
               transition: "opacity 0.3s ease-in-out",
               "&:hover": { visibility: "visible", opacity: 1 },
            }}
         >
            <IconButton size="small" onClick={onReply}>
               <Icon
                  size="small"
                  icon="solar:reply-bold"
                  style={{
                     width: 16,
                     height: 16,
                  }}
               />
            </IconButton>
            {/* <em-emoji id="+1" size="2em"></em-emoji> */}
            <CustomPopover
               anchorEl={openReact}
               onClose={() => setOpenReact(null)}
               anchorOrigin={{ horizontal: "right", vertical: "top" }}
               transformOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
               <Stack spacing={0.5} direction={"row"}>
                  <IconButton
                     size="small"
                     onClick={() => {
                        setOpenReact(null);
                        setSelectedReact("2764-fe0f");
                     }}
                  >
                     <Emoji
                        unified={"2764-fe0f"}
                        size={20}
                        emojiStyle={EmojiStyle.GOOGLE}
                     />
                  </IconButton>
                  <IconButton
                     size="small"
                     onClick={() => {
                        setOpenReact(null);
                        setSelectedReact("1f606");
                     }}
                  >
                     <Emoji
                        unified={"1f606"}
                        size={20}
                        emojiStyle={EmojiStyle.GOOGLE}
                     />
                  </IconButton>
                  <IconButton
                     size="small"
                     onClick={() => {
                        setOpenReact(null);
                        setSelectedReact("1f62e");
                     }}
                  >
                     <Emoji
                        unified={"1f62e"}
                        size={20}
                        emojiStyle={EmojiStyle.GOOGLE}
                     />
                  </IconButton>
                  <IconButton
                     size="small"
                     onClick={() => {
                        setOpenReact(null);
                        setSelectedReact("1f622");
                     }}
                  >
                     <Emoji
                        unified={"1f622"}
                        size={20}
                        emojiStyle={EmojiStyle.GOOGLE}
                     />
                  </IconButton>
                  <IconButton
                     size="small"
                     onClick={() => {
                        setOpenReact(null);
                        setSelectedReact("1f621");
                     }}
                  >
                     <Emoji
                        unified={"1f621"}
                        size={20}
                        emojiStyle={EmojiStyle.GOOGLE}
                     />
                  </IconButton>
                  <IconButton
                     size="small"
                     onClick={() => {
                        setOpenReact(null);
                        setSelectedReact("1f44d");
                     }}
                  >
                     <Emoji
                        unified={"1f44d"}
                        size={20}
                        emojiStyle={EmojiStyle.GOOGLE}
                     />
                  </IconButton>
               </Stack>
            </CustomPopover>
            <IconButton
               size="small"
               onClick={(e) => {
                  setOpenReact(e.currentTarget);
               }}
            >
               <Icon
                  size="small"
                  icon="eva:smiling-face-fill"
                  style={{
                     width: 16,
                     height: 16,
                  }}
               />
            </IconButton>
            <IconButton size="small" onClick={() => setDeleteChatOpen(true)}>
               <Icon
                  size="small"
                  icon="solar:trash-bin-trash-bold"
                  style={{
                     width: 16,
                     height: 16,
                  }}
               />
            </IconButton>

            <AlertDialog
               open={deleteChatOpen}
               onClose={() => setDeleteChatOpen(false)}
               type="delete"
               title={`Are you sure you want to delete this ${
                  attachments ? attachments?.type : "chat"
               }?`}
            />
         </Stack>
      </Stack>
   );
};

export default ChatBox;
