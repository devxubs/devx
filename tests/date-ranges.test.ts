import { describe, it, expect } from "vitest";
import {
   fmtLocalDate,
   PRESET_OPTIONS,
   presetRange,
   type DatePresetKey,
} from "@src/lib/dateRanges";

// Phase 2 (Phase 1 plan §5): dashboard date-range presets.
// All math is browser-local; fixed `now` values are built with the
// local Date constructor at noon so no timezone / DST edge can
// shift the calendar day under test.

const local = (year: number, month: number, day: number) =>
   new Date(year, month - 1, day, 12, 0, 0);

type PresetKey = Exclude<DatePresetKey, "custom">;
const PRESET_KEYS: PresetKey[] = [
   "today",
   "yesterday",
   "thisWeek",
   "lastWeek",
   "thisMonth",
   "lastMonth",
   "thisYear",
];

const expectAllPresets = (
   now: Date,
   expected: Record<PresetKey, { startDate: string; endDate: string }>,
) => {
   for (const key of PRESET_KEYS) {
      expect(presetRange(key, now), key).toEqual(expected[key]);
   }
};

describe("fmtLocalDate", () => {
   it("formats a local date as YYYY-MM-DD with zero-padding", () => {
      expect(fmtLocalDate(local(2026, 1, 5))).toBe("2026-01-05");
      expect(fmtLocalDate(local(2026, 9, 9))).toBe("2026-09-09");
      expect(fmtLocalDate(local(2026, 11, 18))).toBe("2026-11-18");
      expect(fmtLocalDate(local(2026, 12, 31))).toBe("2026-12-31");
   });

   it("uses the local calendar day, not the UTC day", () => {
      // 00:30 local: a UTC conversion could report the previous day
      // for timezones ahead of UTC; the local getters must not.
      const earlyMorning = new Date(2026, 0, 1, 0, 30, 0);
      expect(fmtLocalDate(earlyMorning)).toBe("2026-01-01");
   });
});

describe("PRESET_OPTIONS", () => {
   it("lists exactly the eight presets with their exact labels, in order", () => {
      expect(PRESET_OPTIONS).toEqual([
         { key: "today", label: "Today" },
         { key: "yesterday", label: "Yesterday" },
         { key: "thisWeek", label: "This Week" },
         { key: "lastWeek", label: "Last Week" },
         { key: "thisMonth", label: "This Month" },
         { key: "lastMonth", label: "Last Month" },
         { key: "thisYear", label: "This Year" },
         { key: "custom", label: "Custom Date Range" },
      ]);
   });
});

describe("presetRange — mid-month Wednesday (2026-11-18)", () => {
   it("resolves every preset", () => {
      expectAllPresets(local(2026, 11, 18), {
         today: { startDate: "2026-11-18", endDate: "2026-11-18" },
         yesterday: { startDate: "2026-11-17", endDate: "2026-11-17" },
         thisWeek: { startDate: "2026-11-16", endDate: "2026-11-18" },
         lastWeek: { startDate: "2026-11-09", endDate: "2026-11-15" },
         thisMonth: { startDate: "2026-11-01", endDate: "2026-11-18" },
         lastMonth: { startDate: "2026-10-01", endDate: "2026-10-31" },
         thisYear: { startDate: "2026-01-01", endDate: "2026-11-18" },
      });
   });
});

describe("presetRange — a Monday (2026-11-16)", () => {
   it("resolves every preset; thisWeek starts and ends on the Monday itself", () => {
      expectAllPresets(local(2026, 11, 16), {
         today: { startDate: "2026-11-16", endDate: "2026-11-16" },
         yesterday: { startDate: "2026-11-15", endDate: "2026-11-15" },
         thisWeek: { startDate: "2026-11-16", endDate: "2026-11-16" },
         lastWeek: { startDate: "2026-11-09", endDate: "2026-11-15" },
         thisMonth: { startDate: "2026-11-01", endDate: "2026-11-16" },
         lastMonth: { startDate: "2026-10-01", endDate: "2026-10-31" },
         thisYear: { startDate: "2026-01-01", endDate: "2026-11-16" },
      });
   });
});

describe("presetRange — a Sunday (2026-11-22)", () => {
   it("resolves every preset; the Sunday belongs to the week started the preceding Monday", () => {
      expectAllPresets(local(2026, 11, 22), {
         today: { startDate: "2026-11-22", endDate: "2026-11-22" },
         yesterday: { startDate: "2026-11-21", endDate: "2026-11-21" },
         thisWeek: { startDate: "2026-11-16", endDate: "2026-11-22" },
         lastWeek: { startDate: "2026-11-09", endDate: "2026-11-15" },
         thisMonth: { startDate: "2026-11-01", endDate: "2026-11-22" },
         lastMonth: { startDate: "2026-10-01", endDate: "2026-10-31" },
         thisYear: { startDate: "2026-01-01", endDate: "2026-11-22" },
      });
   });
});

describe("presetRange — Jan 1 (2026-01-01)", () => {
   it("resolves every preset across the year boundary", () => {
      expectAllPresets(local(2026, 1, 1), {
         today: { startDate: "2026-01-01", endDate: "2026-01-01" },
         yesterday: { startDate: "2025-12-31", endDate: "2025-12-31" },
         thisWeek: { startDate: "2025-12-29", endDate: "2026-01-01" },
         lastWeek: { startDate: "2025-12-22", endDate: "2025-12-28" },
         thisMonth: { startDate: "2026-01-01", endDate: "2026-01-01" },
         lastMonth: { startDate: "2025-12-01", endDate: "2025-12-31" },
         thisYear: { startDate: "2026-01-01", endDate: "2026-01-01" },
      });
   });
});

describe("presetRange — Dec 31 (2026-12-31)", () => {
   it("resolves every preset at the end of the year", () => {
      expectAllPresets(local(2026, 12, 31), {
         today: { startDate: "2026-12-31", endDate: "2026-12-31" },
         yesterday: { startDate: "2026-12-30", endDate: "2026-12-30" },
         thisWeek: { startDate: "2026-12-28", endDate: "2026-12-31" },
         lastWeek: { startDate: "2026-12-21", endDate: "2026-12-27" },
         thisMonth: { startDate: "2026-12-01", endDate: "2026-12-31" },
         lastMonth: { startDate: "2026-11-01", endDate: "2026-11-30" },
         thisYear: { startDate: "2026-01-01", endDate: "2026-12-31" },
      });
   });
});

describe("presetRange — leap-year February", () => {
   it("now = 2028-02-15: lastMonth is the full January, thisMonth starts Feb 1", () => {
      const now = local(2028, 2, 15);
      expect(presetRange("lastMonth", now)).toEqual({
         startDate: "2028-01-01",
         endDate: "2028-01-31",
      });
      expect(presetRange("thisMonth", now)).toEqual({
         startDate: "2028-02-01",
         endDate: "2028-02-15",
      });
      expect(presetRange("thisWeek", now)).toEqual({
         startDate: "2028-02-14",
         endDate: "2028-02-15",
      });
   });

   it("now = 2028-03-01: lastMonth is Feb 1–29 of the leap year", () => {
      const now = local(2028, 3, 1);
      expect(presetRange("lastMonth", now)).toEqual({
         startDate: "2028-02-01",
         endDate: "2028-02-29",
      });
      expect(presetRange("yesterday", now)).toEqual({
         startDate: "2028-02-29",
         endDate: "2028-02-29",
      });
      expect(presetRange("thisWeek", now)).toEqual({
         startDate: "2028-02-28",
         endDate: "2028-03-01",
      });
   });
});

describe("presetRange — month boundary (now = 1st of a month, 2026-11-01, a Sunday)", () => {
   it("thisMonth collapses to start = end = the 1st, and lastMonth is the full previous month", () => {
      expectAllPresets(local(2026, 11, 1), {
         today: { startDate: "2026-11-01", endDate: "2026-11-01" },
         yesterday: { startDate: "2026-10-31", endDate: "2026-10-31" },
         thisWeek: { startDate: "2026-10-26", endDate: "2026-11-01" },
         lastWeek: { startDate: "2026-10-19", endDate: "2026-10-25" },
         thisMonth: { startDate: "2026-11-01", endDate: "2026-11-01" },
         lastMonth: { startDate: "2026-10-01", endDate: "2026-10-31" },
         thisYear: { startDate: "2026-01-01", endDate: "2026-11-01" },
      });
   });

   it("now = 2028-03-01 is also a 1st-of-month: thisMonth start = end", () => {
      expect(presetRange("thisMonth", local(2028, 3, 1))).toEqual({
         startDate: "2028-03-01",
         endDate: "2028-03-01",
      });
   });
});

describe("presetRange — purity and defaults", () => {
   it("does not mutate the `now` it is given", () => {
      const now = local(2026, 11, 18);
      const before = now.getTime();
      for (const key of PRESET_KEYS) presetRange(key, now);
      expect(now.getTime()).toBe(before);
   });

   it("defaults `now` to today when omitted", () => {
      const today = fmtLocalDate(new Date());
      expect(presetRange("today")).toEqual({
         startDate: today,
         endDate: today,
      });
   });
});
