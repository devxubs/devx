/**
 * Minimal in-memory rate limiter (per-process).
 *
 * Used to throttle brute-force attempts against /api/auth/login.
 * State lives in module memory: it resets on server restart and is
 * not shared between multiple server instances — acceptable for the
 * current single-instance deployment; swap for a shared store
 * (e.g. Redis) if the app is ever scaled horizontally.
 */

interface Bucket {
   count: number;
   firstAttemptAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
   allowed: boolean;
   retryAfterSeconds: number;
   remaining: number;
}

/**
 * Lazy eviction (follow-up round): buckets whose window has fully
 * expired are dropped on access, so the map cannot grow without
 * bound across many distinct keys. The sweep uses the caller's
 * window — the login route is currently the only consumer and uses
 * one window for all its buckets.
 */
function evictExpiredBuckets(windowMs: number): void {
   const now = Date.now();
   for (const [key, bucket] of buckets) {
      if (now - bucket.firstAttemptAt >= windowMs) {
         buckets.delete(key);
      }
   }
}

/**
 * Best client-IP derivation available to a Next.js route handler.
 *
 * NextRequest exposes no socket address, so headers are the only
 * source. The FIRST `x-forwarded-for` entry is whatever the client
 * claims — any client can prepend a fake address and rotate it to
 * dodge per-IP limits — so it is never trusted here. Preference:
 *   1. `x-real-ip` — set by the platform/reverse proxy (nginx,
 *      Vercel, …) to the actual connecting address.
 *   2. The LAST `x-forwarded-for` hop — appended by the nearest
 *      proxy, i.e. the closest trustworthy view of the client.
 * If the app is ever served with NO proxy in front, both headers
 * are client-controlled and this stays best-effort (as the limiter
 * itself already is); behind the documented proxy deployment the
 * values above are proxy-asserted.
 */
export function getClientIp(request: {
   headers: { get(name: string): string | null };
}): string {
   const realIp = request.headers.get("x-real-ip")?.trim();
   if (realIp) return realIp;
   const forwarded = request.headers.get("x-forwarded-for");
   if (forwarded) {
      const hops = forwarded
         .split(",")
         .map((hop) => hop.trim())
         .filter(Boolean);
      if (hops.length > 0) return hops[hops.length - 1];
   }
   return "unknown";
}

/**
 * Record an attempt for `key` and report whether it is within the limit.
 * Call with `record: true` only for the events that should count
 * (e.g. failed logins); use checkRateLimit() for a read-only peek.
 */
export function hitRateLimit(
   key: string,
   maxAttempts: number,
   windowMs: number,
): RateLimitResult {
   evictExpiredBuckets(windowMs);
   const now = Date.now();
   const bucket = buckets.get(key);

   if (!bucket || now - bucket.firstAttemptAt >= windowMs) {
      buckets.set(key, { count: 1, firstAttemptAt: now });
      return { allowed: true, retryAfterSeconds: 0, remaining: maxAttempts - 1 };
   }

   bucket.count += 1;
   const allowed = bucket.count <= maxAttempts;
   return {
      allowed,
      retryAfterSeconds: allowed
         ? 0
         : Math.max(1, Math.ceil((bucket.firstAttemptAt + windowMs - now) / 1000)),
      remaining: Math.max(0, maxAttempts - bucket.count),
   };
}

export function checkRateLimit(
   key: string,
   maxAttempts: number,
   windowMs: number,
): RateLimitResult {
   evictExpiredBuckets(windowMs);
   const now = Date.now();
   const bucket = buckets.get(key);
   if (!bucket || now - bucket.firstAttemptAt >= windowMs) {
      return { allowed: true, retryAfterSeconds: 0, remaining: maxAttempts };
   }
   const allowed = bucket.count < maxAttempts;
   return {
      allowed,
      retryAfterSeconds: allowed
         ? 0
         : Math.max(1, Math.ceil((bucket.firstAttemptAt + windowMs - now) / 1000)),
      remaining: Math.max(0, maxAttempts - bucket.count),
   };
}

export function resetRateLimit(key: string): void {
   buckets.delete(key);
}
