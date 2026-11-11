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
 * Record an attempt for `key` and report whether it is within the limit.
 * Call with `record: true` only for the events that should count
 * (e.g. failed logins); use checkRateLimit() for a read-only peek.
 */
export function hitRateLimit(
   key: string,
   maxAttempts: number,
   windowMs: number,
): RateLimitResult {
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
