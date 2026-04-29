"use client";
import {
   Stack,
   TextField,
   Button,
   keyframes,
   useTheme,
   Typography,
   Box,
} from "@mui/material";
import React from "react";
import Sidebar from "./Sidebar";
import Icon from "@src/components/Icon";

const Layout = () => {
   const theme = useTheme();
   const rotate = keyframes`
      0% {
         transform: translateX(-5px) rotate(0deg);
      }

      25% {
         transform: translateX(0px) rotate(90deg);
      }

      50% {
         transform: translateX(5px) rotate(180deg);
      }

      65% {
         transform: translateX(5px) rotate(200deg);
      }

      75% {
         transform: translateX(5px) rotate(180deg);
      }

      100% {
         transform: translateX(-5px) rotate(360deg);
      }
      `;
   return (
      <Stack
         spacing={1}
         px={1}
         py={1}
         direction={"row"}
         bgcolor={"background.paper"}
         flex={1}
         borderRadius={2}
         height={"calc(100vh - 64px - 44px)"}
      >
         <Stack
            py={2}
            pl={2}
            pr={1}
            bgcolor={"background.default"}
            borderRadius={2}
            width={{
               xs: 100,
               sm: 260,
            }}
            height={"100%"}
            sx={{
               overflowY: "auto",
               scrollbarWidth: "none!important",

               "&::-webkit-scrollbar": {
                  display: "none!important",
               },
            }}
         >
            <Sidebar />
         </Stack>
         <Stack flex={1} bgcolor={"background.default"} borderRadius={2}>
            <Stack
               px={2}
               height={65}
               borderBottom={1}
               borderColor={"divider"}
               direction={"row"}
               alignItems={"center"}
               justifyContent={"space-between"}
            >
               <TextField
                  variant="outlined"
                  size="small"
                  placeholder="Search..."
                  sx={{
                     width: 300,
                  }}
               />
               <Button
                  variant="contained"
                  startIcon={<Icon icon="solar:settings-bold-duotone" />}
                  sx={{
                     "& svg": {
                        color: theme.palette.common.white + "!important",
                        animation: `${rotate} 4s linear infinite`, // ?  Rotate when changing.
                     },
                  }}
               >
                  Save Changes
               </Button>
            </Stack>
            <Stack p={2} spacing={2}>
               <Stack direction={"row"} alignItems={"center"} spacing={2}>
                  <Box
                     sx={{
                        width: 50,
                        height: 50,
                        borderRadius: 1,
                        bgcolor: "primary.main",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                     }}
                  >
                     <Icon
                        icon="solar:settings-bold"
                        size="large"
                        style={{
                           color: theme.palette.common.white,
                        }}
                     />
                  </Box>
                  <Stack>
                     <Typography variant="h4">General Settings</Typography>
                     <Typography variant="body2" color="textSecondary">
                        Manage your store settings and preferences.
                     </Typography>
                  </Stack>
               </Stack>
               <Stack></Stack>
            </Stack>
         </Stack>
      </Stack>
   );
};

export default Layout;
