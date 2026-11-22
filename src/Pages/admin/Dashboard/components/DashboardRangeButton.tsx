"use client";

import React, { useState } from "react";
import { Button, Stack, MenuItem, ListItemText, Divider, Box } from "@mui/material";
import CustomPopover from "@src/components/CustomPopover";
import DateRangePickerCustom from "@src/components/DateRange";
import Icon from "@src/components/Icon";
import {
   PRESET_OPTIONS,
   type DatePresetKey,
} from "@src/lib/dateRanges";

interface DashboardRangeButtonProps {
   preset: DatePresetKey;
   /** Pre-formatted label for the button (preset name or range dates). */
   label: string;
   customRange: [Date | null, Date | null];
   onPresetChange: (preset: DatePresetKey) => void;
   onCustomApply: (range: [Date | null, Date | null]) => void;
}

/**
 * Part 1 (plan §5): the Dashboard's single date-filter control.
 * One button (calendar icon + current label + chevron) opens a
 * popover listing the 8 presets. Choosing a preset applies it
 * immediately and closes; "Custom Date Range" reveals the shared
 * DateRangePickerCustom inside the popover with an Apply button
 * that closes on apply.
 */
export default function DashboardRangeButton({
   preset,
   label,
   customRange,
   onPresetChange,
   onCustomApply,
}: DashboardRangeButtonProps) {
   const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
   const [showCustom, setShowCustom] = useState(preset === "custom");
   const [pendingCustom, setPendingCustom] =
      useState<[Date | null, Date | null]>(customRange);

   const close = () => setAnchorEl(null);

   const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
      setPendingCustom(customRange);
      setShowCustom(preset === "custom");
      setAnchorEl(e.currentTarget);
   };

   const handlePreset = (key: DatePresetKey) => {
      if (key === "custom") {
         setShowCustom(true);
         return;
      }
      onPresetChange(key);
      close();
   };

   const handleApplyCustom = () => {
      onCustomApply(pendingCustom);
      close();
   };

   const customReady = Boolean(pendingCustom[0] && pendingCustom[1]);

   return (
      <>
         <Button
            variant="outlined"
            color="inherit"
            onClick={handleOpen}
            startIcon={<Icon icon="solar:calendar-bold-duotone" size="small" />}
            endIcon={
               <Icon icon="solar:alt-arrow-down-bold" size="small" />
            }
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 1.5 }}
         >
            {label}
         </Button>

         <CustomPopover
            anchorEl={anchorEl}
            onClose={close}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
         >
            <Box sx={{ minWidth: 220, p: 0.5 }}>
               <Stack spacing={0}>
                  {PRESET_OPTIONS.map((option) => (
                     <MenuItem
                        key={option.key}
                        selected={
                           preset === option.key ||
                           (option.key === "custom" && showCustom)
                        }
                        onClick={() => handlePreset(option.key)}
                        sx={{ borderRadius: 1 }}
                     >
                        <ListItemText primary={option.label} />
                        {(preset === option.key ||
                           (option.key === "custom" && showCustom)) && (
                           <Icon
                              icon="solar:check-circle-bold"
                              size="small"
                              color="primary"
                           />
                        )}
                     </MenuItem>
                  ))}
               </Stack>

               {showCustom && (
                  <>
                     <Divider sx={{ my: 1 }} />
                     <Box sx={{ px: 1, pb: 1, maxWidth: 320 }}>
                        <DateRangePickerCustom
                           title="Date range"
                           size="small"
                           value={pendingCustom}
                           onChange={(v) => setPendingCustom(v)}
                        />
                        <Stack direction="row" justifyContent="flex-end" mt={1.5}>
                           <Button
                              size="small"
                              variant="contained"
                              disabled={!customReady}
                              onClick={handleApplyCustom}
                           >
                              Apply
                           </Button>
                        </Stack>
                     </Box>
                  </>
               )}
            </Box>
         </CustomPopover>
      </>
   );
}
