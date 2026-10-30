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
import { usePathname } from "next/navigation";
import {
   PageSkeleton,
   DashboardSkeleton,
   ProductSkeleton,
   OrderSkeleton,
   ReportSkeleton,
   ChatSkeleton,
   TableSkeleton,
} from "@src/components/SkeletonLoader";

const Layout = ({ children }: { children: React.ReactNode }) => {
   const pathname = usePathname();
   const theme = useTheme();

   const isAuthPage = pathname?.startsWith("/auth");
   const isErrorPage = pathname === "/404";

   const [loading, setLoading] = useState(false);
   const [progress, setProgress] = useState(0);

   useEffect(() => {
      let timer: NodeJS.Timer;
      if (loading) {
         timer = setInterval(() => {
            setProgress((old) => {
               if (old >= 95) return old;
               return old + Math.random() * 5;
            });
         }, 200);
      }
      return () => clearInterval(timer as any);
   }, [loading]);

   useEffect(() => {
      setLoading(true);
      setProgress(30);

      const t1 = setTimeout(() => setProgress(85), 60);
      const t2 = setTimeout(() => {
         setProgress(100);
         setTimeout(() => setLoading(false), 120);
      }, 150);

      return () => {
         clearTimeout(t1);
         clearTimeout(t2);
      };
   }, [pathname]);

   const renderPageSpecificSkeleton = () => {
      if (pathname?.includes("/admin/dashboard")) return <DashboardSkeleton />;
      if (pathname?.includes("/admin/product")) return <ProductSkeleton />;
      if (pathname?.includes("/admin/order") || pathname?.includes("/admin/purchase")) return <OrderSkeleton />;
      if (pathname?.includes("/admin/reports")) return <ReportSkeleton />;
      if (pathname?.includes("/admin/chat")) return <ChatSkeleton />;
      if (
         pathname?.includes("/admin/customers") ||
         pathname?.includes("/admin/suppliers") ||
         pathname?.includes("/admin/expense") ||
         pathname?.includes("/admin/assets") ||
         pathname?.includes("/admin/user") ||
         pathname?.includes("/admin/bin") ||
         pathname?.includes("/admin/categories") ||
         pathname?.includes("/admin/unit")
      ) {
         return <TableSkeleton rows={7} cols={6} />;
      }
      return <PageSkeleton />;
   };

   return (
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
                  {/* Top Progress Bar */}
                  {loading && (
                     <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                           position: "absolute",
                           top: 0,
                           left: 0,
                           width: "100%",
                           zIndex: 1400,
                           height: 3,
                           [`&.${linearProgressClasses.colorPrimary}`]: {
                              backgroundColor: "transparent",
                           },
                           [`& .${linearProgressClasses.bar}`]: {
                              backgroundColor: theme.palette.primary.main,
                           },
                        }}
                     />
                  )}

                  {/* Main Content with Page-Specific Skeleton */}
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
                           {loading ? renderPageSpecificSkeleton() : children}
                        </Container>
                     </Stack>
                  </>
               </Stack>
            </>
         )}
      </Stack>
   );
};

export default Layout;
