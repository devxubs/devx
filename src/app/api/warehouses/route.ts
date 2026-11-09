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
      let warehouses = await prisma.warehouse.findMany({
         where: { isDeleted: false },
         orderBy: { createdAt: "asc" },
      });

      // Auto-provision default warehouse if none exist
      if (warehouses.length === 0) {
         const { customId } = await generateNextEntityId("WAREHOUSE");
         const defaultWh = await prisma.warehouse.create({
            data: {
               customId,
               name: "Main Warehouse",
               code: "WH-MAIN",
               address: "Central Distribution Center, Dhaka",
               isDefault: true,
            },
         });
         warehouses = [defaultWh];
      }

      return NextResponse.json(warehouses);
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch warehouses" },
         { status: 500 },
      );
   }
}

export async function POST(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const body = await request.json();
      const { name, code, address, phone, isDefault } = body;

      if (!name || !name.trim()) {
         return NextResponse.json(
            { error: "Warehouse name is required" },
            { status: 400 },
         );
      }

      const { customId } = await generateNextEntityId("WAREHOUSE");

      if (isDefault) {
         // Reset other defaults
         await prisma.warehouse.updateMany({
            where: { isDefault: true },
            data: { isDefault: false },
         });
      }

      const warehouse = await prisma.warehouse.create({
         data: {
            customId,
            name: name.trim(),
            code: code?.trim() || customId,
            address: address?.trim() || null,
            phone: phone?.trim() || null,
            isDefault: Boolean(isDefault),
         },
      });

      return NextResponse.json(warehouse, { status: 201 });
   } catch (error: any) {
      if (error?.code === "P2002") {
         return NextResponse.json(
            { error: "Warehouse name or code already exists" },
            { status: 409 },
         );
      }
      return NextResponse.json(
         { error: "Failed to create warehouse" },
         { status: 500 },
      );
   }
}
