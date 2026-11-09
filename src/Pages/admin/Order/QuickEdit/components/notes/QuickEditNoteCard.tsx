import React from "react";
import {
   Box,
   Chip,
   Paper,
   Stack,
   Tooltip,
   Typography,
   alpha,
   useTheme,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { OrderNoteItem } from "../../types";
import { getNoteTypeConfig, formatNoteTimestamp } from "./noteConfig";

interface QuickEditNoteCardProps {
   note: OrderNoteItem;
}

export const QuickEditNoteCard: React.FC<QuickEditNoteCardProps> = ({
   note,
}) => {
   const theme = useTheme();
   const config = getNoteTypeConfig(note.type);
   const timeInfo = formatNoteTimestamp(note.createdAt);

   // Determine accent color safely from theme
   const accentColor =
      config.color === "default"
         ? theme.palette.text.secondary
         : (theme.palette[config.color] as any)?.main ||
           theme.palette.primary.main;

   return (
      <Paper
         variant="outlined"
         sx={{
            p: { xs: 1.25, sm: 1.5 },
            borderRadius: 1,
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            borderColor: note.isNew
               ? alpha(theme.palette.success.main, 0.45)
               : "divider",
            borderLeft: `3px solid ${accentColor}`,
            boxShadow: note.isNew
               ? `0 0 0 1px ${alpha(theme.palette.success.main, 0.2)}`
               : "none",
            transition: "all 0.15s ease-in-out",
         }}
      >
         <Stack spacing={0.75}>
            {/* Note Card Header */}
            <Stack
               direction={{ xs: "column", sm: "row" }}
               justifyContent="space-between"
               alignItems={{ xs: "flex-start", sm: "center" }}
               spacing={0.75}
            >
               {/* Left: Type Indicator & Badges */}
               <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
               >
                  {/* Category Icon Badge */}
                  <Box
                     sx={{
                        width: 22,
                        height: 22,
                        borderRadius: 0.5,
                        bgcolor: alpha(accentColor, 0.12),
                        color: accentColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                     }}
                  >
                     <Icon icon={config.icon} size="13px" />
                  </Box>

                  {/* Title / Category */}
                  <Typography
                     variant="subtitle2"
                     sx={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "text.primary",
                     }}
                  >
                     {config.label}
                  </Typography>

                  {/* Internal Only Badge */}
                  {config.internal && (
                     <Tooltip
                        title="Internal Note: Kept strictly confidential for staff only; not printed on customer invoices"
                        arrow
                        disableInteractive
                     >
                        <Chip
                           size="small"
                           icon={
                              <Icon
                                 icon="solar:lock-keyhole-minimalistic-bold"
                                 size="11px"
                              />
                           }
                           label="Internal Only"
                           sx={{
                              height: 18,
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              bgcolor: alpha(theme.palette.warning.main, 0.12),
                              color: "warning.dark",
                              borderRadius: 0.5,
                              "& .MuiChip-icon": {
                                 ml: 0.5,
                                 mr: -0.25,
                                 color: "inherit",
                              },
                           }}
                        />
                     </Tooltip>
                  )}

                  {/* New Highlight Badge */}
                  {note.isNew && (
                     <Chip
                        label="NEW"
                        color="success"
                        size="small"
                        sx={{
                           height: 18,
                           fontSize: "0.62rem",
                           fontWeight: 800,
                           borderRadius: 0.5,
                           px: 0.25,
                        }}
                     />
                  )}
               </Stack>

               {/* Right: Author & Timestamp */}
               <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  sx={{
                     alignSelf: { xs: "flex-end", sm: "center" },
                     pt: { xs: 0.25, sm: 0 },
                  }}
               >
                  <Stack direction="row" spacing={0.5} alignItems="center">
                     <Icon
                        icon="solar:user-circle-bold"
                        size="13px"
                        style={{ color: theme.palette.text.disabled }}
                     />
                     <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.72rem", fontWeight: 500 }}
                     >
                        {note.author || "Staff"}
                     </Typography>
                  </Stack>

                  <Typography
                     variant="caption"
                     color="text.disabled"
                     sx={{ fontSize: "0.7rem" }}
                  >
                     •
                  </Typography>

                  <Tooltip title={timeInfo.full} arrow disableInteractive>
                     <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                           fontSize: "0.72rem",
                           cursor: "default",
                           textDecoration: "underline dotted",
                           textUnderlineOffset: "2px",
                        }}
                     >
                        {timeInfo.relative}
                     </Typography>
                  </Tooltip>
               </Stack>
            </Stack>

            {/* Note Body Content */}
            <Typography
               variant="body2"
               sx={{
                  color: "text.primary",
                  fontSize: "0.835rem",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  pt: 0.25,
               }}
            >
               {note.content}
            </Typography>
         </Stack>
      </Paper>
   );
};

export default QuickEditNoteCard;
