import * as React from "react";
import { Stack, SxProps } from "@mui/material";
import { Box, Typography, Fade, IconButton, Tooltip } from "@mui/material";
import Modal, { ModalProps } from "@mui/material/Modal";
import Icon from "./Icon";

// Phase 2 (2.12): shared modal size tokens. Callers used to hand-write
// the same responsive widths at every call site ({ xs: "95%", sm:
// "90%", md: 950 } and friends). `size` supplies the standard width;
// an explicit `sx.width` from the caller still wins (sx is spread
// after the token), so existing modals are unaffected unless they opt
// in. Omitting `size` keeps the previous behaviour exactly.
export type CustomModalSize = "sm" | "md" | "lg";

const sizeWidths: Record<CustomModalSize, any> = {
   sm: { xs: "95%", sm: 440 },
   md: { xs: "95%", sm: "90%", md: 640 },
   lg: { xs: "95%", sm: "90%", md: 950 },
};

interface CustomModalProps extends Omit<
   ModalProps,
   "open" | "onClose" | "children"
> {
   open: boolean;
   onClose: () => void;
   children?: React.ReactNode;
   sx?: SxProps;
   title?: string;
   closeIcon?: boolean;
   size?: CustomModalSize;
   // Full-screen variant: the surface covers the whole viewport
   // (no centering, no radius, no padding) — used by the
   // full-screen Settings modal. Size/title behaviour unchanged
   // for every existing caller.
   fullScreen?: boolean;
}

export default function CustomModal({
   open,
   onClose,
   children,
   sx,
   title,
   closeIcon = false,
   size,
   fullScreen = false,
   ...rest
}: CustomModalProps) {
   return (
      <Modal
         {...rest}
         open={open}
         onClose={onClose}
         closeAfterTransition
         // BackdropComponent={Backdrop}
         BackdropProps={{
            timeout: 300, // backdrop fade animation time
         }}
      >
         <Fade in={open} timeout={300}>
            <Box
               sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  bgcolor: "background.paper",
                  boxShadow: 24,
                  p: 2,
                  px: {
                     xs: 2,
                     sm: 3,
                  },
                  borderRadius: 2,
                  ...(size ? { width: sizeWidths[size] } : {}),
                  ...(fullScreen
                     ? {
                          top: 0,
                          left: 0,
                          transform: "none",
                          width: "100%",
                          height: "100%",
                          borderRadius: 0,
                          p: 0,
                          px: 0,
                          display: "flex",
                          flexDirection: "column",
                       }
                     : {}),
                  ...sx,
               }}
            >
               {(title || closeIcon) && (
                  <Stack
                     direction="row"
                     justifyContent={title ? "space-between" : "flex-end"}
                     alignItems="center"
                     mb={2}
                     px={{ xs: 2, sm: 0 }}
                  >
                     {title && (
                        <Typography fontSize={22} fontWeight={600}>
                           {title}
                        </Typography>
                     )}
                     {closeIcon && (
                        <Tooltip title="Close" disableInteractive>
                           <IconButton onClick={onClose} aria-label="Close">
                              <Icon icon="eva:close-fill"></Icon>
                           </IconButton>
                        </Tooltip>
                     )}
                  </Stack>
               )}
               {children}
            </Box>
         </Fade>
      </Modal>
   );
}
