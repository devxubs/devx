/**
 * Courier integration entry point (Phase 4, D4/D5) — SERVER-SIDE
 * ONLY. Booking/status are intentionally NOT wired into any route
 * or UI yet: there are no merchant credentials to verify against
 * (D4) and the provider contracts are not fully verified (D5).
 * What exists and is safe to build on:
 *   - config/status (config.ts) — env-only credentials, client-safe
 *     configured/missing-key reporting;
 *   - the provider registry below;
 *   - the duplicate-booking guard + order → consignment input
 *     builder, ready for the future booking route.
 */
import type { CourierProviderId } from "./config";
import { getPathaoConfig, getSteadfastConfig } from "./config";
import type { CourierProvider, CreateConsignmentInput } from "./types";
import { CourierAlreadyBookedError, CourierError } from "./errors";
import { createSteadfastProvider } from "./steadfast";
import { createPathaoProvider } from "./pathao";

export * from "./config";
export * from "./errors";
export * from "./types";
export { mapSteadfastStatus, mapPathaoStatus } from "./statusMap";
export {
   createSteadfastProvider,
   parseSteadfastCreateResponse,
   parseSteadfastStatusResponse,
} from "./steadfast";
export {
   createPathaoProvider,
   getPathaoAccessToken,
   parsePathaoTokenResponse,
} from "./pathao";

/** The provider implementation for an id, bound to env config. */
export function getCourierProvider(
   id: CourierProviderId,
   env: Record<string, string | undefined> = process.env,
): CourierProvider {
   switch (id) {
      case "steadfast":
         return createSteadfastProvider(getSteadfastConfig(env));
      case "pathao":
         return createPathaoProvider(getPathaoConfig(env));
      default:
         throw new CourierError(
            "COURIER_UNKNOWN_PROVIDER",
            `Unknown courier provider "${String(id)}".`,
         );
   }
}

/**
 * Duplicate-booking guard (service level): an order that already
 * carries a consignment id must never be booked again — a second
 * booking would create a second parcel and a second delivery
 * charge for the same order. The future booking route must call
 * this inside its transaction, on the freshly-read order row,
 * before calling the provider.
 */
export function assertOrderNotBooked(order: {
   courierConsignmentId?: string | null;
}): void {
   if (order?.courierConsignmentId) {
      throw new CourierAlreadyBookedError(order.courierConsignmentId);
   }
}

/** The order shape buildConsignmentInput reads (Order + customer). */
export interface OrderForBooking {
   orderId?: string | null;
   customId?: string | null;
   dueAmount?: number | string | null;
   customer?: {
      name?: string | null;
      phone?: string | null;
      address?: string | null;
   } | null;
}

/**
 * Build the provider-agnostic booking payload from an order.
 * COD amount is the order's outstanding due (0 when fully paid).
 * Throws CourierError listing what is missing — a booking with a
 * blank recipient phone/address would only fail at the provider.
 */
export function buildConsignmentInput(
   order: OrderForBooking,
   opts: { note?: string; weightKg?: number; storeId?: string } = {},
): CreateConsignmentInput {
   const invoice = String(order?.orderId || order?.customId || "").trim();
   const name = String(order?.customer?.name || "").trim();
   const phone = String(order?.customer?.phone || "").trim();
   const address = String(order?.customer?.address || "").trim();
   const missing: string[] = [];
   if (!invoice) missing.push("order reference");
   if (!name) missing.push("recipient name");
   if (!phone) missing.push("recipient phone");
   if (!address) missing.push("recipient address");
   if (missing.length > 0) {
      throw new CourierError(
         "COURIER_ORDER_INCOMPLETE",
         `Cannot book this order with a courier — missing ${missing.join(", ")}.`,
      );
   }
   return {
      invoice,
      recipientName: name,
      recipientPhone: phone,
      recipientAddress: address,
      codAmount: Math.max(0, Math.round(Number(order?.dueAmount) || 0)),
      ...(opts.note ? { note: opts.note } : {}),
      ...(opts.weightKg ? { weightKg: opts.weightKg } : {}),
      ...(opts.storeId ? { storeId: opts.storeId } : {}),
   };
}
