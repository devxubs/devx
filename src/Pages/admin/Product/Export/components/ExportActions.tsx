"use client";

import React from "react";
import { Stack, Button, CircularProgress, useTheme } from "@mui/material";
import Icon from "@src/components/Icon";

export interface ExportActionsProps {
   selectedCount: number;
   isExporting: boolean;
   onClose: () => void;
   onExport: () => void;
}

export default function ExportActions({
   selectedCount,
   isExporting,
   onClose,
   onExport,
}: ExportActionsProps) {
   const theme = useTheme();

   return (
      <Stack direction="row" justifyContent="flex-end" spacing={1.5} pt={1}>
         <Button
            // variant="outlined"
            color="inherit"
            onClick={onClose}
            disabled={isExporting}
         >
            Cancel
         </Button>
         <Button
            variant="contained"
            color="primary"
            onClick={onExport}
            disabled={isExporting || selectedCount === 0}
            startIcon={
               isExporting ? (
                  <CircularProgress size={16} color="inherit" />
               ) : (
                  <Icon
                     icon="solar:download-square-bold-duotone"
                     size="small"
                     style={{
                        color: theme.palette.text.primary,
                     }}
                  />
               )
            }
         >
            {isExporting
               ? "Generating..."
               : `Export ${selectedCount} Product${selectedCount > 1 ? "s" : ""}`}
         </Button>
      </Stack>
   );
}
