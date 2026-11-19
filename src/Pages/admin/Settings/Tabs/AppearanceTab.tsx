"use client";

import React from "react";
import {
   Grid,
   Stack,
   Typography,
   Box,
   Card,
   CardContent,
   FormControlLabel,
   Button,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomSwitch from "@src/components/CustomSwitch";

interface AppearanceTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
   onConfigChange: (key: string, value: any) => void;
}

// Phase 2 (2.11): single source of truth for appearance. This tab used
// to maintain a SECOND editor for theme mode, accent colour and
// sidebar layout — duplicating the header appearance drawer and
// writing the same globalState/localStorage keys from two places. The
// header drawer is canonical now: this tab delegates to it and keeps
// only the store-level preference that lives in Settings alone
// (compact table density, saved in customConfig).
export default function AppearanceTab({ values, onConfigChange }: AppearanceTabProps) {
   const customConfig = values.customConfig || {};

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

         {/* Store-level display preference (Settings-only, saved with
             the store configuration — not part of the header drawer). */}
         <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
               Table Density
            </Typography>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                     <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <FormControlLabel
                           control={
                              <CustomSwitch
                                 checked={customConfig.compactTableDensity ?? false}
                                 onChange={(e) => onConfigChange("compactTableDensity", e.target.checked)}
                              />
                           }
                           label={
                              <Box>
                                 <Typography variant="subtitle2" fontWeight={600}>
                                    Compact Table Density
                                 </Typography>
                                 <Typography variant="caption" color="text.secondary">
                                    Show more rows per page with tighter table padding
                                 </Typography>
                              </Box>
                           }
                        />
                     </CardContent>
                  </Card>
               </Grid>
            </Grid>
         </Box>
      </Stack>
   );
}
