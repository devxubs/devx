import React from "react";
import {
   Stack,
   Typography,
   Card,
   Box,
   useTheme,
   alpha,
   Radio,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { ExportFormat } from "../types/export.types";
import { FORMAT_OPTIONS } from "../utils/exportConstants";

interface ExportFormatSelectorProps {
   format: ExportFormat;
   onFormatChange: (fmt: ExportFormat) => void;
}

export const ExportFormatSelector: React.FC<ExportFormatSelectorProps> = ({
   format,
   onFormatChange,
}) => {
   const theme = useTheme();

   return (
      <Stack spacing={1.5}>
         <Box>
            <Typography
               variant="subtitle2"
               fontWeight={700}
               color="text.primary"
            >
               Export Format
            </Typography>
            <Typography variant="caption" color="text.secondary">
               Choose your preferred file format
            </Typography>
         </Box>

         <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            {FORMAT_OPTIONS.map((opt) => {
               const isSelected = format === opt.id;

               return (
                  <Card
                     key={opt.id}
                     variant="outlined"
                     role="radio"
                     aria-checked={isSelected}
                     tabIndex={0}
                     onClick={() => onFormatChange(opt.id)}
                     onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                           event.preventDefault();
                           onFormatChange(opt.id);
                        }
                     }}
                     sx={{
                        flex: 1,
                        minWidth: 0,
                        p: 1.75,
                        cursor: "pointer",
                        position: "relative",
                        borderRadius: 1,
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected ? "primary.main" : "divider",
                        bgcolor: isSelected
                           ? alpha(theme.palette.primary.main, 0.045)
                           : "background.paper",
                        boxShadow: "none",
                        transition:
                           "border-color 0.2s ease, background-color 0.2s ease",
                        "&:hover": {
                           borderColor: "primary.main",
                           bgcolor: alpha(theme.palette.primary.main, 0.035),
                        },
                        "&:focus-visible": {
                           outline: `2px solid ${theme.palette.primary.main}`,
                           outlineOffset: 2,
                        },
                     }}
                  >
                     <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                           sx={{
                              width: 42,
                              height: 42,
                              flexShrink: 0,
                              display: "grid",
                              placeItems: "center",
                              borderRadius: 1.5,
                              color: opt.color,
                              bgcolor: alpha(opt.color, 0.1),
                           }}
                        >
                           <Icon icon={opt.icon} size="large" />
                        </Box>

                        <Stack spacing={0.35} flex={1} minWidth={0}>
                           <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.75}
                              flexWrap="wrap"
                           >
                              <Typography
                                 variant="body2"
                                 fontWeight={700}
                                 color={
                                    isSelected ? "primary.main" : "text.primary"
                                 }
                              >
                                 {opt.name}
                              </Typography>

                              <Typography
                                 variant="caption"
                                 fontWeight={600}
                                 color="text.secondary"
                                 sx={{
                                    px: 0.65,
                                    py: 0.15,
                                    borderRadius: 0.75,
                                    bgcolor: "action.hover",
                                 }}
                              >
                                 {opt.ext}
                              </Typography>
                           </Stack>

                           <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                 overflow: "hidden",
                                 textOverflow: "ellipsis",
                                 whiteSpace: "nowrap",
                              }}
                           >
                              {opt.description}
                           </Typography>
                        </Stack>
                     </Stack>
                  </Card>
               );
            })}
         </Stack>
      </Stack>
   );
};
