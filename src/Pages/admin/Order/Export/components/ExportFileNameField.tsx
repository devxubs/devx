import React from "react";
import { Stack, TextField, InputAdornment, Typography } from "@mui/material";
import Icon from "@src/components/Icon";
import { ExportFormat } from "../types/export.types";

interface ExportFileNameFieldProps {
   fileName: string;
   format: ExportFormat;
   onFileNameChange: (val: string) => void;
}

export const ExportFileNameField: React.FC<ExportFileNameFieldProps> = ({
   fileName,
   format,
   onFileNameChange,
}) => {
   const ext = format === "excel" ? ".xlsx" : format === "word" ? ".docx" : ".csv";

   return (
      <Stack spacing={1}>
         <Typography variant="subtitle2" fontWeight={700} color="text.primary">
            File Name
         </Typography>
         <TextField
            fullWidth
            size="small"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            placeholder="Orders_Export"
            InputProps={{
               startAdornment: (
                  <InputAdornment position="start">
                     <Icon icon="solar:document-text-linear" size="small" />
                  </InputAdornment>
               ),
               endAdornment: (
                  <InputAdornment position="end">
                     <Typography variant="caption" fontWeight={700} color="text.secondary">
                        {ext}
                     </Typography>
                  </InputAdornment>
               ),
            }}
         />
      </Stack>
   );
};
