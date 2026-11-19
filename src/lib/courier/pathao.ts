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
import {
   fetchJsonWithTimeout,
   httpErrorKind,
   isRecord,
   providerMessage,
} from "./http";

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

/** Pure parser for the corroborated issue-token response shape. */
export function parsePathaoTokenResponse(data: unknown): {
   accessToken: string;
   ttlSeconds: number;
} {
   if (!isRecord(data)) {
      throw new CourierApiError(
         "pathao",
         200,
         "Pathao token response was not a JSON object.",
         "invalid_response",
      );
   }
   const accessToken = data.access_token;
   if (typeof accessToken !== "string" || !accessToken.trim()) {
      throw new CourierApiError(
         "pathao",
         200,
         "Pathao token response carried no access_token.",
         "invalid_response",
      );
   }
   const ttlSeconds =
      Number(data.expires_in) > 0
         ? Number(data.expires_in)
         : FALLBACK_TOKEN_TTL_SECONDS;
   return { accessToken, ttlSeconds };
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

   const { status, ok, data } = await fetchJsonWithTimeout(
      "pathao",
      fetchImpl,
      `${config.baseUrl}/aladdin/api/v1/issue-token`,
      {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            username: config.username,
            password: config.password,
            grant_type: "password",
         }),
      },
      REQUEST_TIMEOUT_MS,
   );
   if (!ok) {
      const message = providerMessage(data);
      throw new CourierApiError(
         "pathao",
         status,
         `Pathao token request failed with HTTP ${status}${message ? `: ${message}` : ""}.`,
         httpErrorKind(status),
      );
   }

   const parsed = parsePathaoTokenResponse(data);
   tokenCache = {
      accessToken: parsed.accessToken,
      expiresAt: Date.now() + parsed.ttlSeconds * 1000,
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
