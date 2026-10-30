require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

async function main() {
   console.log("=== EXHAUSTIVE TABLES, MODALS & REUSABLE COMPONENTS VERIFICATION ===");

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

   let passed = 0;
   let failed = 0;

   async function checkEntity(entityName, listUrl, detailIdQuery) {
      try {
         // 1. Check Table / List endpoint
         const listRes = await fetch(listUrl, { headers });
         if (!listRes.ok) {
            console.error(`[FAIL] ${entityName} Table List: HTTP ${listRes.status}`);
            failed++;
            return;
         }
         const listData = await listRes.json();
         console.log(`[PASS] ${entityName.padEnd(12)} Table List API (200 OK)`);
         passed++;

         // 2. Check Detail Modal endpoint if applicable
         if (detailIdQuery) {
            const detailId = await detailIdQuery();
            if (detailId) {
               const detailRes = await fetch(`http://localhost:3000/api/${entityName.toLowerCase()}/${detailId}`, { headers });
               if (!detailRes.ok) {
                  console.error(`[FAIL] ${entityName} Detail Modal: HTTP ${detailRes.status}`);
                  failed++;
                  return;
               }
               const detailData = await detailRes.json();
               console.log(`[PASS] ${entityName.padEnd(12)} Detail Modal API (200 OK, ID: ${detailId})`);
               passed++;
            } else {
               console.log(`[INFO] ${entityName.padEnd(12)} No existing record for Detail Modal test (skipped detail)`);
            }
         }
      } catch (err) {
         console.error(`[FAIL] ${entityName}: ${err.message}`);
         failed++;
      }
   }

   // 1. Products
   await checkEntity("products", "http://localhost:3000/api/products", async () => {
      const p = await prisma.product.findFirst({ where: { isDeleted: false } });
      return p?.id;
   });

   // 2. Categories
   await checkEntity("categories", "http://localhost:3000/api/categories", async () => {
      const c = await prisma.category.findFirst({ where: { isDeleted: false } });
      return c?.id;
   });

   // 3. Units
   await checkEntity("units", "http://localhost:3000/api/units", async () => {
      const u = await prisma.unit.findFirst({ where: { isDeleted: false } });
      return u?.id;
   });

   // 4. Orders
   await checkEntity("orders", "http://localhost:3000/api/orders", async () => {
      const o = await prisma.order.findFirst({ where: { isDeleted: false } });
      return o?.id;
   });

   // 5. Purchases
   await checkEntity("purchases", "http://localhost:3000/api/purchases", async () => {
      const pu = await prisma.purchase.findFirst({ where: { isDeleted: false } });
      return pu?.id;
   });

   // 6. Suppliers
   await checkEntity("suppliers", "http://localhost:3000/api/suppliers", async () => {
      const s = await prisma.supplier.findFirst({ where: { isDeleted: false } });
      return s?.id;
   });

   // 7. Customers
   await checkEntity("customers", "http://localhost:3000/api/customers", async () => {
      const cu = await prisma.customer.findFirst({ where: { isDeleted: false } });
      return cu?.id;
   });

   // 8. Users / Employees
   await checkEntity("users", "http://localhost:3000/api/users", async () => {
      return adminUser.id;
   });

   // 9. Expenses
   await checkEntity("expenses", "http://localhost:3000/api/expenses", async () => {
      const e = await prisma.expense.findFirst({ where: { isDeleted: false } });
      return e?.id;
   });

   // 10. Assets
   await checkEntity("assets", "http://localhost:3000/api/assets", async () => {
      const a = await prisma.asset.findFirst({ where: { isDeleted: false } });
      return a?.id;
   });

   // 11. Roles
   await checkEntity("roles", "http://localhost:3000/api/roles", async () => {
      const r = await prisma.role.findFirst();
      return r?.id;
   });

   // 12. Billing
   await checkEntity("billing", "http://localhost:3000/api/billing", null);

   // 13. Recycle Bin
   await checkEntity("bin", "http://localhost:3000/api/bin", null);

   // 14. Global Search across entities
   try {
      const searchRes = await fetch("http://localhost:3000/api/search?q=test", { headers });
      if (searchRes.ok) {
         console.log("[PASS] Global Search API (200 OK)");
         passed++;
      } else {
         console.error(`[FAIL] Global Search: HTTP ${searchRes.status}`);
         failed++;
      }
   } catch (err) {
      failed++;
   }

   // 15. Notifications API
   try {
      const notifRes = await fetch("http://localhost:3000/api/notifications", { headers });
      if (notifRes.ok) {
         console.log("[PASS] Notifications API (200 OK)");
         passed++;
      } else {
         console.error(`[FAIL] Notifications: HTTP ${notifRes.status}`);
         failed++;
      }
   } catch (err) {
      failed++;
   }

   // 16. Chat Conversations API
   try {
      const chatRes = await fetch("http://localhost:3000/api/chat/conversations", { headers });
      if (chatRes.ok) {
         console.log("[PASS] Chat Conversations API (200 OK)");
         passed++;
      } else {
         console.error(`[FAIL] Chat Conversations: HTTP ${chatRes.status}`);
         failed++;
      }
   } catch (err) {
      failed++;
   }

   console.log("------------------------------------------------------------------");
   console.log(`TOTAL TABLE & MODAL CHECKS: ${passed + failed}`);
   console.log(`PASSED: ${passed}`);
   console.log(`FAILED: ${failed}`);
   console.log("==================================================================");

   if (failed > 0) process.exit(1);
}

main()
   .catch(console.error)
   .finally(() => prisma.$disconnect());
