// src/app/layout.tsx
import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import ThemeProviderClient from "@src/theme/ThemeProviderClient";
import { Public_Sans } from "next/font/google";
import "./globals.css";

export const metadata = {
   title: "DevX POS",
   description: "Point of Sale & Business Management System",
};

const Public_Sans_font = Public_Sans({
   subsets: ["latin"],
   variable: "--font-inter",
});

export default function RootLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <html
         lang="en"
         suppressHydrationWarning
         className={Public_Sans_font.className}
      >
         <body suppressHydrationWarning className={Public_Sans_font.className}>
            <InitColorSchemeScript attribute="class" />
            <AppRouterCacheProvider options={{ enableCssLayer: true }}>
               <ThemeProviderClient>{children}</ThemeProviderClient>
            </AppRouterCacheProvider>
         </body>
      </html>
   );
}
