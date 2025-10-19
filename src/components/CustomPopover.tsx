"use client";

import React from "react";
import {
   Popover,
   Box,
   Fade,
   Zoom,
   useTheme,
   alpha,
   PopoverOrigin,
   useMediaQuery,
   SxProps,
} from "@mui/material";

type ArrowPosition =
   | "top-left"
   | "top-center"
   | "top-right"
   | "bottom-left"
   | "bottom-center"
   | "bottom-right"
   | "left-top"
   | "left-center"
   | "left-bottom"
   | "right-top"
   | "right-center"
   | "right-bottom";

interface CustomPopoverProps {
   children?: React.ReactNode;
   anchorEl: HTMLElement | null;
   onClose?: () => void;
   transition?: boolean;
   anchorOrigin?: PopoverOrigin;
   transformOrigin?: PopoverOrigin;
   sx?: SxProps;
}

const getArrowPosition = (anchorOrigin: PopoverOrigin): ArrowPosition => {
   const { vertical, horizontal } = anchorOrigin;

   const key = `${vertical}-${horizontal}`;

   const map: Record<string, ArrowPosition> = {
      "top-left": "bottom-left",
      "top-center": "bottom-center",
      "top-right": "bottom-right",
      "bottom-left": "top-left",
      "bottom-center": "top-center",
      "bottom-right": "top-right",
      "left-top": "right-top",
      "left-center": "right-center",
      "left-bottom": "right-bottom",
      "right-top": "left-top",
      "right-center": "left-center",
      "right-bottom": "left-bottom",
   };

   return map[key] || "top-center";
};

const arrowStyles: Record<ArrowPosition, React.CSSProperties> = {
   "top-left": {
      top: 0,
      left: 14,
      transform: "translate(0, -50%) rotate(135deg)",
   },
   "top-center": {
      top: 0,
      left: "50%",
      rotate: "135deg",
      translate: "-50% -50%",
   },
   "top-right": { top: 0, right: 14, rotate: "135deg", translate: "0 -50%" },
   "bottom-left": { bottom: 0, left: 14, rotate: "-45deg", translate: "0 50%" },
   "bottom-center": {
      bottom: 0,
      left: "50%",
      rotate: "-45deg",
      translate: "-50% 50%",
   },
   "bottom-right": {
      bottom: 0,
      right: 14,
      rotate: "-45deg",
      translate: "0 50%",
   },
   "left-top": { top: 14, left: 0, rotate: "45deg", translate: "-50% 0" },
   "left-center": {
      top: "50%",
      left: 0,
      rotate: "45deg",
      translate: "-50% -50%",
   },
   "left-bottom": { bottom: 14, left: 0, rotate: "45deg", translate: "-50% 0" },
   "right-top": { top: 14, right: 0, rotate: "-135deg", translate: "50% 0" },
   "right-center": {
      top: "50%",
      right: 0,
      rotate: "-135deg",
      translate: "50% -50%",
   },
   "right-bottom": {
      bottom: 14,
      right: 0,
      rotate: "-135deg",
      translate: "50% 0",
   },
};

export default function CustomPopover({
   children,
   anchorEl,
   onClose,
   transition = true,
   anchorOrigin = { vertical: "bottom", horizontal: "left" },
   transformOrigin = { vertical: "top", horizontal: "left" },
   sx,
}: CustomPopoverProps) {
   const theme = useTheme();
   const open = Boolean(anchorEl);
   const arrow = getArrowPosition(anchorOrigin);

   return (
      <Popover
         open={open}
         anchorEl={anchorEl}
         onClose={onClose}
         anchorOrigin={anchorOrigin}
         transformOrigin={transformOrigin}
         TransitionComponent={transition ? Zoom : undefined}
         PaperProps={{
            sx: {
               position: "relative", // allow arrow to position correctly
               overflow: "visible", // allow arrow to be visible outside
               backdropFilter: "blur(20px)",
               backgroundColor: alpha(theme.palette.background.default, 0.9),
               borderRadius: 1,
               boxShadow: theme.shadows[8],
               backgroundImage: `...`,
               backgroundRepeat: "no-repeat",
               backgroundSize: "50%, 50%",
               backgroundPosition: "right top, left bottom",
               width: "fit-content",
            },
         }}
      >
         {/* Arrow */}
         <Box
            sx={{
               width: 14,
               height: 14,
               position: "absolute",
               borderBottomLeftRadius: "3.5px",
               clipPath: "polygon(0% 0%, 100% 100%, 0% 100%)",
               zIndex: 1,
               backgroundColor: theme.palette.background.paper,
               border: "1px solid",
               borderColor:
                  theme.palette.mode === "dark"
                     ? "rgba(0,0,0,0.12)"
                     : "rgba(125,125,125,0.12)",
               ...arrowStyles[arrow],
            }}
         />
         <Box
            sx={{
               position: "relative", // ✅ Required for arrow positioning
               overflow: "visible",
               backdropFilter: "blur(20px)",
               backgroundColor: alpha(theme.palette.background.default, 0.9),
               borderRadius: 1,
               boxShadow: theme.shadows[8],
               backgroundImage: `
            url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9yYWRpYWxfNDQ2NF81NTMzOCkiIGZpbGwtb3BhY2l0eT0iMC4xIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfNDQ2NF81NTMzOCIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgxMjAgMS44MTgxMmUtMDUpIHJvdGF0ZSgtNDUpIHNjYWxlKDEyMy4yNSkiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMDBCOEQ5Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwQjhEOSIgc3RvcC1vcGFjaXR5PSIwIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+"),
            url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9yYWRpYWxfNDQ2NF81NTMzNykiIGZpbGwtb3BhY2l0eT0iMC4xIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfNDQ2NF81NTMzNyIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEyMCkgcm90YXRlKDEzNSkgc2NhbGUoMTIzLjI1KSI+CjxzdG9wIHN0b3AtY29sb3I9IiNGRjU2MzAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkY1NjMwIiBzdG9wLW9wYWNpdHk9IjAiLz4KPC9yYWRpYWxHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4=");`,
               backgroundRepeat: "no-repeat",
               backgroundSize: "50%, 50%",
               backgroundPosition: "right top, left bottom",
            }}
         >
            <Box p={1} sx={{ ...sx }}>
               {children}
            </Box>
         </Box>
      </Popover>
   );
}
