import { NextRequest, NextResponse } from "next/server";
import { normalizePermissions, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
   buildChanges,
} from "@src/lib/audit";

const ROLE_UPDATE_KEYS = ["roles", "role", "role_update_role", "role_update"];
const ROLE_DELETE_KEYS = ["roles", "role", "role_delete_role", "role_delete"];

// P2-4: the permissions payload is a JSON map that can be large, so
// the audit diff records it as the sorted list of GRANTED permission
// keys (via the same normaliser the enforcer uses) — enough to see
// exactly what access changed, bounded to key names, no raw payload
// dumped into the audit row.
function roleAuditSnapshot(role: any) {
   if (!role) return role;
   const granted = Object.entries(normalizePermissions(role.permissions))
      .filter(([, v]) => v === true)
      .map(([k]) => k)
      .sort();
   return { ...role, permissions: granted.join(", ") || null };
}

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ["roles", "role", "role_view", "role_view_role"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;
   try {
      const role = await prisma.role.findUnique({
         where: { id },
         include: {
            // Never leak password hashes through the role detail view.
            users: {
               select: {
                  id: true,
                  customId: true,
                  name: true,
                  email: true,
                  phoneNumber: true,
                  image: true,
                  status: true,
               },
            },
         },
      });

      if (!role) {
         return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }

      return NextResponse.json(role);
   } catch {
      return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
   }
}

export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ROLE_UPDATE_KEYS);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const body = await request.json();
      const auditCtx = requestAuditContext(request);
      // P2-4: role updates are audited in the same transaction; a
      // no-op PUT (empty computed diff) writes no row, mirroring the
      // expense/purchase PUT pattern.
      const updated = await prisma.$transaction(async (tx) => {
         const before = await tx.role.findUnique({ where: { id } });
         const result = await tx.role.update({
            where: { id },
            data: {
               name: body.name !== undefined ? body.name.trim() : undefined,
               description: body.description !== undefined ? body.description : undefined,
               permissions: body.permissions !== undefined ? body.permissions : undefined,
            },
         });

         if (before) {
            const changes = buildChanges(
               roleAuditSnapshot(before),
               roleAuditSnapshot(result),
               ["name", "description", "permissions"],
            );
            if (changes) {
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "UPDATE",
                  entityType: "ROLE",
                  entityId: result.id,
                  entityCustomId: result.customId,
                  summary: `Role ${result.name} updated`,
                  changes,
                  ...auditCtx,
               });
            }
         }

         return result;
      });

      return NextResponse.json(updated);
   } catch {
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ROLE_DELETE_KEYS);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const auditCtx = requestAuditContext(request);
      // P2-4: role deletion is audited in the same transaction.
      await prisma.$transaction(async (tx) => {
         const before = await tx.role.findUnique({ where: { id } });
         await tx.role.delete({ where: { id } });
         if (before) {
            await logAudit(tx, {
               actor: auditActorFromContext(gate),
               action: "DELETE",
               entityType: "ROLE",
               entityId: before.id,
               entityCustomId: before.customId,
               summary: `Role ${before.name} deleted`,
               ...auditCtx,
            });
         }
      });
      return NextResponse.json({ message: "Role deleted successfully" });
   } catch {
      return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
   }
}
