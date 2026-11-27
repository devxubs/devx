"use client";

// Full-screen Settings modal — opened from the sidebar account
// popup ("devx:open-settings" window event, the same pattern
// the appearance drawer uses). It renders the EXISTING Settings
// layout in embedded mode inside the shared CustomModal's
// full-screen variant: same tabs, same form state machinery,
// same save/discard/permissions — only the presentation shell
// differs from the /admin/settings page (which keeps working
// unchanged for direct links, e.g. from the header search).
//
// The settings tree is loaded lazily (next/dynamic) so it costs
// nothing until the modal is first opened. The layout mounts
// only while the modal is open; it reads and writes through the
// app-wide SettingsProvider, so there is no second settings
// fetch and no duplicated server state.

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import CustomModal from "@src/components/Modal";

const SettingsLayout = dynamic(
   () => import("@src/Pages/admin/Settings/Layout"),
   { ssr: false },
);

export default function SettingsModal() {
   const [open, setOpen] = useState(false);
   // The embedded layout registers its own close handler (it
   // owns the dirty state): Escape and any other shell-level
   // close request run through it, so a dirty form gets the
   // discard confirmation before the modal closes.
   const closeHandlerRef = useRef<() => void>(() => setOpen(false));

   useEffect(() => {
      const openModal = () => setOpen(true);
      window.addEventListener("devx:open-settings", openModal);
      return () => window.removeEventListener("devx:open-settings", openModal);
   }, []);

   return (
      <CustomModal
         open={open}
         onClose={() => closeHandlerRef.current()}
         fullScreen
         hideBackdrop
      >
         {open && (
            <SettingsLayout
               embedded
               onClose={() => setOpen(false)}
               registerCloseHandler={(fn) => {
                  closeHandlerRef.current = fn;
               }}
            />
         )}
      </CustomModal>
   );
}
