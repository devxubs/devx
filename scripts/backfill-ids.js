const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function backfill() {
   console.log("Starting Entity Sequential ID backfill...");

   // 1. Users (EP_)
   const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
   for (let i = 0; i < users.length; i++) {
      const customId = `EP_${i + 1}`;
      await prisma.user.update({
         where: { id: users[i].id },
         data: { customId },
      });
   }
   await prisma.entitySequence.upsert({
      where: { entityType: "USER" },
      update: { currentSeq: users.length },
      create: { entityType: "USER", currentSeq: users.length },
   });
   console.log(`Backfilled ${users.length} Users with EP_ prefix.`);

   // 2. Customers (CUS_)
   const customers = await prisma.customer.findMany({ orderBy: { createdAt: "asc" } });
   for (let i = 0; i < customers.length; i++) {
      const customId = `CUS_${i + 1}`;
      await prisma.customer.update({
         where: { id: customers[i].id },
         data: { customId },
      });
   }
   await prisma.entitySequence.upsert({
      where: { entityType: "CUSTOMER" },
      update: { currentSeq: customers.length },
      create: { entityType: "CUSTOMER", currentSeq: customers.length },
   });
   console.log(`Backfilled ${customers.length} Customers with CUS_ prefix.`);

   // 3. Suppliers (SUP_)
   const suppliers = await prisma.supplier.findMany({ orderBy: { createdAt: "asc" } });
   for (let i = 0; i < suppliers.length; i++) {
      const customId = `SUP_${i + 1}`;
      await prisma.supplier.update({
         where: { id: suppliers[i].id },
         data: { customId },
      });
   }
   await prisma.entitySequence.upsert({
      where: { entityType: "SUPPLIER" },
      update: { currentSeq: suppliers.length },
      create: { entityType: "SUPPLIER", currentSeq: suppliers.length },
   });
   console.log(`Backfilled ${suppliers.length} Suppliers with SUP_ prefix.`);

   // 4. Products (PROD_)
   const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
   for (let i = 0; i < products.length; i++) {
      const customId = `PROD_${i + 1}`;
      await prisma.product.update({
         where: { id: products[i].id },
         data: {
            customId,
            productCode: customId,
            productSku: customId,
         },
      });
   }
   await prisma.entitySequence.upsert({
      where: { entityType: "PRODUCT" },
      update: { currentSeq: products.length },
      create: { entityType: "PRODUCT", currentSeq: products.length },
   });
   console.log(`Backfilled ${products.length} Products with PROD_ prefix.`);

   // 5. Orders (ORD_)
   const orders = await prisma.order.findMany({ orderBy: { createdAt: "asc" } });
   for (let i = 0; i < orders.length; i++) {
      const customId = `ORD_${i + 1}`;
      const invoiceNo = `INV_${i + 1}`;
      await prisma.order.update({
         where: { id: orders[i].id },
         data: {
            customId,
            orderCode: customId,
            orderId: customId,
            invoiceNo,
         },
      });
   }
   await prisma.entitySequence.upsert({
      where: { entityType: "ORDER" },
      update: { currentSeq: orders.length },
      create: { entityType: "ORDER", currentSeq: orders.length },
   });
   console.log(`Backfilled ${orders.length} Orders with ORD_ prefix.`);

   // 6. Purchases (PUR_)
   const purchases = await prisma.purchase.findMany({ orderBy: { createdAt: "asc" } });
   for (let i = 0; i < purchases.length; i++) {
      const customId = `PUR_${i + 1}`;
      await prisma.purchase.update({
         where: { id: purchases[i].id },
         data: {
            customId,
            invoice: customId,
         },
      });
   }
   await prisma.entitySequence.upsert({
      where: { entityType: "PURCHASE" },
      update: { currentSeq: purchases.length },
      create: { entityType: "PURCHASE", currentSeq: purchases.length },
   });
   console.log(`Backfilled ${purchases.length} Purchases with PUR_ prefix.`);

   // 7. Categories (CAT_)
   const categories = await prisma.category.findMany({ orderBy: { createdAt: "asc" } });
   for (let i = 0; i < categories.length; i++) {
      const customId = `CAT_${i + 1}`;
      await prisma.category.update({
         where: { id: categories[i].id },
         data: { customId },
      });
   }
   await prisma.entitySequence.upsert({
      where: { entityType: "CATEGORY" },
      update: { currentSeq: categories.length },
      create: { entityType: "CATEGORY", currentSeq: categories.length },
   });
   console.log(`Backfilled ${categories.length} Categories with CAT_ prefix.`);

   // 8. Units (UNIT_)
   const units = await prisma.unit.findMany({ orderBy: { createdAt: "asc" } });
   for (let i = 0; i < units.length; i++) {
      const customId = `UNIT_${i + 1}`;
      await prisma.unit.update({
         where: { id: units[i].id },
         data: { customId },
      });
   }
   await prisma.entitySequence.upsert({
      where: { entityType: "UNIT" },
      update: { currentSeq: units.length },
      create: { entityType: "UNIT", currentSeq: units.length },
   });
   console.log(`Backfilled ${units.length} Units with UNIT_ prefix.`);

   // 9. Expenses (EXP_)
   const expenses = await prisma.expense.findMany({ orderBy: { createdAt: "asc" } });
   for (let i = 0; i < expenses.length; i++) {
      const customId = `EXP_${i + 1}`;
      await prisma.expense.update({
         where: { id: expenses[i].id },
         data: { customId },
      });
   }
   await prisma.entitySequence.upsert({
      where: { entityType: "EXPENSE" },
      update: { currentSeq: expenses.length },
      create: { entityType: "EXPENSE", currentSeq: expenses.length },
   });
   console.log(`Backfilled ${expenses.length} Expenses with EXP_ prefix.`);

   // 10. Assets (AST_)
   const assets = await prisma.asset.findMany({ orderBy: { createdAt: "asc" } });
   for (let i = 0; i < assets.length; i++) {
      const customId = `AST_${i + 1}`;
      await prisma.asset.update({
         where: { id: assets[i].id },
         data: { customId },
      });
   }
   await prisma.entitySequence.upsert({
      where: { entityType: "ASSET" },
      update: { currentSeq: assets.length },
      create: { entityType: "ASSET", currentSeq: assets.length },
   });
   console.log(`Backfilled ${assets.length} Assets with AST_ prefix.`);

   // 11. Roles (ROLE_)
   const roles = await prisma.role.findMany({ orderBy: { createdAt: "asc" } });
   for (let i = 0; i < roles.length; i++) {
      const customId = `ROLE_${i + 1}`;
      await prisma.role.update({
         where: { id: roles[i].id },
         data: { customId },
      });
   }
   await prisma.entitySequence.upsert({
      where: { entityType: "ROLE" },
      update: { currentSeq: roles.length },
      create: { entityType: "ROLE", currentSeq: roles.length },
   });
   console.log(`Backfilled ${roles.length} Roles with ROLE_ prefix.`);

   // 12. Billing (BILL_)
   const billing = await prisma.billingTransaction.findMany({ orderBy: { createdAt: "asc" } });
   for (let i = 0; i < billing.length; i++) {
      const customId = `BILL_${i + 1}`;
      await prisma.billingTransaction.update({
         where: { id: billing[i].id },
         data: { customId },
      });
   }
   await prisma.entitySequence.upsert({
      where: { entityType: "BILLING" },
      update: { currentSeq: billing.length },
      create: { entityType: "BILLING", currentSeq: billing.length },
   });
   console.log(`Backfilled ${billing.length} Billing Transactions with BILL_ prefix.`);

   console.log("All entities successfully backfilled with sequential IDs!");
}

backfill()
   .catch((err) => {
      console.error("Backfill failed:", err);
      process.exit(1);
   })
   .finally(() => prisma.$disconnect());
