import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";

export async function GET(request: NextRequest) {
   const gate = await requirePermission(request, ["roles", "role", "role_view", "role_view_role", "users", "user", "user_view", "user_view_user"]);
   if (gate instanceof NextResponse) return gate;

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
      const auditCtx = requestAuditContext(request);

      // P2-4: role creation is audited in the same transaction.
      const role = await prisma.$transaction(async (tx) => {
         const created = await tx.role.create({
            data: {
               customId,
               name: name.trim(),
               description: description || undefined,
               permissions: permissions || undefined,
            },
         });

         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "CREATE",
            entityType: "ROLE",
            entityId: created.id,
            entityCustomId: created.customId,
            summary: `Role ${created.name} created`,
            ...auditCtx,
         });

         return created;
      });

      return NextResponse.json(role, { status: 201 });
   } catch (error: any) {
      if (error?.code === "P2002") {
         return NextResponse.json({ error: "Role already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
   }
}
