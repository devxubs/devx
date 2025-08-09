// src/app/layout.tsx
import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import ThemeProviderClient from "@src/theme/ThemeProviderClient";
import Layout from "@src/Layout";

export const metadata = {
  title: "My App",
  description: "A working dark/light theme setup",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      <body suppressHydrationWarning>
        <InitColorSchemeScript attribute="class" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProviderClient>
            <Layout>{children}</Layout>
          </ThemeProviderClient>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
