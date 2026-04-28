"use client";
import { Stack } from "@mui/material";
import React from "react";
import Sidebar from "./Sidebar";
import Scrollbar from "react-browser-scrollbar";

const Layout = () => {
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
         <Stack
            flex={1}
            p={2}
            bgcolor={"background.default"}
            borderRadius={2}
         ></Stack>
      </Stack>
   );
};

export default Layout;
