/**
 * Edge-safe HS256 JWT verification for middleware (B3, audit S-2 /
 * P1-10, SEC-04) — platform Web Crypto only, no dependencies.
 *
 * `src/lib/auth.ts` signs tokens with `jsonwebtoken` (default
 * algorithm HS256, claims { id, email, name, role } + iat/exp, 7-day
 * expiry). The Edge runtime cannot run that Node library, so this
 * module re-checks the same tokens with `crypto.subtle`: header
 * `alg` is pinned to HS256, the HMAC-SHA256 signature is verified
 * (constant-time, inside `subtle.verify`), and `exp` must be in the
 * future. Payload claims are NOT trusted for authorization here —
 * this is a defence-in-depth gate for the admin/auth page shells;
 * every API route keeps its own DB-backed guard in auth.ts.
 *
 * This module must never import Node-only modules: it is imported
 * by `src/middleware.ts` (Edge runtime) and by hermetic tests.
 */

function base64UrlDecode(segment: string): Uint8Array | null {
   if (!/^[A-Za-z0-9_-]*$/.test(segment)) return null;
   let base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
   const remainder = base64.length % 4;
   if (remainder === 1) return null;
   if (remainder > 0) base64 += "=".repeat(4 - remainder);
   try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
         bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
   } catch {
      return null;
   }
}

function decodeJsonSegment(segment: string): Record<string, unknown> | null {
   const bytes = base64UrlDecode(segment);
   if (!bytes) return null;
   try {
      const parsed = JSON.parse(new TextDecoder().decode(bytes));
      return parsed && typeof parsed === "object" ? parsed : null;
   } catch {
      return null;
   }
}

/**
 * True only when `token` is a well-formed HS256 JWT whose signature
 * verifies against `secret` and whose `exp` claim is in the future.
 * `nowSeconds` is injectable for tests; production callers omit it.
 */
export async function verifyHs256Jwt(
   token: string,
   secret: string,
   nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<boolean> {
   if (!token || !secret) return false;

   const parts = token.split(".");
   if (parts.length !== 3) return false;
   const [headerSegment, payloadSegment, signatureSegment] = parts;

   // Pin the algorithm: anything but HS256 (including "none") fails,
   // regardless of what the signature segment contains.
   const header = decodeJsonSegment(headerSegment);
   if (!header || header.alg !== "HS256") return false;

   // auth.ts always issues exp (7d); a token without a valid,
   // future exp is not one of ours.
   const payload = decodeJsonSegment(payloadSegment);
   if (!payload) return false;
   const exp = payload.exp;
   if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
   if (exp <= nowSeconds) return false;

   const signature = base64UrlDecode(signatureSegment);
   if (!signature || signature.length === 0) return false;

   try {
      const key = await crypto.subtle.importKey(
         "raw",
         new TextEncoder().encode(secret),
         { name: "HMAC", hash: "SHA-256" },
         false,
         ["verify"],
      );
      return await crypto.subtle.verify(
         "HMAC",
         key,
         signature.buffer as ArrayBuffer,
         new TextEncoder().encode(`${headerSegment}.${payloadSegment}`),
      );
   } catch {
      return false;
   }
}
