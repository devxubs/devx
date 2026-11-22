import { describe, it, expect } from "vitest";
import {
   proratedTarget,
   scoreEmployees,
   type EmployeePeriodAggregate,
} from "@src/lib/ranking/engine";
import type { RankingSettings } from "@src/lib/rankingSettings";

// Plan §4.1–§4.6 formula parity: target-ratio scores with caps,
// proration with a floor of 1, zero-denominator rules, the S5
// clamp + penalty multiplier, the provisional split, and the full
// deterministic tie-break chain.

const settings: RankingSettings = {
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

const agg = (
   overrides: Partial<EmployeePeriodAggregate> = {},
): EmployeePeriodAggregate => ({
   employeeId: "user-1",
   employeeCustomId: "EP_1",
   employeeName: "Employee One",
   roleName: "Staff",
   completedSales: 0,
   netRevenue: 0,
   confirmations: 0,
   preConfirmationCancellations: 0,
   slaOnTime: 0,
   slaEvaluated: 0,
   handledOrders: 20,
   attributableCancellations: 0,
   evidence: {
      auditLogTransitions: 0,
      auditHistoryTransitions: 0,
      impliedTransitions: 0,
      unattributedOrders: 0,
   },
   ...overrides,
});

describe("proratedTarget (§4.1/§4.2)", () => {
   it("full month is the monthly target", () => {
      expect(proratedTarget(60, 30)).toBe(60);
      expect(proratedTarget(300000, 30)).toBe(300000);
   });

   it("prorates linearly by days/30", () => {
      expect(proratedTarget(60, 15)).toBe(30);
      expect(proratedTarget(60, 10)).toBe(20);
      expect(proratedTarget(300000, 7)).toBe(70000);
   });

   it("floors at 1 (zero target / zero days can never divide by zero)", () => {
      expect(proratedTarget(0, 30)).toBe(1);
      expect(proratedTarget(60, 0)).toBe(1);
   });
});

describe("scoreEmployees — metric formulas", () => {
   it("S1: completed-sales ratio against the prorated target", () => {
      const [s] = scoreEmployees([agg({ completedSales: 30 })], settings, 30);
      expect(s.scores.completedSales).toBe(50);
   });

   it("S1: prorated period — half a month halves the target", () => {
      const [s] = scoreEmployees([agg({ completedSales: 30 })], settings, 15);
      expect(s.scores.completedSales).toBe(100);
   });

   it("S1/S2: scores cap at 100", () => {
      const [s] = scoreEmployees(
         [agg({ completedSales: 120, netRevenue: 900000 })],
         settings,
         30,
      );
      expect(s.scores.completedSales).toBe(100);
      expect(s.scores.netRevenue).toBe(100);
   });

   it("S2: revenue ratio against the prorated target", () => {
      const [s] = scoreEmployees([agg({ netRevenue: 150000 })], settings, 30);
      expect(s.scores.netRevenue).toBe(50);
   });

   it("S3: confirmation rate Conf / (Conf + CancPre)", () => {
      const [s] = scoreEmployees(
         [agg({ confirmations: 8, preConfirmationCancellations: 2 })],
         settings,
         30,
      );
      expect(s.scores.confirmationRate).toBe(80);
   });

   it("S3: zero denominator ⇒ 0 (not 100, not NaN)", () => {
      const [s] = scoreEmployees(
         [agg({ confirmations: 0, preConfirmationCancellations: 0 })],
         settings,
         30,
      );
      expect(s.scores.confirmationRate).toBe(0);
   });

   it("S4: SLA adherence OnTime / Evaluated", () => {
      const [s] = scoreEmployees(
         [agg({ slaOnTime: 3, slaEvaluated: 4 })],
         settings,
         30,
      );
      expect(s.scores.handlingQuality).toBe(75);
   });

   it("S4: nothing evaluated ⇒ 0", () => {
      const [s] = scoreEmployees(
         [agg({ slaOnTime: 0, slaEvaluated: 0 })],
         settings,
         30,
      );
      expect(s.scores.handlingQuality).toBe(0);
   });

   it("S5: no attributable cancellations ⇒ 100", () => {
      const [s] = scoreEmployees(
         [agg({ attributableCancellations: 0, handledOrders: 10 })],
         settings,
         30,
      );
      expect(s.scores.cancellationControl).toBe(100);
   });

   it("S5: cancel rate × 100 × penalty is deducted", () => {
      const [s] = scoreEmployees(
         [agg({ attributableCancellations: 1, handledOrders: 10 })],
         settings,
         30,
      );
      expect(s.scores.cancellationControl).toBe(90);
   });

   it("S5: the settings penalty multiplier scales the deduction", () => {
      const [s] = scoreEmployees(
         [agg({ attributableCancellations: 1, handledOrders: 10 })],
         { ...settings, cancellationPenalty: 2 },
         30,
      );
      expect(s.scores.cancellationControl).toBe(80);
   });

   it("S5: clamps at 0 and uses max(H, 1)", () => {
      const [s] = scoreEmployees(
         [agg({ attributableCancellations: 20, handledOrders: 10 })],
         settings,
         30,
      );
      expect(s.scores.cancellationControl).toBe(0);

      const [zero] = scoreEmployees(
         [agg({ attributableCancellations: 1, handledOrders: 0 })],
         settings,
         30,
      );
      expect(zero.scores.cancellationControl).toBe(0);
   });

   it("final score is the weighted sum, unrounded", () => {
      const [s] = scoreEmployees(
         [
            agg({
               completedSales: 30, // S1 = 50
               netRevenue: 150000, // S2 = 50
               confirmations: 8,
               preConfirmationCancellations: 2, // S3 = 80
               slaOnTime: 3,
               slaEvaluated: 4, // S4 = 75
               handledOrders: 20,
               attributableCancellations: 1, // S5 = 95
            }),
         ],
         settings,
         30,
      );
      // 0.30·50 + 0.25·50 + 0.20·80 + 0.15·75 + 0.10·95 = 64.25
      expect(s.finalScore).toBeCloseTo(64.25, 10);
   });

   it("weights come from settings, not hard-coded defaults", () => {
      const salesOnly: RankingSettings = {
         ...settings,
         weights: {
            completedSales: 100,
            netRevenue: 0,
            confirmationRate: 0,
            handlingQuality: 0,
            cancellationControl: 0,
         },
      };
      const [s] = scoreEmployees(
         [
            agg({
               completedSales: 30, // S1 = 50
               netRevenue: 300000, // would be S2 = 100 — must not count
               confirmations: 10,
               preConfirmationCancellations: 0,
            }),
         ],
         salesOnly,
         30,
      );
      expect(s.finalScore).toBeCloseTo(50, 10);
   });

   it("empty input ⇒ empty output", () => {
      expect(scoreEmployees([], settings, 30)).toEqual([]);
   });
});

describe("scoreEmployees — provisional split (§4.0)", () => {
   it("H below minEligibleOrders ⇒ provisional, rank null", () => {
      const [s] = scoreEmployees([agg({ handledOrders: 9 })], settings, 30);
      expect(s.provisional).toBe(true);
      expect(s.rank).toBeNull();
   });

   it("H exactly at the threshold ⇒ ranked", () => {
      const [s] = scoreEmployees([agg({ handledOrders: 10 })], settings, 30);
      expect(s.provisional).toBe(false);
      expect(s.rank).toBe(1);
   });

   it("provisional employees sort after ALL ranked ones, even with a higher score", () => {
      const result = scoreEmployees(
         [
            agg({ employeeId: "prov", handledOrders: 5, completedSales: 60 }),
            agg({ employeeId: "ranked", handledOrders: 10, completedSales: 0 }),
         ],
         settings,
         30,
      );
      expect(result.map((r) => r.employeeId)).toEqual(["ranked", "prov"]);
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBeNull();
      // The provisional employee still gets a fully computed score.
      expect(result[1].finalScore).toBeGreaterThan(result[0].finalScore);
   });

   it("ranks are ordinal 1..N with no gaps or sharing", () => {
      const result = scoreEmployees(
         [
            agg({ employeeId: "a", completedSales: 10 }),
            agg({ employeeId: "b", completedSales: 30 }),
            agg({ employeeId: "c", completedSales: 20 }),
         ],
         settings,
         30,
      );
      expect(result.map((r) => [r.employeeId, r.rank])).toEqual([
         ["b", 1],
         ["c", 2],
         ["a", 3],
      ]);
   });
});

describe("scoreEmployees — tie-break chain (§4.6)", () => {
   it("final desc is the primary key", () => {
      const result = scoreEmployees(
         [
            agg({ employeeId: "low", completedSales: 10 }),
            agg({ employeeId: "high", completedSales: 20 }),
         ],
         settings,
         30,
      );
      expect(result[0].employeeId).toBe("high");
   });

   it("C desc breaks a final tie (both capped at S1 = 100)", () => {
      const salesOnly: RankingSettings = {
         ...settings,
         weights: {
            completedSales: 100,
            netRevenue: 0,
            confirmationRate: 0,
            handlingQuality: 0,
            cancellationControl: 0,
         },
      };
      const result = scoreEmployees(
         [
            agg({ employeeId: "c60", completedSales: 60 }),
            agg({ employeeId: "c120", completedSales: 120 }),
         ],
         salesOnly,
         30,
      );
      expect(result[0].finalScore).toBe(result[1].finalScore);
      expect(result[0].employeeId).toBe("c120");
   });

   it("R desc breaks a tie when final and C are equal", () => {
      const revenueOnly: RankingSettings = {
         ...settings,
         weights: {
            completedSales: 0,
            netRevenue: 100,
            confirmationRate: 0,
            handlingQuality: 0,
            cancellationControl: 0,
         },
      };
      const result = scoreEmployees(
         [
            agg({ employeeId: "r300", completedSales: 5, netRevenue: 300000 }),
            agg({ employeeId: "r600", completedSales: 5, netRevenue: 600000 }),
         ],
         revenueOnly,
         30,
      );
      expect(result[0].finalScore).toBe(result[1].finalScore);
      expect(result[0].employeeId).toBe("r600");
   });

   it("S3 desc breaks a tie when final, C and R are equal", () => {
      const qualityOnly: RankingSettings = {
         ...settings,
         weights: {
            completedSales: 0,
            netRevenue: 0,
            confirmationRate: 0,
            handlingQuality: 100,
            cancellationControl: 0,
         },
      };
      const base = {
         completedSales: 5,
         netRevenue: 1000,
         slaOnTime: 4,
         slaEvaluated: 4, // S4 = 100 for both ⇒ final tie
      };
      const result = scoreEmployees(
         [
            agg({
               ...base,
               employeeId: "s3low",
               confirmations: 1,
               preConfirmationCancellations: 1, // S3 = 50
            }),
            agg({
               ...base,
               employeeId: "s3high",
               confirmations: 3,
               preConfirmationCancellations: 1, // S3 = 75
            }),
         ],
         qualityOnly,
         30,
      );
      expect(result[0].finalScore).toBe(result[1].finalScore);
      expect(result[0].employeeId).toBe("s3high");
   });

   it("A asc breaks a tie when final, C, R and S3 are equal", () => {
      const cancelOnly: RankingSettings = {
         ...settings,
         weights: {
            completedSales: 0,
            netRevenue: 0,
            confirmationRate: 0,
            handlingQuality: 0,
            cancellationControl: 100,
         },
      };
      const base = {
         completedSales: 5,
         netRevenue: 1000,
         confirmations: 4,
         preConfirmationCancellations: 1, // S3 = 80 for both
      };
      const result = scoreEmployees(
         [
            // S5 = 100 − (2/20)·100 = 90
            agg({ ...base, employeeId: "a2", attributableCancellations: 2, handledOrders: 20 }),
            // S5 = 100 − (1/10)·100 = 90
            agg({ ...base, employeeId: "a1", attributableCancellations: 1, handledOrders: 10 }),
         ],
         cancelOnly,
         30,
      );
      expect(result[0].finalScore).toBe(result[1].finalScore);
      expect(result[0].employeeId).toBe("a1");
   });

   it("EP numeric asc breaks a full metric tie — numerically, not lexicographically", () => {
      const result = scoreEmployees(
         [
            agg({ employeeId: "u10", employeeCustomId: "EP_10", completedSales: 10 }),
            agg({ employeeId: "u2", employeeCustomId: "EP_2", completedSales: 10 }),
         ],
         settings,
         30,
      );
      expect(result.map((r) => r.employeeId)).toEqual(["u2", "u10"]);
   });

   it("an unparseable/missing EP sorts after any parseable EP", () => {
      const result = scoreEmployees(
         [
            agg({ employeeId: "none", employeeCustomId: null, completedSales: 10 }),
            agg({ employeeId: "ep99", employeeCustomId: "EP_99", completedSales: 10 }),
         ],
         settings,
         30,
      );
      expect(result.map((r) => r.employeeId)).toEqual(["ep99", "none"]);
   });

   it("employeeId asc is the final, total tie-break", () => {
      const result = scoreEmployees(
         [
            agg({ employeeId: "user-b", employeeCustomId: null, completedSales: 10 }),
            agg({ employeeId: "user-a", employeeCustomId: null, completedSales: 10 }),
         ],
         settings,
         30,
      );
      expect(result.map((r) => r.employeeId)).toEqual(["user-a", "user-b"]);
      expect(result.map((r) => r.rank)).toEqual([1, 2]);
   });

   it("the same chain orders the provisional group among themselves", () => {
      const result = scoreEmployees(
         [
            agg({ employeeId: "p-low", handledOrders: 3, completedSales: 5 }),
            agg({ employeeId: "p-high", handledOrders: 3, completedSales: 50 }),
         ],
         settings,
         30,
      );
      expect(result.map((r) => r.employeeId)).toEqual(["p-high", "p-low"]);
      expect(result.every((r) => r.rank === null)).toBe(true);
   });
});
