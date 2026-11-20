import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   try {
      // P2-1: GET is read-only — it previously auto-created a
      // "Main Warehouse" row when the list was empty (a write on
      // read). Default-warehouse provisioning now lives in the POST
      // create path below, which guarantees a default exists once
      // any warehouse has been created; the stock engine's mirror
      // tolerates the no-warehouse state until then.
      const warehouses: any[] = await prisma.warehouse.findMany({
         where: { isDeleted: false },
         orderBy: { createdAt: "asc" },
         // Phase 3A (3.2): the Stock workspace lists per-warehouse stock
         // totals — additive include, existing consumers unaffected.
         include: {
            stocks: { select: { productId: true, quantity: true } },
         },
      });

      return NextResponse.json(warehouses);
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch warehouses" },
         { status: 500 },
      );
   }
}

export async function POST(request: NextRequest) {
   const gate = await requirePermission(request, ["products", "product", "product_create", "product_update"]);
   if (gate instanceof NextResponse) return gate;

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

      // P2-1: the create path guarantees a default warehouse exists
      // (this provisioning used to hide inside GET). An explicit
      // isDefault resets the others as before; when NO live default
      // exists at all, the new warehouse becomes the default so the
      // stock mirror always has a target once warehouses are in use.
      const existingDefault = await prisma.warehouse.findFirst({
         where: { isDeleted: false, isDefault: true },
         select: { id: true },
      });
      const makeDefault = Boolean(isDefault) || !existingDefault;

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
            isDefault: makeDefault,
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
