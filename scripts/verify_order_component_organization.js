require("dotenv").config();
const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";
const BASE_URL = "http://localhost:3000";
const ARTIFACTS_DIR = "/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756";
const SCREENSHOTS_DIR = path.join(process.cwd(), "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
   fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const passed = [];
const failed = [];

function assert(cond, msg) {
   if (cond) {
      passed.push(msg);
      console.log(`  [PASS] ${msg}`);
   } else {
      failed.push(msg);
      console.error(`  [FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
   }
}

async function run() {
   console.log("================================================================================");
   console.log("  DEVX POS - ORDER COMPONENT ORGANIZATION & EMPLOYEE ID VERIFICATION");
   console.log("================================================================================\n");

   console.log("--- 1. Verifying File Structure in src/Pages/admin/Order/ ---");
   const orderDir = path.join(process.cwd(), "src/Pages/admin/Order");
   const requiredFiles = [
      "OrderDetailModal.tsx",
      "OrderTracking.tsx",
      "EmployeeActivityTimeline.tsx",
      "components/trackingTypes.ts",
      "components/trackingHelpers.ts",
   ];

   for (const file of requiredFiles) {
      const fullPath = path.join(orderDir, file);
      assert(fs.existsSync(fullPath), `File exists: src/Pages/admin/Order/${file}`);
   }

   // Verify EntityModals.tsx removed old OrderTracking directory
   const oldDir = path.join(process.cwd(), "src/components/EntityDetailModals/OrderTracking");
   assert(!fs.existsSync(oldDir), "Temporary src/components/EntityDetailModals/OrderTracking removed");

   console.log("\n--- 2. Setting Up Browser E2E Environment ---");
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

   const browser = await puppeteer.launch({
      headless: "new",
      executablePath: "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--window-size=1440,1100"],
   });

   const page = await browser.newPage();
   await page.setViewport({ width: 1440, height: 1100 });
   page.setDefaultNavigationTimeout(60000);
   page.setDefaultTimeout(60000);
   page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));
   page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

   await page.setCookie(
      { name: "devx_token", value: token, domain: "localhost", path: "/", httpOnly: false },
      { name: "user_role", value: admin.role?.name || "ADMIN", domain: "localhost", path: "/" },
      { name: "user_name", value: encodeURIComponent(admin.name || "Admin"), domain: "localhost", path: "/" }
   );

   try {
      console.log("\n--- 3. Opening Order Preview Modal ---");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".MuiDataGrid-row", { timeout: 45000 });

      // Click order ID link to open OrderDetailModal
      const orderIdLink = await page.$('.MuiDataGrid-row .MuiDataGrid-cell[data-field="orderId"] p, .MuiDataGrid-row .MuiDataGrid-cell[data-field="orderId"]');
      assert(orderIdLink !== null, "Found order ID link in row");
      await orderIdLink.click();

      // Wait for modal to render
      await page.waitForSelector(".MuiModal-root:not(.MuiModal-hidden)", { timeout: 25000 });
      await page.waitForFunction(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         return modal && !modal.querySelector(".MuiCircularProgress-root");
      }, { timeout: 45000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1500));

      console.log("\n--- 4. Verifying Clean Employee ID (EP_1) in Employee Activity ---");
      const employeeActivityData = await page.evaluate((adminId) => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return null;

         const text = modal.textContent || "";
         const hasOrderTracking = text.includes("Order Tracking");
         const hasActivitySection = text.includes("Employee Activity Track on this Order");
         const hasHandlingStaff = text.includes("Handling Staff Member");

         // Search for clean code pattern e.g. "EP_1"
         const hasCleanCode = text.includes("EP_1") || text.includes("ID: EP_");
         
         // Verify raw employee ID (CUID) is not rendered
         const rawEmployeeId = adminId;
         const activityContainer = Array.from(modal.querySelectorAll(".MuiBox-root")).find(el =>
            el.textContent && el.textContent.includes("Employee Activity Track on this Order")
         );
         const activityText = activityContainer ? activityContainer.textContent : text;
         const containsRawEmployeeId = rawEmployeeId ? activityText.includes(rawEmployeeId) : false;

         // Extract chips inside staff card
         const staffCard = Array.from(modal.querySelectorAll(".MuiPaper-root")).find(el =>
            el.textContent && el.textContent.includes("Handling Staff Member")
         );
         const chipTexts = staffCard
            ? Array.from(staffCard.querySelectorAll(".MuiChip-root")).map(c => c.textContent.trim())
            : [];

         return {
            hasOrderTracking,
            hasActivitySection,
            hasHandlingStaff,
            hasCleanCode,
            containsRawEmployeeId,
            chipTexts,
         };
      }, admin.id);

      assert(employeeActivityData !== null, "Order Preview modal is open");
      assert(employeeActivityData.hasOrderTracking, "Order Tracking section rendered");
      assert(employeeActivityData.hasActivitySection, "Employee Activity section rendered");
      assert(employeeActivityData.hasHandlingStaff, "Handling Staff Member card rendered");
      assert(employeeActivityData.hasCleanCode, "Clean employee code (e.g. EP_1) rendered in Employee Activity");
      assert(!employeeActivityData.containsRawEmployeeId, "No raw employee CUIDs leaked in Employee Activity section");
      console.log("  Staff Card Chips:", employeeActivityData.chipTexts);
      assert(employeeActivityData.chipTexts.some(t => t.includes("EP_")), "Staff ID chip shows clean EP_ code");

      // Scroll down to show both Order Tracking and Employee Activity clearly
      await page.evaluate(() => {
         const scrollContainer = document.querySelector(".MuiModal-root:not(.MuiModal-hidden) [style*=\"overflow-y\"], .MuiModal-root:not(.MuiModal-hidden) [style*=\"overflowY\"]");
         if (scrollContainer) scrollContainer.scrollTop = 420;
      });
      await new Promise(r => setTimeout(r, 600));

      const screenshotPath = path.join(SCREENSHOTS_DIR, "order_preview_clean_employee_code.png");
      await page.screenshot({ path: screenshotPath });
      fs.copyFileSync(screenshotPath, path.join(ARTIFACTS_DIR, "order_preview_clean_employee_code.png"));
      console.log("  Saved screenshot: order_preview_clean_employee_code.png");

      // Close modal
      await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return;
         const closeBtn = Array.from(modal.querySelectorAll("button")).find(b =>
            b.textContent.trim().toLowerCase() === "close" || b.getAttribute("aria-label") === "close"
         );
         if (closeBtn) closeBtn.click();
      });
      await new Promise(r => setTimeout(r, 600));

      console.log("\n================================================================================");
      console.log(`  ALL ${passed.length} VERIFICATIONS PASSED SUCCESSFULLY!`);
      console.log("================================================================================\n");

   } finally {
      await browser.close();
      await prisma.$disconnect();
   }
}

run().catch((err) => {
   console.error("Test execution failed:", err);
   process.exit(1);
});
