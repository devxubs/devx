"use client";

import React from "react";
import { Box } from "@mui/material";
import DateRangePickerCustom from "@src/components/DateRange";

interface DashboardRangeButtonProps {
   /** The currently applied range (both dates always set). */
   value: [Date | null, Date | null];
   /** Fired only when the user presses Apply in the picker. */
   onApply: (range: [Date | null, Date | null]) => void;
}

/**
 * The Dashboard's single date-filter control (owner revision
 * 2026-11-22): the shared Date Range Picker itself, styled like
 * the previous outlined button. The field displays the currently
 * selected range; ONE click opens the picker popover directly —
 * Start Date / End Date selection is immediately visible, with no
 * preset menu or intermediate step. Apply commits the range (and
 * refetches the Dashboard); Cancel or dismissing the popover
 * discards the pending selection.
 */
export default function DashboardRangeButton({
   value,
   onApply,
}: DashboardRangeButtonProps) {
   return (
      <Box
         sx={{
            "& .MuiTextField-root": {
               width: { xs: "100%", sm: "auto" },
               minWidth: { sm: 250 },
            },
            "& .MuiOutlinedInput-root": {
               borderRadius: 1.5,
               cursor: "pointer",
               fontWeight: 600,
            },
            "& .MuiOutlinedInput-input": {
               cursor: "pointer",
               fontWeight: 600,
            },
         }}
      >
         <DateRangePickerCustom
            title="Date range"
            size="small"
            value={value}
            onChange={(v) => onApply(v)}
            showCancel
         />
      </Box>
   );
}
