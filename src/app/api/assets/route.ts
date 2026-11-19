import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";
import { parsePagination } from "@src/lib/pagination";

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
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
      // Optional server pagination for chunked export loaders. The
      // historical no-parameter response remains a bare array, so
      // the Assets page and other existing consumers are unchanged.
      if (searchParams.has("page") || searchParams.has("limit")) {
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
      }

      const assets = await prisma.asset.findMany({
         where,
         orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(assets);
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

      const asset = await prisma.asset.create({
         data: {
            customId,
            name: name.trim(),
            category: category || undefined,
            value: parseFloat(value) || 0,
            description: description || undefined,
         },
      });

      return NextResponse.json(asset, { status: 201 });
   } catch {
      return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
   }
}
