"use client";
import React, { useState, useEffect } from "react";
import {
  Container,
  Stack,
  LinearProgress,
  linearProgressClasses,
  useTheme,
} from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { usePathname, useSearchParams } from "next/navigation";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = useTheme();

  const isAuthPage = pathname?.startsWith("/auth");
  const isErrorPage = pathname === "/404";

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // --- Smooth progress animation
  useEffect(() => {
    let timer: NodeJS.Timer;
    if (loading) {
      timer = setInterval(() => {
        setProgress((old) => {
          if (old >= 95) return old; // stop near 100 until page load finishes
          return old + Math.random() * 5;
        });
      }, 200);
    }
    return () => clearInterval(timer as any);
  }, [loading]);

  // --- Trigger loading on route/query change
  useEffect(() => {
    setLoading(true);
    setProgress(0);

    // Simulate load or wait for actual data
    const timer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setLoading(false), 200); // small delay to show 100%
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname, searchParams?.toString()]);

  return (
    <Stack
      direction={isAuthPage ? "column" : "row"}
      sx={{
        height: "100vh",
        width: "100%",
        backgroundColor: "background.default",
        overflow: "hidden",
      }}
    >
      {/* Top linear progress */}
      {loading && (
        <LinearProgress
          variant="determinate"
          value={progress}
          color="primary"
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: 4, // slim top bar
            zIndex: 9999,
            [`&.${linearProgressClasses.colorPrimary}`]: {
              backgroundColor: "#ffffff00",
            },
          }}
        />
      )}

      {isAuthPage || isErrorPage ? (
        children
      ) : (
        <>
          <Sidebar />
          <Stack sx={{ flexGrow: 1, flex: 1, minWidth: 0 }}>
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
              <Container maxWidth="lg" sx={{ py: 2, pr: "16px!important" }}>
                {children}
              </Container>
            </Stack>
          </Stack>
        </>
      )}
    </Stack>
  );
};

export default Layout;
