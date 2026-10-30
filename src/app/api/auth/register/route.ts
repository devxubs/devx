import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@src/lib/prisma";
import { hashPassword, signToken } from "@src/lib/auth";

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

      const user = await prisma.user.create({
         data: {
            name: fullName,
            email: email.toLowerCase().trim(),
            passwordHash,
            phoneNumber: mobileNumber || null,
            address: businessAddress || null,
         },
      });

      const token = signToken({
         id: user.id,
         email: user.email,
         name: user.name,
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

      // Set auth cookie
      response.cookies.set("devx_token", token, {
         httpOnly: true,
         secure: process.env.NODE_ENV === "production",
         sameSite: "lax",
         maxAge: 60 * 60 * 24 * 7, // 7 days
         path: "/",
      });

      return response;
   } catch (error) {
      return NextResponse.json(
         { error: "Internal server error during registration" },
         { status: 500 },
      );
   }
}
