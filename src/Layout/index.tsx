"use client";
import React from "react";
import Scrollbar from "react-browser-scrollbar";

import { Box, Container, Stack } from "@mui/material";
import Sidebar from "./Sidebar";
import { usePathname } from "next/navigation";
import Header from "./Header";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <Stack
      direction={pathname === "/auth" ? "column" : "row"}
      sx={{
        height: "100vh",
        width: "100%",
        backgroundColor: "background.default",
      }}
    >
      {pathname === "/auth" || pathname === "/404" ? (
        children
      ) : (
        <>
          <Sidebar />
          <Stack sx={{ width: "100%", position: "relative", flexGrow: 1 }}>
            <Scrollbar autoHide darkMode thumbSize={6}>
              <Header />
              <Container maxWidth="lg">{children}</Container>
            </Scrollbar>
          </Stack>
        </>
      )}
    </Stack>
  );
};

export default Layout;
