// src/app/layout.tsx
import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import ThemeProviderClient from "@src/theme/ThemeProviderClient";
import localFont from "next/font/local";
import "./globals.css";

export const metadata = {
   title: "DevX POS",
   description: "Point of Sale & Business Management System",
};

const fontInter = localFont({
   src: [
      {
         path: "./fonts/Inter-Regular.ttf",
         weight: "400",
         style: "normal",
      },
      {
         path: "./fonts/Inter-Medium.ttf",
         weight: "500",
         style: "normal",
      },
      {
         path: "./fonts/Inter-SemiBold.ttf",
         weight: "600",
         style: "normal",
      },
      {
         path: "./fonts/Inter-Bold.ttf",
         weight: "700",
         style: "normal",
      },
   ],
   variable: "--font-inter",
   display: "swap",
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
         className={`${fontInter.variable} ${fontInter.className}`}
      >
         <body suppressHydrationWarning className={fontInter.className}>
            <InitColorSchemeScript attribute="class" />
            <AppRouterCacheProvider options={{ enableCssLayer: true }}>
               <ThemeProviderClient>{children}</ThemeProviderClient>
            </AppRouterCacheProvider>
         </body>
      </html>
   );
}
