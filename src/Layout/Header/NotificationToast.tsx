"use client";
import {
   Alert,
   alpha,
   Box,
   keyframes,
   Slide,
   Snackbar,
   Stack,
   Typography,
   type SlideProps,
} from "@mui/material";
import Icon from "@src/components/Icon";

// Presentation-only polish of the new-notification toast (the
// detection logic — seen-ID dedupe, polling, batching — lives in
// Header and is untouched). This component owns no behaviour: it
// renders the toast data it is given and passes the close / open
// callbacks straight through. AUTO_HIDE_MS is the Snackbar's
// existing auto-hide value; it is declared once here so the
// decorative progress bar below animates over the same duration.
const AUTO_HIDE_MS = 4000;

const SEVERITY_ICONS = {
   success: "solar:check-circle-bold",
   warning: "solar:danger-triangle-bold",
   error: "solar:close-circle-bold",
   info: "solar:info-circle-bold",
} as const;

type ToastSeverity = keyof typeof SEVERITY_ICONS;

export interface NotificationToastData {
   title: string;
   message: string;
   severity: ToastSeverity;
   more: number;
}

interface NotificationToastProps {
   toast: NotificationToastData | null;
   onClose: () => void;
   onOpen: () => void;
   // Cleanup Phase 3: position/duration/dismiss come from the
   // store's toast configuration; defaults preserve the
   // historical bottom-right / 4000 ms behaviour.
   anchorOrigin?: {
      vertical: "top" | "bottom";
      horizontal: "left" | "center" | "right";
   };
   durationMs?: number | null;
   clickawayDismiss?: boolean;
}

// Decorative auto-dismiss indicator: shrinks from full width to
// zero over the Snackbar's auto-hide duration. Purely visual —
// the Snackbar still owns when the toast actually dismisses.
const shrink = keyframes`
   from { transform: scaleX(1); }
   to { transform: scaleX(0); }
`;

// Slide-in from the anchored edge. A wrapper because
// Snackbar's TransitionProps type does not carry Slide's
// `direction` prop.
const makeSlide = (direction: "left" | "right" | "up" | "down") =>
   function SlideFromEdge(props: SlideProps) {
      return <Slide {...props} direction={direction} />;
   };

const clampLines = (lines: number) => ({
   display: "-webkit-box",
   WebkitBoxOrient: "vertical" as const,
   WebkitLineClamp: lines,
   overflow: "hidden",
   overflowWrap: "anywhere" as const,
});

const NotificationToast = ({
   toast,
   onClose,
   onOpen,
   anchorOrigin = { vertical: "bottom", horizontal: "right" },
   durationMs = AUTO_HIDE_MS,
   clickawayDismiss = true,
}: NotificationToastProps) => {
   const severity: ToastSeverity = toast?.severity ?? "info";
   const slideDirection =
      anchorOrigin.horizontal === "right"
         ? "left"
         : anchorOrigin.horizontal === "left"
           ? "right"
           : anchorOrigin.vertical === "top"
             ? "down"
             : "up";

   return (
      <Snackbar
         open={Boolean(toast)}
         autoHideDuration={durationMs}
         onClose={(_event, reason) => {
            if (reason === "clickaway" && !clickawayDismiss) return;
            onClose();
         }}
         anchorOrigin={anchorOrigin}
         TransitionComponent={makeSlide(slideDirection)}
         sx={{
            left: { xs: 16, sm: anchorOrigin.horizontal === "right" ? "auto" : 24 },
            right: { xs: 16, sm: anchorOrigin.horizontal === "left" ? "auto" : 24 },
            ...(anchorOrigin.vertical === "bottom"
               ? { bottom: { xs: 16, sm: 24 } }
               : { top: { xs: 16, sm: 24 } }),
         }}
      >
         <Alert
            severity={severity}
            onClose={onClose}
            onClick={onOpen}
            icon={
               <Box
                  sx={{
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                     width: 36,
                     height: 36,
                     borderRadius: "50%",
                     flexShrink: 0,
                     bgcolor: (theme) =>
                        alpha(theme.palette[severity].main, 0.12),
                  }}
               >
                  <Icon
                     icon={SEVERITY_ICONS[severity]}
                     color={severity}
                     size="small"
                  />
               </Box>
            }
            sx={{
               position: "relative",
               overflow: "hidden",
               alignItems: "flex-start",
               width: { xs: "100%", sm: 384 },
               px: 2,
               py: 1.5,
               cursor: "pointer",
               color: "text.primary",
               bgcolor: "background.paper",
               border: "1px solid",
               borderColor: "divider",
               borderRadius: 1,
               boxShadow: (theme) => theme.shadows[16],
               transition: "box-shadow 200ms ease",
               "&:hover": {
                  boxShadow: (theme) => theme.shadows[20],
               },
               // Pause the decorative progress bar while hovered,
               // mirroring the Snackbar's own hover pause.
               "&:hover .notification-toast-progress": {
                  animationPlayState: "paused",
               },
               "& .MuiAlert-icon": {
                  p: 0,
                  m: 0,
                  mr: 1.5,
                  opacity: 1,
               },
               "& .MuiAlert-message": {
                  p: 0,
                  flex: 1,
                  minWidth: 0,
               },
               "& .MuiAlert-action": {
                  p: 0,
                  ml: 1,
                  mr: -0.5,
                  mt: -0.25,
               },
               "& .MuiAlert-action .MuiIconButton-root": {
                  width: 28,
                  height: 28,
                  color: "text.secondary",
                  "&:hover": {
                     bgcolor: (theme) =>
                        alpha(theme.palette.grey[500], 0.12),
                  },
               },
            }}
         >
            <Stack spacing={0.25}>
               <Typography
                  variant="subtitle2"
                  sx={{ lineHeight: 1.4, ...clampLines(2) }}
               >
                  {toast?.title}
               </Typography>
               {toast?.message && (
                  <Typography
                     variant="body2"
                     color="text.secondary"
                     sx={{ lineHeight: 1.45, ...clampLines(3) }}
                  >
                     {toast.message}
                  </Typography>
               )}
               {toast && toast.more > 0 && (
                  <Box
                     sx={{
                        alignSelf: "flex-start",
                        mt: 0.75,
                        px: 1,
                        py: 0.25,
                        borderRadius: 999,
                        bgcolor: (theme) =>
                           alpha(theme.palette.primary.main, 0.08),
                     }}
                  >
                     <Typography
                        variant="caption"
                        fontWeight={700}
                        color="primary.main"
                     >
                        +{toast.more} more new notification
                        {toast.more > 1 ? "s" : ""}
                     </Typography>
                  </Box>
               )}
            </Stack>

            {/* Auto-dismiss progress bar (decorative; restarts per
                toast via the key, unmounts when the toast closes).
                Hidden when the toast stays until dismissed. */}
            {toast && durationMs !== null && (
               <Box
                  key={`${toast.title}|${toast.message}|${toast.more}`}
                  className="notification-toast-progress"
                  aria-hidden
                  sx={{
                     position: "absolute",
                     left: 0,
                     right: 0,
                     bottom: 0,
                     height: 3,
                     transformOrigin: "left center",
                     bgcolor: (theme) => theme.palette[severity].main,
                     animation: `${shrink} ${durationMs ?? AUTO_HIDE_MS}ms linear forwards`,
                  }}
               />
            )}
         </Alert>
      </Snackbar>
   );
};

export default NotificationToast;
