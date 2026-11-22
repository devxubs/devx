/**
 * Smart Employee Ranking — pure scoring engine (plan §4.1–§4.6).
 *
 * No I/O, no rounding: scores are full floats end to end (the
 * display layer rounds to 2 decimals). Inputs are per-employee
 * period aggregates produced by src/lib/ranking/attribution.ts;
 * all five formulas, the target proration, the provisional split
 * and the deterministic tie-break chain come straight from the
 * approved Phase 1 plan.
 */
import type { RankingSettings } from "../rankingSettings";

export interface EmployeePeriodAggregate {
   employeeId: string;
   employeeCustomId: string | null;
   employeeName: string;
   roleName?: string | null;
   /** C(E) — distinct orders completed by E, still DELIVERED/COMPLETED. */
   completedSales: number;
   /** R(E) — Σ Order.total over the C(E) order set. */
   netRevenue: number;
   /** Conf(E) — distinct orders whose first confirm-class transition is E's. */
   confirmations: number;
   /** CancPre(E) — E's cancels from PENDING/HOLD. */
   preConfirmationCancellations: number;
   /** OnTime(E) — confirmations within the processing SLA. */
   slaOnTime: number;
   /** Conf(E) orders evaluated for SLA (= Conf(E) when data is complete). */
   slaEvaluated: number;
   /** H(E) — distinct orders with ≥1 attributed transition by E. */
   handledOrders: number;
   /** A(E) — cancellations classified employee-attributable (§4.5). */
   attributableCancellations: number;
   evidence: {
      auditLogTransitions: number;
      auditHistoryTransitions: number;
      impliedTransitions: number;
      unattributedOrders: number;
   };
}

export interface ScoredEmployee extends EmployeePeriodAggregate {
   scores: {
      completedSales: number;
      netRevenue: number;
      confirmationRate: number;
      handlingQuality: number;
      cancellationControl: number;
   };
   /** Unrounded weighted final score (0–100 scale). */
   finalScore: number;
   provisional: boolean;
   /** Ordinal rank 1..N for ranked employees; null for provisional. */
   rank: number | null;
}

/**
 * §4.1/§4.2 target proration: monthly × daysInPeriod / 30,
 * minimum 1 (so a zero/negative monthly target can never divide
 * by zero — the prorated floor is the yardstick).
 */
export function proratedTarget(monthly: number, daysInPeriod: number): number {
   return Math.max(1, (monthly * daysInPeriod) / 30);
}

function clamp(value: number, min: number, max: number): number {
   return Math.min(max, Math.max(min, value));
}

/** Numeric part of an employee customId ("EP_12" → 12), else null. */
export function employeeCustomIdNumeric(
   customId: string | null | undefined,
): number | null {
   if (!customId) return null;
   const match = /^EP_(\d+)$/i.exec(customId.trim());
   if (!match) return null;
   const n = Number(match[1]);
   return Number.isFinite(n) ? n : null;
}

/**
 * §4.6 tie-break chain, applied until the order is total:
 * final desc → C desc → R desc → S3 desc → A asc → EP numeric asc
 * (parseable before unparseable) → employeeId asc.
 */
function compareScored(a: ScoredEmployee, b: ScoredEmployee): number {
   if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
   if (b.completedSales !== a.completedSales) {
      return b.completedSales - a.completedSales;
   }
   if (b.netRevenue !== a.netRevenue) return b.netRevenue - a.netRevenue;
   if (b.scores.confirmationRate !== a.scores.confirmationRate) {
      return b.scores.confirmationRate - a.scores.confirmationRate;
   }
   if (a.attributableCancellations !== b.attributableCancellations) {
      return a.attributableCancellations - b.attributableCancellations;
   }
   const epA = employeeCustomIdNumeric(a.employeeCustomId);
   const epB = employeeCustomIdNumeric(b.employeeCustomId);
   if (epA !== null && epB !== null && epA !== epB) return epA - epB;
   if (epA !== null && epB === null) return -1;
   if (epA === null && epB !== null) return 1;
   if (a.employeeId < b.employeeId) return -1;
   if (a.employeeId > b.employeeId) return 1;
   return 0;
}

export function scoreEmployees(
   aggregates: EmployeePeriodAggregate[],
   settings: RankingSettings,
   daysInPeriod: number,
): ScoredEmployee[] {
   const { weights } = settings;
   const salesTarget = proratedTarget(settings.salesTargetMonthly, daysInPeriod);
   const revenueTarget = proratedTarget(
      settings.revenueTargetMonthly,
      daysInPeriod,
   );

   const scored: ScoredEmployee[] = (aggregates || []).map((agg) => {
      // §4.1 — Completed Sales, target-ratio, capped at 100.
      const s1 = Math.min(100, (agg.completedSales / salesTarget) * 100);
      // §4.2 — Net Sales Revenue, target-ratio, capped at 100.
      const s2 = Math.min(100, (agg.netRevenue / revenueTarget) * 100);
      // §4.3 — Confirmation Rate; denominator 0 ⇒ 0.
      const decisions = agg.confirmations + agg.preConfirmationCancellations;
      const s3 = decisions === 0 ? 0 : (agg.confirmations / decisions) * 100;
      // §4.4 — Handling Quality (SLA adherence); nothing evaluated ⇒ 0.
      const s4 =
         agg.slaEvaluated === 0 ? 0 : (agg.slaOnTime / agg.slaEvaluated) * 100;
      // §4.5 — Cancellation Control; A(E) = 0 ⇒ 100.
      const cancelRate = agg.attributableCancellations / Math.max(agg.handledOrders, 1);
      const s5 = clamp(100 - cancelRate * 100 * settings.cancellationPenalty, 0, 100);

      const finalScore =
         (weights.completedSales / 100) * s1 +
         (weights.netRevenue / 100) * s2 +
         (weights.confirmationRate / 100) * s3 +
         (weights.handlingQuality / 100) * s4 +
         (weights.cancellationControl / 100) * s5;

      return {
         ...agg,
         scores: {
            completedSales: s1,
            netRevenue: s2,
            confirmationRate: s3,
            handlingQuality: s4,
            cancellationControl: s5,
         },
         finalScore,
         provisional: agg.handledOrders < settings.minEligibleOrders,
         rank: null,
      };
   });

   const ranked = scored.filter((s) => !s.provisional).sort(compareScored);
   ranked.forEach((s, i) => {
      s.rank = i + 1;
   });
   const provisional = scored.filter((s) => s.provisional).sort(compareScored);

   // One array: ranked group first (ranks 1..N), provisional after
   // (same ordering chain, rank stays null).
   return [...ranked, ...provisional];
}
