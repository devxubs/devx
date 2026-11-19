/**
 * Courier provider contract (Phase 4, D5) — server-side only.
 *
 * One provider-agnostic interface for every courier integration.
 * The internal order keeps the provider's RAW status string
 * (Order.courierProviderStatus) alongside the mapped internal
 * value (Order.courierStatus), so a provider vocabulary surprise
 * never loses information — results here therefore always carry
 * both the parsed fields and the untouched `raw` payload.
 */
import type { CourierProviderId } from "./config";

export interface CreateConsignmentInput {
   /** Unique order reference the provider echoes back (orderId). */
   invoice: string;
   recipientName: string;
   recipientPhone: string;
   recipientAddress: string;
   /** Amount to collect on delivery, in BDT (0 when prepaid). */
   codAmount: number;
   note?: string;
   /** Parcel weight in kg (Pathao requires 0.5–10 when booking). */
   weightKg?: number;
   /** Merchant store id (Pathao books against a store). */
   storeId?: string;
}

export interface CreateConsignmentResult {
   consignmentId: string;
   trackingCode: string;
   raw: unknown;
}

export interface ConsignmentStatusResult {
   /** The provider's own status string, unmapped. */
   providerStatus: string;
   raw: unknown;
}

export interface CourierProvider {
   readonly id: CourierProviderId;
   createConsignment(
      input: CreateConsignmentInput,
   ): Promise<CreateConsignmentResult>;
   getStatus(consignmentId: string): Promise<ConsignmentStatusResult>;
}
