/**
 * DEVX POS — Automated Verification for Sequential Order ID Generation & Consistent Display
 * Tests format, persistence, concurrency safety, API lookup/edit/search, and UI display.
 */

const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

function assert(condition, message) {
   if (!condition) {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
   }
   console.log(`  [PASS] ${message}`);
}

async function run() {
   console.log("================================================================================");
   console.log("  DEVX POS — ORDER ID GENERATION & DISPLAY VERIFICATION");
   console.log("================================================================================\n");

   let browser;
   const createdOrderIds = [];

   try {
      // -------------------------------------------------------------------------
      // 1. Verify Existing Orders in Database
      // -------------------------------------------------------------------------
      console.log("--- 1. Verifying Sequential ORD_ Format for Existing Database Orders ---");
      const existingOrders = await prisma.order.findMany({
         where: { isDeleted: false },
         orderBy: { createdAt: "asc" },
         select: { id: true, orderCode: true, orderId: true, customId: true, invoiceNo: true },
      });

      assert(existingOrders.length >= 12, `At least 12 existing orders present (found ${existingOrders.length})`);

      for (let i = 0; i < existingOrders.length; i++) {
         const ord = existingOrders[i];
         const expectedCode = `ORD_${i + 1}`;
         assert(
            ord.orderCode === expectedCode,
            `Order #${i + 1} has dedicated orderCode='${expectedCode}' (got: '${ord.orderCode}')`
         );
         assert(
            ord.orderId === expectedCode,
            `Order #${i + 1} has orderId='${expectedCode}' (got: '${ord.orderId}')`
         );
         assert(
            ord.customId === expectedCode,
            `Order #${i + 1} has customId='${expectedCode}' (got: '${ord.customId}')`
         );
         assert(
            /^ORD_\d+$/.test(ord.orderCode),
            `Order #${i + 1} orderCode strictly matches regex /^ORD_\\d+$/`
         );
      }

      // Verify other entity IDs were untouched
      console.log("\n--- 2. Verifying Non-Order Entity IDs are Untouched ---");
      const sampleCustomer = await prisma.customer.findFirst({ where: { customId: { startsWith: "CUS_" } } });
      assert(sampleCustomer !== null, "Customer IDs retain CUS_ prefix");

      const sampleUser = await prisma.user.findFirst({ where: { customId: { startsWith: "EP_" } } });
      assert(sampleUser !== null, "Employee IDs retain EP_ prefix");

      const sampleProduct = await prisma.product.findFirst({ where: { customId: { startsWith: "PROD_" } } });
      assert(sampleProduct !== null, "Product IDs retain PROD_ prefix");

      // -------------------------------------------------------------------------
      // 3. Authenticate for API and Browser Tests
      // -------------------------------------------------------------------------
      console.log("\n--- 3. Setting Up Authentication ---");
      const admin = await prisma.user.findFirst({
         where: { email: "devxub@gmail.com" },
         include: { role: true },
      });
      if (!admin) throw new Error("Admin user not found");

      const token = jwt.sign(
         { id: admin.id, email: admin.email, role: admin.role?.name || "System Admin", permissions: ["ALL"] },
         JWT_SECRET,
         { expiresIn: "4h" }
      );

      const authHeaders = {
         "Content-Type": "application/json",
         Cookie: `devx_token=${token}`,
      };

      // -------------------------------------------------------------------------
      // 4. Test Single New Order Creation via Backend API
      // -------------------------------------------------------------------------
      console.log("\n--- 4. Testing New Order Creation (Sequential ORD_ Generation) ---");
      const sampleProd = await prisma.product.findFirst();
      if (!sampleProd) throw new Error("No products available to create an order");

      const createRes = await fetch(`${BASE_URL}/api/orders`, {
         method: "POST",
         headers: authHeaders,
         body: JSON.stringify({
            customer: { name: "Sequential Test Customer", phone: "01700998877", address: "Dhaka, Bangladesh" },
            products: [{ id: sampleProd.id, name: sampleProd.productName || "Sequential Test Product", price: 500, quantity: 1 }],
            pricing: { paymentMethod: "Cash on Delivery", deliveryCharge: 60, discount: 0, advancePayment: 0 },
            orderNote: "Automated Sequential Order Test",
            orderSource: "Direct",
         }),
      });

      assert(createRes.ok, `POST /api/orders succeeded with status ${createRes.status}`);
      const newOrder = await createRes.json();
      createdOrderIds.push(newOrder.id);

      assert(Boolean(newOrder.orderCode), `New order has orderCode: ${newOrder.orderCode}`);
      assert(/^ORD_\d+$/.test(newOrder.orderCode), `New orderCode format is ORD_N: ${newOrder.orderCode}`);
      assert(newOrder.orderId === newOrder.orderCode, `orderId matches orderCode: ${newOrder.orderId}`);
      assert(newOrder.customId === newOrder.orderCode, `customId matches orderCode: ${newOrder.customId}`);

      // Verify database record
      const dbNewOrder = await prisma.order.findUnique({ where: { id: newOrder.id } });
      assert(dbNewOrder !== null, "New order persisted in database");
      assert(dbNewOrder.orderCode === newOrder.orderCode, "DB orderCode matches response");
      assert(dbNewOrder.id.length > 20, "Primary key is preserved as cuid, not overwritten with code");

      // -------------------------------------------------------------------------
      // 5. Test Backend Concurrency Safety (Simultaneous Order Creation)
      // -------------------------------------------------------------------------
      console.log("\n--- 5. Testing Backend Concurrency Safety (Simultaneous Order Creation) ---");
      const concurrentBatchSize = 4;
      const concurrentPromises = Array.from({ length: concurrentBatchSize }, (_, idx) =>
         fetch(`${BASE_URL}/api/orders`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
               customer: { name: `Concurrent Buyer ${idx + 1}`, phone: `0171100000${idx}` },
               products: [{ id: sampleProd.id, name: sampleProd.productName || "Concurrent Test Product", price: 250, quantity: 1 }],
               pricing: { paymentMethod: "Cash on Delivery", deliveryCharge: 50 },
               orderNote: `Concurrent Test Order ${idx + 1}`,
               orderSource: "Direct",
            }),
         }).then((r) => r.json())
      );

      const batchResults = await Promise.all(concurrentPromises);
      const batchCodes = batchResults.map((r) => {
         createdOrderIds.push(r.id);
         return r.orderCode || r.orderId;
      });

      console.log("  Batch generated codes:", batchCodes);
      const uniqueCodes = new Set(batchCodes);
      assert(
         uniqueCodes.size === concurrentBatchSize,
         `All ${concurrentBatchSize} simultaneous orders received unique codes (no duplicates: ${Array.from(uniqueCodes).join(", ")})`
      );

      for (const code of batchCodes) {
         assert(/^ORD_\d+$/.test(code), `Concurrent order code matches /^ORD_\\d+$/ (${code})`);
      }

      // -------------------------------------------------------------------------
      // 6. Test Order Lookup by ORD_ Code
      // -------------------------------------------------------------------------
      console.log("\n--- 6. Testing Order Lookup, Editing & Search by ORD_ Code ---");
      const lookupRes = await fetch(`${BASE_URL}/api/orders/ORD_1`, { headers: authHeaders });
      assert(lookupRes.ok, "GET /api/orders/ORD_1 returned 200 OK");
      const lookupData = await lookupRes.json();
      assert(lookupData.orderCode === "ORD_1" || lookupData.orderId === "ORD_1", "Lookup returned Order ORD_1");

      // Test PUT edit by ORD_ Code
      const editRes = await fetch(`${BASE_URL}/api/orders/ORD_1`, {
         method: "PUT",
         headers: authHeaders,
         body: JSON.stringify({ courierNote: "Updated via ORD_1 test" }),
      });
      assert(editRes.ok, "PUT /api/orders/ORD_1 returned 200 OK");

      // Test Search by ORD_ Code
      const searchRes = await fetch(`${BASE_URL}/api/orders?search=ORD_1`, { headers: authHeaders });
      assert(searchRes.ok, "GET /api/orders?search=ORD_1 returned 200 OK");
      const searchData = await searchRes.json();
      assert(
         searchData.orders.some((o) => o.orderCode === "ORD_1" || o.orderId === "ORD_1"),
         "Search for 'ORD_1' returned matching order"
      );

      // Test Global Search Bar API
      const globalSearchRes = await fetch(`${BASE_URL}/api/search?q=ORD_1`, { headers: authHeaders });
      assert(globalSearchRes.ok, "GET /api/search?q=ORD_1 returned 200 OK");
      const globalSearchData = await globalSearchRes.json();
      assert(
         globalSearchData.results.orders.some((o) => o.orderCode === "ORD_1" || o.orderId === "ORD_1"),
         "Global Search returned Order ORD_1 in results.orders"
      );

      // -------------------------------------------------------------------------
      // 7. Browser E2E UI Display Verification
      // -------------------------------------------------------------------------
      console.log("\n--- 7. Setting Up Browser E2E Environment for UI Display Verification ---");
      browser = await puppeteer.launch({
         headless: "new",
         executablePath: "/usr/bin/google-chrome",
         args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--window-size=1440,1100"],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 1100 });
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);

      await page.setCookie(
         { name: "devx_token", value: token, domain: "localhost", path: "/", httpOnly: false },
         { name: "user_role", value: admin.role?.name || "ADMIN", domain: "localhost", path: "/" },
         { name: "user_name", value: encodeURIComponent(admin.name || "Admin"), domain: "localhost", path: "/" }
      );

      // 7.1 Verify Order Page Table Display
      console.log("\n--- 7.1 Testing Order Page Table Display (/admin/order) ---");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiDataGrid-row", { timeout: 35000 });

      const tableOrderCodes = await page.evaluate(() => {
         const cells = Array.from(document.querySelectorAll('.MuiDataGrid-cell[data-field="orderId"]'));
         return cells.map((c) => c.innerText.trim()).filter((t) => t.startsWith("ORD_"));
      });

      console.log("  Order IDs visible in table:", tableOrderCodes.slice(0, 8));
      assert(tableOrderCodes.length > 0, "Order page renders ORD_ IDs in table");
      assert(tableOrderCodes.every((c) => /^ORD_\d+$/.test(c)), "All table order IDs strictly follow sequential ORD_N format");
      assert(tableOrderCodes.some((c) => c === "ORD_14" || c === "ORD_12" || c === "ORD_1"), "Table displays persistent sequential ORD_ codes");

      // 7.2 Verify Dedicated Order Details Page by ORD_ Code
      console.log("\n--- 7.2 Testing Dedicated Order Details Page (/admin/order/ORD_1) ---");
      await page.goto(`${BASE_URL}/admin/order/ORD_1`, { waitUntil: "networkidle2" });
      await page.waitForFunction(() => {
         const t = document.body.innerText || "";
         return t.includes("ORD_1") && !document.querySelector(".MuiCircularProgress-root");
      }, { timeout: 25000 });

      const detailsPageText = await page.evaluate(() => document.body.innerText || "");
      assert(detailsPageText.includes("ORD_1"), "Order Details page header prominently renders 'ORD_1'");

      // 7.3 Verify Customer Order History Modal displays ORD_ Codes
      console.log("\n--- 7.3 Testing Customer Order History Modal displays ORD_ Codes ---");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiDataGrid-row", { timeout: 35000 });

      const customerCell = await page.$('.MuiDataGrid-row .MuiDataGrid-cell[data-field="customer"]');
      assert(customerCell !== null, "Found customer cell in Order table row");
      await customerCell.click();

      await page.waitForSelector(".MuiModal-root:not(.MuiModal-hidden)", { timeout: 15000 });
      await page.waitForFunction(() => {
         const m = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         return m && m.innerText && m.innerText.includes("Customer Profile & Order History") && !m.querySelector(".MuiCircularProgress-root");
      }, { timeout: 25000 });

      const modalHistoryCodes = await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return [];
         const rows = Array.from(modal.querySelectorAll("table tbody tr"));
         return rows.map((r) => r.innerText).filter((t) => t.includes("ORD_"));
      });

      assert(modalHistoryCodes.length > 0, "Customer Order History modal displays orders with ORD_ codes");

      // 7.4 Verify Order Export data formatting
      console.log("\n--- 7.4 Testing Order Export Data Format ---");
      const exportRes = await fetch(`${BASE_URL}/api/orders?all=true`, { headers: authHeaders });
      assert(exportRes.ok, "GET /api/orders?all=true returned 200 OK");
      const exportData = await exportRes.json();
      assert(exportData.orders.length > 0, "Export data returned orders");
      const allExportCodesValid = exportData.orders.every(
         (o) => Boolean(o.orderCode || o.orderId) && /^ORD_\d+$/.test(o.orderCode || o.orderId)
      );
      assert(allExportCodesValid, "Every order in export data has sequential ORD_N code");

      // 7.5 Save Screenshot of Order Table with ORD_ IDs
      const screenshotsDir = path.join(__dirname, "../screenshots");
      if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

      const orderCodesScreenshotPath = path.join(screenshotsDir, "order_sequential_ids_display.png");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiDataGrid-row", { timeout: 25000 });
      await page.screenshot({ path: orderCodesScreenshotPath });
      console.log("  Saved screenshot: order_sequential_ids_display.png");

      const artifactDir = "/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756";
      if (fs.existsSync(artifactDir)) {
         fs.copyFileSync(orderCodesScreenshotPath, path.join(artifactDir, "order_sequential_ids_display.png"));
      }

      console.log("\n================================================================================");
      console.log("  ALL SEQUENTIAL ORDER ID GENERATION & DISPLAY CHECKS PASSED!");
      console.log("================================================================================\n");
   } finally {
      // Clean up temporary test orders created during this test run
      if (createdOrderIds.length > 0) {
         try {
            await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
            await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
            console.log(`Cleaned up ${createdOrderIds.length} test order(s).`);
         } catch (e) {
            console.warn("Cleanup warning:", e.message);
         }
      }
      if (browser) await browser.close();
      await prisma.$disconnect();
   }
}

run().catch((err) => {
   console.error("Test failed with error:", err);
   process.exit(1);
});
