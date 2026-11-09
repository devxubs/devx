import React from "react";
import { Stack, Button, CircularProgress, Typography } from "@mui/material";
import Icon from "@src/components/Icon";
import { ExportFormat } from "../types/export.types";

interface ExportActionsProps {
   format: ExportFormat;
   isExporting: boolean;
   errorMessage: string | null;
   onCancel: () => void;
   onExport: () => void;
}

export const ExportActions: React.FC<ExportActionsProps> = ({
   format,
   isExporting,
   errorMessage,
   onCancel,
   onExport,
}) => {
   const formatLabel =
      format === "excel" ? "Excel" : format === "word" ? "Word" : "CSV";

   return (
      <Stack
         direction={{ xs: "column", sm: "row" }}
         justifyContent="space-between"
         alignItems={{ sm: "center" }}
         spacing={1.5}
         pt={1}
      >
         {errorMessage ? (
            <Typography variant="body2" color="error" fontWeight={600}>
               {errorMessage}
            </Typography>
         ) : (
            <span />
         )}

         <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button
               variant="contained"
               color="primary"
               onClick={onExport}
               disabled={isExporting}
               startIcon={
                  isExporting ? (
                     <CircularProgress size={18} color="inherit" />
                  ) : (
                     <Icon
                        icon="solar:download-square-bold-duotone"
                        size="small"
                        style={{ color: "white" }}
                     />
                  )
               }
            >
               {isExporting
                  ? `Exporting ${formatLabel}...`
                  : `Export ${formatLabel}`}
            </Button>
         </Stack>
      </Stack>
   );
};
