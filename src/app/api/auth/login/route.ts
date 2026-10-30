import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@src/lib/prisma";
import { verifyPassword, signToken } from "@src/lib/auth";

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

      const user = await prisma.user.findUnique({
         where: { email: email.toLowerCase().trim() },
         include: { role: true },
      });

      if (!user || !user.passwordHash) {
         return NextResponse.json(
            { error: "Invalid email or password" },
            { status: 401 },
         );
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
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
