"use client";

import React from "react";
import { Stack, Typography } from "@mui/material";

interface SettingsFieldProps {
   label: string;
   helper?: string;
   error?: string | null;
   children: React.ReactNode;
}

/**
 * Global Settings field standard (RP-7 field standardization):
 * ONE field per row — a visible label ABOVE the control
 * (never a floating label), a placeholder inside the control,
 * and concise, field-specific helper text directly BELOW it.
 * When an error is present it replaces the helper text and
 * renders in the error colour. Every Settings tab composes its
 * fields with this wrapper so spacing and typography are
 * identical everywhere.
 */
export default function SettingsField({
   label,
   helper,
   error,
   children,
}: SettingsFieldProps) {
   return (
      <Stack spacing={0.75}>
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
