import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@src/lib/prisma";
import { hashPassword, signToken, getAuthContext } from "@src/lib/auth";

/**
 * Registration policy (SEC-01 fix):
 *
 * Public self-registration is closed. Accounts are created by an
 * administrator (here or via /api/users). The single exception is the
 * first-run bootstrap: when the database contains no users at all,
 * one initial account may be created so the owner can get in — it is
 * assigned the seeded "System Admin" role when that role exists.
 * Registration can never assign a privileged role from request data:
 * this handler accepts no role input at all.
 */
export async function POST(request: NextRequest) {
   try {
      const body = await request.json();
      const {
         fullName,
         email,
         password,
         businessAddress,
         mobileNumber,
      } = body;

      if (!email || !password || !fullName) {
         return NextResponse.json(
            { error: "Full name, email, and password are required" },
            { status: 400 },
         );
      }

      if (password.length < 6) {
         return NextResponse.json(
            { error: "Password must be at least 6 characters" },
            { status: 400 },
         );
      }

      // Authorization gate: admin session OR empty-database bootstrap.
      const [userCount, adminCtx] = await Promise.all([
         prisma.user.count(),
         getAuthContext(request).catch(() => null),
      ]);
      const isBootstrap = userCount === 0;
      const isAdmin = Boolean(adminCtx?.isAdmin);

      if (!isBootstrap && !isAdmin) {
         return NextResponse.json(
            {
               error: "Registration is disabled. Please contact an administrator to create your account.",
            },
            { status: 403 },
         );
      }

      // Check if user already exists
      const existing = await prisma.user.findUnique({
         where: { email: email.toLowerCase().trim() },
      });

      if (existing) {
         return NextResponse.json(
            { error: "Email is already registered" },
            { status: 409 },
         );
      }

      const passwordHash = await hashPassword(password);

      // Bootstrap account becomes the first administrator when the
      // seeded role exists; admin-created accounts start role-less
      // (roles are assigned afterwards via user management).
      let roleId: string | undefined;
      if (isBootstrap) {
         const adminRole = await prisma.role.findUnique({
            where: { name: "System Admin" },
         });
         roleId = adminRole?.id;
      }

      const user = await prisma.user.create({
         data: {
            name: fullName,
            email: email.toLowerCase().trim(),
            passwordHash,
            phoneNumber: mobileNumber || null,
            address: businessAddress || null,
            roleId,
         },
      });

      const response = NextResponse.json(
         {
            success: true,
            user: {
               id: user.id,
               email: user.email,
               name: user.name,
            },
         },
         { status: 201 },
      );

      // Only the bootstrap flow signs the new account in. When an admin
      // creates an account for someone else, their own session cookie
      // must not be replaced.
      if (isBootstrap) {
         const token = signToken({
            id: user.id,
            email: user.email,
            name: user.name,
            role: roleId ? "System Admin" : null,
         });

         response.cookies.set("devx_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
         });
      }

      return response;
   } catch (error) {
      return NextResponse.json(
         { error: "Internal server error during registration" },
         { status: 500 },
      );
   }
}
