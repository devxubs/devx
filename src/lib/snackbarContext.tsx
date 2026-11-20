"use client";

// Central CRUD feedback (Phase D, P3-2 / audit G-4).
//
// Before this, at least eight pages (Assets, Billing, Bin, Customers,
// Order, Suppliers, User, Settings) each re-implemented a local
// Snackbar + Alert with drifting anchors/durations, and several
// pages (Categories, Product, Unit, Roles) gave mutation feedback
// not at all. This provider is the single implementation for LOCAL
// action feedback (save / delete / restore confirmations and
// errors). It is deliberately distinct from the server-notification
// toast system in Layout/Header (NotificationToast), which surfaces
// pushed notifications — the two never share state.
//
// Shape follows the settingsContext precedent (lib/settingsContext):
// a typed context with a safe no-op default, a provider component,
// and a hook. Anchor/duration match the most common of the previous
// local implementations: bottom-center, 4000 ms.

import React, { createContext, useCallback, useContext, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

export type SnackbarSeverity = "success" | "error" | "warning" | "info";

interface SnackbarContextType {
   showSnackbar: (message: string, severity?: SnackbarSeverity) => void;
}

const SnackbarContext = createContext<SnackbarContextType>({
   showSnackbar: () => {},
});

export const SnackbarProvider = ({
   children,
}: {
   children: React.ReactNode;
}) => {
   const [state, setState] = useState<{
      open: boolean;
      message: string;
      severity: SnackbarSeverity;
      // Incremented per call so a repeated identical message still
      // re-opens the snackbar and restarts the auto-hide timer.
      nonce: number;
   }>({ open: false, message: "", severity: "success", nonce: 0 });

   const showSnackbar = useCallback(
      (message: string, severity: SnackbarSeverity = "success") => {
         setState((prev) => ({
            open: true,
            message,
            severity,
            nonce: prev.nonce + 1,
         }));
      },
      [],
   );

   const handleClose = useCallback(() => {
      setState((prev) => ({ ...prev, open: false }));
   }, []);

   return (
      <SnackbarContext.Provider value={{ showSnackbar }}>
         {children}
         <Snackbar
            key={state.nonce}
            open={state.open}
            autoHideDuration={4000}
            onClose={handleClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
         >
            <Alert
               severity={state.severity}
               onClose={handleClose}
               sx={{ width: "100%" }}
            >
               {state.message}
            </Alert>
         </Snackbar>
      </SnackbarContext.Provider>
   );
};

export const useSnackbar = () => useContext(SnackbarContext);
