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

const REQUEST_TIMEOUT_MS = 15_000;

type FetchLike = typeof fetch;

async function steadfastRequest(
   config: SteadfastConfig,
   fetchImpl: FetchLike,
   pathSegment: string,
   init: RequestInit,
): Promise<any> {
   const controller = new AbortController();
   const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
   let res: Response;
   try {
      res = await fetchImpl(`${config.baseUrl}${pathSegment}`, {
         ...init,
         signal: controller.signal,
         headers: {
            "Content-Type": "application/json",
            "Api-Key": config.apiKey,
            "Secret-Key": config.secretKey,
            ...(init.headers || {}),
         },
      });
   } catch (error: any) {
      throw new CourierApiError(
         "steadfast",
         null,
         `Steadfast request failed before a response was received (${error?.name === "AbortError" ? "timeout" : "network error"}).`,
      );
   } finally {
      clearTimeout(timer);
   }

   const text = await res.text().catch(() => "");
   let data: any = null;
   try {
      data = text ? JSON.parse(text) : null;
   } catch {
      throw new CourierApiError(
         "steadfast",
         res.status,
         "Steadfast returned a non-JSON response.",
      );
   }
   if (!res.ok) {
      throw new CourierApiError(
         "steadfast",
         res.status,
         `Steadfast request failed with HTTP ${res.status}${data?.message ? `: ${data.message}` : ""}.`,
      );
   }
   return data;
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
         const consignment = data?.consignment;
         if (!consignment?.consignment_id) {
            throw new CourierApiError(
               "steadfast",
               200,
               "Steadfast answered but the response carried no consignment_id — the contract may have changed (D5 verification pending).",
            );
         }
         return {
            consignmentId: String(consignment.consignment_id),
            trackingCode: String(consignment.tracking_code || ""),
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
         const status = data?.delivery_status;
         if (typeof status !== "string" || !status) {
            throw new CourierApiError(
               "steadfast",
               200,
               "Steadfast status response carried no delivery_status — the contract may have changed (D5 verification pending).",
            );
         }
         return { providerStatus: status, raw: data };
      },
   };
}
