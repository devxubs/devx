import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

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
      JWT_SECRET,
      { expiresIn: "7d" },
   );
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): SessionUser | null {
   try {
      const decoded = jwt.verify(token, JWT_SECRET) as SessionUser;
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
