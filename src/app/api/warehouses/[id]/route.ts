import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { normalizeWarehouseUpdate } from "@src/lib/warehouse";

// P2-1: warehouse update/delete. Warehouses borrow the product
// permission family (the warehouses POST does the same — audit S-5
// notes the borrowed keys; consistency wins over inventing new keys
// here). Like the comparable units/categories routes, these handlers
// do not write audit rows — audit coverage extension is P2-4.
//
// Deletion is a SOFT delete (isDeleted/deletedAt), the pattern the
// codebase uses for entities with history: ProductWarehouseStock
// rows and StockBatch references point at warehouses, so a hard
// delete would cascade-destroy stock history. Two guards keep the
// stock mirror coherent:
//   - the default warehouse cannot be deleted (set another default
//     first) — the stock engine mirrors deltas onto the default;
//   - a warehouse whose stock rows do not sum to zero cannot be
//     deleted (its units would vanish from the mirror).

const WAREHOUSE_KEYS = ["products", "product", "product_create", "product_update"];

async function findWarehouse(id: string) {
   return prisma.warehouse.findFirst({
      where: {
         OR: [{ id }, { customId: id }],
         isDeleted: false,
      },
   });
}

export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, WAREHOUSE_KEYS);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const target = await findWarehouse(id);
      if (!target) {
         return NextResponse.json(
            { error: "Warehouse not found" },
            { status: 404 },
         );
      }

      const body = await request.json();
      const normalized = normalizeWarehouseUpdate(body ?? {});
      if (!normalized.ok) {
         return NextResponse.json(
            { error: normalized.error },
            { status: 400 },
         );
      }
      const data = normalized.data;

      // Duplicate name/code against other live warehouses (the DB
      // unique constraints are the backstop — see the P2002 catch).
      if (data.name !== undefined && data.name !== target.name) {
         const conflict = await prisma.warehouse.findFirst({
            where: { name: data.name, id: { not: target.id }, isDeleted: false },
         });
         if (conflict) {
            return NextResponse.json(
               { error: `Warehouse "${data.name}" already exists` },
               { status: 409 },
            );
         }
      }
      if (data.code !== undefined && data.code !== null && data.code !== target.code) {
         const conflict = await prisma.warehouse.findFirst({
            where: { code: data.code, id: { not: target.id }, isDeleted: false },
         });
         if (conflict) {
            return NextResponse.json(
               { error: `Warehouse code "${data.code}" already exists` },
               { status: 409 },
            );
         }
      }

      // Demoting the only default would leave the stock mirror with
      // no target — promote another warehouse first.
      if (data.isDefault === false && target.isDefault) {
         const otherDefault = await prisma.warehouse.findFirst({
            where: { isDefault: true, isDeleted: false, id: { not: target.id } },
         });
         if (!otherDefault) {
            return NextResponse.json(
               {
                  error:
                     "This is the only default warehouse. Set another warehouse as default first.",
               },
               { status: 409 },
            );
         }
      }

      const updated = await prisma.$transaction(async (tx) => {
         if (data.isDefault === true && !target.isDefault) {
            await tx.warehouse.updateMany({
               where: { isDefault: true, isDeleted: false, id: { not: target.id } },
               data: { isDefault: false },
            });
         }
         return tx.warehouse.update({
            where: { id: target.id },
            data,
         });
      });

      return NextResponse.json(updated);
   } catch (error: any) {
      if (error?.code === "P2002") {
         return NextResponse.json(
            { error: "Warehouse name or code already exists" },
            { status: 409 },
         );
      }
      return NextResponse.json(
         { error: "Failed to update warehouse" },
         { status: 500 },
      );
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, WAREHOUSE_KEYS);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const target = await findWarehouse(id);
      if (!target) {
         return NextResponse.json(
            { error: "Warehouse not found" },
            { status: 404 },
         );
      }

      if (target.isDefault) {
         return NextResponse.json(
            {
               error:
                  "Cannot delete the default warehouse. Set another warehouse as default first.",
            },
            { status: 409 },
         );
      }

      const stockAgg = await prisma.productWarehouseStock.aggregate({
         where: { warehouseId: target.id },
         _sum: { quantity: true },
      });
      const heldUnits = Number(stockAgg._sum.quantity || 0);
      if (heldUnits !== 0) {
         return NextResponse.json(
            {
               error: `Warehouse still holds stock (${heldUnits} units in the warehouse mirror). Adjust or move that stock before deleting.`,
            },
            { status: 409 },
         );
      }

      await prisma.warehouse.update({
         where: { id: target.id },
         data: { isDeleted: true, deletedAt: new Date() },
      });

      return NextResponse.json({ message: "Warehouse deleted" });
   } catch {
      return NextResponse.json(
         { error: "Failed to delete warehouse" },
         { status: 500 },
      );
   }
}
