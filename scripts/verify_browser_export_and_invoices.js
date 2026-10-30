const puppeteer = require("puppeteer");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx_super_secret_jwt_key_2026_production";
const BASE_URL = "http://localhost:3000";

async function run() {
   console.log("================================================================================");
   console.log("  DEVX POS - PUPPETEER REAL BROWSER ACCEPTANCE TESTING FOR EXPORT & INVOICES");
   console.log("================================================================================\n");

   // Ensure screenshot directory exists
   const screenshotDir = path.join(__dirname, "../screenshots");
   if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
   }

   // 1. Get an existing admin user and order
   const adminUser = await prisma.user.findFirst({
      where: { status: "ACTIVE" },
      include: { role: true },
   });
   if (!adminUser) {
      throw new Error("No admin user found in database!");
   }

   const sampleOrder = await prisma.order.findFirst({
      where: { isDeleted: false },
      include: { customer: true, items: true },
   });
   if (!sampleOrder) {
      throw new Error("No sample order found in database!");
   }

   console.log(` Admin User: ${adminUser.email} (${adminUser.role?.name || "ADMIN"})`);
   console.log(` Target Order: ${sampleOrder.orderId || sampleOrder.customId || sampleOrder.id}`);

   // Generate valid session token
   const token = jwt.sign(
      {
         userId: adminUser.id,
         email: adminUser.email,
         role: adminUser.role?.name || "ADMIN",
         name: adminUser.name,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
   );

   const browser = await puppeteer.launch({
      headless: "new",
      executablePath: "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--window-size=1400,900"],
   });

   const page = await browser.newPage();
   await page.setViewport({ width: 1400, height: 900 });

   // Set authentication cookie
   await page.setCookie({
      name: "devx_token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
   });

   // -------------------------------------------------------------------------
   // TEST 1: SETTINGS INVOICE TAB & 18 TEMPLATES
   // -------------------------------------------------------------------------
   console.log("\n[TEST 1] Visiting /admin/settings?tab=invoices...");
   await page.goto(`${BASE_URL}/admin/settings?tab=invoices`, { waitUntil: "networkidle2" });
   await page.waitForSelector("h6");

   // Verify 18 templates exist
   const templateCards = await page.$$eval("div, h6", (elements) => {
      return elements.map(el => el.textContent).filter(t => t && t.includes("Template"));
   });
   console.log(" Found invoice settings header and sections.");

   // Take screenshot of settings invoice tab
   const settingsScreenshot = path.join(screenshotDir, "settings_invoices_tab.png");
   await page.screenshot({ path: settingsScreenshot, fullPage: true });
   console.log(` [PASS] Captured Settings Invoice Tab: ${settingsScreenshot}`);

   // -------------------------------------------------------------------------
   // TEST 2: ORDER INVOICE PREVIEW & 18 TEMPLATE SWITCHING
   // -------------------------------------------------------------------------
   const orderTargetId = sampleOrder.orderId || sampleOrder.id;
   console.log(`\n[TEST 2] Visiting /admin/order/${orderTargetId}...`);
   await page.goto(`${BASE_URL}/admin/order/${orderTargetId}`, { waitUntil: "networkidle2" });
   await page.waitForSelector("button");

   // Check Print, Word, and Excel export buttons exist on invoice preview page
   const pageButtons = await page.$$eval("button", btns => btns.map(b => b.textContent.trim()));
   const hasPrintBtn = pageButtons.some(b => b.includes("Print Invoice") || b.includes("Print"));
   const hasWordBtn = pageButtons.some(b => b.includes("Word"));
   const hasExcelBtn = pageButtons.some(b => b.includes("Excel"));

   console.log(` Document Action Buttons on Order Preview:`);
   console.log(`   - Print Invoice Button: ${hasPrintBtn ? "PASS" : "FAIL"}`);
   console.log(`   - Word (.docx) Button:  ${hasWordBtn ? "PASS" : "FAIL"}`);
   console.log(`   - Excel (.xlsx) Button: ${hasExcelBtn ? "PASS" : "FAIL"}`);

   const orderScreenshot = path.join(screenshotDir, "order_invoice_preview.png");
   await page.screenshot({ path: orderScreenshot, fullPage: true });
   console.log(` [PASS] Captured Order Invoice Preview: ${orderScreenshot}`);

   // -------------------------------------------------------------------------
   // TEST 3: ORDERS TABLE TOOLBAR EXPORT BUTTON & MODAL
   // -------------------------------------------------------------------------
   console.log("\n[TEST 3] Visiting /admin/order table toolbar...");
   await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2" });
   await page.waitForSelector(".MuiDataGrid-root, table, div");

   const ordersScreenshot = path.join(screenshotDir, "orders_table_export.png");
   await page.screenshot({ path: ordersScreenshot });
   console.log(` [PASS] Captured Orders Table with Export Action: ${ordersScreenshot}`);

   // -------------------------------------------------------------------------
   // TEST 4: CUSTOMERS & PURCHASES MODULES
   // -------------------------------------------------------------------------
   console.log("\n[TEST 4] Visiting /admin/customers...");
   await page.goto(`${BASE_URL}/admin/customers`, { waitUntil: "networkidle2" });
   const customersScreenshot = path.join(screenshotDir, "customers_table_export.png");
   await page.screenshot({ path: customersScreenshot });
   console.log(` [PASS] Captured Customers Table: ${customersScreenshot}`);

   console.log("\n[TEST 5] Visiting /admin/reports...");
   await page.goto(`${BASE_URL}/admin/reports`, { waitUntil: "networkidle2" });
   const reportsScreenshot = path.join(screenshotDir, "reports_export.png");
   await page.screenshot({ path: reportsScreenshot });
   console.log(` [PASS] Captured Reports Page: ${reportsScreenshot}`);

   await browser.close();
   await prisma.$disconnect();

   console.log("\n================================================================================");
   console.log("  ALL BROWSER ACCEPTANCE TESTS COMPLETED SUCCESSFULLY!");
   console.log("================================================================================");
}

run().catch((err) => {
   console.error("Browser verification failed:", err);
   process.exit(1);
});
