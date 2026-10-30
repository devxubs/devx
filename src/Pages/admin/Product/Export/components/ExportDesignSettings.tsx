"use client";

import React from "react";
import { Grid, TextField, Box, Typography, Button } from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import Icon from "@src/components/Icon";
import { HeaderStyleOption, BorderStyleOption } from "@src/lib/exportEngine";
import { DocumentTheme } from "../types/export.types";
import {
   HEADER_STYLE_OPTIONS,
   BORDER_STYLE_OPTIONS,
} from "../utils/exportConstants";

export interface ExportDesignSettingsProps {
   documentTitle: string;
   onChangeDocumentTitle: (val: string) => void;
   documentTheme: DocumentTheme;
   onToggleDocumentTheme: () => void;
   headerStyle: HeaderStyleOption;
   onChangeHeaderStyle: (val: HeaderStyleOption) => void;
   borderStyle: BorderStyleOption;
   onChangeBorderStyle: (val: BorderStyleOption) => void;
}

export default function ExportDesignSettings({
   documentTitle,
   onChangeDocumentTitle,
   documentTheme,
   onToggleDocumentTheme,
   headerStyle,
   onChangeHeaderStyle,
   borderStyle,
   onChangeBorderStyle,
}: ExportDesignSettingsProps) {
   return (
      <Grid container spacing={2}>
         {/* 1. Document Title */}
         <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
               fullWidth
               size="small"
               label="Document Title"
               placeholder="Title"
               value={documentTitle}
               onChange={(e) => onChangeDocumentTitle(e.target.value)}
            />
         </Grid>

         {/* 2. Document Theme (Light / Dark) */}
         <Grid size={{ xs: 12, sm: 4 }}>
            <Button
               data-testid="theme-toggle-button"
               fullWidth
               variant="outlined"
               color="inherit"
               onClick={onToggleDocumentTheme}
               startIcon={
                  <Icon
                     icon={
                        documentTheme === "dark"
                           ? "solar:sun-bold-duotone"
                           : "solar:moon-bold-duotone"
                     }
                     size="small"
                  />
               }
               sx={{
                  height: 40,
                  justifyContent: "center",
                  px: 1.5,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: 1,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  "&:hover": {
                     borderColor: "primary.main",
                     bgcolor: "action.hover",
                  },
               }}
            >
               {documentTheme !== "dark" ? "Dark Theme" : "Light Theme"}
            </Button>
         </Grid>

         {/* 3. Table Header Styling */}
         <Grid size={{ xs: 12, sm: 6 }}>
            <CustomAutocomplete
               label="Table Header Styling"
               placeholder="Select Header Styling"
               arrow={true}
               options={HEADER_STYLE_OPTIONS}
               value={headerStyle}
               size="small"
               onChange={(val: any) => {
                  const selected =
                     typeof val === "string"
                        ? val
                        : val?.value || val?.label || "Default";
                  onChangeHeaderStyle(selected as HeaderStyleOption);
               }}
            />
         </Grid>

         {/* 4. Table Border Styling */}
         <Grid size={{ xs: 12, sm: 6 }}>
            <CustomAutocomplete
               label="Table Border Styling"
               placeholder="Select Border Styling"
               arrow={true}
               options={BORDER_STYLE_OPTIONS}
               value={borderStyle}
               size="small"
               onChange={(val: any) => {
                  const selected =
                     typeof val === "string"
                        ? val
                        : val?.value || val?.label || "Horizontal Lines";
                  onChangeBorderStyle(selected as BorderStyleOption);
               }}
            />
         </Grid>
      </Grid>
   );
}
