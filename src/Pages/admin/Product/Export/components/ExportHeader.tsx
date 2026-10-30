"use client";

import React from "react";
import { Box, Stack, Typography, Chip, Paper } from "@mui/material";
import Icon from "@src/components/Icon";

export interface ExportHeaderProps {
   selectedCount: number;
}

export default function ExportHeader({ selectedCount }: ExportHeaderProps) {
   return (
      <Paper
         variant="outlined"
         sx={{
            p: 2,
            borderRadius: 1.5,
            bgcolor: "background.paper",
         }}
      >
         <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
               sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1.5,
                  bgcolor: "action.hover",
                  color: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
               }}
            >
               <Icon icon="solar:export-bold-duotone" size="large" />
            </Box>
            <Box>
               <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6" fontWeight={700}>
                     Export Selected Products
                  </Typography>
                  <Chip
                     label={`${selectedCount} Selected`}
                     size="small"
                     color="primary"
                     variant="outlined"
                     sx={{ fontWeight: 700 }}
                  />
               </Stack>
               <Typography variant="caption" color="text.secondary">
                  Generate publication-ready spreadsheet, Word printable
                  document, or CSV stream. Only the {selectedCount} products
                  currently selected will be exported.
               </Typography>
            </Box>
         </Stack>
      </Paper>
   );
}
