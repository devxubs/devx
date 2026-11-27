"use client";

import { ThemeProvider, CssBaseline } from "@mui/material";
import React, { useEffect, useState } from "react";
import { buildAppTheme } from "@src/theme";
import { resolveFontStack } from "@src/lib/appearance";
import useGlobalState from "@src/handler/globalState";
import { SettingsProvider } from "@src/lib/settingsContext";
import { PrintProvider } from "@src/components/TablePrintDocument/PrintPortal";

export default function ThemeProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const globalState = useGlobalState();
  const themeState: string = globalState.get("theme"); // light | dark | system
  const colorState = globalState.get("color");
  const fontState: string = globalState.get("font");

  // Mount-only hydration from localStorage by design (the same
  // pattern as the Settings Sidebar ?tab= effect): the bucket
  // object identity changes on every state update, so depending
  // on it would re-run hydration repeatedly.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup Phase 3: "system" mode follows the device colour
  // scheme and tracks it live while the app is open.
  const [systemDark, setSystemDark] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setSystemDark(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const resolvedMode: "light" | "dark" =
    themeState === "system"
      ? systemDark
        ? "dark"
        : "light"
      : themeState === "light"
        ? "light"
        : "dark";

  // Cleanup Phase 3: the MUI theme carries the font stack for
  // themed components, but the document body's own font comes
  // from the next/font class on <body> (layout.tsx), which
  // outranks CssBaseline. Mirror the resolved stack onto the
  // body as an inline style so the choice is genuinely
  // app-wide (inherited text, inputs and placeholders included).
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.fontFamily = resolveFontStack(fontState);
    }
  }, [fontState]);

  const theme = buildAppTheme(resolvedMode, colorState as any, fontState);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SettingsProvider>
        <PrintProvider>{children}</PrintProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
