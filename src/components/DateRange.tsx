"use client";

import React, { useEffect } from "react";
import {
   Box,
   Stack,
   TextField,
   InputAdornment,
   useTheme,
   alpha,
   MenuItem,
   Typography,
   Button,
} from "@mui/material";

import { DateRange, Range, DefinedRange } from "react-date-range";
import { addDays, format } from "date-fns";
import "react-date-range/dist/styles.css"; // main css file
import "react-date-range/dist/theme/default.css"; // theme css file

import CustomPopover from "./CustomPopover";
import Icon from "./Icon";

type Props = {
   onChange?: (value: [Date | null, Date | null]) => void;
   value?: [Date | null, Date | null];
   size?: "small" | "medium";
};

export default function DateRangePickerCustom({
   onChange,
   value,
   size = "medium",
}: Props) {
   const theme = useTheme();

   const [range, setRange] = React.useState<Range[]>([
      {
         startDate: new Date(),
         endDate: addDays(new Date(), 7),
         key: "selection",
      },
   ]);

   const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
   const [monthAnchor, setMonthAnchor] = React.useState<HTMLElement | null>(
      null
   );
   const [yearAnchor, setYearAnchor] = React.useState<HTMLElement | null>(null);
   const [currentMonth, setCurrentMonth] = React.useState(new Date());
   const [calendarKey, setCalendarKey] = React.useState(0);

   const handleChange = (item: any) => {
      const newRange = item.selection;

      setRange([newRange]);
      onChange?.([newRange.startDate || null, newRange.endDate || null]);

      // Automatically close popover when both dates are selected
      // if (newRange.startDate && newRange.endDate) {
      //    setTimeout(() => setAnchorEl(null), 150);
      // }
   };

   const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
   };
   const handleClose = () => setAnchorEl(null);

   const start = range[0]?.startDate
      ? format(range[0].startDate!, "dd MMM yyyy")
      : "";
   const end = range[0]?.endDate
      ? format(range[0].endDate!, "dd MMM yyyy")
      : "";

   // 🔢 Month & Year lists
   const months = Array.from({ length: 12 }, (_, i) =>
      new Date(0, i).toLocaleString("default", { month: "long" })
   );
   const years = Array.from(
      { length: 16 },
      (_, i) => new Date().getFullYear() - 15 + i
   );

   useEffect(() => {
      // 1. Do your DOM queries or calculations
      const shown = document.querySelector(".rdrMonths .rdrMonthName");
      if (!shown) return;

      const txt = shown.textContent;
      if (!txt) return;

      const [monthName, year] = txt.split(" ");

      const monthIndex = months.findIndex(
         (m) => m.toLowerCase() === monthName.toLowerCase()
      );

      if (monthIndex < 0) return;

      const newDate = new Date(currentMonth);
      newDate.setMonth(monthIndex);
      newDate.setFullYear(Number(year));

      // 2. Prevent infinite loop by checking if state is already correct
      if (
         currentMonth.getMonth() === newDate.getMonth() &&
         currentMonth.getFullYear() === newDate.getFullYear()
      ) {
         return; // IMPORTANT: prevents infinite loop
      }

      // 3. Now we update state safely
      setCurrentMonth(newDate);
   }, [calendarKey]); // 🔥 Only runs when calendarKey changes

   // 🗓️ Handlers
   const handleMonthChange = (monthIndex: number) => {
      const updated = new Date(currentMonth);
      updated.setMonth(monthIndex);
      setCurrentMonth(updated);

      setCalendarKey((prev) => prev + 1);
      setMonthAnchor(null);
   };

   const handleYearChange = (year: number) => {
      const updated = new Date(currentMonth);
      updated.setFullYear(year);
      setCurrentMonth(updated);

      setCalendarKey((prev) => prev + 1);
      setYearAnchor(null);
   };

   return (
      <Stack direction="column" spacing={1} alignItems="flex-start">
         {/* TextField trigger */}
         <TextField
            size={size}
            variant="outlined"
            label="Select date range"
            value={start && end ? `${start} - ${end}` : ""}
            onClick={handleOpen}
            InputProps={{
               readOnly: true,
               endAdornment: (
                  <InputAdornment position="end">
                     <Icon icon="solar:calendar-bold-duotone" />
                  </InputAdornment>
               ),
            }}
            sx={{
               width: size === "small" ? 200 : 300,
               cursor: "pointer",
            }}
         />

         {/* Popover */}
         <CustomPopover anchorEl={anchorEl} onClose={handleClose} sx={{ p: 0 }}>
            <Box
               sx={{
                  borderRadius: 1,
                  boxShadow: theme.shadows[8],
                  border: `1px solid ${theme.palette.divider}`,
                  overflow: "hidden",

                  "& .rdrMonthAndYearWrapper, & .rdrMonths, & .rdrCalendarWrapper, & .rdrDefinedRangesWrapper, & .rdrStaticRange":
                     {
                        backgroundColor: "transparent!important",
                        color: theme.palette.text.primary + "!important",
                     },
                  "& .rdrDefinedRangesWrapper": {
                     borderColor: theme.palette.divider + "!important",
                     border: "0px!important",
                     height: "100%!important",
                  },
                  "& .rdrStaticRange": {
                     borderColor: theme.palette.divider + "!important",
                  },
                  "& .rdrStaticRangeSelected > .rdrStaticRangeLabel": {
                     fontWeight: 700 + "!important",
                     backgroundColor:
                        alpha(theme.palette.primary.main, 0.1) + "!important",
                     color: theme.palette.primary.main + "!important",
                  },
                  "& .rdrStaticRangeLabel": {
                     backgroundColor: "transparent!important",
                  },
                  "& .rdrStaticRangeLabel:hover": {
                     backgroundColor:
                        alpha(theme.palette.primary.main, 0.15) + "!important",
                  },
                  "& .rdrInputRangeInput": {
                     borderColor: theme.palette.divider + "!important",
                     backgroundColor: "transparent!important",
                     color: theme.palette.text.primary + "!important",
                  },
                  "& .rdrInputRangeInput:hover": {
                     borderColor: theme.palette.common.white + "!important",
                  },
                  "& .rdrInputRangeInput:focus": {
                     borderColor: theme.palette.primary.main + "!important",
                  },

                  "& .rdrNextPrevButton": {
                     backgroundColor:
                        theme.palette.mode === "dark"
                           ? alpha(theme.palette.background.default, 0.6) +
                             "!important"
                           : alpha(theme.palette.grey[300], 0.4) + "!important",
                     color: theme.palette.text.primary + "!important",
                  },
                  "& .rdrNextPrevButton:hover": {
                     backgroundColor:
                        theme.palette.mode === "dark"
                           ? alpha(theme.palette.background.default, 0.9) +
                             "!important"
                           : alpha(theme.palette.grey[300], 0.9) + "!important",
                     color: theme.palette.text.primary + "!important",
                  },
                  "& .rdrDay, & .rdrWeekDay, & .rdrMonthName": {
                     // color: theme.palette.text.primary + "!important",
                  },
                  "& .rdrDayNumber, & .rdrDayNumber > span": {
                     fontWeight: 500 + "!important",
                     color: theme.palette.text.primary + "!important",
                  },

                  "& .rdrDayPassive, & .rdrDayPassive > .rdrDayNumber > span": {
                     color: theme.palette.text.secondary + " !important",
                  },
                  "& .rdrDayNumber:hover": {
                     backgroundColor:
                        alpha(theme.palette.primary.main, 0.08) + "!important",
                     borderRadius: 50,
                  },
                  "& .rdrStartEdge ~ .rdrDayNumber > span, & .rdrInRange ~ .rdrDayNumber > span, & .rdrEndEdge ~ .rdrDayNumber > span":
                     {
                        color: theme.palette.common.white + " !important",
                     },
               }}
            >
               {/* 🧭 Month & Year selector */}
               <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                     px: 1.5,
                     py: 1,
                     borderBottom: `1px solid ${theme.palette.divider}`,
                  }}
               >
                  {/* Month button */}
                  <Button
                     size="small"
                     onClick={(e) => setMonthAnchor(e.currentTarget)}
                  >
                     <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {months[currentMonth.getMonth()]}
                     </Typography>
                     <Icon
                        icon="solar:alt-arrow-down-bold-duotone"
                        color="primary"
                     />
                  </Button>

                  {/* Year button */}
                  <Button
                     size="small"
                     onClick={(e) => setYearAnchor(e.currentTarget)}
                  >
                     <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {currentMonth.getFullYear()}
                     </Typography>
                     <Icon
                        icon="solar:alt-arrow-down-bold-duotone"
                        color="primary"
                     />
                  </Button>
               </Stack>
               <Stack
                  direction={"row"}
                  alignItems={"center"}
                  sx={{
                     backgroundColor:
                        alpha(theme.palette.background.paper, 0.6) +
                        "!important",
                  }}
               >
                  <DefinedRange ranges={range} onChange={handleChange} />
                  <DateRange
                     key={calendarKey}
                     ranges={range}
                     onChange={handleChange}
                     moveRangeOnFirstSelection={false}
                     editableDateInputs
                     showMonthAndYearPickers={false}
                     direction="horizontal"
                     rangeColors={[theme.palette.primary.main]}
                     months={1}
                     showDateDisplay={false}
                     weekdayDisplayFormat="EEE"
                     shownDate={currentMonth}
                     onShownDateChange={(date) => {
                        const updated = new Date(date);
                        setCurrentMonth(updated);
                        setCalendarKey((prev) => prev + 1);
                     }}
                  />
               </Stack>
            </Box>
         </CustomPopover>

         {/* Month popover */}
         <CustomPopover
            anchorEl={monthAnchor}
            onClose={() => setMonthAnchor(null)}
         >
            <Box sx={{ minWidth: 150, p: 0.5 }}>
               {months.map((month, idx) => (
                  <MenuItem
                     key={month}
                     onClick={() => handleMonthChange(idx)}
                     sx={{
                        borderRadius: 1,
                        fontWeight: idx === currentMonth.getMonth() ? 600 : 400,
                        bgcolor:
                           idx === currentMonth.getMonth()
                              ? alpha(theme.palette.primary.main, 0.1)
                              : "transparent",
                        "&:hover": {
                           bgcolor: alpha(theme.palette.primary.main, 0.15),
                        },
                     }}
                  >
                     {month}
                  </MenuItem>
               ))}
            </Box>
         </CustomPopover>

         {/* Year popover */}
         <CustomPopover
            anchorEl={yearAnchor}
            onClose={() => setYearAnchor(null)}
         >
            <Box sx={{ minWidth: 100, p: 0.5 }}>
               {years.map((year) => (
                  <MenuItem
                     key={year}
                     onClick={() => handleYearChange(year)}
                     sx={{
                        borderRadius: 1,
                        fontWeight:
                           year === currentMonth.getFullYear() ? 600 : 400,
                        bgcolor:
                           year === currentMonth.getFullYear()
                              ? alpha(theme.palette.primary.main, 0.1)
                              : "transparent",
                        "&:hover": {
                           bgcolor: alpha(theme.palette.primary.main, 0.15),
                        },
                     }}
                  >
                     {year}
                  </MenuItem>
               ))}
            </Box>
         </CustomPopover>
      </Stack>
   );
}
