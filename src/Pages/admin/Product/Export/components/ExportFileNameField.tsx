"use client";

import React from "react";
import { Box, Typography, TextField } from "@mui/material";

export interface ExportFileNameFieldProps {
   fileName: string;
   finalFileName: string;
   onChangeFileName: (val: string) => void;
}

export default function ExportFileNameField({
   fileName,
   finalFileName,
   onChangeFileName,
}: ExportFileNameFieldProps) {
   return (
      <Box>
         <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            File Name
         </Typography>
         <TextField
            fullWidth
            size="small"
            placeholder="e.g. devx-products-2026-10-30"
            value={fileName}
            onChange={(e) => onChangeFileName(e.target.value)}
            helperText={`Download file: ${finalFileName} (Invalid characters removed automatically)`}
         />
      </Box>
   );
}
