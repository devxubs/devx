require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

async function main() {
   console.log("=== EXHAUSTIVE RECYCLE BIN VERIFICATION (ALL 10 ENTITIES) ===");

   const adminUser = await prisma.user.findFirst({
      where: { email: "devxub@gmail.com" },
      include: { role: true },
   });

   const token = jwt.sign(
      {
         id: adminUser.id,
         email: adminUser.email,
         role: adminUser.role?.name || "ADMIN",
         permissions: ["ALL"],
      },
      JWT_SECRET,
      { expiresIn: "1h" }
   );

   const headers = {
      Authorization: `Bearer ${token}`,
      Cookie: `devx_token=${token}`,
      "Content-Type": "application/json",
   };

   // Clean up any stale bin test items
   await prisma.category.deleteMany({ where: { name: { startsWith: "BIN_TEST_CAT" } } });

   const ts = Date.now();
   const role = await prisma.role.findFirst();

   const tCategory = await prisma.category.create({
      data: { name: `BIN_TEST_CAT_${ts}`, isDeleted: true, customId: `CAT_BIN_${ts}` },
   });
   const tUnit = await prisma.unit.create({
      data: { name: `BIN_TEST_UNIT_${ts}`, isDeleted: true, customId: `UNIT_BIN_${ts}` },
   });
   const tCustomer = await prisma.customer.create({
      data: { name: "BIN_TEST_CUST", phone: `01788${ts.toString().slice(-6)}`, isDeleted: true, customId: `CUS_BIN_${ts}` },
   });
   const tSupplier = await prisma.supplier.create({
      data: { name: "BIN_TEST_SUPP", phone: `01799${ts.toString().slice(-6)}`, isDeleted: true, customId: `SUP_BIN_${ts}` },
   });
   const tProduct = await prisma.product.create({
      data: {
         productName: `BIN_TEST_PROD_${ts}`,
         productCode: `BIN_P_${ts}`,
         productSku: `BIN_S_${ts}`,
         regularPrice: 250,
         salePrice: 200,
         quantity: 5,
         isDeleted: true,
         customId: `PROD_BIN_${ts}`,
      },
   });
   const tExpense = await prisma.expense.create({
      data: { type: "BIN_TEST_EXP", amount: 50, isDeleted: true, customId: `EXP_BIN_${ts}` },
   });
   const tAsset = await prisma.asset.create({
      data: { name: `BIN_TEST_ASSET_${ts}`, value: 1000, isDeleted: true, customId: `AST_BIN_${ts}` },
   });
   const tOrder = await prisma.order.create({
      data: {
         orderId: `BIN_ORD_${ts}`,
         customId: `ORD_BIN_${ts}`,
         invoiceNo: `INV_BIN_${ts}`,
         subtotal: 300,
         total: 300,
         status: "CANCELLED",
         isDeleted: true,
      },
   });
   const tPurchase = await prisma.purchase.create({
      data: {
         customId: `PUR_BIN_${ts}`,
         invoice: `PUR_INV_${ts}`,
         supplierId: tSupplier.id,
         productAmount: 500,
         total: 500,
         paid: 500,
         due: 0,
         isDeleted: true,
      },
   });
   const tUser = await prisma.user.create({
      data: {
         email: `bin_user_${ts}@devx.test`,
         name: "BIN_TEST_USER",
         passwordHash: "hashpassword123",
         role: { connect: { id: role.id } },
         status: "INACTIVE",
         customId: `EP_BIN_${ts}`,
      },
   });

   console.log("Seeded soft-deleted test records for all 10 entities.");

   // 2. Query Bin API
   const binRes = await fetch("http://localhost:3000/api/bin", { headers });
   if (!binRes.ok) {
      console.error("[FAIL] Bin API returned status:", binRes.status);
      process.exit(1);
   }
   const binData = await binRes.json();
   const items = Array.isArray(binData) ? binData : (binData.items || []);
   console.log(`[PASS] Bin API returned ${items.length} soft-deleted items across entities.`);

   const entitiesToVerify = [
      { name: "Product", type: "product", id: tProduct.id, model: prisma.product },
      { name: "Category", type: "category", id: tCategory.id, model: prisma.category },
      { name: "Unit", type: "unit", id: tUnit.id, model: prisma.unit },
      { name: "Customer", type: "customer", id: tCustomer.id, model: prisma.customer },
      { name: "Supplier", type: "supplier", id: tSupplier.id, model: prisma.supplier },
      { name: "Expense", type: "expense", id: tExpense.id, model: prisma.expense },
      { name: "Asset", type: "asset", id: tAsset.id, model: prisma.asset },
      { name: "Order", type: "order", id: tOrder.id, model: prisma.order },
      { name: "Purchase", type: "purchase", id: tPurchase.id, model: prisma.purchase },
      { name: "User", type: "user", id: tUser.id, model: prisma.user },
   ];

   for (const ent of entitiesToVerify) {
      const inBin = items.some((it) => it.id === ent.id && it.type === ent.type);
      if (!inBin) {
         console.error(`[FAIL] Entity ${ent.name} (ID: ${ent.id}) not listed in Recycle Bin`);
         process.exit(1);
      }
      console.log(`[PASS] ${ent.name.padEnd(10)} present in Recycle Bin listing.`);
   }

   // 3. Test Restoration for each entity
   console.log("\nTesting Restoration for all 10 entities...");
   for (const ent of entitiesToVerify) {
      const restoreRes = await fetch("http://localhost:3000/api/bin", {
         method: "POST",
         headers,
         body: JSON.stringify({
            action: "restore",
            type: ent.type,
            id: ent.id,
         }),
      });

      if (!restoreRes.ok) {
         console.error(`[FAIL] Restore failed for ${ent.name}:`, await restoreRes.text());
         process.exit(1);
      }

      // Assert record in DB has isDeleted = false (or status = ACTIVE for user)
      const record = await ent.model.findUnique({ where: { id: ent.id } });
      const isRestored = ent.name === "User" ? record.status === "ACTIVE" : record.isDeleted === false;
      if (!isRestored) {
         console.error(`[FAIL] Entity ${ent.name} in DB still not active after restore:`, record);
         process.exit(1);
      }
      console.log(`[PASS] ${ent.name.padEnd(10)} restored successfully.`);
   }

   // 4. Test Permanent Deletion for each entity
   console.log("\nTesting Permanent Deletion for all 10 entities...");
   for (const ent of entitiesToVerify) {
      const permRes = await fetch("http://localhost:3000/api/bin", {
         method: "POST",
         headers,
         body: JSON.stringify({
            action: "delete",
            type: ent.type,
            id: ent.id,
         }),
      });

      if (!permRes.ok) {
         console.error(`[FAIL] Permanent delete failed for ${ent.name}:`, await permRes.text());
         process.exit(1);
      }

      const record = await ent.model.findUnique({ where: { id: ent.id } });
      if (record !== null) {
         console.error(`[FAIL] Entity ${ent.name} still exists in DB after permanent_delete`);
         process.exit(1);
      }
      console.log(`[PASS] ${ent.name.padEnd(10)} permanently deleted from DB cleanly.`);
   }

   console.log("==============================================================");
   console.log("RECYCLE BIN ALL 10 ENTITIES VERIFIED (SOFT DELETE, LIST, RESTORE, PERMANENT DELETE)");
   console.log("==============================================================");
}

main()
   .catch(console.error)
   .finally(() => prisma.$disconnect());
