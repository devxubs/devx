import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const units = await prisma.unit.findMany({
         where: { isDeleted: false },
         orderBy: { createdAt: "asc" },
      });

      // Calculate referencing products count for each unit to protect existing relationships
      const products = await prisma.product.findMany({
         where: { isDeleted: false },
         select: { sizes: true },
      });

      const counts: Record<string, number> = {};
      units.forEach((u) => {
         counts[u.name] = 0;
      });

      products.forEach((p) => {
         if (Array.isArray(p.sizes)) {
            p.sizes.forEach((s) => {
               if (typeof s === "string" && counts[s] !== undefined) {
                  counts[s]++;
               }
            });
         }
      });

      const unitsWithCount = units.map((u) => ({
         id: u.id,
         customId: u.customId,
         name: u.name,
         short: u.short || (u.name ? u.name.slice(0, 3).toLowerCase() : ""),
         productCount: counts[u.name] || 0,
         createdAt: u.createdAt,
         updatedAt: u.updatedAt,
      }));

      return NextResponse.json(unitsWithCount);
   } catch {
      return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const body = await request.json();
      const { name, short } = body;

      if (!name || typeof name !== "string" || !name.trim()) {
         return NextResponse.json({ error: "Unit name is required" }, { status: 400 });
      }

      const trimmedName = name.trim();
      const trimmedShort = short && typeof short === "string" && short.trim()
         ? short.trim()
         : trimmedName.slice(0, 3).toLowerCase();

      // Check if a unit with the same name already exists (active or in recycle bin)
      const existing = await prisma.unit.findFirst({
         where: {
            name: trimmedName,
         },
      });

      if (existing) {
         if (existing.isDeleted) {
            // Restore from Recycle Bin and update details
            const restored = await prisma.unit.update({
               where: { id: existing.id },
               data: {
                  isDeleted: false,
                  short: trimmedShort,
               },
            });
            return NextResponse.json(restored, { status: 201 });
         }
         return NextResponse.json(
            { error: `Unit "${trimmedName}" already exists` },
            { status: 409 }
         );
      }

      const { customId } = await generateNextEntityId("UNIT");

      const unit = await prisma.unit.create({
         data: {
            customId,
            name: trimmedName,
            short: trimmedShort,
         },
      });

      return NextResponse.json(unit, { status: 201 });
   } catch (error: any) {
      if (error?.code === "P2002") {
         return NextResponse.json({ error: "Unit already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
   }
}
