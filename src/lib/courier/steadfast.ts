/**
 * Steadfast provider (Phase 4, D5) — SERVER-SIDE ONLY.
 *
 * ⚠ UNVERIFIED CONTRACT: Steadfast publishes no official developer
 * portal. This client is written against "API Documentation V1"
 * (a published document, closest-to-official source; researched
 * 2026-11-20 — see DEVX_POS_PHASE4_SCHEMA_PROPOSAL.md §4.2):
 *   base  https://portal.packzy.com/api/v1
 *   auth  static `Api-Key` + `Secret-Key` headers
 *   POST  /create_order          → consignment { consignment_id, tracking_code }
 *   GET   /status_by_cid/{id}    → { delivery_status, ... }
 * It has NEVER been called against a live merchant account. Before
 * enabling booking in production, confirm the base URL, response
 * shapes and rate limits from the merchant panel (D5).
 *
 * Safety: constructed with a null config (provider not configured)
 * every method throws CourierNotConfiguredError BEFORE any network
 * call. This module is not wired into any route or UI yet — booking
 * activates only when credentials exist AND the owner enables it.
 */
import type { SteadfastConfig } from "./config";
import { missingEnvKeys } from "./config";
import type {
   CourierProvider,
   CreateConsignmentInput,
   CreateConsignmentResult,
   ConsignmentStatusResult,
} from "./types";
import { CourierApiError, CourierNotConfiguredError } from "./errors";
import {
   fetchJsonWithTimeout,
   httpErrorKind,
   isRecord,
   providerMessage,
} from "./http";

const REQUEST_TIMEOUT_MS = 15_000;

type FetchLike = typeof fetch;

async function steadfastRequest(
   config: SteadfastConfig,
   fetchImpl: FetchLike,
   pathSegment: string,
   init: RequestInit,
): Promise<unknown> {
   const { status, ok, data } = await fetchJsonWithTimeout(
      "steadfast",
      fetchImpl,
      `${config.baseUrl}${pathSegment}`,
      {
         ...init,
         headers: {
            "Content-Type": "application/json",
            "Api-Key": config.apiKey,
            "Secret-Key": config.secretKey,
            ...(init.headers || {}),
         },
      },
      REQUEST_TIMEOUT_MS,
   );
   if (!ok) {
      const message = providerMessage(data);
      throw new CourierApiError(
         "steadfast",
         status,
         `Steadfast request failed with HTTP ${status}${message ? `: ${message}` : ""}.`,
         httpErrorKind(status),
      );
   }
   return data;
}

function bodyStatus(data: Record<string, any>): number | null {
   const status = Number(data.status);
   return Number.isFinite(status) && data.status !== undefined
      ? status
      : null;
}

function assertNoBodyRejection(data: unknown): Record<string, any> {
   if (!isRecord(data)) {
      throw new CourierApiError(
         "steadfast",
         200,
         "Steadfast returned an invalid response shape — the contract may have changed (D5 verification pending).",
         "invalid_response",
      );
   }
   const status = bodyStatus(data);
   if (status !== null && (status < 200 || status >= 300)) {
      const message = providerMessage(data);
      throw new CourierApiError(
         "steadfast",
         status,
         `Steadfast rejected the request${message ? `: ${message}` : ""}.`,
         "provider_rejected",
      );
   }
   return data;
}

/** Pure parser for the researched create_order response shape. */
export function parseSteadfastCreateResponse(data: unknown): {
   consignmentId: string;
   trackingCode: string;
} {
   const body = assertNoBodyRejection(data);
   const consignment = body.consignment;
   if (!isRecord(consignment)) {
      throw new CourierApiError(
         "steadfast",
         200,
         "Steadfast answered but the response carried no consignment object — the contract may have changed (D5 verification pending).",
         "invalid_response",
      );
   }
   const rawId = consignment.consignment_id;
   if (
      (typeof rawId !== "string" && typeof rawId !== "number") ||
      !String(rawId).trim()
   ) {
      throw new CourierApiError(
         "steadfast",
         200,
         "Steadfast answered but the response carried no consignment_id — the contract may have changed (D5 verification pending).",
         "invalid_response",
      );
   }
   const rawTracking = consignment.tracking_code;
   if (
      rawTracking !== undefined &&
      rawTracking !== null &&
      typeof rawTracking !== "string" &&
      typeof rawTracking !== "number"
   ) {
      throw new CourierApiError(
         "steadfast",
         200,
         "Steadfast returned an invalid tracking_code — the contract may have changed (D5 verification pending).",
         "invalid_response",
      );
   }
   return {
      consignmentId: String(rawId),
      trackingCode: rawTracking == null ? "" : String(rawTracking),
   };
}

/** Pure parser for the researched status_by_cid response shape. */
export function parseSteadfastStatusResponse(data: unknown): {
   providerStatus: string;
} {
   const body = assertNoBodyRejection(data);
   const status = body.delivery_status;
   if (typeof status !== "string" || !status.trim()) {
      throw new CourierApiError(
         "steadfast",
         200,
         "Steadfast status response carried no delivery_status — the contract may have changed (D5 verification pending).",
         "invalid_response",
      );
   }
   return { providerStatus: status };
}

export function createSteadfastProvider(
   config: SteadfastConfig | null,
   fetchImpl: FetchLike = fetch,
): CourierProvider {
   const requireConfig = (): SteadfastConfig => {
      if (!config) {
         throw new CourierNotConfiguredError(
            "steadfast",
            missingEnvKeys("steadfast"),
         );
      }
      return config;
   };

   return {
      id: "steadfast",

      async createConsignment(
         input: CreateConsignmentInput,
      ): Promise<CreateConsignmentResult> {
         const cfg = requireConfig();
         const data = await steadfastRequest(cfg, fetchImpl, "/create_order", {
            method: "POST",
            body: JSON.stringify({
               invoice: input.invoice,
               recipient_name: input.recipientName,
               recipient_phone: input.recipientPhone,
               recipient_address: input.recipientAddress,
               cod_amount: Math.max(0, Math.round(Number(input.codAmount) || 0)),
               ...(input.note ? { note: input.note } : {}),
            }),
         });
         return {
            ...parseSteadfastCreateResponse(data),
            raw: data,
         };
      },

      async getStatus(
         consignmentId: string,
      ): Promise<ConsignmentStatusResult> {
         const cfg = requireConfig();
         const data = await steadfastRequest(
            cfg,
            fetchImpl,
            `/status_by_cid/${encodeURIComponent(consignmentId)}`,
            { method: "GET" },
         );
         return {
            ...parseSteadfastStatusResponse(data),
            raw: data,
         };
      },
   };
}
