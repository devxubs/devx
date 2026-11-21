/**
 * Courier submission helpers (O3/O4) — pure, client-safe.
 *
 * One shared source for:
 *   - the SUPPORTED courier statuses. This is the exact list the
 *     orders-list bulk courier action already offered
 *     (BULK_COURIER_STATUSES in Order/Table.tsx) and it matches the
 *     internal vocabulary the provider status mapping produces
 *     (src/lib/courier/statusMap.ts: Pending, In Courier, Delivered,
 *     Cancelled, plus Returned/Hold used across order handling).
 *     No status is invented here — the list is only relocated so
 *     the bulk UI, the settings UI, the settings API and the bulk
 *     API all validate against the same values.
 *   - the "Default Courier Status" setting (O4), persisted in the
 *     settings singleton's JSON customConfig blob under
 *     `defaultCourierStatus` — the same mechanism as the existing
 *     defaultExpenseCategory setting, so no schema change.
 *   - partitioning a bulk courier submission's per-order results
 *     into the succeeded set (whose invoices print, O3) and the
 *     failed set (reported to the user, never printed).
 */

export const COURIER_STATUSES = [
   "Pending",
   "In Courier",
   "Delivered",
   "Returned",
   "Hold",
   "Cancelled",
] as const;

export type CourierStatus = (typeof COURIER_STATUSES)[number];

/** customConfig key the Default Courier Status setting lives under. */
export const DEFAULT_COURIER_STATUS_KEY = "defaultCourierStatus";

/**
 * Canonicalise a raw value to a supported courier status.
 * Case-insensitive and whitespace-tolerant ("in courier" →
 * "In Courier"); anything outside the supported list → null.
 */
export function normalizeCourierStatus(value: unknown): CourierStatus | null {
   if (typeof value !== "string") return null;
   const needle = value.trim().toLowerCase();
   if (!needle) return null;
   return (
      COURIER_STATUSES.find((s) => s.toLowerCase() === needle) ?? null
   );
}

export function isSupportedCourierStatus(
   value: unknown,
): value is CourierStatus {
   return normalizeCourierStatus(value) !== null;
}

export type DefaultCourierStatusValidation =
   | { ok: true; value: CourierStatus | null }
   | { ok: false; message: string };

/**
 * Validate a candidate Default Courier Status VALUE (O4).
 * Empty string / null / undefined mean "unset" and are valid —
 * unset preserves the pre-O4 behaviour exactly. Any other value
 * must be a supported courier status.
 */
export function validateDefaultCourierStatusValue(
   value: unknown,
): DefaultCourierStatusValidation {
   if (value === undefined || value === null) return { ok: true, value: null };
   if (typeof value === "string" && value.trim() === "") {
      return { ok: true, value: null };
   }
   const normalized = normalizeCourierStatus(value);
   if (!normalized) {
      return {
         ok: false,
         message: `${DEFAULT_COURIER_STATUS_KEY} must be one of ${COURIER_STATUSES.join(", ")} (or empty to leave it unset).`,
      };
   }
   return { ok: true, value: normalized };
}

/**
 * Validate the defaultCourierStatus key inside a customConfig
 * payload, as received by PUT /api/settings. A config without the
 * key (or a non-object config, which the settings route stores
 * as given) has nothing to reject.
 */
export function validateDefaultCourierStatusInConfig(
   customConfig: unknown,
): DefaultCourierStatusValidation {
   if (
      !customConfig ||
      typeof customConfig !== "object" ||
      Array.isArray(customConfig) ||
      !(DEFAULT_COURIER_STATUS_KEY in customConfig)
   ) {
      return { ok: true, value: null };
   }
   return validateDefaultCourierStatusValue(
      (customConfig as Record<string, unknown>)[DEFAULT_COURIER_STATUS_KEY],
   );
}

/**
 * The configured Default Courier Status from a settings
 * customConfig blob, or null when unset — including when a stale
 * unsupported value is somehow stored (an invalid stored value
 * must never leak into a submission; it behaves as unset).
 */
export function resolveDefaultCourierStatus(
   customConfig: unknown,
): CourierStatus | null {
   if (
      !customConfig ||
      typeof customConfig !== "object" ||
      Array.isArray(customConfig)
   ) {
      return null;
   }
   return normalizeCourierStatus(
      (customConfig as Record<string, unknown>)[DEFAULT_COURIER_STATUS_KEY],
   );
}

export type SubmittedCourierStatusResolution =
   | { ok: true; courierStatus: CourierStatus | undefined }
   | { ok: false; message: string };

/**
 * Decide the courierStatus a bulk courier submission applies (O4):
 *   - the caller PROVIDED a non-empty status → that status,
 *     validated against the supported list (invalid → not ok);
 *   - the caller provided an explicit empty status → "keep
 *     current": no status is applied, and the configured default
 *     does NOT override an explicit choice;
 *   - the caller did not provide the field at all → the configured
 *     Default Courier Status applies when set; when unset, no
 *     status is applied (the exact pre-O4 behaviour).
 */
export function resolveSubmittedCourierStatus(opts: {
   provided: boolean;
   value: unknown;
   customConfig: unknown;
}): SubmittedCourierStatusResolution {
   if (opts.provided) {
      if (
         opts.value === undefined ||
         opts.value === null ||
         (typeof opts.value === "string" && opts.value.trim() === "")
      ) {
         return { ok: true, courierStatus: undefined };
      }
      const normalized = normalizeCourierStatus(opts.value);
      if (!normalized) {
         return {
            ok: false,
            message: `courierStatus must be one of ${COURIER_STATUSES.join(", ")}.`,
         };
      }
      return { ok: true, courierStatus: normalized };
   }
   return {
      ok: true,
      courierStatus: resolveDefaultCourierStatus(opts.customConfig) ?? undefined,
   };
}

// ---------------------------------------------------------------------------
// O3: bulk submission results → print set
// ---------------------------------------------------------------------------

export interface BulkOrderResultLike {
   id: string;
   orderId?: string;
   ok: boolean;
   error?: string;
   note?: string;
}

/** Split per-order bulk results into succeeded / failed, order kept. */
export function partitionBulkResults<T extends BulkOrderResultLike>(
   results: readonly T[] | null | undefined,
): { succeeded: T[]; failed: T[] } {
   const succeeded: T[] = [];
   const failed: T[] = [];
   for (const r of results || []) {
      if (r?.ok) succeeded.push(r);
      else if (r) failed.push(r);
   }
   return { succeeded, failed };
}

/**
 * The rows whose invoices print after a bulk courier submission:
 * exactly the rows whose per-order result succeeded, in the rows'
 * own order. Failed orders are never in the print set; a total
 * failure yields an empty set (the caller must not open print).
 */
export function selectCourierPrintRows<T extends { id: string }>(
   rows: readonly T[],
   results: readonly BulkOrderResultLike[] | null | undefined,
): T[] {
   const { succeeded } = partitionBulkResults(results);
   const okIds = new Set(succeeded.map((r) => String(r.id)));
   return (rows || []).filter((row) => okIds.has(String(row.id)));
}

/** "ORD_12 (Order not found (or deleted)), ORD_13 (Update failed)". */
export function formatFailedOrdersSummary(
   failed: readonly BulkOrderResultLike[],
): string {
   return (failed || [])
      .map((r) => `${r.orderId || r.id} (${r.error || "Failed"})`)
      .join(", ");
}
