"use client";

import React from "react";
import { Stack, Typography } from "@mui/material";

interface SettingsFieldProps {
   label: string;
   helper?: string;
   error?: string | null;
   /** "wide" (560px) is reserved for controls that genuinely
    * need more room — textareas. Everything else uses the
    * standard compact width. */
   width?: "standard" | "wide";
   children: React.ReactNode;
}

// Compact control widths (RP-7 width correction): the field
// ROW spans the content column, but the control itself never
// stretches across it — GitHub-style compact inputs with the
// unused space left to the right. width: "100%" under the cap
// lets the control shrink to the available space on mobile.
export const SETTINGS_FIELD_MAX_WIDTH = 440;
export const SETTINGS_FIELD_WIDE_MAX_WIDTH = 560;

/**
 * Global Settings field standard (RP-7 field standardization):
 * ONE field per row — a visible label ABOVE the control
 * (never a floating label), a placeholder inside the control,
 * and concise, field-specific helper text directly BELOW it.
 * When an error is present it replaces the helper text and
 * renders in the error colour. Every Settings tab composes its
 * fields with this wrapper so spacing, typography and the
 * compact control width are identical everywhere.
 */
export default function SettingsField({
   label,
   helper,
   error,
   width = "standard",
   children,
}: SettingsFieldProps) {
   return (
      <Stack
         spacing={0.75}
         sx={{
            width: "100%",
            maxWidth:
               width === "wide"
                  ? SETTINGS_FIELD_WIDE_MAX_WIDTH
                  : SETTINGS_FIELD_MAX_WIDTH,
         }}
      >
         <Typography
            variant="body2"
            fontSize={13}
            fontWeight={600}
            color="textSecondary"
         >
            {label}
         </Typography>
         {children}
         {(error || helper) && (
            <Typography
               variant="caption"
               color={error ? "error" : "text.secondary"}
               {...(error ? { role: "alert" as const } : {})}
            >
               {error || helper}
            </Typography>
         )}
      </Stack>
   );
}
