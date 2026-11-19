import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   try {
      const suppliers = await prisma.supplier.findMany({
         where: { isDeleted: false },
         include: { _count: { select: { purchases: true } } },
         orderBy: { name: "asc" },
      });
      return NextResponse.json(suppliers);
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch suppliers" },
         { status: 500 },
      );
   }
}

export async function POST(request: NextRequest) {
   const gate = await requirePermission(request, ["suppliers", "supplier", "supplier_create"]);
   if (gate instanceof NextResponse) return gate;

   try {
      const body = await request.json();
      const { name, email, phone, address } = body;

      if (!name) {
         return NextResponse.json(
            { error: "Supplier name is required" },
            { status: 400 },
         );
      }

      const { customId } = await generateNextEntityId("SUPPLIER");

      const supplier = await prisma.supplier.create({
         data: {
            customId,
            name: name.trim(),
            email: email || null,
            phone: phone || null,
            address: address || null,
         },
      });

      return NextResponse.json(supplier, { status: 201 });
   } catch {
      return NextResponse.json(
         { error: "Failed to create supplier" },
         { status: 500 },
      );
   }
}
