"use client";
import { Stack } from "@mui/material";
import React from "react";
import Sidebar from "./Sidebar";

const Layout = () => {
   return (
      <Stack
         spacing={2}
         px={1}
         py={2}
         direction={"row"}
         bgcolor={"background.paper"}
         height={"100%"}
         flex={1}
         borderRadius={2}
      >
         <Stack
            py={2}
            bgcolor={"background.default"}
            borderRadius={2}
            width={260}
         >
            <Sidebar />
         </Stack>
         <Stack flex={1}>content</Stack>
      </Stack>
   );
};

export default Layout;
