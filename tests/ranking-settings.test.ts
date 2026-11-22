import { describe, it, expect } from "vitest";
import {
   DEFAULT_RANKING_SETTINGS,
   RANKING_SETTINGS_KEY,
   parseRankingSettings,
   validateRankingSettings,
   type RankingSettings,
} from "@src/lib/rankingSettings";

// Ranking settings (Phase 2, plan §6): stored as one customConfig
// key (employeeRankingSettings), validated strictly on save and
// parsed leniently on read (missing/invalid → defaults, never a
// throw). Hermetic: the lib under test is pure.

function validSettings(): RankingSettings {
   return {
      weights: {
         completedSales: 30,
         netRevenue: 25,
         confirmationRate: 20,
         handlingQuality: 15,
         cancellationControl: 10,
      },
      salesTargetMonthly: 60,
      revenueTargetMonthly: 300000,
      minEligibleOrders: 10,
      cancellationPenalty: 1.0,
      processingSlaHours: 48,
      autoRecalculate: true,
   };
}

describe("DEFAULT_RANKING_SETTINGS", () => {
   it("matches the owner-approved defaults and is itself valid", () => {
      expect(DEFAULT_RANKING_SETTINGS).toEqual(validSettings());
      expect(validateRankingSettings(DEFAULT_RANKING_SETTINGS)).toEqual({
         ok: true,
         value: validSettings(),
      });
      expect(RANKING_SETTINGS_KEY).toBe("employeeRankingSettings");
   });
});

describe("validateRankingSettings — happy path", () => {
   it("accepts the defaults", () => {
      const verdict = validateRankingSettings(validSettings());
      expect(verdict.ok).toBe(true);
      if (verdict.ok) expect(verdict.value).toEqual(validSettings());
   });

   it("accepts a zero weight as long as the sum is still 100", () => {
      const s = validSettings();
      s.weights = {
         completedSales: 50,
         netRevenue: 50,
         confirmationRate: 0,
         handlingQuality: 0,
         cancellationControl: 0,
      };
      expect(validateRankingSettings(s).ok).toBe(true);
   });

   it("accepts zero targets", () => {
      const s = validSettings();
      s.salesTargetMonthly = 0;
      s.revenueTargetMonthly = 0;
      expect(validateRankingSettings(s).ok).toBe(true);
   });

   it("returns a normalized value containing ONLY the known fields", () => {
      const s: any = validSettings();
      s.unknownTopLevel = "x";
      s.weights.extraWeight = 5;
      const verdict = validateRankingSettings(s);
      expect(verdict).toEqual({ ok: true, value: validSettings() });
   });

   it("rejects non-object input", () => {
      for (const bad of [null, undefined, "x", 42, [1, 2], true]) {
         const verdict = validateRankingSettings(bad);
         expect(verdict.ok).toBe(false);
         if (!verdict.ok) expect(verdict.error).toContain(RANKING_SETTINGS_KEY);
      }
   });
});

describe("validateRankingSettings — weight rules", () => {
   it("rejects a missing weight, naming the field", () => {
      const s: any = validSettings();
      delete s.weights.cancellationControl;
      const verdict = validateRankingSettings(s);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) {
         expect(verdict.error).toContain("weights.cancellationControl");
         expect(verdict.error).toContain("required");
      }
   });

   it("rejects a missing weights object", () => {
      const s: any = validSettings();
      delete s.weights;
      const verdict = validateRankingSettings(s);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) expect(verdict.error).toContain("weights");
   });

   it("rejects a negative weight, naming the field", () => {
      const s = validSettings();
      s.weights.handlingQuality = -5;
      s.weights.completedSales = 35; // keep the sum at 100
      const verdict = validateRankingSettings(s);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) {
         expect(verdict.error).toContain("weights.handlingQuality");
         expect(verdict.error).toContain(">= 0");
      }
   });

   it("rejects weights summing to 99 and to 101", () => {
      const low = validSettings();
      low.weights.cancellationControl = 9;
      const lowVerdict = validateRankingSettings(low);
      expect(lowVerdict.ok).toBe(false);
      if (!lowVerdict.ok) {
         expect(lowVerdict.error).toContain("exactly 100");
         expect(lowVerdict.error).toContain("99");
      }

      const high = validSettings();
      high.weights.cancellationControl = 11;
      const highVerdict = validateRankingSettings(high);
      expect(highVerdict.ok).toBe(false);
      if (!highVerdict.ok) {
         expect(highVerdict.error).toContain("exactly 100");
         expect(highVerdict.error).toContain("101");
      }
   });

   it("rejects a non-number weight", () => {
      const s: any = validSettings();
      s.weights.netRevenue = "25";
      const verdict = validateRankingSettings(s);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) {
         expect(verdict.error).toContain("weights.netRevenue");
         expect(verdict.error).toContain("finite number");
      }
   });

   it("rejects NaN and Infinity weights", () => {
      for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
         const s = validSettings();
         s.weights.completedSales = bad;
         expect(validateRankingSettings(s).ok).toBe(false);
      }
   });
});

describe("validateRankingSettings — field bounds", () => {
   it("rejects minEligibleOrders of 0", () => {
      const s = validSettings();
      s.minEligibleOrders = 0;
      const verdict = validateRankingSettings(s);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) {
         expect(verdict.error).toContain("minEligibleOrders");
         expect(verdict.error).toContain(">= 1");
      }
   });

   it("rejects a non-integer minEligibleOrders", () => {
      const s = validSettings();
      s.minEligibleOrders = 1.5;
      const verdict = validateRankingSettings(s);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) {
         expect(verdict.error).toContain("minEligibleOrders");
         expect(verdict.error).toContain("integer");
      }
   });

   it("accepts minEligibleOrders of 1", () => {
      const s = validSettings();
      s.minEligibleOrders = 1;
      expect(validateRankingSettings(s).ok).toBe(true);
   });

   it("rejects a cancellationPenalty of 0 and a negative one", () => {
      for (const bad of [0, -0.5]) {
         const s = validSettings();
         s.cancellationPenalty = bad;
         const verdict = validateRankingSettings(s);
         expect(verdict.ok).toBe(false);
         if (!verdict.ok) {
            expect(verdict.error).toContain("cancellationPenalty");
            expect(verdict.error).toContain("> 0");
         }
      }
   });

   it("rejects a processingSlaHours of 0 and a negative one", () => {
      for (const bad of [0, -48]) {
         const s = validSettings();
         s.processingSlaHours = bad;
         const verdict = validateRankingSettings(s);
         expect(verdict.ok).toBe(false);
         if (!verdict.ok) {
            expect(verdict.error).toContain("processingSlaHours");
            expect(verdict.error).toContain("> 0");
         }
      }
   });

   it("rejects negative targets, naming the field", () => {
      const s1 = validSettings();
      s1.salesTargetMonthly = -1;
      const v1 = validateRankingSettings(s1);
      expect(v1.ok).toBe(false);
      if (!v1.ok) {
         expect(v1.error).toContain("salesTargetMonthly");
         expect(v1.error).toContain(">= 0");
      }

      const s2 = validSettings();
      s2.revenueTargetMonthly = -300000;
      const v2 = validateRankingSettings(s2);
      expect(v2.ok).toBe(false);
      if (!v2.ok) {
         expect(v2.error).toContain("revenueTargetMonthly");
         expect(v2.error).toContain(">= 0");
      }
   });

   it("rejects non-finite targets", () => {
      const s = validSettings();
      s.revenueTargetMonthly = Number.POSITIVE_INFINITY;
      expect(validateRankingSettings(s).ok).toBe(false);
   });

   it("rejects a non-boolean autoRecalculate", () => {
      for (const bad of ["true", 1, 0, null, undefined]) {
         const s: any = validSettings();
         s.autoRecalculate = bad;
         const verdict = validateRankingSettings(s);
         expect(verdict.ok).toBe(false);
         if (!verdict.ok) {
            expect(verdict.error).toContain("autoRecalculate");
            expect(verdict.error).toContain("boolean");
         }
      }
   });

   it("accepts autoRecalculate false", () => {
      const s = validSettings();
      s.autoRecalculate = false;
      expect(validateRankingSettings(s).ok).toBe(true);
   });
});

describe("parseRankingSettings", () => {
   it("returns the defaults when the key is missing", () => {
      expect(parseRankingSettings(null)).toEqual(DEFAULT_RANKING_SETTINGS);
      expect(parseRankingSettings(undefined)).toEqual(DEFAULT_RANKING_SETTINGS);
      expect(parseRankingSettings({})).toEqual(DEFAULT_RANKING_SETTINGS);
      expect(
         parseRankingSettings({ defaultCourierStatus: "Pending" }),
      ).toEqual(DEFAULT_RANKING_SETTINGS);
   });

   it("returns the defaults for garbage configs and never throws", () => {
      for (const garbage of [
         "x",
         42,
         [1, 2],
         { employeeRankingSettings: "nope" },
         { employeeRankingSettings: null },
         { employeeRankingSettings: { weights: { completedSales: 100 } } },
         {
            employeeRankingSettings: {
               ...validSettings(),
               minEligibleOrders: 0,
            },
         },
      ]) {
         expect(parseRankingSettings(garbage)).toEqual(
            DEFAULT_RANKING_SETTINGS,
         );
      }
   });

   it("returns the stored settings when they are valid", () => {
      const stored = validSettings();
      stored.salesTargetMonthly = 80;
      stored.weights = {
         completedSales: 40,
         netRevenue: 20,
         confirmationRate: 20,
         handlingQuality: 10,
         cancellationControl: 10,
      };
      expect(
         parseRankingSettings({ employeeRankingSettings: stored }),
      ).toEqual(stored);
   });

   it("normalizes a valid stored value (unknown keys dropped)", () => {
      const stored: any = validSettings();
      stored.junk = true;
      expect(
         parseRankingSettings({ employeeRankingSettings: stored }),
      ).toEqual(validSettings());
   });
});
