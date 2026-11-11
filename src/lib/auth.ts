import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";

/**
 * JWT signing secret resolution (SEC-03 fix).
 *
 * - Production: JWT_SECRET MUST be configured. If it is missing, token
 *   signing/verification fails securely instead of falling back to a
 *   hard-coded secret committed to source control.
 * - Development (NODE_ENV !== "production"): if JWT_SECRET is unset, an
 *   ephemeral per-process secret is generated so local development keeps
 *   working. Tokens are invalidated on every server restart and a warning
 *   is printed. No usable secret exists in the codebase.
 */
let ephemeralSecret: string | null = null;

function getJwtSecret(): string {
   const configured = process.env.JWT_SECRET;
   if (configured && configured.length > 0) {
      return configured;
   }

   if (process.env.NODE_ENV === "production") {
      throw new Error(
         "JWT_SECRET environment variable is not set. Refusing to sign or verify tokens with an insecure fallback.",
      );
   }

   if (!ephemeralSecret) {
      ephemeralSecret = crypto.randomBytes(48).toString("hex");
      console.warn(
         "[auth] JWT_SECRET is not set — using an ephemeral development secret. Sessions will not survive restarts. Set JWT_SECRET in .env for persistent sessions.",
      );
   }
   return ephemeralSecret;
}

export interface SessionUser {
   id: string;
   name?: string | null;
   email: string;
   role?: string | null;
}

/**
 * Hash password securely with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
   return bcrypt.hash(password, 12);
}

/**
 * Verify password against bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
   return bcrypt.compare(password, hash);
}

/**
 * Issue a signed JWT token
 */
export function signToken(user: SessionUser): string {
   return jwt.sign(
      {
         id: user.id,
         email: user.email,
         name: user.name,
         role: user.role,
      },
      getJwtSecret(),
      { expiresIn: "7d" },
   );
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): SessionUser | null {
   try {
      const decoded = jwt.verify(token, getJwtSecret()) as SessionUser;
      return decoded;
   } catch {
      return null;
   }
}

/**
 * Extract authenticated user session from NextRequest (via cookie or Bearer header)
 */
export function getSessionUser(request: NextRequest): SessionUser | null {
   // 1. Check Bearer Authorization header
   const authHeader = request.headers.get("authorization");
   if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      return verifyToken(token);
   }

   // 2. Check devx_token cookie
   const cookieToken = request.cookies.get("devx_token")?.value;
   if (cookieToken) {
      return verifyToken(cookieToken);
   }

   return null;
}

// ─────────────────────────────────────────────
// RBAC — server-side role / permission enforcement (SEC-01 fix)
//
// Role.permissions is stored as a flat JSON map of permission keys to
// booleans. Two shapes exist in the wild:
//   - Seed roles:   { all: true, orders: true, users: true, ... }
//   - UI-saved:     { user_view_user: true, user_create: true, ... }
//     (keys are "<category>_<permission>" lower-cased, spaces → "_")
// permissionMatches() accepts both shapes, plus an array of
// { name, allow } entries, so enforcement works with existing data.
// ─────────────────────────────────────────────

export type PermissionMap = Record<string, boolean>;

export function normalizePermissions(raw: unknown): PermissionMap {
   const out: PermissionMap = {};
   if (!raw) return out;

   if (Array.isArray(raw)) {
      for (const entry of raw as any[]) {
         if (entry && typeof entry === "object") {
            const key = String(entry.key || entry.name || "")
               .trim()
               .toLowerCase()
               .replace(/\s+/g, "_");
            if (key) out[key] = entry.allow !== false && entry.value !== false;
         } else if (typeof entry === "string") {
            out[entry.trim().toLowerCase().replace(/\s+/g, "_")] = true;
         }
      }
      return out;
   }

   if (typeof raw === "object") {
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
         out[k.trim().toLowerCase().replace(/\s+/g, "_")] = v === true || v === "true";
      }
   }
   return out;
}

/**
 * True when the permission map grants any of the candidate keys.
 * The `all` key (seeded System Admin) grants everything.
 */
export function permissionMatches(
   permissions: PermissionMap | null | undefined,
   candidates: string[],
): boolean {
   if (!permissions) return false;
   if (permissions["all"] === true) return true;
   return candidates.some(
      (c) => permissions[c.trim().toLowerCase().replace(/\s+/g, "_")] === true,
   );
}

export interface AuthContext {
   session: SessionUser;
   userId: string;
   email: string;
   roleName: string | null;
   permissions: PermissionMap;
   isAdmin: boolean;
   hasPermission: (candidates: string[]) => boolean;
}

/**
 * Load the full authorization context for the request's session:
 * the live user record + role + permissions from the database.
 * Returns null when there is no valid session, the user no longer
 * exists, or the account is not ACTIVE (suspended/inactive accounts
 * lose privileged access immediately, even with an unexpired token).
 */
export async function getAuthContext(
   request: NextRequest,
): Promise<AuthContext | null> {
   const session = getSessionUser(request);
   if (!session) return null;

   const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { role: true },
   });
   if (!user) return null;
   if (user.status !== "ACTIVE") return null;

   const permissions = normalizePermissions(user.role?.permissions);
   const roleName = user.role?.name || null;
   const isAdmin = roleName === "System Admin" || permissions["all"] === true;

   return {
      session,
      userId: user.id,
      email: user.email,
      roleName,
      permissions,
      isAdmin,
      hasPermission: (candidates: string[]) =>
         isAdmin || permissionMatches(permissions, candidates),
   };
}

/**
 * Guard for administrator-only endpoints (user/role management,
 * settings, recycle bin mutations, system export, ...).
 * Returns the AuthContext on success, or a ready-to-return
 * NextResponse (401/403) on failure — check with `instanceof NextResponse`.
 */
export async function requireAdmin(
   request: NextRequest,
): Promise<AuthContext | NextResponse> {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   const ctx = await getAuthContext(request);
   if (!ctx || !ctx.isAdmin) {
      return NextResponse.json(
         { error: "Forbidden: administrator access required" },
         { status: 403 },
      );
   }
   return ctx;
}

/**
 * Guard for endpoints restricted to admins or to roles holding one of
 * the given permission keys. Same return contract as requireAdmin().
 */
export async function requirePermission(
   request: NextRequest,
   candidates: string[],
): Promise<AuthContext | NextResponse> {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   const ctx = await getAuthContext(request);
   if (!ctx || !ctx.hasPermission(candidates)) {
      return NextResponse.json(
         { error: "Forbidden: insufficient permissions" },
         { status: 403 },
      );
   }
   return ctx;
}
