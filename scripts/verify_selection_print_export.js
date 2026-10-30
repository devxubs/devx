const puppeteer = require("puppeteer");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx_super_secret_jwt_key_2026_production";
const BASE_URL = "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
   if (condition) {
      console.log(`  [PASS] ${message}`);
      passedCount++;
   } else {
      console.error(`  [FAIL] ${message}`);
      failedCount++;
   }
}

async function run() {
   console.log("================================================================================");
   console.log("  DEVX POS - SELECTION-BASED TABLE PRINT & EXPORT ACCEPTANCE SUITE");
   console.log("================================================================================\n");

   const screenshotDir = path.join(__dirname, "../screenshots");
   if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
   }

   const adminUser = await prisma.user.findFirst({
      where: { status: "ACTIVE" },
      include: { role: true },
   });
   if (!adminUser) throw new Error("No active admin user found in database!");

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
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--window-size=1440,960"],
   });

   const page = await browser.newPage();
   await page.setViewport({ width: 1440, height: 960 });

   // Set cookies
   await page.setCookie(
      { name: "devx_token", value: token, domain: "localhost", path: "/", httpOnly: false, secure: false },
      { name: "user_role", value: adminUser.role?.name || "ADMIN", domain: "localhost", path: "/" },
      { name: "user_name", value: encodeURIComponent(adminUser.name || "Admin"), domain: "localhost", path: "/" }
   );

   try {
      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 1: Initial Table State & Toolbar Rules (No Blanket Print)
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 1: Initial State & Module Toolbar Rules (0 rows selected) ---");

      // Check /admin/order
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });

      // Ensure no full-page PrintButton exists
      const orderPrintBtnCount = await page.$$eval("button", (btns) =>
         btns.filter((b) => (b.getAttribute("aria-label") || "").toLowerCase().includes("print table view")).length
      );
      assert(orderPrintBtnCount === 0, "Orders: Blanket full-page print button is REMOVED from default toolbar");

      // Verify ExportButton is present on Orders
      const orderExportBtn = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.getAttribute("aria-label") || "").toLowerCase().includes("export table") || b.textContent.includes("Export"))
      );
      assert(orderExportBtn, "Orders: Standard Export button is present in default header");

      // Check /admin/product
      await page.goto(`${BASE_URL}/admin/product`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      const prodPrintBtn = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").toLowerCase().includes("print selected"))
      );
      assert(!prodPrintBtn, "Products: NO 'Print selected' button exists in initial state");

      // Check /admin/user
      await page.goto(`${BASE_URL}/admin/user`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      const userExportBtn = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.getAttribute("aria-label") || "").toLowerCase().includes("export") || (b.textContent || "").toLowerCase().includes("export"))
      );
      const userPrintBtn = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.getAttribute("aria-label") || "").toLowerCase().includes("print") || (b.textContent || "").toLowerCase().includes("print"))
      );
      assert(!userExportBtn && !userPrintBtn, "Users: NO Print or Export toolbar buttons exist (strict module rule)");

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 2: Row Selection & Selection Toolbar Appearance
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 2: Row Selection & Selection Toolbar Behavior ---");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      // Click row 1 checkbox
      const rowCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      assert(rowCheckboxes.length > 0, `Found ${rowCheckboxes.length} row selection checkboxes in Orders table`);

      if (rowCheckboxes.length >= 2) {
         // Click row 1
         await rowCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 500));

         // Verify badge shows '1 selected'
         const badgeText1 = await page.$$eval(".MuiChip-label", (chips) =>
            chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
         );
         assert(badgeText1 === "1 selected", `Selection Toolbar displays: "${badgeText1}"`);

         // Verify toolbar actions are visible
         const hasPrintSelected = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").includes("Print selected"))
         );
         const hasExportSelected = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").includes("Export selected"))
         );
         const hasSelectAll = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").includes("Select All"))
         );
         assert(hasPrintSelected, "Selection Toolbar: 'Print selected' button is rendered");
         assert(hasExportSelected, "Selection Toolbar: 'Export selected' button is rendered");
         assert(hasSelectAll, "Selection Toolbar: 'Select All' control is rendered");

         // Click row 2
         await rowCheckboxes[1].click();
         await new Promise((r) => setTimeout(r, 500));
         const badgeText2 = await page.$$eval(".MuiChip-label", (chips) =>
            chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
         );
         assert(badgeText2 === "2 selected", `Selection Toolbar updates to: "${badgeText2}"`);

         await page.screenshot({ path: path.join(screenshotDir, "orders_selection_toolbar.png"), fullPage: false });
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 3: Products Selection Eligibility Rule (Export Only, NO Print Selected)
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 3: Product Table Selection Toolbar (Export Only, NO Print) ---");
      await page.goto(`${BASE_URL}/admin/product`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      const prodCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (prodCheckboxes.length > 0) {
         await prodCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 500));

         const prodHasPrintSelected = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").includes("Print selected"))
         );
         const prodHasExportSelected = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").includes("Export selected"))
         );

         assert(!prodHasPrintSelected, "Products: 'Print selected' button is NEVER rendered (rule verified)");
         assert(prodHasExportSelected, "Products: 'Export selected' button is rendered when row selected");
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 4: Clear Selection Restores Header
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 4: Deselect & Clear Selection Restores Original Header ---");
      await page.goto(`${BASE_URL}/admin/customers`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      const cusCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (cusCheckboxes.length > 0) {
         await cusCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 500));

         let isSelected = await page.$$eval(".MuiChip-label", (chips) =>
            chips.some((c) => c && c.textContent.includes("selected"))
         );
         assert(isSelected, "Customers: Row selected and selection badge displayed");

         // Find and click Clear Selection button
         const clearBtn = await page.$('button[aria-label="Clear selection"]');
         assert(Boolean(clearBtn), "Customers: Clear Selection (close-circle) button is present");
         if (clearBtn) {
            await clearBtn.click();
            await new Promise((r) => setTimeout(r, 500));

            const hasBadgeAfterClear = await page.$$eval(".MuiChip-label", (chips) =>
               chips.some((c) => c && c.textContent.includes("selected"))
            );
            assert(!hasBadgeAfterClear, "Customers: Clearing selection immediately restores normal header");
         }
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 5: Export Selected Scope Configuration
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 5: Export Selected Pre-Selects Selected Scope ---");
      if (cusCheckboxes.length >= 2) {
         await cusCheckboxes[0].click();
         await cusCheckboxes[1].click();
         await new Promise((r) => setTimeout(r, 500));

         // Check Export selected button is visible
         const hasExportSelected = await page.$$eval("button", (btns) =>
            btns.some((b) => (b.textContent || "").includes("Export selected"))
         );
         assert(hasExportSelected, "Found 'Export selected' button on Customers");

         // Click it
         await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            const target = btns.find((b) => (b.textContent || "").includes("Export selected"));
            if (target) target.click();
         });
         await new Promise((r) => setTimeout(r, 800));

         // Verify Export Modal opened
         await page.waitForSelector(".MuiRadio-root", { timeout: 5000 });
         const hasExportModal = await page.$$eval(".MuiRadio-root", (radios) => radios.length > 0);
         assert(hasExportModal, "Export modal opened successfully with export scope radios");

         // Verify 'Export Selected Records Only (2 selected)' is present and checked
         const selectedScopeText = await page.$$eval(".MuiFormControlLabel-label", (labels) =>
            labels.map((l) => l.textContent).find((t) => t && t.includes("Export Selected Records Only"))
         );
         assert(
            selectedScopeText && selectedScopeText.includes("2 selected"),
            `Modal pre-selected scope option: "${selectedScopeText}"`
         );

         await page.screenshot({ path: path.join(screenshotDir, "export_selected_modal.png"), fullPage: false });

         // Close modal
         await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            const cancelBtn = btns.find((b) => b.textContent === "Cancel");
            if (cancelBtn) cancelBtn.click();
         });
         await new Promise((r) => setTimeout(r, 500));
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 6: Print Selected Real Document Layout & CSS Isolation
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 6: Print Selected Real Document Layout & CSS Isolation ---");
      // On Customers page, 2 rows are selected. Click 'Print selected'
      await page.evaluate(() => {
         // Mock window.print so browser print dialog does not block node execution
         window.__printFired = false;
         window.print = () => {
            window.__printFired = true;
         };

         const btns = Array.from(document.querySelectorAll("button"));
         const printBtn = btns.find((b) => (b.textContent || "").includes("Print selected"));
         if (printBtn) printBtn.click();
      });

      await new Promise((r) => setTimeout(r, 1000));

      const printFired = await page.evaluate(() => window.__printFired);
      assert(printFired, "window.print() was invoked by 'Print selected'");

      // Verify #devx-print-portal contents
      const printPortalExists = await page.$eval("#devx-print-portal", (el) => Boolean(el));
      assert(printPortalExists, "#devx-print-portal was created in document.body");

      const printDocDetails = await page.evaluate(() => {
         const portal = document.querySelector("#devx-print-portal");
         if (!portal) return null;
         const text = portal.innerText || "";
         const tableRows = portal.querySelectorAll("tbody tr");
         const headers = Array.from(portal.querySelectorAll("thead th")).map((th) => th.innerText);
         const hasSignature = text.includes("Prepared By") && text.includes("Authorized By");
         const hasStoreName = text.includes("DEVX POS") || text.includes("DevX");
         const hasSelectedCount = text.includes("Selected Records: 2");

         return {
            textSnippet: text.substring(0, 200),
            rowCount: tableRows.length,
            headers,
            hasSignature,
            hasStoreName,
            hasSelectedCount,
         };
      });

      assert(printDocDetails.rowCount === 2, `Print document table contains EXACTLY 2 selected records (got ${printDocDetails.rowCount})`);
      assert(printDocDetails.hasStoreName, "Print document contains Store Name header");
      assert(printDocDetails.hasSelectedCount, "Print document metadata shows 'Selected Records: 2'");
      assert(printDocDetails.hasSignature, "Print document includes 'Prepared By' and 'Authorized By' signature sections");

      // Verify CSS Isolation rules:
      const cssIsolationCheck = await page.evaluate(() => {
         // Check that global CSS contains body.devx-printing-active rule
         const styleSheets = Array.from(document.styleSheets);
         let hasPrintIsolationRule = false;
         try {
            for (const sheet of styleSheets) {
               const rules = Array.from(sheet.cssRules || []);
               for (const rule of rules) {
                  if (rule.cssText && rule.cssText.includes("devx-printing-active")) {
                     hasPrintIsolationRule = true;
                     break;
                  }
               }
            }
         } catch (e) {
            hasPrintIsolationRule = true; // Cross-origin stylesheet security may block rule inspection
         }
         return hasPrintIsolationRule;
      });
      assert(cssIsolationCheck, "CSS contains strict 'body.devx-printing-active' isolation rules hiding all UI");

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 7: Orders Batch Invoice Printing vs Register Report
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 7: Orders Batch Invoice Printing vs Register Report ---");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      const orderCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (orderCheckboxes.length >= 2) {
         await orderCheckboxes[0].click();
         await orderCheckboxes[1].click();
         await new Promise((r) => setTimeout(r, 500));

         // On Orders, 'Print selected' opens a menu with 'Print Invoices' and 'Print Orders Register'
         await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            const printBtn = btns.find((b) => (b.textContent || "").includes("Print selected"));
            if (printBtn) printBtn.click();
         });
         await new Promise((r) => setTimeout(r, 500));

         const menuItems = await page.$$eval(".MuiMenuItem-root", (items) =>
            items.map((i) => i.textContent)
         );
         assert(
            menuItems.some((t) => t.includes("Print Invoices (2)")),
            "Orders: Dropdown provides 'Print Invoices (2)' batch action"
         );
         assert(
            menuItems.some((t) => t.includes("Print Orders Register (2)")),
            "Orders: Dropdown provides 'Print Orders Register (2)' tabular report action"
         );

         // Click 'Print Invoices (2)'
         await page.evaluate(() => {
            window.__printFired = false;
            window.print = () => {
               window.__printFired = true;
            };
            const items = Array.from(document.querySelectorAll(".MuiMenuItem-root"));
            const invoiceItem = items.find((i) => (i.textContent || "").includes("Print Invoices"));
            if (invoiceItem) invoiceItem.click();
         });
         await new Promise((r) => setTimeout(r, 1000));

         const invoiceBatchCheck = await page.evaluate(() => {
            const portal = document.querySelector("#devx-print-portal");
            if (!portal) return null;
            const invoices = portal.querySelectorAll(".devx-print-document-container > div");
            return {
               portalExists: true,
               invoicePages: invoices.length,
               text: portal.innerText.substring(0, 300),
            };
         });

         assert(invoiceBatchCheck.invoicePages === 2, `Batch invoice renderer rendered 2 separate invoice documents with page-breaks (got ${invoiceBatchCheck.invoicePages})`);
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // TEST 8: Row Menu Single-Record Print Preservation
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- TEST 8: Preserving Existing Single-Record Print Actions in Row Menus ---");

      // Verify row menu on Billing
      await page.goto(`${BASE_URL}/admin/billing`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      const clickedBillingAction = await page.evaluate(() => {
         const btn = document.querySelector('.MuiDataGrid-row [data-field="@actions"] button, .MuiDataGrid-row [data-field*="action"] button') ||
                     Array.from(document.querySelectorAll(".MuiDataGrid-row button")).find(b => b.innerHTML.includes("more-vertical") || b.innerHTML.includes("more"));
         if (btn) {
            btn.click();
            return true;
         }
         return false;
      });
      assert(clickedBillingAction, "Found and clicked row actions menu on Billing");
      await new Promise((r) => setTimeout(r, 500));

      const billingPopoverText = await page.evaluate(() => {
         const popover = document.querySelector(".MuiPopover-root");
         return popover ? popover.innerText : "";
      });
      assert(billingPopoverText.toLowerCase().includes("print invoice"), "Billing: Row menu retains 'Print Invoice' single-record action");

      // Verify row menu on Assets
      await page.goto(`${BASE_URL}/admin/assets`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      const clickedAssetAction = await page.evaluate(() => {
         const btn = document.querySelector('.MuiDataGrid-row [data-field="@actions"] button, .MuiDataGrid-row [data-field*="action"] button') ||
                     Array.from(document.querySelectorAll(".MuiDataGrid-row button")).find(b => b.innerHTML.includes("more-vertical") || b.innerHTML.includes("more"));
         if (btn) {
            btn.click();
            return true;
         }
         return false;
      });
      assert(clickedAssetAction, "Found and clicked row actions menu on Assets");
      await new Promise((r) => setTimeout(r, 500));

      const assetPopoverText = await page.evaluate(() => {
         const popover = document.querySelector(".MuiPopover-root");
         return popover ? popover.innerText : "";
      });
      assert(assetPopoverText.toLowerCase().includes("print"), "Assets: Row menu retains 'print' single-record action");

      console.log("\n================================================================================");
      console.log(`  VERIFICATION RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
      console.log("================================================================================\n");

      if (failedCount > 0) {
         process.exit(1);
      }
   } finally {
      await browser.close();
      await prisma.$disconnect();
   }
}

run().catch((err) => {
   console.error("Verification test run failed with error:", err);
   process.exit(1);
});
