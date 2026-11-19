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

export type CourierErrorKind =
   | "not_configured"
   | "already_booked"
   | "not_implemented"
   | "network"
   | "timeout"
   | "http"
   | "provider_rejected"
   | "invalid_response"
   | "unknown";

export class CourierError extends Error {
   code: string;
   kind: CourierErrorKind;
   retryable: boolean;
   constructor(
      code: string,
      message: string,
      kind: CourierErrorKind = "unknown",
      retryable = false,
   ) {
      super(message);
      this.name = "CourierError";
      this.code = code;
      this.kind = kind;
      this.retryable = retryable;
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
         "not_configured",
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
         "already_booked",
      );
      this.name = "CourierAlreadyBookedError";
      this.consignmentId = consignmentId;
   }
}

export class CourierNotImplementedError extends CourierError {
   provider: string;
   constructor(provider: string, detail: string) {
      super("COURIER_NOT_IMPLEMENTED", detail, "not_implemented");
      this.name = "CourierNotImplementedError";
      this.provider = provider;
   }
}

export type CourierApiErrorKind = Extract<
   CourierErrorKind,
   "network" | "timeout" | "http" | "provider_rejected" | "invalid_response"
>;

export class CourierApiError extends CourierError {
   provider: string;
   /** HTTP status when the provider answered; null on network/shape failures. */
   status: number | null;
   declare kind: CourierApiErrorKind;
   constructor(
      provider: string,
      status: number | null,
      message: string,
      kind: CourierApiErrorKind = status === null ? "network" : "http",
      retryable = kind === "network" ||
         kind === "timeout" ||
         status === 429 ||
         (typeof status === "number" && status >= 500),
   ) {
      super("COURIER_API_ERROR", message, kind, retryable);
      this.name = "CourierApiError";
      this.provider = provider;
      this.status = status;
   }
}

/**
 * Pure translation for the future booking/status HTTP routes.
 * It deliberately returns a small, safe body: the typed error's
 * message/code/kind only — never provider payloads or credentials.
 */
export function courierErrorToHttp(error: unknown): {
   status: number;
   body: { error: string; code: string; kind: CourierErrorKind };
} {
   if (error instanceof CourierNotConfiguredError) {
      return {
         status: 503,
         body: { error: error.message, code: error.code, kind: error.kind },
      };
   }
   if (error instanceof CourierAlreadyBookedError) {
      return {
         status: 409,
         body: { error: error.message, code: error.code, kind: error.kind },
      };
   }
   if (error instanceof CourierNotImplementedError) {
      return {
         status: 501,
         body: { error: error.message, code: error.code, kind: error.kind },
      };
   }
   if (error instanceof CourierApiError) {
      return {
         status: error.kind === "timeout" ? 504 : 502,
         body: { error: error.message, code: error.code, kind: error.kind },
      };
   }
   if (error instanceof CourierError) {
      return {
         status: 500,
         body: { error: error.message, code: error.code, kind: error.kind },
      };
   }
   return {
      status: 500,
      body: {
         error: "Unexpected courier integration error.",
         code: "COURIER_UNEXPECTED_ERROR",
         kind: "unknown",
      },
   };
}
