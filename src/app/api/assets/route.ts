import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";
import { parsePagination } from "@src/lib/pagination";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";

export async function GET(request: NextRequest) {
   const sessionGate = await requirePermission(request, ["assets", "asset", "asset_view_asset", "asset_create"]);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { searchParams } = new URL(request.url);
   const search = searchParams.get("search")?.trim() || "";

   const where: any = { isDeleted: false };
   if (search) {
      where.OR = [
         { name: { contains: search } },
         { category: { contains: search } },
         { customId: { contains: search } },
      ];
   }

   try {
      // P4-2: pagination is now the DEFAULT (and only) shape — the
      // shared parsePagination bounds (default 20, max 100) always
      // apply and the response is always { assets, total, page,
      // limit }. The previous no-parameter bare-array response was
      // an unbounded full-table load. Consumers that render the
      // full set (the Assets page, the export loader) walk the
      // bounded pages via lib/fetchAllPages, so the rows they show
      // are unchanged — they just arrive in chunks.
      const { page, limit, skip } = parsePagination(searchParams, 20);
      const [assets, total] = await Promise.all([
         prisma.asset.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
         }),
         prisma.asset.count({ where }),
      ]);
      return NextResponse.json({ assets, total, page, limit });
   } catch {
      return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   const gate = await requirePermission(request, ["assets", "asset", "asset_create"]);
   if (gate instanceof NextResponse) return gate;

   try {
      const body = await request.json();
      const { name, category, value, description } = body;

      if (!name) {
         return NextResponse.json({ error: "Asset name is required" }, { status: 400 });
      }

      const { customId } = await generateNextEntityId("ASSET");
      const auditCtx = requestAuditContext(request);

      // P2-4: asset creation is audited in the same transaction.
      const asset = await prisma.$transaction(async (tx) => {
         const created = await tx.asset.create({
            data: {
               customId,
               name: name.trim(),
               category: category || undefined,
               value: parseFloat(value) || 0,
               description: description || undefined,
            },
         });

         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "CREATE",
            entityType: "ASSET",
            entityId: created.id,
            entityCustomId: created.customId,
            summary: `Asset ${created.customId || created.name} created — ${created.name}`,
            ...auditCtx,
         });

         return created;
      });

      return NextResponse.json(asset, { status: 201 });
   } catch {
      return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
   }
}
