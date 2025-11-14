import { Stack, alpha, Box, Typography, useTheme } from "@mui/material";
import Icon from "@src/components/Icon";
import {
   PdfIcon,
   WordIcon,
   ZipIcon,
   ExcelIcon,
   PowerPointIcon,
   PsdIcon,
   AudioIcon,
   AiIcon,
   UnknownIcon,
} from "@src/SvgIcon/files";
import React from "react";
import { Attachment } from "../handler/chatData";

interface attachmentProps {
   attachments?: Attachment;
   attachmentName: string[];
}

const Attachments = ({ attachments, attachmentName }: attachmentProps) => {
   const theme = useTheme();
   return (
      <Stack
         direction="row"
         spacing={1}
         alignItems="center"
         sx={{
            p: 1,
            borderRadius: 1,
            bgcolor:
               theme.palette.mode === "dark"
                  ? alpha(theme.palette.background.default, 0.3)
                  : theme.palette.background.default,
            cursor: "pointer",
            "&:hover #overlay": {
               visibility: "visible",
               opacity: 1,
            },
         }}
      >
         <Box
            sx={{
               width: 40,
               height: 40,
               borderRadius: 0.84,
               bgcolor:
                  theme.palette.mode === "dark"
                     ? alpha(theme.palette.background.default, 0.3)
                     : theme.palette.background.paper,
               p: 1.2,
               position: "relative",
               overflow: "hidden",
               cursor: "pointer",
            }}
         >
            <Box
               component={"span"}
               id="overlay"
               sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  borderRadius: 1,
                  backdropFilter: "blur(6px)",
                  bgcolor: alpha(theme.palette.background.default, 0.1),
                  zIndex: 1,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  visibility: "hidden",
                  opacity: 0,
                  transition: "visibility 0.3s, opacity 0.3s ease-in-out",
               }}
            >
               <Icon icon="eva:cloud-download-fill" size="small" />
            </Box>
            {(attachments?.type || "") === "pdf" ? (
               <PdfIcon width="100%" height={"100%"} />
            ) : (attachments?.type || "") === "doc" ? (
               <WordIcon width="100%" height={"100%"} />
            ) : (attachments?.type || "") === "zip" ? (
               <ZipIcon width="100%" height={"100%"} />
            ) : (attachments?.type || "") === "xls" ? (
               <ExcelIcon width="100%" height={"100%"} />
            ) : (attachments?.type || "") === "ppt" ? (
               <PowerPointIcon width="100%" height={"100%"} />
            ) : (attachments?.type || "") === "psd" ? (
               <PsdIcon width="100%" height={"100%"} />
            ) : (attachments?.type || "") === "audio" ? (
               <AudioIcon width="100%" height={"100%"} />
            ) : (attachments?.type || "") === "ai" ? (
               <AiIcon width="100%" height={"100%"} />
            ) : (
               <UnknownIcon width="100%" height={"100%"} />
            )}
            {/* <PdfIcon width="100%" height={"100%"} /> */}
         </Box>
         <Stack>
            <Typography variant="body2" color={"textPrimary"}>
               {`${
                  attachmentName[0].length >= 25
                     ? attachmentName[0].slice(0, 20) +
                       "..." +
                       attachmentName[0].slice(-5)
                     : attachmentName[0]
               }.${attachmentName[1]}`}
            </Typography>
            <Typography variant="caption" color={"textSecondary"}>
               {attachments?.time}
            </Typography>
         </Stack>
      </Stack>
   );
};

export default Attachments;
