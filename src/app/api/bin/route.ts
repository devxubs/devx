import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   loadStockSettings,
   deductStockForItems,
   addStockForPurchaseItems,
   InsufficientStockError,
} from "@src/lib/stock";

export async function GET(request: NextRequest) {
   // R-2 fix (Final Review): Recycle Bin contents are deleted business
   // records — reading them requires the same administrator
   // authorization as the bin mutations in POST below, not just any
   // login. Unauthenticated requests still receive 401 from the guard.
   const gate = await requireAdmin(request);
   if (gate instanceof NextResponse) return gate;

   try {
      const [
         products,
         orders,
         suppliers,
         purchases,
         expenses,
         assets,
         customers,
         categories,
         units,
      ] = await Promise.all([
         prisma.product.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, productName: true, updatedAt: true },
         }),
         prisma.order.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, orderId: true, total: true, updatedAt: true },
         }),
         prisma.supplier.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, name: true, updatedAt: true },
         }),
         prisma.purchase.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, invoice: true, total: true, updatedAt: true },
         }),
         prisma.expense.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, type: true, amount: true, updatedAt: true },
         }),
         prisma.asset.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, name: true, value: true, updatedAt: true },
         }),
         prisma.customer.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, name: true, phone: true, updatedAt: true },
         }),
         prisma.category.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, name: true, updatedAt: true },
         }),
         prisma.unit.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, name: true, updatedAt: true },
         }),
      ]);

      const items = [
         ...products.map((p) => ({
            id: p.id,
            customId: p.customId,
            type: "product",
            name: p.productName,
            deletedAt: p.updatedAt,
         })),
         ...orders.map((o) => ({
            id: o.id,
            customId: o.customId || o.orderId,
            type: "order",
            name: `Order ${o.orderId || o.customId}`,
            deletedAt: o.updatedAt,
         })),
         ...suppliers.map((s) => ({
            id: s.id,
            customId: s.customId,
            type: "supplier",
            name: s.name,
            deletedAt: s.updatedAt,
         })),
         ...purchases.map((p) => ({
            id: p.id,
            customId: p.customId || p.invoice,
            type: "purchase",
            name: `Purchase ${p.invoice || p.customId}`,
            deletedAt: p.updatedAt,
         })),
         ...expenses.map((e) => ({
            id: e.id,
            customId: e.customId,
            type: "expense",
            name: `Expense: ${e.type} (৳${e.amount})`,
            deletedAt: e.updatedAt,
         })),
         ...assets.map((a) => ({
            id: a.id,
            customId: a.customId,
            type: "asset",
            name: `Asset: ${a.name}`,
            deletedAt: a.updatedAt,
         })),
         ...customers.map((c) => ({
            id: c.id,
            customId: c.customId,
            type: "customer",
            name: `Customer: ${c.name} (${c.phone || "No phone"})`,
            deletedAt: c.updatedAt,
         })),
         ...categories.map((cat) => ({
            id: cat.id,
            customId: cat.customId,
            type: "category",
            name: `Category: ${cat.name}`,
            deletedAt: cat.updatedAt,
         })),
         ...units.map((u) => ({
            id: u.id,
            customId: u.customId,
            type: "unit",
            name: `Unit: ${u.name}`,
            deletedAt: u.updatedAt || new Date(),
         })),
         // BIN-01 fix: INACTIVE/SUSPENDED users are NOT deleted
         // records and no longer appear in the Recycle Bin. The User
         // model has no soft-delete flag; account status is managed
         // from User Management. Previously, "restoring" a suspended
         // employee from the bin silently reactivated them as ACTIVE.
      ];

      return NextResponse.json(items);
   } catch {
      return NextResponse.json({ error: "Failed to fetch bin items" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   // SEC-01 fix: restore and (especially) permanent deletion from the
   // recycle bin are administrator-only operations.
   const gate = await requireAdmin(request);
   if (gate instanceof NextResponse) return gate;

   try {
      const body = await request.json();
      const type = (body.type || body.entity || "").toLowerCase();
      const action = body.action === "permanent_delete" ? "delete" : body.action;
      const { id } = body;

      if (!type || !id || !action) {
         return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
      }

      // 1. USER HANDLING
      if (type === "user") {
         if (action === "restore") {
            // BIN-01 fix: users are never soft-deleted, so there is
            // nothing to "restore" — and blindly setting ACTIVE here
            // used to reactivate accounts that had been suspended on
            // purpose. Status changes belong to User Management.
            return NextResponse.json(
               {
                  error:
                     "Users are not deleted records. Manage account status (Active / Inactive / Suspended) from User Management.",
               },
               { status: 400 },
            );
         } else if (action === "delete") {
            await prisma.$transaction([
               prisma.order.updateMany({ where: { employeeId: id }, data: { employeeId: null } }),
               prisma.purchase.updateMany({ where: { createdById: id }, data: { createdById: null } }),
               prisma.expense.updateMany({ where: { createdById: id }, data: { createdById: null } }),
               prisma.user.delete({ where: { id } }),
            ]);
            return NextResponse.json({ message: "User permanently deleted" });
         }
      }

      // 2. ORDER HANDLING
      if (type === "order") {
         if (action === "restore") {
            // BIN-02/ORD-02 fix: soft-deleting the order released its
            // stock, so restoring must deduct it again (validated,
            // same transaction) — unless the order is CANCELLED, in
            // which case it holds no stock either way.
            await prisma.$transaction(async (tx) => {
               const order = await tx.order.findUnique({
                  where: { id },
                  include: { items: true },
               });
               if (!order) throw new Error("Order not found");
               if (order.isDeleted && order.status !== "CANCELLED") {
                  const stockSettings = await loadStockSettings(tx);
                  await deductStockForItems(
                     tx,
                     order.items
                        .filter((it) => it.productId)
                        .map((it) => ({
                           productId: it.productId as string,
                           quantity: it.quantity,
                        })),
                     {
                        settings: stockSettings,
                        orderId: order.id,
                        note: `Order ${order.orderId || order.customId} restored from bin — stock deducted`,
                     },
                  );
               }
               await tx.order.update({
                  where: { id },
                  data: { isDeleted: false },
               });
            });
            return NextResponse.json({ message: "Order restored successfully" });
         } else if (action === "delete") {
            await prisma.$transaction([
               prisma.orderItem.deleteMany({ where: { orderId: id } }),
               prisma.order.delete({ where: { id } }),
            ]);
            return NextResponse.json({ message: "Order permanently deleted" });
         }
      }

      // 3. PURCHASE HANDLING
      if (type === "purchase") {
         if (action === "restore") {
            // PUR-03 mirror: soft-deleting reversed the purchase's
            // stock, so restoring re-adds it in the same transaction.
            await prisma.$transaction(async (tx) => {
               const purchase = await tx.purchase.findUnique({
                  where: { id },
                  include: { items: true },
               });
               if (!purchase) throw new Error("Purchase not found");
               if (purchase.isDeleted) {
                  await addStockForPurchaseItems(
                     tx,
                     purchase.items
                        .filter((it) => it.productId)
                        .map((it) => ({
                           productId: it.productId as string,
                           quantity: it.quantity,
                        })),
                     {
                        purchaseId: purchase.id,
                        note: `Purchase ${purchase.customId} restored from bin — stock re-added`,
                     },
                  );
               }
               await tx.purchase.update({
                  where: { id },
                  data: { isDeleted: false },
               });
            });
            return NextResponse.json({ message: "Purchase restored successfully" });
         } else if (action === "delete") {
            await prisma.$transaction([
               prisma.purchaseAttachment.deleteMany({ where: { purchaseId: id } }),
               prisma.purchaseItem.deleteMany({ where: { purchaseId: id } }),
               prisma.purchase.delete({ where: { id } }),
            ]);
            return NextResponse.json({ message: "Purchase permanently deleted" });
         }
      }

      // 4. SUPPLIER HANDLING
      if (type === "supplier") {
         if (action === "restore") {
            await prisma.supplier.update({
               where: { id },
               data: { isDeleted: false },
            });
            return NextResponse.json({ message: "Supplier restored successfully" });
         } else if (action === "delete") {
            await prisma.$transaction([
               prisma.purchase.updateMany({ where: { supplierId: id }, data: { supplierId: null } }),
               prisma.supplier.delete({ where: { id } }),
            ]);
            return NextResponse.json({ message: "Supplier permanently deleted" });
         }
      }

      // 5. PRODUCT HANDLING
      if (type === "product") {
         if (action === "restore") {
            await prisma.product.update({
               where: { id },
               data: { isDeleted: false },
            });
            return NextResponse.json({ message: "Product restored successfully" });
         } else if (action === "delete") {
            // Fix instruction #31 / DB-01 / DB-04: permanent product
            // deletion must not destroy the StockMovement audit trail.
            // StockMovement.product is a required FK, so a product
            // with movement history cannot be removed without erasing
            // that history — reject safely instead. Bundle-component
            // links (configuration, not history) are cleaned up first
            // so they no longer block deletion with a raw FK error.
            const movementCount = await prisma.stockMovement.count({
               where: { productId: id },
            });
            if (movementCount > 0) {
               return NextResponse.json(
                  {
                     error:
                        "This product has stock movement history and cannot be permanently deleted without destroying the inventory audit trail. Keep it in the Recycle Bin (soft-deleted) instead.",
                  },
                  { status: 409 },
               );
            }
            await prisma.$transaction([
               prisma.productBundleItem.deleteMany({
                  where: { componentProductId: id },
               }),
               prisma.product.delete({ where: { id } }),
            ]);
            return NextResponse.json({ message: "Product permanently deleted" });
         }
      }

      // 6. EXPENSE HANDLING
      if (type === "expense") {
         if (action === "restore") {
            await prisma.expense.update({
               where: { id },
               data: { isDeleted: false },
            });
            return NextResponse.json({ message: "Expense restored successfully" });
         } else if (action === "delete") {
            await prisma.expense.delete({ where: { id } });
            return NextResponse.json({ message: "Expense permanently deleted" });
         }
      }

      // 7. ASSET HANDLING
      if (type === "asset") {
         if (action === "restore") {
            await prisma.asset.update({
               where: { id },
               data: { isDeleted: false },
            });
            return NextResponse.json({ message: "Asset restored successfully" });
         } else if (action === "delete") {
            await prisma.asset.delete({ where: { id } });
            return NextResponse.json({ message: "Asset permanently deleted" });
         }
      }

      // 8. CUSTOMER HANDLING
      if (type === "customer") {
         if (action === "restore") {
            await prisma.customer.update({
               where: { id },
               data: { isDeleted: false },
            });
            return NextResponse.json({ message: "Customer restored successfully" });
         } else if (action === "delete") {
            await prisma.$transaction([
               prisma.order.updateMany({ where: { customerId: id }, data: { customerId: null } }),
               prisma.customer.delete({ where: { id } }),
            ]);
            return NextResponse.json({ message: "Customer permanently deleted" });
         }
      }

      // 9. CATEGORY HANDLING
      if (type === "category") {
         if (action === "restore") {
            await prisma.category.update({
               where: { id },
               data: { isDeleted: false },
            });
            return NextResponse.json({ message: "Category restored successfully" });
         } else if (action === "delete") {
            await prisma.$transaction([
               prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
               prisma.category.delete({ where: { id } }),
            ]);
            return NextResponse.json({ message: "Category permanently deleted" });
         }
      }

      // 10. UNIT HANDLING
      if (type === "unit") {
         if (action === "restore") {
            await prisma.unit.update({
               where: { id },
               data: { isDeleted: false },
            });
            return NextResponse.json({ message: "Unit restored successfully" });
         } else if (action === "delete") {
            await prisma.unit.delete({ where: { id } });
            return NextResponse.json({ message: "Unit permanently deleted" });
         }
      }

      return NextResponse.json({ error: "Unsupported entity type or action" }, { status: 400 });
   } catch (error: any) {
      if (error instanceof InsufficientStockError) {
         return NextResponse.json(
            { error: "Insufficient stock", message: error.message },
            { status: 400 },
         );
      }
      console.error("POST /api/bin error:", error);
      return NextResponse.json({ error: "Failed to process bin item" }, { status: 500 });
   }
}
