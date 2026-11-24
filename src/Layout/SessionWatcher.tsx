"use client";

import React, { useEffect, useRef } from "react";
import { useSnackbar } from "@src/lib/snackbarContext";
import { usePathname } from "next/navigation";

export default function SessionWatcher() {
   const { showSnackbar } = useSnackbar();
   const pathname = usePathname();
   const isAuthPage = pathname?.startsWith("/auth");
   const redirectingRef = useRef(false);

   const handleAccountBlocked = React.useCallback(
      (type: "suspended" | "inactive") => {
         if (redirectingRef.current) return;
         redirectingRef.current = true;
         const message =
            type === "suspended"
               ? "Your account has been suspended. Please contact administrator."
               : "Your account is inactive. Please contact administrator.";
         try {
            sessionStorage.setItem("auth_suspended_toast", message);
         } catch {}
         showSnackbar(message, "error");
         setTimeout(() => {
            window.location.href = `/auth?error=${type}`;
         }, 500);
      },
      [showSnackbar],
   );

   useEffect(() => {
      if (isAuthPage) return;

      const checkSession = async () => {
         try {
            const res = await fetch("/api/auth/me");
            if (res.status === 403) {
               const data = await res.json().catch(() => ({}));
               if (
                  data.code === "ACCOUNT_SUSPENDED" ||
                  data.status === "SUSPENDED" ||
                  String(data.error || "").toLowerCase().includes("suspended")
               ) {
                  handleAccountBlocked("suspended");
               } else if (
                  data.code === "ACCOUNT_INACTIVE" ||
                  data.status === "INACTIVE" ||
                  String(data.error || "").toLowerCase().includes("inactive")
               ) {
                  handleAccountBlocked("inactive");
               }
            }
         } catch {}
      };

      // Check on initial load
      checkSession();

      // Periodic verification (every 15s)
      const interval = setInterval(checkSession, 15000);

      // Check on window focus and visibility change
      const handleVisibility = () => {
         if (document.visibilityState === "visible") {
            checkSession();
         }
      };
      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("focus", checkSession);

      // Intercept fetch responses to catch any 403 suspension or inactive state immediately
      const origFetch = window.fetch;
      window.fetch = async (...args) => {
         const response = await origFetch(...args);
         if (response.status === 403) {
            try {
               const clone = response.clone();
               clone
                  .json()
                  .then((d) => {
                     if (
                        d?.code === "ACCOUNT_SUSPENDED" ||
                        d?.status === "SUSPENDED" ||
                        String(d?.error || "").toLowerCase().includes("suspended")
                     ) {
                        handleAccountBlocked("suspended");
                     } else if (
                        d?.code === "ACCOUNT_INACTIVE" ||
                        d?.status === "INACTIVE" ||
                        String(d?.error || "").toLowerCase().includes("inactive")
                     ) {
                        handleAccountBlocked("inactive");
                     }
                  })
                  .catch(() => {});
            } catch {}
         }
         return response;
      };

      return () => {
         clearInterval(interval);
         document.removeEventListener("visibilitychange", handleVisibility);
         window.removeEventListener("focus", checkSession);
         window.fetch = origFetch;
      };
   }, [isAuthPage, handleAccountBlocked]);

   return null;
}
