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
   useTheme,
   alpha,
   ButtonBase,
} from "@mui/material";
import useGlobalState from "@src/handler/globalState";
import Icon from "@src/components/Icon";
import CustomSwitch from "@src/components/CustomSwitch";

interface AppearanceTabProps {
   values: any;
   onChange: (field: string, value: any) => void;
   onConfigChange: (key: string, value: any) => void;
}

const colorPresets = [
   { key: "primary", name: "DevX Indigo", hex: "#3B82F6" },
   { key: "secondary", name: "Royal Purple", hex: "#8B5CF6" },
   { key: "info", name: "Ocean Cyan", hex: "#06B6D4" },
   { key: "success", name: "Emerald Green", hex: "#10B981" },
   { key: "warning", name: "Amber Orange", hex: "#F59E0B" },
   { key: "error", name: "Ruby Crimson", hex: "#EF4444" },
];

export default function AppearanceTab({ values, onChange, onConfigChange }: AppearanceTabProps) {
   const theme = useTheme();
   const globalState = useGlobalState();
   const currentTheme = globalState.get("theme") || values.themeMode || "dark";
   const currentColor = globalState.get("color") || values.themeColor || "primary";
   const currentLayout = globalState.get("layoutFull") ?? true;
   const customConfig = values.customConfig || {};

   const handleThemeChange = (newMode: "light" | "dark") => {
      onChange("themeMode", newMode);
      globalState.set("theme", newMode);
      if (typeof window !== "undefined") {
         const saved = localStorage.getItem("customize");
         const parsed = saved ? JSON.parse(saved) : {};
         localStorage.setItem("customize", JSON.stringify({ ...parsed, theme: newMode }));
      }
   };

   const handleColorChange = (newColor: any) => {
      onChange("themeColor", newColor);
      globalState.set("color", newColor as any);
      if (typeof window !== "undefined") {
         const saved = localStorage.getItem("customize");
         const parsed = saved ? JSON.parse(saved) : {};
         localStorage.setItem("customize", JSON.stringify({ ...parsed, color: newColor }));
      }
   };

   const handleLayoutChange = (isFull: boolean) => {
      globalState.set("layoutFull", isFull);
      if (typeof window !== "undefined") {
         const saved = localStorage.getItem("customize");
         const parsed = saved ? JSON.parse(saved) : {};
         localStorage.setItem("customize", JSON.stringify({ ...parsed, layoutFull: isFull }));
      }
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

         {/* Theme Mode Selection */}
         <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
               Display Mode
            </Typography>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <ButtonBase
                     onClick={() => handleThemeChange("dark")}
                     sx={{
                        width: "100%",
                        p: 2.5,
                        borderRadius: 2,
                        border: 2,
                        borderColor: currentTheme === "dark" ? "primary.main" : "divider",
                        bgcolor: "#1e1e2d",
                        color: "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        textAlign: "left",
                     }}
                  >
                     <Stack direction="row" alignItems="center" spacing={2}>
                        <Icon icon="solar:moon-bold-duotone" size="large" />
                        <Box>
                           <Typography variant="subtitle1" fontWeight={700}>
                              Dark Theme
                           </Typography>
                           <Typography variant="caption" sx={{ opacity: 0.7 }}>
                              Optimal for reduced eye strain in low-light POS environments
                           </Typography>
                        </Box>
                     </Stack>
                     {currentTheme === "dark" && (
                        <Icon icon="solar:check-circle-bold" style={{ color: theme.palette.primary.main }} />
                     )}
                  </ButtonBase>
               </Grid>

               <Grid size={{ xs: 12, sm: 6 }}>
                  <ButtonBase
                     onClick={() => handleThemeChange("light")}
                     sx={{
                        width: "100%",
                        p: 2.5,
                        borderRadius: 2,
                        border: 2,
                        borderColor: currentTheme === "light" ? "primary.main" : "divider",
                        bgcolor: "#f8fafc",
                        color: "#1e293b",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        textAlign: "left",
                     }}
                  >
                     <Stack direction="row" alignItems="center" spacing={2}>
                        <Icon icon="solar:sun-bold-duotone" size="large" />
                        <Box>
                           <Typography variant="subtitle1" fontWeight={700}>
                              Light Theme
                           </Typography>
                           <Typography variant="caption" color="text.secondary">
                              Crisp, bright daylight interface for retail counters
                           </Typography>
                        </Box>
                     </Stack>
                     {currentTheme === "light" && (
                        <Icon icon="solar:check-circle-bold" style={{ color: theme.palette.primary.main }} />
                     )}
                  </ButtonBase>
               </Grid>
            </Grid>
         </Box>

         {/* Theme Color Presets */}
         <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
               Primary Accent Color Preset
            </Typography>
            <Grid container spacing={2}>
               {colorPresets.map((preset) => {
                  const isSelected = currentColor === preset.key;
                  return (
                     <Grid size={{ xs: 6, sm: 4, md: 2 }} key={preset.key}>
                        <ButtonBase
                           onClick={() => handleColorChange(preset.key)}
                           sx={{
                              width: "100%",
                              p: 1.5,
                              borderRadius: 2,
                              border: 2,
                              borderColor: isSelected ? preset.hex : "divider",
                              bgcolor: isSelected ? alpha(preset.hex, 0.1) : "background.paper",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 1,
                           }}
                        >
                           <Box
                              sx={{
                                 width: 32,
                                 height: 32,
                                 borderRadius: "50%",
                                 bgcolor: preset.hex,
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "center",
                              }}
                           >
                              {isSelected && (
                                 <Icon icon="solar:check-read-bold" size="small" style={{ color: "#fff" }} />
                              )}
                           </Box>
                           <Typography variant="caption" fontWeight={isSelected ? 700 : 500}>
                              {preset.name}
                           </Typography>
                        </ButtonBase>
                     </Grid>
                  );
               })}
            </Grid>
         </Box>

         {/* Navigation & Layout Preferences */}
         <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
               Navigation & Table Density
            </Typography>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                     <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <FormControlLabel
                           control={
                              <CustomSwitch
                                 checked={currentLayout}
                                 onChange={(e) => handleLayoutChange(e.target.checked)}
                              />
                           }
                           label={
                              <Box>
                                 <Typography variant="subtitle2" fontWeight={600}>
                                    Expanded Main Sidebar
                                 </Typography>
                                 <Typography variant="caption" color="text.secondary">
                                    Keep the sidebar full-width with text labels visible
                                 </Typography>
                              </Box>
                           }
                        />
                     </CardContent>
                  </Card>
               </Grid>

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
