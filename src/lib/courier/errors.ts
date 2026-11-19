/**
 * Courier integration errors (Phase 4, D4/D5) — server-side only.
 *
 * Typed errors so the future booking/status routes can map them to
 * honest HTTP responses instead of leaking provider payloads:
 *  - CourierNotConfiguredError: the provider's env credentials are
 *    absent. Every provider method throws this BEFORE any network
 *    call, so an unconfigured deployment can never accidentally
 *    talk to a courier API.
 *  - CourierAlreadyBookedError: the duplicate-booking guard — an
 *    order that already has a consignment id must never be booked
 *    twice.
 *  - CourierNotImplementedError: a provider capability whose
 *    contract is not yet verified (Pathao booking/status, D5).
 *    Throwing is deliberate: a TODO that throws cannot be mistaken
 *    for a working integration.
 *  - CourierApiError: the provider answered, but with an error or
 *    an unexpected payload shape.
 */

export class CourierError extends Error {
   code: string;
   constructor(code: string, message: string) {
      super(message);
      this.name = "CourierError";
      this.code = code;
   }
}

export class CourierNotConfiguredError extends CourierError {
   provider: string;
   /** Env key NAMES that are missing — never values. */
   missing: string[];
   constructor(provider: string, missing: string[]) {
      super(
         "COURIER_NOT_CONFIGURED",
         `Courier provider "${provider}" is not configured. Missing environment variables: ${missing.join(", ")}.`,
      );
      this.name = "CourierNotConfiguredError";
      this.provider = provider;
      this.missing = missing;
   }
}

export class CourierAlreadyBookedError extends CourierError {
   consignmentId: string;
   constructor(consignmentId: string) {
      super(
         "COURIER_ALREADY_BOOKED",
         `This order already has a courier booking (consignment ${consignmentId}). It cannot be booked again.`,
      );
      this.name = "CourierAlreadyBookedError";
      this.consignmentId = consignmentId;
   }
}

export class CourierNotImplementedError extends CourierError {
   provider: string;
   constructor(provider: string, detail: string) {
      super("COURIER_NOT_IMPLEMENTED", detail);
      this.name = "CourierNotImplementedError";
      this.provider = provider;
   }
}

export class CourierApiError extends CourierError {
   provider: string;
   /** HTTP status when the provider answered; null on network/shape failures. */
   status: number | null;
   constructor(provider: string, status: number | null, message: string) {
      super("COURIER_API_ERROR", message);
      this.name = "CourierApiError";
      this.provider = provider;
      this.status = status;
   }
}
