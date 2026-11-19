/**
 * Courier provider configuration (Phase 4, D4) — SERVER-SIDE ONLY.
 *
 * Credentials come from environment variables and nowhere else:
 * never from the database, never from request bodies, never from
 * code. This module is the only place that reads them.
 *
 * What may leave the server: provider ids, `configured` booleans,
 * and the NAMES of missing env keys (see getProviderStatus — that
 * is what the admin Settings surface shows). Secret VALUES are
 * only ever returned by getSteadfastConfig / getPathaoConfig for
 * use inside server-side provider calls; they must never be
 * serialized into an API response, a page, or a log line.
 *
 * Do NOT import this module from client components.
 *
 * Env keys (documented in .env.example):
 *   STEADFAST_API_KEY, STEADFAST_SECRET_KEY [, STEADFAST_BASE_URL]
 *   PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME,
 *   PATHAO_PASSWORD, PATHAO_STORE_ID [, PATHAO_BASE_URL]
 */

export type CourierProviderId = "steadfast" | "pathao";

export interface CourierProviderStatus {
   provider: CourierProviderId;
   label: string;
   configured: boolean;
   /** Env key NAMES still missing — names only, never values. */
   missing: string[];
}

interface ProviderSpec {
   id: CourierProviderId;
   label: string;
   requiredEnv: string[];
   baseUrlEnv: string;
   defaultBaseUrl: string;
}

const PROVIDER_SPECS: Record<CourierProviderId, ProviderSpec> = {
   steadfast: {
      id: "steadfast",
      label: "Steadfast",
      requiredEnv: ["STEADFAST_API_KEY", "STEADFAST_SECRET_KEY"],
      baseUrlEnv: "STEADFAST_BASE_URL",
      // Researched base (Packzy portal, "API Documentation V1").
      // Unverified against a live merchant account — D5.
      defaultBaseUrl: "https://portal.packzy.com/api/v1",
   },
   pathao: {
      id: "pathao",
      label: "Pathao",
      requiredEnv: [
         "PATHAO_CLIENT_ID",
         "PATHAO_CLIENT_SECRET",
         "PATHAO_USERNAME",
         "PATHAO_PASSWORD",
         "PATHAO_STORE_ID",
      ],
      baseUrlEnv: "PATHAO_BASE_URL",
      // Production Hermes host (merchant panel / official plugin).
      defaultBaseUrl: "https://api-hermes.pathao.com",
   },
};

export const COURIER_PROVIDER_IDS = Object.keys(
   PROVIDER_SPECS,
) as CourierProviderId[];

type EnvLike = Record<string, string | undefined>;

function readEnv(env: EnvLike, key: string): string | null {
   const value = env[key];
   if (value === undefined || value === null) return null;
   const trimmed = String(value).trim();
   return trimmed ? trimmed : null;
}

/** Names of the required env keys that are absent/blank. Pure. */
export function missingEnvKeys(
   provider: CourierProviderId,
   env: EnvLike = process.env,
): string[] {
   return PROVIDER_SPECS[provider].requiredEnv.filter(
      (key) => !readEnv(env, key),
   );
}

export function isProviderConfigured(
   provider: CourierProviderId,
   env: EnvLike = process.env,
): boolean {
   return missingEnvKeys(provider, env).length === 0;
}

/** Client-safe status: booleans + missing key NAMES only. */
export function getProviderStatus(
   provider: CourierProviderId,
   env: EnvLike = process.env,
): CourierProviderStatus {
   const missing = missingEnvKeys(provider, env);
   return {
      provider,
      label: PROVIDER_SPECS[provider].label,
      configured: missing.length === 0,
      missing,
   };
}

export function getAllProviderStatuses(
   env: EnvLike = process.env,
): CourierProviderStatus[] {
   return COURIER_PROVIDER_IDS.map((id) => getProviderStatus(id, env));
}

export function getCourierBaseUrl(
   provider: CourierProviderId,
   env: EnvLike = process.env,
): string {
   const spec = PROVIDER_SPECS[provider];
   const override = readEnv(env, spec.baseUrlEnv);
   return (override || spec.defaultBaseUrl).replace(/\/+$/, "");
}

// ---------------------------------------------------------------------------
// Secret-bearing configs — server-side provider calls only.
// Each returns null when the provider is not fully configured, so
// callers can refuse with CourierNotConfiguredError instead of
// ever sending a partial credential set.
// ---------------------------------------------------------------------------

export interface SteadfastConfig {
   apiKey: string;
   secretKey: string;
   baseUrl: string;
}

export function getSteadfastConfig(
   env: EnvLike = process.env,
): SteadfastConfig | null {
   if (!isProviderConfigured("steadfast", env)) return null;
   return {
      apiKey: readEnv(env, "STEADFAST_API_KEY") as string,
      secretKey: readEnv(env, "STEADFAST_SECRET_KEY") as string,
      baseUrl: getCourierBaseUrl("steadfast", env),
   };
}

export interface PathaoConfig {
   clientId: string;
   clientSecret: string;
   username: string;
   password: string;
   storeId: string;
   baseUrl: string;
}

export function getPathaoConfig(
   env: EnvLike = process.env,
): PathaoConfig | null {
   if (!isProviderConfigured("pathao", env)) return null;
   return {
      clientId: readEnv(env, "PATHAO_CLIENT_ID") as string,
      clientSecret: readEnv(env, "PATHAO_CLIENT_SECRET") as string,
      username: readEnv(env, "PATHAO_USERNAME") as string,
      password: readEnv(env, "PATHAO_PASSWORD") as string,
      storeId: readEnv(env, "PATHAO_STORE_ID") as string,
      baseUrl: getCourierBaseUrl("pathao", env),
   };
}
