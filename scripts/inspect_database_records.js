require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
   console.log("=== DATABASE RECORDS AUDIT & TEST RECORD IDENTIFICATION ===");

   const [
      users,
      roles,
      products,
      categories,
      units,
      customers,
      suppliers,
      orders,
      purchases,
      expenses,
      assets,
      conversations,
      messages,
      notifications,
   ] = await Promise.all([
      prisma.user.findMany({ include: { role: true } }),
      prisma.role.findMany(),
      prisma.product.findMany({ select: { id: true, customId: true, productName: true, isDeleted: true } }),
      prisma.category.findMany({ select: { id: true, customId: true, name: true, isDeleted: true } }),
      prisma.unit.findMany({ select: { id: true, customId: true, name: true, isDeleted: true } }),
      prisma.customer.findMany({ select: { id: true, customId: true, name: true, phone: true, isDeleted: true } }),
      prisma.supplier.findMany({ select: { id: true, customId: true, name: true, isDeleted: true } }),
      prisma.order.findMany({ select: { id: true, customId: true, orderId: true, invoiceNo: true, customerId: true, isDeleted: true } }),
      prisma.purchase.findMany({ select: { id: true, customId: true, invoice: true, supplierId: true, isDeleted: true } }),
      prisma.expense.findMany({ select: { id: true, customId: true, type: true, isDeleted: true } }),
      prisma.asset.findMany({ select: { id: true, customId: true, name: true, isDeleted: true } }),
      prisma.conversation.findMany({ select: { id: true, name: true, type: true } }),
      prisma.chatMessage.findMany({ select: { id: true, senderName: true, message: true } }),
      prisma.notification.findMany({ select: { id: true, title: true, userId: true } }),
   ]);

   console.log(`Users (${users.length}):`, users.map((u) => ({ id: u.id, customId: u.customId, email: u.email, role: u.role?.name, status: u.status })));
   console.log(`Roles (${roles.length}):`, roles.map((r) => ({ id: r.id, name: r.name })));
   console.log(`Products (${products.length}):`, products.map((p) => ({ id: p.id, customId: p.customId, name: p.productName, isDeleted: p.isDeleted })));
   console.log(`Categories (${categories.length}):`, categories.map((c) => ({ id: c.id, customId: c.customId, name: c.name, isDeleted: c.isDeleted })));
   console.log(`Units (${units.length}):`, units.map((u) => ({ id: u.id, customId: u.customId, name: u.name, isDeleted: u.isDeleted })));
   console.log(`Customers (${customers.length}):`, customers.map((c) => ({ id: c.id, customId: c.customId, name: c.name, phone: c.phone, isDeleted: c.isDeleted })));
   console.log(`Suppliers (${suppliers.length}):`, suppliers.map((s) => ({ id: s.id, customId: s.customId, name: s.name, isDeleted: s.isDeleted })));
   console.log(`Orders (${orders.length}):`, orders.map((o) => ({ id: o.id, customId: o.customId, orderId: o.orderId, invoiceNo: o.invoiceNo, isDeleted: o.isDeleted })));
   console.log(`Purchases (${purchases.length}):`, purchases.map((pu) => ({ id: pu.id, customId: pu.customId, invoice: pu.invoice, isDeleted: pu.isDeleted })));
   console.log(`Expenses (${expenses.length}):`, expenses.map((e) => ({ id: e.id, customId: e.customId, type: e.type, isDeleted: e.isDeleted })));
   console.log(`Assets (${assets.length}):`, assets.map((a) => ({ id: a.id, customId: a.customId, name: a.name, isDeleted: a.isDeleted })));
   console.log(`Conversations (${conversations.length}):`, conversations);
   console.log(`Chat Messages (${messages.length}):`, messages);
   console.log(`Notifications (${notifications.length}):`, notifications.map((n) => ({ id: n.id, title: n.title })));

   // Check for broken FKs
   const orderCustIds = orders.map((o) => o.customerId).filter(Boolean);
   const existingCustIds = new Set(customers.map((c) => c.id));
   const orphanedOrders = orderCustIds.filter((cid) => !existingCustIds.has(cid));

   const purSuppIds = purchases.map((p) => p.supplierId).filter(Boolean);
   const existingSuppIds = new Set(suppliers.map((s) => s.id));
   const orphanedPurchases = purSuppIds.filter((sid) => !existingSuppIds.has(sid));

   console.log("\nForeign Key Integrity:");
   console.log(`- Orphaned Orders (Customer missing): ${orphanedOrders.length} -> ${orphanedOrders.length === 0 ? "INTACT (PASS)" : "BROKEN"}`);
   console.log(`- Orphaned Purchases (Supplier missing): ${orphanedPurchases.length} -> ${orphanedPurchases.length === 0 ? "INTACT (PASS)" : "BROKEN"}`);

   // Check duplicate customIds
   function checkDupes(name, list) {
      const ids = list.map((x) => x.customId).filter(Boolean);
      const seen = new Set();
      const dupes = [];
      for (const id of ids) {
         if (seen.has(id)) dupes.push(id);
         seen.add(id);
      }
      console.log(`- Duplicate customIds in ${name}: ${dupes.length === 0 ? "None (PASS)" : dupes.join(", ")}`);
   }

   console.log("\nDuplicate ID Checks:");
   checkDupes("Products", products);
   checkDupes("Categories", categories);
   checkDupes("Units", units);
   checkDupes("Customers", customers);
   checkDupes("Suppliers", suppliers);
   checkDupes("Orders", orders);
   checkDupes("Purchases", purchases);
   checkDupes("Expenses", expenses);
   checkDupes("Assets", assets);
   checkDupes("Users", users);
}

main()
   .catch(console.error)
   .finally(() => prisma.$disconnect());
