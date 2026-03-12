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
import { on } from "events";

type Props = {
   onChange?: (value: [Date | null, Date | null]) => void;
   value?: [Date | null, Date | null];
   size?: "small" | "medium";
   title?: string;
   type?: "single" | "range" | "month-year";
};

export default function DateRangePickerCustom({
   onChange,
   value,
   size,
   title,
   type = "range",
}: Props) {
   const theme = useTheme();

   const [range, setRange] = React.useState<Range[]>([
      {
         startDate: value?.[0] || undefined,
         endDate: value?.[1] || undefined,
         key: "selection",
      },
   ]);

   const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
   const [monthAnchor, setMonthAnchor] = React.useState<HTMLElement | null>(
      null,
   );
   const [yearAnchor, setYearAnchor] = React.useState<HTMLElement | null>(null);
   const [currentMonth, setCurrentMonth] = React.useState(new Date());
   const [calendarKey, setCalendarKey] = React.useState(0);

   // Lists
   const months = React.useMemo(
      () =>
         Array.from({ length: 12 }, (_, i) =>
            new Date(0, i).toLocaleString("default", { month: "long" }),
         ),
      [],
   );

   const years = React.useMemo(
      () =>
         Array.from(
            { length: 15 },
            (_, i) => new Date().getFullYear() - 14 + i,
         ),
      [],
   );

   // Sync value
   useEffect(() => {
      if (!value) return;

      const start = value[0] ? new Date(value[0]) : undefined;
      const end = value[1] ? new Date(value[1]) : undefined;

      setRange([
         {
            startDate: start,
            endDate: end,
            key: "selection",
         },
      ]);

      if (start) {
         setCurrentMonth(start);
         setCalendarKey((k) => k + 1);
      }
   }, [value]);

   // Display value
   const displayValue = React.useMemo(() => {
      const s = range[0]?.startDate;
      const e = range[0]?.endDate;
      if (!s) return "";

      if (type === "single") return format(s, "dd MMM yyyy");
      if (type === "month-year") return format(s, "MMMM yyyy");

      return e
         ? `${format(s, "dd MMM yyyy")} - ${format(e, "dd MMM yyyy")}`
         : "";
   }, [range, type]);

   // Calendar change
   const handleChange = (item: any) => {
      const sel = item.selection;

      if (type === "single") {
         const d = sel.startDate || null;
         setRange([
            {
               startDate: d ?? undefined,
               endDate: d ?? undefined,
               key: "selection",
            },
         ]);
      }

      setRange([sel]);
   };

   // Month only
   const handleMonthOnly = (m: number) => {
      setCurrentMonth((prev) => {
         const d = new Date(prev);
         d.setMonth(m);
         return d;
      });

      const y =
         range[0]?.startDate?.getFullYear() ?? currentMonth.getFullYear();

      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);

      setRange([{ startDate: start, endDate: end, key: "selection" }]);

      setMonthAnchor(null);
   };

   // Year only
   const handleYearOnly = (y: number) => {
      setCurrentMonth(new Date(y, 0, 1));

      const start = new Date(y, 0, 1);
      const end = new Date(y, 0, 31);

      setRange([{ startDate: start, endDate: end, key: "selection" }]);

      setYearAnchor(null);
   };

   // Reset
   const handleReset = () => {
      const newD = new Date();

      setCurrentMonth(new Date(newD.getFullYear(), 0, 1));

      setRange([
         {
            startDate: undefined,
            endDate: undefined,
            key: "selection",
         },
      ]);

      setCalendarKey((k) => k + 1);
   };

   return (
      <Stack direction="column" spacing={1} alignItems="flex-start">
         {/* INPUT (UNCHANGED DESIGN) */}
         <TextField
            fullWidth
            focused={Boolean(anchorEl)}
            size={size}
            // label={title || "Select"}
            placeholder={title || "Select"}
            value={displayValue}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            InputProps={{
               readOnly: true,
               endAdornment: (
                  <InputAdornment position="end">
                     <Icon icon="solar:calendar-bold-duotone" />
                  </InputAdornment>
               ),
            }}
            sx={{
               "& .MuiInputLabel-root": {
                  maxWidth: "calc(100% - 60px)", // reserve space for icon
               },
            }}
         />
         {/* Popover */}
         <CustomPopover
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            sx={{ p: 0 }}
         >
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
                     backgroundColor: "transparent !important",
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
               {type !== "month-year" && (
                  <Stack
                     direction="row"
                     justifyContent="space-between"
                     px={1.5}
                     py={1}
                     borderBottom={`1px solid ${theme.palette.divider}`}
                  >
                     <Button
                        size="small"
                        onClick={(e) => setMonthAnchor(e.currentTarget)}
                     >
                        {months[currentMonth.getMonth()]}
                     </Button>
                     <Button
                        size="small"
                        onClick={(e) => setYearAnchor(e.currentTarget)}
                     >
                        {currentMonth.getFullYear()}
                     </Button>
                  </Stack>
               )}

               <Stack direction="row">
                  {type === "range" && (
                     <DefinedRange ranges={range} onChange={handleChange} />
                  )}

                  {(type === "single" || type === "range") && (
                     <DateRange
                        key={calendarKey}
                        ranges={range}
                        onChange={handleChange}
                        moveRangeOnFirstSelection={false}
                        preventSnapRefocus
                        dragSelectionEnabled={true}
                        showMonthAndYearPickers={false}
                        months={1}
                        showDateDisplay={false}
                        shownDate={currentMonth}
                        rangeColors={[theme.palette.primary.main]}
                     />
                  )}
                  {type === "month-year" && (
                     <Stack direction="column" p={2} spacing={2}>
                        <Typography variant="h6">
                           Select Month and Year
                        </Typography>
                        <Stack direction={"row"}>
                           <Box
                              sx={{
                                 p: 1,
                                 display: "grid",
                                 gridTemplateColumns: "repeat(3, 1fr)",
                                 gap: 1,
                              }}
                           >
                              {months.map((m, i) => (
                                 <Button
                                    key={m}
                                    size="small"
                                    onClick={() => handleMonthOnly(i)}
                                    color={
                                       currentMonth.getMonth() === i
                                          ? "primary"
                                          : "inherit"
                                    }
                                    variant={
                                       currentMonth.getMonth() === i
                                          ? "contained"
                                          : "text"
                                    }
                                    sx={{
                                       fontWeight:
                                          currentMonth.getMonth() === i
                                             ? 600
                                             : 400,
                                    }}
                                 >
                                    {m}
                                 </Button>
                              ))}
                           </Box>
                           <Box
                              sx={{
                                 p: 1,
                                 display: "grid",
                                 gridTemplateColumns: "repeat(3, 1fr)",
                                 gap: 1,
                              }}
                           >
                              {years.map((y, i) => (
                                 <Button
                                    key={y}
                                    size="small"
                                    onClick={() => handleYearOnly(y)}
                                    color={
                                       currentMonth.getFullYear() === y
                                          ? "primary"
                                          : "inherit"
                                    }
                                    variant={
                                       currentMonth.getFullYear() === y
                                          ? "contained"
                                          : "text"
                                    }
                                    sx={{
                                       fontWeight:
                                          currentMonth.getFullYear() === y
                                             ? 600
                                             : 400,
                                    }}
                                 >
                                    {y}
                                 </Button>
                              ))}
                           </Box>
                        </Stack>
                     </Stack>
                  )}
               </Stack>

               {/* FOOTER */}
               <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={1}
                  p={1}
                  borderTop={`1px solid ${theme.palette.divider}`}
               >
                  <Button size="small" onClick={handleReset}>
                     Reset
                  </Button>
                  <Button
                     size="small"
                     variant="contained"
                     onClick={() => {
                        onChange?.([
                           range[0]?.startDate || null,
                           range[0]?.endDate || null,
                        ]);
                        setAnchorEl(null);
                     }}
                  >
                     Apply
                  </Button>
               </Stack>
            </Box>
         </CustomPopover>

         {/* MONTH UI */}
         <>
            {/* MONTH POPOVER (for single / range only) */}
            <CustomPopover
               anchorEl={monthAnchor}
               onClose={() => setMonthAnchor(null)}
            >
               {months.map((m, i) => (
                  <MenuItem
                     key={m}
                     onClick={() => {
                        handleMonthOnly(i);
                        setCurrentMonth(
                           new Date(currentMonth.getFullYear(), i, 1),
                        );
                     }}
                  >
                     {m}
                  </MenuItem>
               ))}
            </CustomPopover>
         </>

         {/* YEAR POPOVER (SAME DESIGN) */}
         <CustomPopover
            anchorEl={yearAnchor}
            onClose={() => setYearAnchor(null)}
         >
            {years.map((y) => (
               <MenuItem
                  key={y}
                  onClick={() => {
                     handleYearOnly(y);
                     setCurrentMonth(new Date(y, currentMonth.getMonth(), 1));
                  }}
               >
                  {y}
               </MenuItem>
            ))}
         </CustomPopover>
      </Stack>
   );
}
