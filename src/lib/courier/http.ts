/**
 * Shared courier HTTP transport (Phase 4, D5 hardening).
 *
 * One injectable implementation for both provider clients: the
 * AbortController timeout spans the response-body read as well as
 * the initial fetch, network/timeout failures become typed
 * CourierApiErrors, and a non-JSON body is an invalid response —
 * never silently treated as data. No provider code should call
 * fetch directly.
 */
import { CourierApiError } from "./errors";

type FetchLike = typeof fetch;

export interface TimedJsonResponse {
   status: number;
   ok: boolean;
   data: unknown;
}

function isAbortError(error: unknown): boolean {
   return (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: unknown }).name === "AbortError"
   );
}

export async function fetchJsonWithTimeout(
   provider: string,
   fetchImpl: FetchLike,
   url: string,
   init: RequestInit,
   timeoutMs: number,
): Promise<TimedJsonResponse> {
   const controller = new AbortController();
   const timer = setTimeout(() => controller.abort(), timeoutMs);
   let status: number;
   let ok: boolean;
   let text: string;

   try {
      const res = await fetchImpl(url, { ...init, signal: controller.signal });
      status = res.status;
      ok = res.ok;
      text = await res.text();
   } catch (error) {
      const timedOut = isAbortError(error);
      throw new CourierApiError(
         provider,
         null,
         timedOut
            ? `${provider} request timed out after ${timeoutMs} ms.`
            : `${provider} request failed before a response was received (network error).`,
         timedOut ? "timeout" : "network",
      );
   } finally {
      clearTimeout(timer);
   }

   if (!text) return { status, ok, data: null };
   try {
      return { status, ok, data: JSON.parse(text) as unknown };
   } catch {
      throw new CourierApiError(
         provider,
         status,
         `${provider} returned a non-JSON response.`,
         "invalid_response",
      );
   }
}

/** True for plain JSON objects (not arrays, strings, or null). */
export function isRecord(value: unknown): value is Record<string, any> {
   return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Provider message from a parsed body, when it is a safe string. */
export function providerMessage(data: unknown): string | null {
   if (!isRecord(data)) return null;
   const message = data.message ?? data.error;
   return typeof message === "string" && message.trim() ? message.trim() : null;
}

/** Kind for an HTTP response that reached the provider. */
export function httpErrorKind(
   status: number,
): "provider_rejected" | "http" {
   return status >= 400 && status < 500 && status !== 429
      ? "provider_rejected"
      : "http";
}
