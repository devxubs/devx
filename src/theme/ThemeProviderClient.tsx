"use client";

import { ThemeProvider, CssBaseline } from "@mui/material";
import React, { useEffect } from "react";
import { buildAppTheme } from "@src/theme";
import useGlobalState from "@src/handler/globalState";

export default function ThemeProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const globalState = useGlobalState();
  const themeState: string = globalState.get("theme"); // light | dark
  const colorState = globalState.get("color");

  useEffect(() => {
    if (typeof window !== undefined) {
      const customize = localStorage.getItem("customize");
      globalState.setState(JSON.parse(customize as any));
    }
  }, []);

  const theme = buildAppTheme(themeState as any, colorState as any);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
