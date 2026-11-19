import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { parsePagination } from "@src/lib/pagination";

// Audit log viewer API (Phase 4, D1).
//
// READ-ONLY by design (owner's D1 decision): this is the only
// HTTP surface for audit records — there is no POST/PUT/PATCH/
// DELETE handler for them anywhere in the app, and writes happen
// exclusively from server-side mutation transactions through
// src/lib/audit.ts. Access is administrator-only (requireAdmin —
// the same gate as the Recycle Bin and system operations).

export async function GET(request: NextRequest) {
   const gate = await requireAdmin(request);
   if (gate instanceof NextResponse) return gate;

   const { searchParams } = new URL(request.url);
   const { page, limit, skip } = parsePagination(searchParams, 25);
   const entityType = searchParams.get("entityType")?.trim() || "";
   const action = searchParams.get("action")?.trim() || "";
   const actorId = searchParams.get("actorId")?.trim() || "";
   const search = searchParams.get("search")?.trim() || "";
   const startDate = searchParams.get("startDate");
   const endDate = searchParams.get("endDate");

   const where: any = {};
   if (entityType) where.entityType = entityType;
   if (action) where.action = action;
   if (actorId) where.actorId = actorId;
   if (search) {
      where.OR = [
         { summary: { contains: search } },
         { entityCustomId: { contains: search } },
         { actorLabel: { contains: search } },
      ];
   }
   if (startDate || endDate) {
      const range: any = {};
      if (startDate) range.gte = new Date(startDate);
      if (endDate) {
         const end = new Date(endDate);
         end.setHours(23, 59, 59, 999);
         range.lte = end;
      }
      where.createdAt = range;
   }

   try {
      const [logs, total] = await Promise.all([
         prisma.auditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
         }),
         prisma.auditLog.count({ where }),
      ]);

      return NextResponse.json({ logs, total, page, limit });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch audit logs" },
         { status: 500 },
      );
   }
}
