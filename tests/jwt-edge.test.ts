import { describe, it, expect } from "vitest";
import { verifyHs256Jwt } from "@src/lib/jwtEdge";
import { signToken } from "@src/lib/auth";

// B3 (audit S-2 / P1-10): hermetic tests for the Edge-runtime HS256
// verifier used by middleware. Tokens are signed with the same Web
// Crypto the verifier uses (plus one interop case against the real
// `jsonwebtoken`-issued token from lib/auth). Throwaway secrets only.

const SECRET = "jwt-edge-test-secret-not-for-production";
const OTHER_SECRET = "jwt-edge-other-secret-not-for-production";
const NOW = 1_800_000_000; // fixed clock for deterministic exp checks

function base64UrlEncode(bytes: Uint8Array): string {
   let binary = "";
   for (const b of bytes) binary += String.fromCharCode(b);
   return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
}

function encodeJson(value: unknown): string {
   return base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
}

async function signWithWebCrypto(
   header: Record<string, unknown>,
   payload: Record<string, unknown>,
   secret: string,
): Promise<string> {
   const signingInput = `${encodeJson(header)}.${encodeJson(payload)}`;
   const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
   );
   const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signingInput),
   );
   return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

const validPayload = { id: "user_1", email: "a@b.test", exp: NOW + 3600 };

describe("verifyHs256Jwt", () => {
   it("accepts a valid HS256 token", async () => {
      const token = await signWithWebCrypto(
         { alg: "HS256", typ: "JWT" },
         validPayload,
         SECRET,
      );
      await expect(verifyHs256Jwt(token, SECRET, NOW)).resolves.toBe(true);
   });

   it("accepts a real token issued by lib/auth signToken (jsonwebtoken)", async () => {
      const token = signToken({ id: "user_1", email: "a@b.test" });
      await expect(
         verifyHs256Jwt(token, process.env.JWT_SECRET as string),
      ).resolves.toBe(true);
   });

   it("rejects a tampered payload", async () => {
      const token = await signWithWebCrypto(
         { alg: "HS256", typ: "JWT" },
         validPayload,
         SECRET,
      );
      const [header, , signature] = token.split(".");
      const forged = `${header}.${encodeJson({ ...validPayload, role: "System Admin" })}.${signature}`;
      await expect(verifyHs256Jwt(forged, SECRET, NOW)).resolves.toBe(false);
   });

   it("rejects a token signed with the wrong secret", async () => {
      const token = await signWithWebCrypto(
         { alg: "HS256", typ: "JWT" },
         validPayload,
         OTHER_SECRET,
      );
      await expect(verifyHs256Jwt(token, SECRET, NOW)).resolves.toBe(false);
   });

   it("rejects an expired token", async () => {
      const token = await signWithWebCrypto(
         { alg: "HS256", typ: "JWT" },
         { ...validPayload, exp: NOW - 1 },
         SECRET,
      );
      await expect(verifyHs256Jwt(token, SECRET, NOW)).resolves.toBe(false);
   });

   it("rejects a token expiring exactly now", async () => {
      const token = await signWithWebCrypto(
         { alg: "HS256", typ: "JWT" },
         { ...validPayload, exp: NOW },
         SECRET,
      );
      await expect(verifyHs256Jwt(token, SECRET, NOW)).resolves.toBe(false);
   });

   it("rejects alg=none even with an empty or copied signature", async () => {
      const noneToken = `${encodeJson({ alg: "none", typ: "JWT" })}.${encodeJson(validPayload)}.`;
      await expect(verifyHs256Jwt(noneToken, SECRET, NOW)).resolves.toBe(false);

      const hsToken = await signWithWebCrypto(
         { alg: "HS256", typ: "JWT" },
         validPayload,
         SECRET,
      );
      const [, payload, signature] = hsToken.split(".");
      const relabelled = `${encodeJson({ alg: "none", typ: "JWT" })}.${payload}.${signature}`;
      await expect(verifyHs256Jwt(relabelled, SECRET, NOW)).resolves.toBe(false);
   });

   it("rejects other algorithms (HS384 header)", async () => {
      const token = await signWithWebCrypto(
         { alg: "HS384", typ: "JWT" },
         validPayload,
         SECRET,
      );
      await expect(verifyHs256Jwt(token, SECRET, NOW)).resolves.toBe(false);
   });

   it("rejects a token without an exp claim", async () => {
      const { exp: _exp, ...noExp } = validPayload;
      const token = await signWithWebCrypto(
         { alg: "HS256", typ: "JWT" },
         noExp,
         SECRET,
      );
      await expect(verifyHs256Jwt(token, SECRET, NOW)).resolves.toBe(false);
   });

   it("rejects malformed tokens", async () => {
      await expect(verifyHs256Jwt("", SECRET, NOW)).resolves.toBe(false);
      await expect(verifyHs256Jwt("not-a-jwt", SECRET, NOW)).resolves.toBe(false);
      await expect(verifyHs256Jwt("a.b", SECRET, NOW)).resolves.toBe(false);
      await expect(verifyHs256Jwt("a.b.c.d", SECRET, NOW)).resolves.toBe(false);
      await expect(verifyHs256Jwt("!!!.@@@.###", SECRET, NOW)).resolves.toBe(false);
      await expect(
         verifyHs256Jwt(`${encodeJson({ alg: "HS256" })}.not-json.sig`, SECRET, NOW),
      ).resolves.toBe(false);
   });

   it("rejects an empty secret", async () => {
      const token = await signWithWebCrypto(
         { alg: "HS256", typ: "JWT" },
         validPayload,
         SECRET,
      );
      await expect(verifyHs256Jwt(token, "", NOW)).resolves.toBe(false);
   });
});
