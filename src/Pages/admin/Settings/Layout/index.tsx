"use client";
import {
   Stack,
   useTheme,
   Typography,
   Box,
   useMediaQuery,
   Drawer,
} from "@mui/material";
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Icon from "@src/components/Icon";
import useQueryParams from "@src/handler/useQueryParams";
import SettingItem from "./SettingItem";
import Header from "./Header";
import CustomBox from "@src/components/CustomBox";

const Layout = () => {
   const theme = useTheme();
   const query = useQueryParams();
   const selectedTab = query.get("tab") || "profile";
   const isSmDown = useMediaQuery((theme: any) => theme.breakpoints.down("sm"));
   const isSm = useMediaQuery(theme.breakpoints.only("sm"));

   const [showSidebar, setShowSidebar] = useState(false);

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
         {/*//? Sidebar  */}
         {isSmDown ? (
            <Drawer open={showSidebar} onClose={() => setShowSidebar(false)}>
               <CustomBox
                  sx={{
                     width: 260,
                     height: "100%",
                     display: "flex",
                     flexDirection: "column",
                     justifyContent: "center",
                  }}
               >
                  <Stack
                     px={2}
                     direction={"column"}
                     justifyContent={"center"}
                     width={260}
                     sx={{
                        overflowY: "auto",
                        scrollbarWidth: "none!important",

                        "&::-webkit-scrollbar": {
                           display: "none!important",
                        },
                     }}
                  >
                     <Sidebar onItemClick={() => setShowSidebar(false)} />
                  </Stack>
               </CustomBox>
            </Drawer>
         ) : (
            <Stack
               py={2}
               pl={{ sm: 1, md: 2 }}
               pr={1}
               bgcolor={"background.default"}
               borderRadius={2}
               width={{
                  sm: 130,
                  md: 260,
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
         )}
         {/*//? Sidebar  */}

         <Stack flex={1} bgcolor={"background.default"} borderRadius={2}>
            {/*//? Header  */}
            <Header onShowSidebar={() => setShowSidebar(true)} />
            {/*//? Header  */}

            <Stack p={2} spacing={2} overflow={"auto"}>
               <Stack
                  direction={"row"}
                  alignItems={"center"}
                  spacing={2}
                  flexWrap={"wrap"}
               >
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
                  <Stack flex={1}>
                     <Typography
                        variant="h4"
                        fontSize={{ xs: "1.4rem", sm: "1.6rem" }}
                     >
                        {selectedTab.charAt(0).toUpperCase() +
                           selectedTab.slice(1)}{" "}
                        Settings
                     </Typography>
                     <Typography variant="body2" color="textSecondary">
                        Manage your{" "}
                        {selectedTab.charAt(0).toUpperCase() +
                           selectedTab.slice(1)}{" "}
                        information and preferences.
                     </Typography>
                  </Stack>
               </Stack>
               <Stack spacing={2}>
                  <SettingItem
                     title="Name"
                     description="Update your name and display name."
                  />
                  <SettingItem
                     title="Email"
                     description="Update your email address."
                  />
                  <SettingItem
                     title="Phone"
                     description="Update your phone number."
                  />
                  <SettingItem
                     title="Password"
                     description="Update your password."
                  />
               </Stack>
            </Stack>
         </Stack>
      </Stack>
   );
};

export default Layout;
