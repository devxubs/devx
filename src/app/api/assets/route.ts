import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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
