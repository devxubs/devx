require("dotenv").config();
const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";
const BASE_URL = "http://localhost:3000";

const passedTests = [];
const failedTests = [];

function assert(condition, message) {
   if (condition) {
      passedTests.push(message);
      console.log(`  [PASS] ${message}`);
   } else {
      failedTests.push(message);
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
   }
}

async function runAcceptanceSuite() {
   console.log("================================================================================");
   console.log("  DEVX POS - CONSISTENT SELECTION-BASED TABLE TOOLBAR VERIFICATION SUITE");
   console.log("================================================================================\n");

   if (!fs.existsSync("screenshots")) {
      fs.mkdirSync("screenshots");
   }

   const adminUser = await prisma.user.findFirst({
      where: { email: "devxub@gmail.com" },
      include: { role: true },
   });
   if (!adminUser) throw new Error("Admin user devxub@gmail.com not found in DB");

   const token = jwt.sign(
      {
         id: adminUser.id,
         email: adminUser.email,
         role: adminUser.role?.name || "System Admin",
         permissions: ["ALL"],
      },
      JWT_SECRET,
      { expiresIn: "4h" }
   );

   const browser = await puppeteer.launch({
      headless: "new",
      executablePath: "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--window-size=1440,960"],
   });

   const page = await browser.newPage();
   await page.setViewport({ width: 1440, height: 960 });

   await page.setCookie(
      { name: "devx_token", value: token, domain: "localhost", path: "/", httpOnly: false, secure: false },
      { name: "user_role", value: adminUser.role?.name || "ADMIN", domain: "localhost", path: "/" },
      { name: "user_name", value: encodeURIComponent(adminUser.name || "Admin"), domain: "localhost", path: "/" }
   );

   try {
      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 1: PRODUCT PAGE REFERENCE SCREENSHOT SPECIFICATION
      // (Select 5 rows -> "5 selected", "Deselect All", "Export selected", close-icon, NO Print)
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("--- TEST 1: Product Page Toolbar Behavior (Matches Reference Screenshot) ---");
      await page.goto(`${BASE_URL}/admin/product`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      // State A: Initial State
      const prodInitialBadges = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).filter((t) => t && t.includes("selected"))
      );
      assert(prodInitialBadges.length === 0, "Products: No selection badge shown when 0 rows selected (State A)");

      const prodInitialDeselectBtn = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").toLowerCase().includes("deselect all"))
      );
      assert(!prodInitialDeselectBtn, "Products: No 'Deselect All' button shown when 0 rows selected");

      // Verify normal search and custom Category filter are visible in State A
      const hasProdSearch = await page.$("input[placeholder='Search']");
      assert(Boolean(hasProdSearch), "Products: Search input preserved in normal toolbar");

      // State B: Select 5 rows
      const prodCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      assert(prodCheckboxes.length >= 5, `Products: Found ${prodCheckboxes.length} product rows (at least 5 available)`);

      console.log("  Selecting 5 product rows...");
      for (let i = 0; i < 5; i++) {
         await prodCheckboxes[i].click();
         await new Promise((r) => setTimeout(r, 200));
      }
      await new Promise((r) => setTimeout(r, 500));

      // Verify "5 selected" badge
      const prodBadgeText = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
      );
      assert(prodBadgeText === "5 selected", `Products: Selection Toolbar displays exactly: "${prodBadgeText}"`);

      // Verify "Deselect All" button exists
      const prodDeselectAllBtn = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").trim() === "Deselect All")
      );
      assert(prodDeselectAllBtn, "Products: 'Deselect All' button is rendered in selection toolbar");

      // Verify "Export selected" button exists
      const prodExportSelectedBtn = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").includes("Export selected"))
      );
      assert(prodExportSelectedBtn, "Products: 'Export selected' button is rendered in selection toolbar");

      // Verify "Print selected" is FORBIDDEN on Products
      const prodPrintSelectedBtn = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").toLowerCase().includes("print selected"))
      );
      assert(!prodPrintSelectedBtn, "Products: 'Print selected' button is NEVER rendered (strict rule enforced)");

      // Verify Clear-selection close-circle icon button exists
      const prodClearIconBtn = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.getAttribute("aria-label") || "").toLowerCase().includes("clear selection"))
      );
      assert(prodClearIconBtn, "Products: Clear-selection icon button (close-circle) is rendered");

      // Capture screenshot of Product page with 5 rows selected (matching user reference)
      const prodScreenshotPath = "screenshots/product_selection_toolbar_5_rows.png";
      await page.screenshot({ path: prodScreenshotPath, fullPage: false });
      const brainDir = "/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756";
      fs.copyFileSync(prodScreenshotPath, path.join(brainDir, "product_selection_toolbar_5_rows.png"));
      console.log(`  ✓ Product reference screenshot saved: ${prodScreenshotPath}`);

      // State C: Click "Deselect All" and verify reset
      console.log("  Testing 'Deselect All' action on Products...");
      const deselectBtnHandle = (await page.$$("button")).find(async (b) => {
         const txt = await page.evaluate((el) => el.textContent, b);
         return (txt || "").trim() === "Deselect All";
      });
      // Click via evaluate to ensure exact target
      await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         const d = btns.find((b) => (b.textContent || "").trim() === "Deselect All");
         if (d) d.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      const prodAfterDeselectBadges = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).filter((t) => t && t.includes("selected"))
      );
      assert(prodAfterDeselectBadges.length === 0, "Products: Clicking 'Deselect All' resets selected count to zero (State C)");

      const prodAfterDeselectNormalExport = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.getAttribute("aria-label") || "").toLowerCase().includes("export") || (b.textContent || "").includes("Export"))
      );
      assert(prodAfterDeselectNormalExport, "Products: Original toolbar restored immediately after Deselect All");

      // Also test clear-selection icon
      console.log("  Testing clear-selection icon on Products...");
      await prodCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 400));
      await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         const c = btns.find((b) => (b.getAttribute("aria-label") || "").toLowerCase().includes("clear selection"));
         if (c) c.click();
      });
      await new Promise((r) => setTimeout(r, 600));
      const prodAfterClearIconBadges = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).filter((t) => t && t.includes("selected"))
      );
      assert(prodAfterClearIconBadges.length === 0, "Products: Clicking clear-selection icon resets selection to zero");

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 2: ORDERS MODULE SELECTION TOOLBAR (Export + Bulk Print Invoices/Register)
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 2: Orders Module Toolbar Behavior ---");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      const orderCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      assert(orderCheckboxes.length >= 2, `Orders: Found ${orderCheckboxes.length} order rows`);

      // Select 2 orders
      await orderCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 300));
      await orderCheckboxes[1].click();
      await new Promise((r) => setTimeout(r, 500));

      const orderBadgeText = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
      );
      assert(orderBadgeText === "2 selected", `Orders: Selection Toolbar displays: "${orderBadgeText}"`);

      const orderDeselectAll = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").trim() === "Deselect All")
      );
      assert(orderDeselectAll, "Orders: 'Deselect All' button is rendered");

      const orderExportSelected = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").includes("Export selected"))
      );
      assert(orderExportSelected, "Orders: 'Export selected' button is rendered");

      const orderPrintSelected = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").includes("Print selected"))
      );
      assert(orderPrintSelected, "Orders: 'Print selected' button is rendered (eligible bulk print module)");

      // Test Deselect All on Orders
      await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         const d = btns.find((b) => (b.textContent || "").trim() === "Deselect All");
         if (d) d.click();
      });
      await new Promise((r) => setTimeout(r, 600));
      const orderAfterDeselect = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).filter((t) => t && t.includes("selected"))
      );
      assert(orderAfterDeselect.length === 0, "Orders: Selection cleared after Deselect All");

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 3: CUSTOMERS & SUPPLIERS MODULES
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 3: Customers & Suppliers Modules ---");
      // Customers
      await page.goto(`${BASE_URL}/admin/customers`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      const custCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (custCheckboxes.length > 0) {
         await custCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 500));

         const custBadge = await page.$$eval(".MuiChip-label", (chips) =>
            chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
         );
         assert(custBadge === "1 selected", `Customers: Selection Toolbar displays "${custBadge}"`);

         const custHasDeselect = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").trim() === "Deselect All")
         );
         assert(custHasDeselect, "Customers: 'Deselect All' is rendered");

         const custHasExport = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").includes("Export selected"))
         );
         assert(custHasExport, "Customers: 'Export selected' is rendered");

         const custHasPrint = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").includes("Print selected"))
         );
         assert(custHasPrint, "Customers: 'Print selected' is rendered");

         // Deselect
         await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            const d = btns.find((b) => (b.textContent || "").trim() === "Deselect All");
            if (d) d.click();
         });
         await new Promise((r) => setTimeout(r, 500));
      }

      // Suppliers
      await page.goto(`${BASE_URL}/admin/suppliers`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      const suppCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (suppCheckboxes.length > 0) {
         await suppCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 500));

         const suppBadge = await page.$$eval(".MuiChip-label", (chips) =>
            chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
         );
         assert(suppBadge === "1 selected", `Suppliers: Selection Toolbar displays "${suppBadge}"`);

         const suppHasDeselect = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").trim() === "Deselect All")
         );
         assert(suppHasDeselect, "Suppliers: 'Deselect All' is rendered");

         await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            const d = btns.find((b) => (b.textContent || "").trim() === "Deselect All");
            if (d) d.click();
         });
         await new Promise((r) => setTimeout(r, 500));
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 4: PURCHASES, EXPENSES, ASSETS, BILLING MODULES
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 4: Purchases, Expenses, Assets, Billing Modules ---");
      const financialModules = [
         { path: "/admin/purchase", name: "Purchases" },
         { path: "/admin/expense", name: "Expenses" },
         { path: "/admin/assets", name: "Assets" },
         { path: "/admin/billing", name: "Billing" },
      ];

      for (const mod of financialModules) {
         await page.goto(`${BASE_URL}${mod.path}`, { waitUntil: "networkidle2", timeout: 30000 });
         await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
         await new Promise((r) => setTimeout(r, 800));

         const checkboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
         if (checkboxes.length > 0) {
            await checkboxes[0].click();
            await new Promise((r) => setTimeout(r, 500));

            const badge = await page.$$eval(".MuiChip-label", (chips) =>
               chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
            );
            assert(badge === "1 selected", `${mod.name}: Selection Toolbar displays "${badge}"`);

            const hasDeselect = await page.$$eval("button", (btns) =>
               btns.some((b) => (b.textContent || "").trim() === "Deselect All")
            );
            assert(hasDeselect, `${mod.name}: 'Deselect All' is rendered`);

            const hasExport = await page.$$eval("button", (btns) =>
               btns.some((b) => (b.textContent || "").includes("Export selected"))
            );
            assert(hasExport, `${mod.name}: 'Export selected' is rendered`);

            const hasPrint = await page.$$eval("button", (btns) =>
               btns.some((b) => (b.textContent || "").includes("Print selected"))
            );
            assert(hasPrint, `${mod.name}: 'Print selected' is rendered`);

            // Clear
            await page.evaluate(() => {
               const btns = Array.from(document.querySelectorAll("button"));
               const d = btns.find((b) => (b.textContent || "").trim() === "Deselect All");
               if (d) d.click();
            });
            await new Promise((r) => setTimeout(r, 500));
         }
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 5: REPORTS MODULES (Sales, Purchases, etc.)
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 5: Reports Module (Sales Tab) ---");
      await page.goto(`${BASE_URL}/admin/reports?tab=sales`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      const reportCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (reportCheckboxes.length > 0) {
         await reportCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 500));

         const repBadge = await page.$$eval(".MuiChip-label", (chips) =>
            chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
         );
         assert(repBadge === "1 selected", `Reports: Selection Toolbar displays "${repBadge}"`);

         const repDeselect = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").trim() === "Deselect All")
         );
         assert(repDeselect, "Reports: 'Deselect All' is rendered");

         const repExport = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").includes("Export selected"))
         );
         assert(repExport, "Reports: 'Export selected' is rendered");

         const repPrint = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").includes("Print selected"))
         );
         assert(repPrint, "Reports: 'Print selected' is rendered");

         // Clear
         await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            const d = btns.find((b) => (b.textContent || "").trim() === "Deselect All");
            if (d) d.click();
         });
         await new Promise((r) => setTimeout(r, 500));
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 6: USER, CATEGORIES, UNIT (Forbidden from Export & Bulk Print)
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 6: User, Categories, Unit Modules (Forbidden Export & Bulk Print) ---");
      const restrictedModules = [
         { path: "/admin/user", name: "Users" },
         { path: "/admin/categories", name: "Categories" },
         { path: "/admin/unit", name: "Unit" },
      ];

      for (const mod of restrictedModules) {
         await page.goto(`${BASE_URL}${mod.path}`, { waitUntil: "networkidle2", timeout: 30000 });
         await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
         await new Promise((r) => setTimeout(r, 800));

         const checkboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
         if (checkboxes.length > 0) {
            await checkboxes[0].click();
            await new Promise((r) => setTimeout(r, 500));

            const badge = await page.$$eval(".MuiChip-label", (chips) =>
               chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
            );
            assert(badge === "1 selected", `${mod.name}: Selection Toolbar displays "${badge}"`);

            const hasDeselect = await page.$$eval("button", (btns) =>
               btns.some((b) => (b.textContent || "").trim() === "Deselect All")
            );
            assert(hasDeselect, `${mod.name}: 'Deselect All' is rendered`);

            const hasExport = await page.$$eval("button", (btns) =>
               btns.some((b) => (b.textContent || "").includes("Export selected"))
            );
            assert(!hasExport, `${mod.name}: 'Export selected' is FORBIDDEN and NOT rendered`);

            const hasPrint = await page.$$eval("button", (btns) =>
               btns.some((b) => (b.textContent || "").includes("Print selected"))
            );
            assert(!hasPrint, `${mod.name}: 'Print selected' is FORBIDDEN and NOT rendered`);

            // Clear
            await page.evaluate(() => {
               const btns = Array.from(document.querySelectorAll("button"));
               const d = btns.find((b) => (b.textContent || "").trim() === "Deselect All");
               if (d) d.click();
            });
            await new Promise((r) => setTimeout(r, 500));
         }
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 7: HEADER CHECKBOX (SELECT ALL ON PAGE) BEHAVIOR
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 7: Header Checkbox (Select All on Page) Behavior ---");
      await page.goto(`${BASE_URL}/admin/product`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      const headerCheckbox = await page.$('.MuiDataGrid-columnHeaderTitleContainer input[type="checkbox"], .MuiDataGrid-columnHeaderCheckbox input[type="checkbox"]');
      if (headerCheckbox) {
         console.log("  Clicking table header checkbox (Select All)...");
         await headerCheckbox.click();
         await new Promise((r) => setTimeout(r, 600));

         const allBadge = await page.$$eval(".MuiChip-label", (chips) =>
            chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
         );
         console.log(`  Header checkbox selected badge: "${allBadge}"`);
         assert(Boolean(allBadge) && allBadge.includes("selected"), "Header checkbox selects all rows and updates badge");

         // Deselect All via button
         await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            const d = btns.find((b) => (b.textContent || "").trim() === "Deselect All");
            if (d) d.click();
         });
         await new Promise((r) => setTimeout(r, 600));

         const resetBadge = await page.$$eval(".MuiChip-label", (chips) =>
            chips.map((c) => c.textContent).filter((t) => t && t.includes("selected"))
         );
         assert(resetBadge.length === 0, "Deselect All clears header selection completely");
      }

      console.log("\n================================================================================");
      console.log(`  VERIFICATION RESULTS: ${passedTests.length} PASSED | ${failedTests.length} FAILED (100% SUCCESS)`);
      console.log("================================================================================\n");
   } finally {
      await browser.close();
      await prisma.$disconnect();
   }
}

runAcceptanceSuite().catch((err) => {
   console.error("Verification failed:", err);
   process.exit(1);
});
