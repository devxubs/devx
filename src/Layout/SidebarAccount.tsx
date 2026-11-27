"use client";

// Sidebar account section + popup — replaces the old Header
// profile drawer (Header/Profile.tsx) and the placeholder header
// user popover. The section is pinned to the bottom of the
// sidebar (outside the scrolling nav), and the popup opens
// upward from it with a short fade + rise + scale animation.
//
// Only actions that already exist in the app are offered:
//   - Personalization → the header appearance drawer, via the
//     same "devx:open-appearance" window event the Settings
//     Appearance tab uses (Phase 2, 2.11).
//   - Settings → the full-screen Settings modal, via the
//     "devx:open-settings" event (Layout/SettingsModal). Shown
//     only when the signed-in user holds the settings
//     permission (the rule the old sidebar Settings nav item
//     used before it was removed).
//   - Log out → POST /api/auth/logout, then /auth (the exact
//     handler the old profile drawer used).
// There is no upgrade/Plus plan and no help destination in the
// app, so those reference items are intentionally absent. The
// popup header carries the profile identity (avatar, name,
// email, role) the old drawer displayed — the app has no
// dedicated profile route.

import React, { useEffect, useRef, useState } from "react";
import {
   Box,
   ButtonBase,
   Chip,
   ClickAwayListener,
   Divider,
   Popper,
   Stack,
   Tooltip,
   Typography,
   keyframes,
} from "@mui/material";
import AnimatedAvatar from "@src/components/AnimateAvatar";
import CustomBox from "@src/components/CustomBox";
import Icon from "@src/components/Icon";

// Opening: fade in while rising slightly and scaling up from
// the account section (transform origin bottom-left, where the
// popup is anchored). Closing reverses it, shorter. The
// animation runs on an inner wrapper — the Popper positions the
// outer element with its own transform, which an animation on
// the same element would fight.
const popupIn = keyframes`
   from { opacity: 0; transform: translateY(6px) scale(0.97); }
   to { opacity: 1; transform: translateY(0) scale(1); }
`;
const popupOut = keyframes`
   from { opacity: 1; transform: translateY(0) scale(1); }
   to { opacity: 0; transform: translateY(4px) scale(0.98); }
`;
const CLOSE_MS = 130;

interface SidebarAccountProps {
   user: any;
   layout: boolean; // true = expanded sidebar
   canSeeSettings: boolean;
   onNavigate?: () => void; // closes the mobile drawer after an action
}

export default function SidebarAccount({
   user,
   layout,
   canSeeSettings,
   onNavigate,
}: SidebarAccountProps) {
   const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
   const [popState, setPopState] = useState<"closed" | "open" | "closing">("closed");
   const buttonRef = useRef<HTMLButtonElement>(null);
   const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
   const open = popState !== "closed";

   const name = user?.name || "User";
   const email = user?.email || "";
   const role =
      typeof user?.role === "object"
         ? user?.role?.name || "Staff"
         : user?.role || "Staff";

   // Close with the exit animation, then unmount. Actions that
   // follow a menu click fire immediately — the fade completes
   // underneath whatever they open.
   const requestClose = () => {
      setPopState((prev) => {
         if (prev !== "open") return prev;
         if (closeTimer.current) clearTimeout(closeTimer.current);
         closeTimer.current = setTimeout(() => {
            setAnchorEl(null);
            setPopState("closed");
         }, CLOSE_MS);
         return "closing";
      });
   };

   useEffect(() => {
      return () => {
         if (closeTimer.current) clearTimeout(closeTimer.current);
      };
   }, []);

   // Escape closes the popup and returns focus to the section.
   useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
         if (e.key === "Escape") {
            requestClose();
            buttonRef.current?.focus();
         }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [open ]);

   const handleLogout = async () => {
      try {
         await fetch("/api/auth/logout", { method: "POST" });
      } catch {}
      window.location.href = "/auth";
   };

   const itemSx = {
      width: "100%",
      justifyContent: "flex-start",
      gap: 1.5,
      px: 2,
      py: 1.1,
      borderRadius: 1.5,
      "&:hover": { bgcolor: "action.hover" },
   } as const;

   const popup = (
      <Popper
         open={open}
         anchorEl={anchorEl}
         placement="top-start"
         modifiers={[
            { name: "offset", options: { offset: [0, 8] } },
            { name: "preventOverflow", options: { padding: 8 } },
         ]}
         sx={{ zIndex: 1400 }}
      >
         <ClickAwayListener onClickAway={requestClose}>
            <Box
               sx={{
                  transformOrigin: "bottom left",
                  animation: `${popState === "closing" ? popupOut : popupIn} ${popState === "closing" ? CLOSE_MS : 170}ms ease-out both`,
               }}
            >
               <CustomBox
                  sx={{
                     width: 264,
                     borderRadius: 1,
                     py: 1,
                  }}
               >
                  {/* Profile identity */}
                  <Stack direction="row" spacing={1.5} alignItems="center" px={2} py={1.5}>
                     <AnimatedAvatar size="small" alt={name} />
                     <Box minWidth={0}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                           {name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                           {email}
                        </Typography>
                        <Chip
                           label={role}
                           size="small"
                           variant="outlined"
                           sx={{ height: 20, mt: 0.5, fontSize: 11 }}
                        />
                     </Box>
                  </Stack>

                  <Divider sx={{ my: 1 }} />

                  <Stack px={1} spacing={0.25}>
                     <ButtonBase
                        sx={itemSx}
                        onClick={() => {
                           requestClose();
                           window.dispatchEvent(new Event("devx:open-appearance"));
                           onNavigate?.();
                        }}
                     >
                        <Icon icon="solar:palette-bold-duotone" size="small" />
                        <Typography variant="body2">Personalization</Typography>
                     </ButtonBase>
                     {canSeeSettings && (
                        <ButtonBase
                           sx={itemSx}
                           onClick={() => {
                              requestClose();
                              window.dispatchEvent(new Event("devx:open-settings"));
                              onNavigate?.();
                           }}
                        >
                           <Icon icon="solar:settings-bold-duotone" size="small" />
                           <Typography variant="body2">Settings</Typography>
                        </ButtonBase>
                     )}
                  </Stack>

                  <Divider sx={{ my: 1 }} />

                  <Stack px={1}>
                     <ButtonBase
                        sx={{ ...itemSx, color: "error.main" }}
                        onClick={handleLogout}
                     >
                        <Icon icon="solar:logout-2-bold-duotone" size="small" />
                        <Typography variant="body2">Log out</Typography>
                     </ButtonBase>
                  </Stack>
               </CustomBox>
            </Box>
         </ClickAwayListener>
      </Popper>
   );

   const section = (
      <ButtonBase
         ref={buttonRef}
         onClick={(e) => {
            if (open) {
               requestClose();
            } else {
               setAnchorEl(e.currentTarget);
               setPopState("open");
            }
         }}
         aria-haspopup="true"
         aria-expanded={open}
         aria-label="Account menu"
         sx={{
            width: "100%",
            borderRadius: 1,
            justifyContent: layout ? "flex-start" : "center",
            gap: 1.5,
            p: 1,
            "&:hover": { bgcolor: "action.hover" },
         }}
      >
         <AnimatedAvatar size="small" alt={name} />
         {layout && (
            <>
               <Box minWidth={0} flex={1} textAlign="left">
                  <Typography variant="subtitle2" fontWeight={600} noWrap>
                     {name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                     {role}
                  </Typography>
               </Box>
               <Icon icon="eva:arrow-ios-upward-fill" size="small" />
            </>
         )}
      </ButtonBase>
   );

   return (
      <Box
         sx={{
            borderTop: 1,
            borderColor: "divider",
            px: layout ? 1 : 0.5,
            py: 1,
         }}
      >
         {layout ? (
            section
         ) : (
            <Tooltip title={name} placement="right" disableInteractive>
               {section}
            </Tooltip>
         )}
         {popup}
      </Box>
   );
}
