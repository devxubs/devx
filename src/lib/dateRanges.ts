/**
 * Dashboard date-range presets (Phase 2, from the approved
 * Phase 1 plan §5).
 *
 * Pure, local-time helpers: every range is a pair of browser-local
 * `YYYY-MM-DD` strings, computed with the same local getters the
 * dashboard has always used — no UTC conversion, so a range never
 * shifts a day for users ahead of / behind UTC.
 *
 * Weeks start on Monday (the convention already used by
 * `src/components/AnalyticsGraph.tsx`): a Sunday belongs to the
 * week that started on the preceding Monday.
 */

export type DatePresetKey =
   | "today"
   | "yesterday"
   | "thisWeek"
   | "lastWeek"
   | "thisMonth"
   | "lastMonth"
   | "thisYear"
   | "custom";

export const PRESET_OPTIONS: { key: DatePresetKey; label: string }[] = [
   { key: "today", label: "Today" },
   { key: "yesterday", label: "Yesterday" },
   { key: "thisWeek", label: "This Week" },
   { key: "lastWeek", label: "Last Week" },
   { key: "thisMonth", label: "This Month" },
   { key: "lastMonth", label: "Last Month" },
   { key: "thisYear", label: "This Year" },
   { key: "custom", label: "Custom Date Range" },
];

/**
 * Browser-local `YYYY-MM-DD` for a Date.
 *
 * Moved verbatim from `src/Pages/admin/Dashboard/index.tsx`, where
 * it formatted every dashboard range parameter: local getters with
 * zero-padding, never `toISOString()` (which is UTC).
 */
export const fmtLocalDate = (d: Date): string =>
   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
   ).padStart(2, "0")}`;

/** Local midnight at the start of the given date's calendar day. */
const startOfLocalDay = (d: Date): Date =>
   new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** The date `days` calendar days after `d` (local, day-overflow safe). */
const addLocalDays = (d: Date, days: number): Date =>
   new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

/**
 * Monday of the week containing `d` (Monday-start weeks).
 * Follows AnalyticsGraph.tsx: Sunday (getDay() === 0) steps back
 * six days to the preceding Monday; any other day steps back to
 * its own week's Monday.
 */
const mondayOfWeek = (d: Date): Date => {
   const day = d.getDay();
   const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
   return new Date(d.getFullYear(), d.getMonth(), diff);
};

/**
 * Inclusive local date range for a preset, relative to `now`
 * (defaults to the current moment). Pure: `now` is never mutated.
 *
 * - today:     [today, today]
 * - yesterday: [today − 1, today − 1]
 * - thisWeek:  [Monday of this week, today]
 * - lastWeek:  [Monday of last week, Sunday of last week]
 * - thisMonth: [1st of this month, today]
 * - lastMonth: [1st of last month, last day of last month]
 * - thisYear:  [Jan 1 of this year, today]
 */
export function presetRange(
   key: Exclude<DatePresetKey, "custom">,
   now: Date = new Date(),
): { startDate: string; endDate: string } {
   const today = startOfLocalDay(now);

   switch (key) {
      case "today":
         return { startDate: fmtLocalDate(today), endDate: fmtLocalDate(today) };
      case "yesterday": {
         const yesterday = addLocalDays(today, -1);
         return {
            startDate: fmtLocalDate(yesterday),
            endDate: fmtLocalDate(yesterday),
         };
      }
      case "thisWeek":
         return {
            startDate: fmtLocalDate(mondayOfWeek(today)),
            endDate: fmtLocalDate(today),
         };
      case "lastWeek": {
         const lastMonday = addLocalDays(mondayOfWeek(today), -7);
         const lastSunday = addLocalDays(lastMonday, 6);
         return {
            startDate: fmtLocalDate(lastMonday),
            endDate: fmtLocalDate(lastSunday),
         };
      }
      case "thisMonth": {
         const first = new Date(today.getFullYear(), today.getMonth(), 1);
         return { startDate: fmtLocalDate(first), endDate: fmtLocalDate(today) };
      }
      case "lastMonth": {
         const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
         // Day 0 of the current month is the last day of the previous one.
         const last = new Date(today.getFullYear(), today.getMonth(), 0);
         return { startDate: fmtLocalDate(first), endDate: fmtLocalDate(last) };
      }
      case "thisYear": {
         const first = new Date(today.getFullYear(), 0, 1);
         return { startDate: fmtLocalDate(first), endDate: fmtLocalDate(today) };
      }
   }
}
