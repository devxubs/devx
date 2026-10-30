import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const [
         products,
         orders,
         suppliers,
         purchases,
         expenses,
         assets,
         users,
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
         prisma.user.findMany({
            where: { status: { in: ["INACTIVE", "SUSPENDED"] } },
            select: { id: true, customId: true, name: true, email: true, updatedAt: true },
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
         ...users.map((u) => ({
            id: u.id,
            customId: u.customId || "EP",
            type: "user",
            name: u.name || u.email,
            deletedAt: u.updatedAt,
         })),
      ];

      return NextResponse.json(items);
   } catch {
      return NextResponse.json({ error: "Failed to fetch bin items" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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
            await prisma.user.update({
               where: { id },
               data: { status: "ACTIVE" },
            });
            return NextResponse.json({ message: "Employee restored successfully" });
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
            await prisma.order.update({
               where: { id },
               data: { isDeleted: false },
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
            await prisma.purchase.update({
               where: { id },
               data: { isDeleted: false },
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
            await prisma.$transaction([
               prisma.stockMovement.deleteMany({ where: { productId: id } }),
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
      return NextResponse.json({ error: error.message || "Failed to process bin item" }, { status: 500 });
   }
}
