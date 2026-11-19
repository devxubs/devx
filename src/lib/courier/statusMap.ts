/**
 * Provider status → internal courierStatus mapping (Phase 4, D5).
 *
 * Internal values are the existing free-text vocabulary already
 * used on Order.courierStatus (Pending, In Courier, Delivered,
 * Cancelled, Returned, ...). The provider's raw string is always
 * stored separately (courierProviderStatus), so a mapping choice
 * here never destroys information.
 */
import { CourierNotImplementedError } from "./errors";

/**
 * Steadfast delivery statuses as documented in "API Documentation
 * V1" (researched 2026-11-20; NOT yet verified against a live
 * merchant account — D5). Statuses outside the documented set pass
 * through unchanged rather than being guessed at.
 */
const STEADFAST_STATUS_MAP: Record<string, string> = {
   pending: "Pending",
   in_review: "In Courier",
   hold: "In Courier",
   delivered: "Delivered",
   // Partial delivery still means goods reached the customer; the
   // raw value stays in courierProviderStatus for the distinction.
   partial_delivered: "Delivered",
   cancelled: "Cancelled",
   unknown: "Unknown",
};

export function mapSteadfastStatus(raw: string): string {
   const key = String(raw || "").trim().toLowerCase();
   if (!key) return "Unknown";
   // Documented intermediates: *_approval_pending (e.g.
   // delivered_approval_pending) — the parcel is not final yet.
   if (key.endsWith("_approval_pending")) return "Pending";
   return STEADFAST_STATUS_MAP[key] ?? String(raw).trim();
}

/**
 * Pathao: the full order-status vocabulary is NOT enumerated in
 * any documentation available to us (only "Pending" appears), and
 * guessing mappings for a money-carrying status would be worse
 * than none. This is an explicit TODO (D5): confirm the vocabulary
 * from the merchant panel, then fill the map in here.
 */
export function mapPathaoStatus(_raw: string): string {
   throw new CourierNotImplementedError(
      "pathao",
      "Pathao status mapping is not implemented: the provider's status vocabulary is unverified (D5). Confirm it from the Pathao merchant panel before enabling status sync.",
   );
}
