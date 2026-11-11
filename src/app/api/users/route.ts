import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";

export async function GET(request: NextRequest) {
   // R-1 fix (Final Review): the staff list exposes every employee's
   // email, phone, salary and status, so a bare login is not enough —
   // require the same `users` permission family as user management
   // (POST below, users/[id]). Roles without it receive 403;
   // unauthenticated requests still receive 401 from the guard.
   const gate = await requirePermission(request, [
      "users",
      "user",
      "user_view",
      "user_view_user",
   ]);
   if (gate instanceof NextResponse) return gate;

   const { searchParams } = new URL(request.url);
   const search = searchParams.get("search")?.trim() || "";
   const role = searchParams.get("role")?.trim() || "";
   const status = searchParams.get("status")?.trim() || "";

   const where: any = {};

   if (search) {
      where.OR = [
         { name: { contains: search } },
         { email: { contains: search } },
         { phoneNumber: { contains: search } },
         { customId: { contains: search } },
      ];
   }

   if (role && role !== "All") {
      where.role = { name: role };
   }

   if (status && status !== "All") {
      where.status = status.toUpperCase();
   }

   try {
      const users = await prisma.user.findMany({
         where,
         include: { role: true },
         orderBy: { createdAt: "desc" },
      });

      // Strip sensitive passwordHash and flatten role to string
      const safeUsers = users.map(({ passwordHash, role, ...rest }) => ({
         ...rest,
         role: role?.name || "Staff",
         roleDetails: role,
      }));

      return NextResponse.json(safeUsers);
   } catch {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   // SEC-01 fix: creating accounts (incl. assigning roles) is an
   // administrator / user-management operation, not something any
   // signed-in account may do.
   const gate = await requirePermission(request, [
      "users",
      "user",
      "user_create",
   ]);
   if (gate instanceof NextResponse) return gate;

   try {
      const body = await request.json();
      const { name, email, password, phoneNumber, address, salary, roleId, status, image } = body;

      if (!email) {
         return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
         return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }

      const passwordHash = password ? await hashPassword(password) : undefined;
      const { customId } = await generateNextEntityId("USER");

      const newUser = await prisma.user.create({
         data: {
            customId,
            name: name || undefined,
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber || undefined,
            address: address || undefined,
            salary: salary || undefined,
            passwordHash,
            roleId: roleId || undefined,
            status: status ? (status.toUpperCase() as any) : "ACTIVE",
            image: image || undefined,
         },
         include: { role: true },
      });

      const { passwordHash: _, role: roleRel, ...rest } = newUser;
      const safeUser = {
         ...rest,
         role: roleRel?.name || "Staff",
         roleDetails: roleRel,
      };
      return NextResponse.json(safeUser, { status: 201 });
   } catch {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
   }
}
