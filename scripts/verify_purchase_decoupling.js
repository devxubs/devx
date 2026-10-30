require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

async function main() {
   console.log("=== PURCHASE ID vs INVOICE ID DECOUPLING VERIFICATION ===");

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

   const supplier = await prisma.supplier.findFirst({ where: { isDeleted: false } });

   // 1. Create Purchase via API
   const createRes = await fetch("http://localhost:3000/api/purchases", {
      method: "POST",
      headers,
      body: JSON.stringify({
         supplierId: supplier.id,
         invoice: "SUPPLIER-EXTERNAL-INV-8877",
         productAmount: 3000,
         othersCost: 100,
         discount: 50,
         total: 3050,
         paid: 3050,
         due: 0,
         paymentMethod: "Cash",
      }),
   });

   if (!createRes.ok) {
      console.error("[FAIL] Failed to create purchase:", await createRes.text());
      process.exit(1);
   }

   const createdPurchase = await createRes.json();
   console.log(`[PASS] Purchase created with customId = '${createdPurchase.customId}' and invoice = '${createdPurchase.invoice}'`);

   if (!createdPurchase.customId || !createdPurchase.customId.startsWith("PUR_")) {
      console.error("[FAIL] Purchase customId should start with PUR_ prefix:", createdPurchase.customId);
      process.exit(1);
   }

   if (createdPurchase.invoice !== "SUPPLIER-EXTERNAL-INV-8877") {
      console.error("[FAIL] Purchase invoice mismatch:", createdPurchase.invoice);
      process.exit(1);
   }

   // 2. Fetch by Detail API
   const detailRes = await fetch(`http://localhost:3000/api/purchases/${createdPurchase.id}`, { headers });
   const detailData = await detailRes.json();
   if (detailData.customId !== createdPurchase.customId || detailData.invoice !== "SUPPLIER-EXTERNAL-INV-8877") {
      console.error("[FAIL] Detail API did not preserve both IDs independently:", detailData);
      process.exit(1);
   }
   console.log("[PASS] Detail API verifies both internal customId and supplier invoice independently.");

   // 3. Edit invoice without altering internal customId
   const updateRes = await fetch(`http://localhost:3000/api/purchases/${createdPurchase.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
         invoice: "SUPPLIER-EXTERNAL-INV-8877-MODIFIED",
      }),
   });
   const updatedPurchase = await updateRes.json();
   if (updatedPurchase.customId !== createdPurchase.customId || updatedPurchase.invoice !== "SUPPLIER-EXTERNAL-INV-8877-MODIFIED") {
      console.error("[FAIL] Update failed to keep customId intact:", updatedPurchase);
      process.exit(1);
   }
   console.log("[PASS] Edit API updated external invoice while keeping internal customId immutable.");

   // 4. Search by supplier invoice
   const searchByInvoice = await fetch("http://localhost:3000/api/purchases?search=8877-MODIFIED", { headers });
   const searchByInvData = await searchByInvoice.json();
   if (!searchByInvData.purchases.some((p) => p.id === createdPurchase.id)) {
      console.error("[FAIL] Search by supplier invoice failed");
      process.exit(1);
   }
   console.log("[PASS] Search by external supplier invoice succeeds.");

   // 5. Search by internal PUR ID
   const searchByPurId = await fetch(`http://localhost:3000/api/purchases?search=${createdPurchase.customId}`, { headers });
   const searchByPurData = await searchByPurId.json();
   if (!searchByPurData.purchases.some((p) => p.id === createdPurchase.id)) {
      console.error("[FAIL] Search by internal customId failed");
      process.exit(1);
   }
   console.log("[PASS] Search by internal customId succeeds.");

   // 6. Cleanup
   await prisma.purchase.delete({ where: { id: createdPurchase.id } });
   console.log("Cleaned up test purchase.");
   console.log("==============================================================");
   console.log("PURCHASE ID vs INVOICE ID DECOUPLING VERIFIED WITH 100% SUCCESS");
   console.log("==============================================================");
}

main()
   .catch(console.error)
   .finally(() => prisma.$disconnect());
