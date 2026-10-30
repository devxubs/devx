"use client";

import { ThemeProvider, CssBaseline } from "@mui/material";
import React, { useEffect } from "react";
import { buildAppTheme } from "@src/theme";
import useGlobalState from "@src/handler/globalState";
import { SettingsProvider } from "@src/lib/settingsContext";
import { PrintProvider } from "@src/components/TablePrintDocument/PrintPortal";

export default function ThemeProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const globalState = useGlobalState();
  const themeState: string = globalState.get("theme"); // light | dark
  const colorState = globalState.get("color");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const customize = localStorage.getItem("customize");
      if (customize) {
        try {
          const parsed = JSON.parse(customize);
          if (parsed && typeof parsed === "object") {
            globalState.setState(parsed);
          }
        } catch {
          // ignore corrupted JSON in localStorage
        }
      }
    }
  }, []);

  const theme = buildAppTheme(themeState as any, colorState as any);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SettingsProvider>
        <PrintProvider>{children}</PrintProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
