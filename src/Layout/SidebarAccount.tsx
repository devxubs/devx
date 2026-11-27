"use client";

// Sidebar account section + popup — replaces the old Header
// profile drawer (Header/Profile.tsx) and the placeholder header
// user popover. The section is pinned to the bottom of the
// sidebar (outside the scrolling nav), and the popup opens
// upward from it.
//
// Only actions that already exist in the app are offered:
//   - Personalization → the header appearance drawer, via the
//     same "devx:open-appearance" window event the Settings
//     Appearance tab uses (Phase 2, 2.11).
//   - Settings → /admin/settings, shown only when the signed-in
//     user can see the Settings nav entry (same permission
//     filter as the sidebar itself).
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
} from "@mui/material";
import { useRouter } from "next/navigation";
import AnimatedAvatar from "@src/components/AnimateAvatar";
import CustomBox from "@src/components/CustomBox";
import Icon from "@src/components/Icon";

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
   const router = useRouter();
   const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
   const buttonRef = useRef<HTMLButtonElement>(null);
   const open = Boolean(anchorEl);

   const name = user?.name || "User";
   const email = user?.email || "";
   const role =
      typeof user?.role === "object"
         ? user?.role?.name || "Staff"
         : user?.role || "Staff";

   const close = () => setAnchorEl(null);

   // Escape closes the popup and returns focus to the section.
   useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
         if (e.key === "Escape") {
            close();
            buttonRef.current?.focus();
         }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
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
         <ClickAwayListener onClickAway={close}>
            <CustomBox
               sx={{
                  width: 264,
                  borderRadius: 2.5,
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
                        close();
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
                           close();
                           router.push("/admin/settings");
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
         </ClickAwayListener>
      </Popper>
   );

   const section = (
      <ButtonBase
         ref={buttonRef}
         onClick={(e) => setAnchorEl(open ? null : e.currentTarget)}
         aria-haspopup="true"
         aria-expanded={open}
         aria-label="Account menu"
         sx={{
            width: "100%",
            borderRadius: 2,
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
