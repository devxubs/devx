/**
 * Product Settings — Decrease Stock On (Phase 1B).
 *
 * The trigger lives in the settings singleton's JSON customConfig
 * blob under `decreaseStockOn` (written by Settings → Products &
 * Inventory, Phase 1 / commit 9a291bb) — the same mechanism as the
 * Default Courier Status (src/lib/courierSubmission.ts), so no
 * schema change was needed for the setting itself.
 *
 * This module is the single source for:
 *   - the supported trigger statuses and the status progression
 *     used to decide whether an order has REACHED the trigger;
 *   - canonicalising / validating a candidate value (used by
 *     PUT /api/settings so an unsupported status is rejected on
 *     save instead of being stored and silently misapplied);
 *   - resolving the effective trigger from a stored blob — a
 *     missing or invalid stored value falls back to CONFIRMED,
 *     the owner-confirmed default;
 *   - the pure holding decision every order write path shares:
 *     given the order's RECORDED deduction state
 *     (Order.stockDeducted) and the status it is moving to,
 *     decide the state it must end in. Callers compare the
 *     decision with the recorded state and run exactly one
 *     deduction or restoration when they differ, flipping
 *     stockDeducted in the same transaction.
 *
 * Holding rules (owner decisions, Phase C0/1A):
 *   - CANCELLED / FAILED never hold stock.
 *   - A write that does not change the status never changes the
 *     holding state either (the recorded flag governs — changing
 *     the trigger setting has no retroactive effect on orders
 *     that are not moving).
 *   - Entering HOLD keeps the recorded state (HOLD sits outside
 *     the progression: it is reachable from both sides of any
 *     trigger); leaving HOLD is decided by the target status.
 *   - Any other target holds iff its progression index is at or
 *     past the trigger's — so moving backward past the trigger
 *     (e.g. CONFIRMED → PENDING with trigger CONFIRMED) restores.
 */

import { ORDER_STATUSES } from "@src/lib/orderStatus";

/** customConfig key the Decrease Stock On setting lives under. */
export const DECREASE_STOCK_ON_KEY = "decreaseStockOn";

/** Owner-confirmed default trigger. */
export const DEFAULT_DECREASE_STOCK_ON: DecreaseStockOnStatus = "CONFIRMED";

/**
 * The forward progression of an order's life. HOLD is deliberately
 * absent (a pause, not a stage) and CANCELLED/FAILED are terminal
 * exits, not stages. OUT_FOR_DELIVERY sits between SHIPPED and
 * DELIVERED, matching the order of ORDER_STATUSES.
 */
export const ORDER_PROGRESSION = [
   "PENDING",
   "CONFIRMED",
   "PROCESSING",
   "SHIPPED",
   "OUT_FOR_DELIVERY",
   "DELIVERED",
   "COMPLETED",
] as const;

export type DecreaseStockOnStatus = (typeof ORDER_PROGRESSION)[number];

const PROGRESSION_INDEX: ReadonlyMap<string, number> = new Map(
   ORDER_PROGRESSION.map((s, i) => [s, i] as [string, number]),
);

const TERMINAL: ReadonlySet<string> = new Set(["CANCELLED", "FAILED"]);

/**
 * Canonicalise a raw value to a supported trigger status.
 * Case-insensitive and separator-tolerant, via the same
 * normalisation the order write paths apply to statuses
 * (normalizeOrderStatus); anything that is not a progression
 * status (including HOLD and the terminal statuses, which can
 * never be deduction points) → null.
 */
export function normalizeDecreaseStockOn(
   value: unknown,
): DecreaseStockOnStatus | null {
   if (typeof value !== "string") return null;
   const needle = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
   if (!needle) return null;
   return PROGRESSION_INDEX.has(needle)
      ? (needle as DecreaseStockOnStatus)
      : null;
}

export function isSupportedDecreaseStockOn(
   value: unknown,
): value is DecreaseStockOnStatus {
   return normalizeDecreaseStockOn(value) !== null;
}

export type DecreaseStockOnValidation =
   | { ok: true; value: DecreaseStockOnStatus | null }
   | { ok: false; message: string };

/**
 * Validate a candidate Decrease Stock On VALUE (mirrors
 * validateDefaultCourierStatusValue). Empty / null / undefined
 * mean "unset" and are valid — unset resolves to the CONFIRMED
 * default at read time. Any other value must be a progression
 * status.
 */
export function validateDecreaseStockOnValue(
   value: unknown,
): DecreaseStockOnValidation {
   if (value === undefined || value === null) return { ok: true, value: null };
   if (typeof value === "string" && value.trim() === "") {
      return { ok: true, value: null };
   }
   const normalized = normalizeDecreaseStockOn(value);
   if (!normalized) {
      return {
         ok: false,
         message: `${DECREASE_STOCK_ON_KEY} must be one of ${ORDER_PROGRESSION.join(", ")} (or empty to use the ${DEFAULT_DECREASE_STOCK_ON} default).`,
      };
   }
   return { ok: true, value: normalized };
}

/**
 * Validate the decreaseStockOn key inside a customConfig payload,
 * as received by PUT /api/settings. A config without the key (or
 * a non-object config, which the settings route stores as given)
 * has nothing to reject.
 */
export function validateDecreaseStockOnInConfig(
   customConfig: unknown,
): DecreaseStockOnValidation {
   if (
      !customConfig ||
      typeof customConfig !== "object" ||
      Array.isArray(customConfig) ||
      !(DECREASE_STOCK_ON_KEY in customConfig)
   ) {
      return { ok: true, value: null };
   }
   return validateDecreaseStockOnValue(
      (customConfig as Record<string, unknown>)[DECREASE_STOCK_ON_KEY],
   );
}

/**
 * The effective trigger from a settings customConfig blob. A
 * missing or invalid stored value falls back to CONFIRMED — an
 * invalid value must never silently change when stock moves.
 */
export function resolveDecreaseStockOn(
   customConfig: unknown,
): DecreaseStockOnStatus {
   if (
      !customConfig ||
      typeof customConfig !== "object" ||
      Array.isArray(customConfig)
   ) {
      return DEFAULT_DECREASE_STOCK_ON;
   }
   return (
      normalizeDecreaseStockOn(
         (customConfig as Record<string, unknown>)[DECREASE_STOCK_ON_KEY],
      ) ?? DEFAULT_DECREASE_STOCK_ON
   );
}

/**
 * Read the effective trigger from the settings singleton. Works
 * with any Prisma-like client (root client or transaction
 * client); any read failure resolves to the default, mirroring
 * loadStockSettings' defensive posture.
 */
export async function loadDecreaseStockOn(
   db: any,
): Promise<DecreaseStockOnStatus> {
   try {
      const s = await db.storeSetting.findUnique({
         where: { id: "default" },
         select: { customConfig: true },
      });
      return resolveDecreaseStockOn(s?.customConfig);
   } catch {
      return DEFAULT_DECREASE_STOCK_ON;
   }
}

/**
 * Whether an order created directly in `status` begins life
 * holding stock under `trigger`: it has already reached the
 * trigger. Terminal statuses never hold.
 */
export function orderReachesTrigger(
   status: string,
   trigger: DecreaseStockOnStatus,
): boolean {
   const idx = PROGRESSION_INDEX.get(String(status || "").toUpperCase());
   if (idx === undefined) return false; // HOLD / terminal / unknown
   return idx >= (PROGRESSION_INDEX.get(trigger) ?? 1);
}

/**
 * The holding state an order must END in after a write that moves
 * it from `fromStatus` to `toStatus`, given its recorded state.
 * Pure — every order write path decides through this function so
 * the rules above exist exactly once. See the module header for
 * the rule list.
 */
export function decideStockHolding(args: {
   wasDeducted: boolean;
   fromStatus: string;
   toStatus: string;
   trigger: DecreaseStockOnStatus;
}): boolean {
   const to = String(args.toStatus || "").toUpperCase();
   const from = String(args.fromStatus || "").toUpperCase();
   // An unrecognised target can never justify moving stock —
   // callers pass normalised statuses, so this is a safety net.
   if (!(ORDER_STATUSES as readonly string[]).includes(to)) {
      return args.wasDeducted;
   }
   if (TERMINAL.has(to)) return false;
   if (to === from) return args.wasDeducted; // no move → flag governs
   if (to === "HOLD") return args.wasDeducted; // entering HOLD keeps state
   return orderReachesTrigger(to, args.trigger);
}
