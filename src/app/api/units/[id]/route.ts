import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(
   _request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   try {
      const unit = await prisma.unit.findFirst({
         where: {
            OR: [{ id }, { customId: id }],
         },
      });

      if (!unit) {
         return NextResponse.json({ error: "Unit not found" }, { status: 404 });
      }

      return NextResponse.json(unit);
   } catch {
      return NextResponse.json({ error: "Failed to fetch unit" }, { status: 500 });
   }
}

async function handleUpdate(
   request: NextRequest,
   params: Promise<{ id: string }>,
) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { id } = await params;

   try {
      // Find the existing unit by primary key id OR customId
      const targetUnit = await prisma.unit.findFirst({
         where: {
            OR: [{ id }, { customId: id }],
         },
      });

      if (!targetUnit) {
         return NextResponse.json({ error: "Unit not found" }, { status: 404 });
      }

      const body = await request.json();
      const { name, short } = body;

      if (name !== undefined && (!name || typeof name !== "string" || !name.trim())) {
         return NextResponse.json({ error: "Unit name cannot be empty" }, { status: 400 });
      }

      const trimmedName = name !== undefined ? name.trim() : targetUnit.name;
      const trimmedShort = short !== undefined
         ? (short && typeof short === "string" ? short.trim() : null)
         : targetUnit.short;

      // Duplicate name check against other records
      if (trimmedName.toLowerCase() !== targetUnit.name.toLowerCase()) {
         const conflict = await prisma.unit.findFirst({
            where: {
               name: trimmedName,
               id: { not: targetUnit.id },
            },
         });

         if (conflict) {
            if (conflict.isDeleted) {
               return NextResponse.json(
                  { error: `Unit "${trimmedName}" exists in the Recycle Bin. Restore or delete it from the Bin first.` },
                  { status: 409 }
               );
            }
            return NextResponse.json(
               { error: `Unit "${trimmedName}" already exists` },
               { status: 409 }
            );
         }
      }

      // Update unit in database using the primary key
      const updated = await prisma.unit.update({
         where: { id: targetUnit.id },
         data: {
            name: trimmedName,
            short: trimmedShort,
         },
      });

      // Preserve product relationships: update Product.sizes if the unit name was renamed
      if (targetUnit.name !== trimmedName) {
         const productsWithUnit = await prisma.product.findMany({
            where: { isDeleted: false },
            select: { id: true, sizes: true },
         });

         for (const prod of productsWithUnit) {
            if (Array.isArray(prod.sizes) && prod.sizes.includes(targetUnit.name)) {
               const newSizes = (prod.sizes as string[]).map((s: string) =>
                  s === targetUnit.name ? trimmedName : s
               );
               await prisma.product.update({
                  where: { id: prod.id },
                  data: { sizes: newSizes },
               });
            }
         }
      }

      return NextResponse.json(updated);
   } catch (error: any) {
      if (error?.code === "P2002") {
         return NextResponse.json({ error: "A unit with this name already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
   }
}

export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   return handleUpdate(request, params);
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   return handleUpdate(request, params);
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { id } = await params;

   try {
      const targetUnit = await prisma.unit.findFirst({
         where: {
            OR: [{ id }, { customId: id }],
         },
      });

      if (!targetUnit) {
         return NextResponse.json({ error: "Unit not found" }, { status: 404 });
      }

      // Check whether existing products reference the unit
      const productsWithUnit = await prisma.product.findMany({
         where: { isDeleted: false },
         select: { id: true, productName: true, sizes: true },
      });
      const referencingProducts = productsWithUnit.filter(
         (p) => Array.isArray(p.sizes) && p.sizes.includes(targetUnit.name)
      );

      await prisma.unit.update({
         where: { id: targetUnit.id },
         data: { isDeleted: true },
      });

      return NextResponse.json({
         message: "Unit moved to Recycle Bin",
         referencingProductsCount: referencingProducts.length,
      });
   } catch {
      return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
   }
}
