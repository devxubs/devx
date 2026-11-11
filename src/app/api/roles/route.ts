import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const roles = await prisma.role.findMany({
         include: {
            _count: { select: { users: true } },
         },
         orderBy: { createdAt: "asc" },
      });

      return NextResponse.json(roles);
   } catch {
      return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   // SEC-01 fix: role creation defines the permission model itself —
   // administrator / role-management permission required.
   const gate = await requirePermission(request, [
      "roles",
      "role",
      "role_create_role",
      "role_create",
   ]);
   if (gate instanceof NextResponse) return gate;

   try {
      const body = await request.json();
      const { name, description, permissions } = body;

      if (!name) {
         return NextResponse.json({ error: "Role name is required" }, { status: 400 });
      }

      const { customId } = await generateNextEntityId("ROLE");

      const role = await prisma.role.create({
         data: {
            customId,
            name: name.trim(),
            description: description || undefined,
            permissions: permissions || undefined,
         },
      });

      return NextResponse.json(role, { status: 201 });
   } catch (error: any) {
      if (error?.code === "P2002") {
         return NextResponse.json({ error: "Role already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
   }
}
