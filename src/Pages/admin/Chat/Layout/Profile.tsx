import React from "react";
import {
   Stack,
   Typography,
   Box,
   Accordion,
   AccordionSummary,
   AccordionDetails,
   useTheme,
   alpha,
   Avatar,
   Badge,
} from "@mui/material";

import AnimatedAvatar from "@src/components/AnimateAvatar";
import Icon from "@src/components/Icon";
import {
   PdfIcon,
   AiIcon,
   AudioIcon,
   ExcelIcon,
   ImageIcon,
   PowerPointIcon,
   PsdIcon,
   UnknownIcon,
   VideoIcon,
   WordIcon,
   ZipIcon,
} from "@Icon/files";
import { User } from "../handler/chatData";
import { UserProps } from "../../User";

const Profile = ({
   open,
   mobileMode,
   user,
}: {
   open?: Boolean;
   mobileMode?: Boolean;
   user: any;
}) => {
   const theme = useTheme();

   return (
      <Stack
         spacing={2}
         width={open ? 280 : 0}
         borderLeft={mobileMode || !open ? 0 : 1}
         borderColor={mobileMode || !open ? "transparent" : "divider"}
         sx={{
            transition: "width 0.3s ease-in-out",
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
            height: "100%",
            scrollbarWidth: "none!important", // For Firefox
            "&::-webkit-scrollbar": {
               display: "none !important", // For Chrome, Safari, and Opera
            },
         }}
      >
         {/* Scrollable area */}
         <Stack
            spacing={2}
            alignItems="center"
            justifyContent="flex-start"
            sx={{
               py: 2,
            }}
         >
            {/* Avatar Section */}
            <Stack
               spacing={1}
               alignItems="center"
               justifyContent="center"
               my={3}
            >
               <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  color="primary"
                  variant="dot"
                  badgeContent=" "
                  sx={{
                     "& .MuiBadge-badge": {
                        zIndex: 2,
                        width: 15,
                        height: 10,
                        borderRadius: 40,
                     },
                  }}
               >
                  {Array.isArray(user.profileUrl) ? (
                     <Stack
                        position={"relative"}
                        height={43}
                        width={43}
                        borderRadius={"50%"}
                        sx={{
                           "& .MuiAvatar-root": {
                              width: 32,
                              height: 32,
                           },
                        }}
                     >
                        <Avatar
                           src={user.profileUrl[0]}
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
                           src={user.profileUrl[1]}
                           sx={{
                              position: "absolute",
                              top: 0,
                              right: 0,
                              zIndex: 1,
                           }}
                        />
                     </Stack>
                  ) : (
                     <AnimatedAvatar src={user.profileUrl} size="large" />
                  )}
               </Badge>
               <Box textAlign="center">
                  <Typography variant="body1" fontWeight={600}>
                     {user.name}
                  </Typography>
                  <Typography variant="subtitle2" color="textSecondary">
                     CEO
                  </Typography>
               </Box>
            </Stack>

            {/* Accordions */}
            <Stack width={"100%"}>
               <Accordion
                  sx={{
                     width: "100%",
                     m: "0px!important",
                     borderRadius: "0px!important",
                     bgcolor:
                        theme.palette.mode === "light"
                           ? theme.palette.grey[300]
                           : theme.palette.background.paper,
                  }}
               >
                  <AccordionSummary sx={{ minHeight: "40px!important" }}>
                     <Typography
                        component="span"
                        variant="body2"
                        fontSize={12}
                        fontWeight={600}
                        textTransform={"uppercase"}
                     >
                        INFORMATION
                     </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: "background.paper" }}>
                     <Stack
                        spacing={1}
                        direction={"row"}
                        alignItems={"center"}
                        mb={1}
                        color={theme.palette.text.secondary}
                     >
                        <Icon
                           icon="solar:phone-rounded-bold-duotone"
                           size="small"
                        />
                        <Typography
                           variant="body2"
                           fontSize={13}
                           color="textSecondary"
                        >
                           {user.phoneNumber || "+8801784123456"}
                        </Typography>
                     </Stack>
                     <Stack
                        spacing={1}
                        direction={"row"}
                        alignItems={"center"}
                        color={theme.palette.text.secondary}
                     >
                        <Icon icon="solar:inbox-bold-duotone" size="small" />
                        <Typography
                           variant="body2"
                           fontSize={13}
                           color="textSecondary"
                        >
                           {user?.email || "najrul787@gmail.com"}
                        </Typography>
                     </Stack>
                  </AccordionDetails>
               </Accordion>

               <Accordion
                  sx={{
                     width: "100%",
                     m: "0px!important",
                     borderRadius: "0px!important",
                     bgcolor:
                        theme.palette.mode === "light"
                           ? theme.palette.grey[300]
                           : theme.palette.background.paper,
                  }}
               >
                  <AccordionSummary sx={{ minHeight: "40px!important" }}>
                     <Typography
                        component="span"
                        variant="body2"
                        fontSize={12}
                        fontWeight={600}
                        textTransform={"uppercase"}
                     >
                        ATTACHMENTS
                     </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: "background.paper" }}>
                     <Stack spacing={1}>
                        {user?.attachmentsDetailed?.map(
                           (file: any, idx: any) => {
                              return (
                                 <Stack direction={"row"} spacing={1} key={idx}>
                                    <Box
                                       sx={{
                                          width: 40,
                                          height: 40,
                                          borderRadius: 0.84,
                                          bgcolor: alpha(
                                             theme.palette.background.default,
                                             0.3,
                                          ),
                                          p: 1.2,
                                          position: "relative",
                                          overflow: "hidden",
                                          cursor: "pointer",
                                          "&:hover #overlay": {
                                             visibility: "visible",
                                             opacity: 1,
                                          },
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
                                             bgcolor: alpha(
                                                theme.palette.background
                                                   .default,
                                                0.1,
                                             ),
                                             zIndex: 1,
                                             flexShrink: 0,
                                             display: "flex",
                                             alignItems: "center",
                                             justifyContent: "center",
                                             visibility: "hidden",
                                             opacity: 0,
                                             transition:
                                                "visibility 0.3s, opacity 0.3s ease-in-out",
                                          }}
                                       >
                                          <Icon
                                             icon="eva:cloud-download-fill"
                                             size="small"
                                          />
                                       </Box>
                                       {file.type === "pdf" ? (
                                          <PdfIcon
                                             width="100%"
                                             height={"100%"}
                                          />
                                       ) : file.type === "doc" ? (
                                          <WordIcon
                                             width="100%"
                                             height={"100%"}
                                          />
                                       ) : file.type === "zip" ? (
                                          <ZipIcon
                                             width="100%"
                                             height={"100%"}
                                          />
                                       ) : file.type === "xls" ? (
                                          <ExcelIcon
                                             width="100%"
                                             height={"100%"}
                                          />
                                       ) : file.type === "ppt" ? (
                                          <PowerPointIcon
                                             width="100%"
                                             height={"100%"}
                                          />
                                       ) : file.type === "psd" ? (
                                          <PsdIcon
                                             width="100%"
                                             height={"100%"}
                                          />
                                       ) : file.type === "image" ? (
                                          <ImageIcon
                                             width="100%"
                                             height={"100%"}
                                          />
                                       ) : file.type === "video" ? (
                                          <VideoIcon
                                             width="100%"
                                             height={"100%"}
                                          />
                                       ) : file.type === "audio" ? (
                                          <AudioIcon
                                             width="100%"
                                             height={"100%"}
                                          />
                                       ) : file.type === "ai" ? (
                                          <AiIcon
                                             width="100%"
                                             height={"100%"}
                                          />
                                       ) : (
                                          <UnknownIcon
                                             width="100%"
                                             height={"100%"}
                                          />
                                       )}
                                       {/* <PdfIcon width="100%" height={"100%"} /> */}
                                    </Box>
                                    <Stack>
                                       <Typography
                                          variant="body1"
                                          fontSize={14}
                                       >
                                          {file.name}
                                       </Typography>
                                       <Typography
                                          variant="body2"
                                          fontSize={12}
                                          color="textSecondary"
                                       >
                                          {file.time}
                                       </Typography>
                                    </Stack>
                                 </Stack>
                              );
                           },
                        )}
                     </Stack>
                  </AccordionDetails>
               </Accordion>
            </Stack>
         </Stack>
      </Stack>
   );
};

export default Profile;
