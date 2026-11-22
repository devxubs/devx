/**
 * Employee performance ranking settings — pure, client-safe.
 *
 * Ranking settings live as ONE key in the settings singleton's
 * JSON customConfig blob — `employeeRankingSettings` — exactly the
 * pattern already proven by `defaultCourierStatus` (fix O4, see
 * src/lib/courierSubmission.ts). No schema change, no new model:
 * settings are a singleton, change rarely, and are read whole.
 *
 * This module owns the shape, the defaults, a strict pure
 * validator (used by PUT /api/settings to reject bad saves with a
 * 400 and a specific message), and a lenient parser for reads
 * (a missing or invalid stored value falls back to the defaults —
 * a read must never throw).
 *
 * Rules (Phase 1 plan §6, owner-approved):
 *   - the five weights are finite numbers ≥ 0 summing to EXACTLY 100
 *   - salesTargetMonthly / revenueTargetMonthly are finite ≥ 0
 *   - minEligibleOrders is an integer ≥ 1
 *   - cancellationPenalty is finite > 0
 *   - processingSlaHours is finite > 0
 *   - autoRecalculate is a boolean
 */

export interface RankingWeights {
   completedSales: number;
   netRevenue: number;
   confirmationRate: number;
   handlingQuality: number;
   cancellationControl: number;
}

export interface RankingSettings {
   weights: RankingWeights;
   salesTargetMonthly: number;
   revenueTargetMonthly: number;
   minEligibleOrders: number;
   cancellationPenalty: number;
   processingSlaHours: number;
   autoRecalculate: boolean;
}

/** customConfig key the ranking settings live under. */
export const RANKING_SETTINGS_KEY = "employeeRankingSettings";

export const DEFAULT_RANKING_SETTINGS: RankingSettings = {
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

const WEIGHT_KEYS = [
   "completedSales",
   "netRevenue",
   "confirmationRate",
   "handlingQuality",
   "cancellationControl",
] as const satisfies readonly (keyof RankingWeights)[];

export type RankingSettingsValidation =
   | { ok: true; value: RankingSettings }
   | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
   return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
   );
}

function isFiniteNumber(value: unknown): value is number {
   return typeof value === "number" && Number.isFinite(value);
}

/**
 * Strictly validate a candidate ranking-settings object (as
 * received by PUT /api/settings). On success the returned value is
 * normalized: it contains ONLY the known fields, so unknown keys
 * in the input never leak into consumers.
 */
export function validateRankingSettings(
   input: unknown,
): RankingSettingsValidation {
   if (!isPlainObject(input)) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY} must be an object.`,
      };
   }

   // Weights: all five present, finite numbers ≥ 0, sum exactly 100.
   if (!isPlainObject(input.weights)) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.weights must be an object with ${WEIGHT_KEYS.join(", ")}.`,
      };
   }
   const weights = {} as RankingWeights;
   let weightSum = 0;
   for (const key of WEIGHT_KEYS) {
      const raw = input.weights[key];
      if (raw === undefined) {
         return {
            ok: false,
            error: `${RANKING_SETTINGS_KEY}.weights.${key} is required.`,
         };
      }
      if (!isFiniteNumber(raw)) {
         return {
            ok: false,
            error: `${RANKING_SETTINGS_KEY}.weights.${key} must be a finite number.`,
         };
      }
      if (raw < 0) {
         return {
            ok: false,
            error: `${RANKING_SETTINGS_KEY}.weights.${key} must be >= 0.`,
         };
      }
      weights[key] = raw;
      weightSum += raw;
   }
   if (weightSum !== 100) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.weights must sum to exactly 100 (got ${weightSum}).`,
      };
   }

   // Targets: finite numbers ≥ 0.
   const salesTargetMonthly = input.salesTargetMonthly;
   if (!isFiniteNumber(salesTargetMonthly)) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.salesTargetMonthly must be a finite number.`,
      };
   }
   if (salesTargetMonthly < 0) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.salesTargetMonthly must be >= 0.`,
      };
   }
   const revenueTargetMonthly = input.revenueTargetMonthly;
   if (!isFiniteNumber(revenueTargetMonthly)) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.revenueTargetMonthly must be a finite number.`,
      };
   }
   if (revenueTargetMonthly < 0) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.revenueTargetMonthly must be >= 0.`,
      };
   }

   // Minimum eligible orders: integer ≥ 1.
   const minEligibleOrders = input.minEligibleOrders;
   if (!isFiniteNumber(minEligibleOrders)) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.minEligibleOrders must be a finite number.`,
      };
   }
   if (!Number.isInteger(minEligibleOrders)) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.minEligibleOrders must be an integer.`,
      };
   }
   if (minEligibleOrders < 1) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.minEligibleOrders must be >= 1.`,
      };
   }

   // Cancellation penalty multiplier: finite > 0.
   const cancellationPenalty = input.cancellationPenalty;
   if (!isFiniteNumber(cancellationPenalty)) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.cancellationPenalty must be a finite number.`,
      };
   }
   if (cancellationPenalty <= 0) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.cancellationPenalty must be > 0.`,
      };
   }

   // Processing SLA: finite > 0 hours.
   const processingSlaHours = input.processingSlaHours;
   if (!isFiniteNumber(processingSlaHours)) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.processingSlaHours must be a finite number.`,
      };
   }
   if (processingSlaHours <= 0) {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.processingSlaHours must be > 0.`,
      };
   }

   // Auto-recalculate flag: boolean.
   const autoRecalculate = input.autoRecalculate;
   if (typeof autoRecalculate !== "boolean") {
      return {
         ok: false,
         error: `${RANKING_SETTINGS_KEY}.autoRecalculate must be a boolean.`,
      };
   }

   return {
      ok: true,
      value: {
         weights,
         salesTargetMonthly,
         revenueTargetMonthly,
         minEligibleOrders,
         cancellationPenalty,
         processingSlaHours,
         autoRecalculate,
      },
   };
}

/**
 * Read the ranking settings out of a settings customConfig blob.
 * Missing or invalid stored values fall back to
 * DEFAULT_RANKING_SETTINGS — this never throws, so a stale or
 * hand-edited blob can never break a ranking read.
 */
export function parseRankingSettings(customConfig: unknown): RankingSettings {
   if (!isPlainObject(customConfig)) return DEFAULT_RANKING_SETTINGS;
   const raw = customConfig[RANKING_SETTINGS_KEY];
   if (raw === undefined) return DEFAULT_RANKING_SETTINGS;
   const verdict = validateRankingSettings(raw);
   return verdict.ok ? verdict.value : DEFAULT_RANKING_SETTINGS;
}
