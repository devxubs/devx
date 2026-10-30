"use client";

import React from "react";
import {
   Box,
   Stack,
   Typography,
   Chip,
   Paper,
   Grid,
   alpha,
   useTheme,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { ExportFormat } from "../types/export.types";
import { FORMAT_OPTIONS } from "../utils/exportConstants";

export interface ExportFormatSelectorProps {
   format: ExportFormat;
   onSelectFormat: (format: ExportFormat) => void;
}

export default function ExportFormatSelector({
   format,
   onSelectFormat,
}: ExportFormatSelectorProps) {
   const theme = useTheme();

   return (
      <Box>
         <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            File Format
         </Typography>
         <Grid container spacing={1.5}>
            {FORMAT_OPTIONS.map((opt) => {
               const isSelected = format === opt.key;
               return (
                  <Grid size={{ xs: 12, sm: 4 }} key={opt.key}>
                     <Paper
                        variant="outlined"
                        onClick={() => onSelectFormat(opt.key)}
                        sx={{
                           p: 1.75,
                           cursor: "pointer",
                           borderRadius: 1,
                           borderColor: isSelected
                              ? "primary.main"
                              : "divider",
                           borderWidth: isSelected ? 1.5 : 1,
                           bgcolor: isSelected
                              ? alpha(theme.palette.primary.main, 0.08)
                              : "background.paper",
                           transition: "all 0.2s ease-in-out",
                           "&:hover": {
                              borderColor: "primary.main",
                              bgcolor: alpha(theme.palette.primary.main, 0.04),
                           },
                        }}
                     >
                        <Stack spacing={1}>
                           <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                           >
                              <Icon icon={opt.icon} size="medium" />
                              <Chip
                                 label={opt.ext}
                                 size="small"
                                 color={isSelected ? "primary" : "default"}
                                 variant={isSelected ? "filled" : "outlined"}
                                 sx={{
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                 }}
                              />
                           </Stack>
                           <Typography variant="subtitle2" fontWeight={700}>
                              {opt.label}
                           </Typography>
                           <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ minHeight: 32, display: "block" }}
                           >
                              {opt.desc}
                           </Typography>
                        </Stack>
                     </Paper>
                  </Grid>
               );
            })}
         </Grid>
      </Box>
   );
}
