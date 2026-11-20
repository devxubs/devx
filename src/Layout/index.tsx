"use client";
import React from "react";
import { Container, Stack } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { usePathname } from "next/navigation";
import { SnackbarProvider } from "@src/lib/snackbarContext";

const Layout = ({ children }: { children: React.ReactNode }) => {
   const pathname = usePathname();

   const isAuthPage = pathname?.startsWith("/auth");
   const isErrorPage = pathname === "/404";

   // P3-4 (audit G-5): the layout used to swap in a route skeleton on
   // EVERY navigation, driven by fixed 85% / 150 ms timers regardless
   // of real load state — a skeleton flash even for instant loads.
   // That timer-based flash is removed. The layout owns no genuine
   // loading state of its own; each page renders its own loading
   // visual (TableSkeleton / DataGrid overlay / page skeleton) for
   // the data it actually fetches.
   //
   // P3-2: the layout also hosts the central SnackbarProvider for
   // local CRUD action feedback (lib/snackbarContext) — distinct
   // from the Header's server-notification toasts.

   return (
      <SnackbarProvider>
         <Stack
            direction={isAuthPage ? "column" : "row"}
            height="100vh"
            overflow="hidden"
         >
            {isAuthPage || isErrorPage ? (
               children
            ) : (
               <>
                  <Sidebar />
                  <Stack
                     direction="column"
                     sx={{
                        flexGrow: 1,
                        height: "100vh",
                        overflow: "hidden",
                        position: "relative",
                     }}
                  >
                     <>
                        <Header />
                        <Stack
                           sx={{
                              flexGrow: 1,
                              overflowY: "auto",
                              overflowX: "hidden",
                              "&::-webkit-scrollbar": { display: "none" },
                              scrollbarWidth: "none",
                           }}
                        >
                           <Container
                              maxWidth="lg"
                              sx={{ py: 2, pr: "16px!important" }}
                           >
                              {children}
                           </Container>
                        </Stack>
                     </>
                  </Stack>
               </>
            )}
         </Stack>
      </SnackbarProvider>
   );
};

export default Layout;
