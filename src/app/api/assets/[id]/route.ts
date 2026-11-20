import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
   buildChanges,
} from "@src/lib/audit";

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   try {
      const asset = await prisma.asset.findFirst({
         where: {
            OR: [{ id }, { customId: id }],
         },
      });
      if (!asset || asset.isDeleted) {
         return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
      return NextResponse.json(asset);
   } catch {
      return NextResponse.json({ error: "Failed to fetch asset" }, { status: 500 });
   }
}

export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ["assets", "asset", "asset_update"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const body = await request.json();
      const auditCtx = requestAuditContext(request);
      // P2-4: asset updates are audited in the same transaction; a
      // no-op PUT (empty diff) writes no row.
      const updated = await prisma.$transaction(async (tx) => {
         const before = await tx.asset.findUnique({ where: { id } });
         const result = await tx.asset.update({
            where: { id },
            data: {
               name: body.name !== undefined ? body.name.trim() : undefined,
               category: body.category !== undefined ? body.category : undefined,
               value: body.value !== undefined ? parseFloat(body.value) : undefined,
               description: body.description !== undefined ? body.description : undefined,
            },
         });

         if (before) {
            const changes = buildChanges(before, result, [
               "name",
               "category",
               "value",
               "description",
            ]);
            if (changes) {
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "UPDATE",
                  entityType: "ASSET",
                  entityId: result.id,
                  entityCustomId: result.customId,
                  summary: `Asset ${result.customId || result.name} updated`,
                  changes,
                  ...auditCtx,
               });
            }
         }

         return result;
      });

      return NextResponse.json(updated);
   } catch {
      return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ["assets", "asset", "asset_delete"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const auditCtx = requestAuditContext(request);
      // P2-4: the soft delete is audited in the same transaction.
      const asset = await prisma.$transaction(async (tx) => {
         const before = await tx.asset.findUnique({ where: { id } });
         const result = await tx.asset.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() },
         });
         if (before && !before.isDeleted) {
            await logAudit(tx, {
               actor: auditActorFromContext(gate),
               action: "DELETE",
               entityType: "ASSET",
               entityId: before.id,
               entityCustomId: before.customId,
               summary: `Asset ${before.customId || before.name} moved to bin`,
               ...auditCtx,
            });
         }
         return result;
      });

      return NextResponse.json({ message: "Asset moved to bin", asset });
   } catch {
      return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
   }
}
