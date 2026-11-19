import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@src/lib/prisma";
import { verifyPassword, signToken } from "@src/lib/auth";
import {
   checkRateLimit,
   getClientIp,
   hitRateLimit,
   resetRateLimit,
} from "@src/lib/rateLimit";
import { logAuditStandalone, requestAuditContext } from "@src/lib/audit";

// Brute-force protection: at most 10 failed login attempts per
// email+IP pair in a 15-minute window, then 429 until the window ends.
// Follow-up round: a second, IP-only bucket with the same threshold
// runs alongside the pair bucket, so rotating through many email
// addresses from one address is throttled too. The client IP comes
// from getClientIp (proxy-asserted headers; the client-controlled
// first x-forwarded-for hop is never trusted).
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function loginRateLimitKey(request: NextRequest, email: string): string {
   return `login:${email.toLowerCase().trim()}:${getClientIp(request)}`;
}

function loginIpRateLimitKey(request: NextRequest): string {
   return `login-ip:${getClientIp(request)}`;
}

export async function POST(request: NextRequest) {
   try {
      const body = await request.json();
      const { email, password } = body;

      if (!email || !password) {
         return NextResponse.json(
            { error: "Email and password are required" },
            { status: 400 },
         );
      }

      const rateKey = loginRateLimitKey(request, email);
      const ipRateKey = loginIpRateLimitKey(request);
      // Either bucket can block; when both do, the longer wait wins.
      const pairState = checkRateLimit(rateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
      const ipState = checkRateLimit(ipRateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
      if (!pairState.allowed || !ipState.allowed) {
         const retryAfterSeconds = Math.max(
            pairState.allowed ? 0 : pairState.retryAfterSeconds,
            ipState.allowed ? 0 : ipState.retryAfterSeconds,
         );
         return NextResponse.json(
            { error: "Too many failed login attempts. Please try again later." },
            {
               status: 429,
               headers: { "Retry-After": String(retryAfterSeconds) },
            },
         );
      }

      const user = await prisma.user.findUnique({
         where: { email: email.toLowerCase().trim() },
         include: { role: true },
      });

      if (!user || !user.passwordHash) {
         hitRateLimit(rateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
         hitRateLimit(ipRateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
         return NextResponse.json(
            { error: "Invalid email or password" },
            { status: 401 },
         );
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
         hitRateLimit(rateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
         hitRateLimit(ipRateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
         return NextResponse.json(
            { error: "Invalid email or password" },
            { status: 401 },
         );
      }

      if (user.status === "SUSPENDED") {
         return NextResponse.json(
            { error: "Account suspended. Contact administrator." },
            { status: 403 },
         );
      }

      // Phase 1 (S-2): INACTIVE accounts (the users API's soft-delete /
      // deactivation state) must not be able to sign in either.
      if (user.status === "INACTIVE") {
         return NextResponse.json(
            { error: "Account inactive. Contact administrator." },
            { status: 403 },
         );
      }

      // Successful login clears the PAIR bucket's failed-attempt
      // counter. The IP-only bucket is deliberately NOT reset: it
      // decays by window only, so one success cannot launder a
      // distributed guessing run from the same address.
      resetRateLimit(rateKey);

      // Phase 4 (D1): LOGIN audit row — standalone insert AFTER
      // successful authentication; logAuditStandalone swallows its
      // own errors, so a failed audit write can never break login.
      await logAuditStandalone({
         actor: { id: user.id, label: user.name || user.email },
         action: "LOGIN",
         entityType: "USER",
         entityId: user.id,
         entityCustomId: user.customId,
         summary: `${user.name || user.email} signed in`,
         ...requestAuditContext(request),
      });

      const token = signToken({
         id: user.id,
         email: user.email,
         name: user.name,
         role: user.role?.name || null,
      });

      const response = NextResponse.json(
         {
            success: true,
            user: {
               id: user.id,
               email: user.email,
               name: user.name,
               role: user.role?.name || null,
            },
         },
         { status: 200 },
      );

      // Set cookie
      response.cookies.set("devx_token", token, {
         httpOnly: true,
         secure: process.env.NODE_ENV === "production",
         sameSite: "lax",
         maxAge: 60 * 60 * 24 * 7,
         path: "/",
      });

      return response;
   } catch (error) {
      return NextResponse.json(
         { error: "Internal server error during login" },
         { status: 500 },
      );
   }
}
