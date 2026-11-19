import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@src/lib/prisma";
import { verifyPassword, signToken } from "@src/lib/auth";
import { checkRateLimit, hitRateLimit, resetRateLimit } from "@src/lib/rateLimit";
import { logAuditStandalone, requestAuditContext } from "@src/lib/audit";

// Brute-force protection: at most 10 failed login attempts per
// email+IP pair in a 15-minute window, then 429 until the window ends.
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function loginRateLimitKey(request: NextRequest, email: string): string {
   const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
   return `login:${email.toLowerCase().trim()}:${ip}`;
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
      const limitState = checkRateLimit(rateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
      if (!limitState.allowed) {
         return NextResponse.json(
            { error: "Too many failed login attempts. Please try again later." },
            {
               status: 429,
               headers: { "Retry-After": String(limitState.retryAfterSeconds) },
            },
         );
      }

      const user = await prisma.user.findUnique({
         where: { email: email.toLowerCase().trim() },
         include: { role: true },
      });

      if (!user || !user.passwordHash) {
         hitRateLimit(rateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
         return NextResponse.json(
            { error: "Invalid email or password" },
            { status: 401 },
         );
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
         hitRateLimit(rateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
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

      // Successful login clears the failed-attempt counter.
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
