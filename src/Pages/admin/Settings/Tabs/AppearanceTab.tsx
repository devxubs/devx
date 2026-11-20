"use client";

import React from "react";
import {
   Stack,
   Typography,
   Box,
   Card,
   CardContent,
   Button,
} from "@mui/material";
import Icon from "@src/components/Icon";

interface AppearanceTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
   onConfigChange: (key: string, value: any) => void;
}

// Phase 2 (2.11): single source of truth for appearance. This tab used
// to maintain a SECOND editor for theme mode, accent colour and
// sidebar layout — duplicating the header appearance drawer and
// writing the same globalState/localStorage keys from two places. The
// header drawer is canonical now: this tab delegates to it.
export default function AppearanceTab(_props: AppearanceTabProps) {

   const openAppearanceDrawer = () => {
      window.dispatchEvent(new CustomEvent("devx:open-appearance"));
   };

   return (
      <Stack spacing={3}>
         <Box>
            <Typography variant="h6" fontWeight={600}>
               Appearance & Theme Customization
            </Typography>
            <Typography variant="body2" color="text.secondary">
               Personalize the application display mode, accent brand colors, and navigation density.
            </Typography>
         </Box>

         <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
               <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ sm: "center" }}
                  justifyContent="space-between"
               >
                  <Stack direction="row" spacing={2} alignItems="center">
                     <Icon icon="solar:palette-bold-duotone" size="large" />
                     <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                           Theme, accent colour & sidebar layout
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                           These are personal display preferences. They are edited in one
                           place — the appearance drawer in the header — so they stay in
                           sync everywhere.
                        </Typography>
                     </Box>
                  </Stack>
                  <Button
                     variant="contained"
                     color="primary"
                     onClick={openAppearanceDrawer}
                     sx={{ flexShrink: 0 }}
                  >
                     Open Appearance Settings
                  </Button>
               </Stack>
            </CardContent>
         </Card>

         {/* P2-20: the "Compact Table Density" toggle was removed —
             it wrote customConfig.compactTableDensity, which no table
             component ever read, so the switch changed nothing. */}
      </Stack>
   );
}
