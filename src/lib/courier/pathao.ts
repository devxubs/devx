/**
 * Pathao provider (Phase 4, D5) — SERVER-SIDE ONLY, SCAFFOLDING.
 *
 * What is implemented: the OAuth 2.0 token request, whose shape is
 * the best-corroborated part of Pathao's contract (merchant API
 * documentation copy + Pathao's official WooCommerce plugin;
 * researched 2026-11-20):
 *   POST {base}/aladdin/api/v1/issue-token
 *   body { client_id, client_secret, username, password,
 *          grant_type: "password" } → { access_token, expires_in }
 * Tokens live ~5 days; a single in-process cache is kept (a
 * multi-instance deployment would re-issue per instance — harmless,
 * but noted).
 *
 * What is deliberately NOT implemented: booking and status. The
 * create-order contract is only partially documented in the
 * sources available to us and the order-status vocabulary is not
 * enumerated anywhere we could verify (D5). Both methods throw
 * CourierNotImplementedError so the gap can never be mistaken for
 * a working integration. Confirm the vocabulary and payloads from
 * the merchant panel, then implement against them.
 *
 * Safety: with a null config every entry point throws
 * CourierNotConfiguredError BEFORE any network call.
 */
import type { PathaoConfig } from "./config";
import { missingEnvKeys } from "./config";
import type { CourierProvider } from "./types";
import {
   CourierApiError,
   CourierNotConfiguredError,
   CourierNotImplementedError,
} from "./errors";

const REQUEST_TIMEOUT_MS = 15_000;
// Documented token lifetime is 5 days; used when the response
// omits expires_in.
const FALLBACK_TOKEN_TTL_SECONDS = 5 * 24 * 60 * 60;

type FetchLike = typeof fetch;

interface TokenCache {
   accessToken: string;
   expiresAt: number;
}
let tokenCache: TokenCache | null = null;

/** Test/internal helper — drops the in-process token cache. */
export function resetPathaoTokenCache(): void {
   tokenCache = null;
}

export async function getPathaoAccessToken(
   config: PathaoConfig | null,
   fetchImpl: FetchLike = fetch,
): Promise<string> {
   if (!config) {
      throw new CourierNotConfiguredError("pathao", missingEnvKeys("pathao"));
   }
   if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
      return tokenCache.accessToken;
   }

   const controller = new AbortController();
   const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
   let res: Response;
   try {
      res = await fetchImpl(`${config.baseUrl}/aladdin/api/v1/issue-token`, {
         method: "POST",
         signal: controller.signal,
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            username: config.username,
            password: config.password,
            grant_type: "password",
         }),
      });
   } catch {
      throw new CourierApiError(
         "pathao",
         null,
         "Pathao token request failed before a response was received (network error or timeout).",
      );
   } finally {
      clearTimeout(timer);
   }

   const data: any = await res.json().catch(() => null);
   if (!res.ok || !data?.access_token) {
      throw new CourierApiError(
         "pathao",
         res.status,
         `Pathao token request failed with HTTP ${res.status}${data?.message ? `: ${data.message}` : ""}.`,
      );
   }
   const ttlSeconds =
      Number(data.expires_in) > 0
         ? Number(data.expires_in)
         : FALLBACK_TOKEN_TTL_SECONDS;
   tokenCache = {
      accessToken: String(data.access_token),
      expiresAt: Date.now() + ttlSeconds * 1000,
   };
   return tokenCache.accessToken;
}

const NOT_IMPLEMENTED_DETAIL =
   "Pathao booking/status are not implemented: the create-order contract is only partially verified and the order-status vocabulary is unknown (D5). Confirm both from the Pathao merchant panel before enabling.";

export function createPathaoProvider(
   config: PathaoConfig | null,
): CourierProvider {
   const requireConfig = (): PathaoConfig => {
      if (!config) {
         throw new CourierNotConfiguredError(
            "pathao",
            missingEnvKeys("pathao"),
         );
      }
      return config;
   };

   return {
      id: "pathao",

      async createConsignment() {
         requireConfig();
         throw new CourierNotImplementedError("pathao", NOT_IMPLEMENTED_DETAIL);
      },

      async getStatus() {
         requireConfig();
         throw new CourierNotImplementedError("pathao", NOT_IMPLEMENTED_DETAIL);
      },
   };
}
