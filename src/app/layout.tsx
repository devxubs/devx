// src/app/layout.tsx
import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import ThemeProviderClient from "@src/theme/ThemeProviderClient";
import Layout from "@src/Layout";
import { Public_Sans } from "next/font/google";
import "./globals.css";

export const metadata = {
   title: "My App",
   description: "A working dark/light theme setup",
};

const Public_Sans_font = Public_Sans({
   subsets: ["latin"],
   variable: "--font-inter",
});

export default async function RootLayout({
   children,
   params,
}: {
   children: React.ReactNode;
   params: Promise<{ team: string }>;
}) {
   return (
      <html
         lang="en"
         suppressHydrationWarning
         className={Public_Sans_font.className}
      >
         <head>
            <link
               href="https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,100..900;1,100..900&display=swap"
               rel="stylesheet"
            />
         </head>
         <body suppressHydrationWarning className={Public_Sans_font.className}>
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
