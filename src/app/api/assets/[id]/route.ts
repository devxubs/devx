import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

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
      const updated = await prisma.asset.update({
         where: { id },
         data: {
            name: body.name !== undefined ? body.name.trim() : undefined,
            category: body.category !== undefined ? body.category : undefined,
            value: body.value !== undefined ? parseFloat(body.value) : undefined,
            description: body.description !== undefined ? body.description : undefined,
         },
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
      const asset = await prisma.asset.update({
         where: { id },
         data: { isDeleted: true },
      });

      return NextResponse.json({ message: "Asset moved to bin", asset });
   } catch {
      return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
   }
}
