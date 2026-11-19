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
      const supplier = await prisma.supplier.findFirst({
         where: {
            OR: [{ id }, { customId: id }],
         },
         include: {
            purchases: {
               where: { isDeleted: false },
               orderBy: { createdAt: "desc" },
            },
         },
      });

      if (!supplier || supplier.isDeleted) {
         return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }

      return NextResponse.json(supplier);
   } catch {
      return NextResponse.json({ error: "Failed to fetch supplier" }, { status: 500 });
   }
}

export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ["suppliers", "supplier", "supplier_update"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const body = await request.json();
      const updated = await prisma.supplier.update({
         where: { id },
         data: {
            name: body.name !== undefined ? body.name.trim() : undefined,
            email: body.email !== undefined ? body.email.trim() : undefined,
            phone: body.phone !== undefined ? body.phone.trim() : undefined,
            address: body.address !== undefined ? body.address : undefined,
         },
      });

      return NextResponse.json(updated);
   } catch {
      return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ["suppliers", "supplier", "supplier_delete"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const supplier = await prisma.supplier.update({
         where: { id },
         data: { isDeleted: true, deletedAt: new Date() },
      });

      return NextResponse.json({ message: "Supplier moved to bin", supplier });
   } catch {
      return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
   }
}
