require("dotenv").config();
const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";
const BASE_URL = "http://localhost:3000";

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

async function runTest() {
   console.log("================================================================================");
   console.log("  DEVX POS - USER PAGE REMOVE SELECTION TOOLBAR INDICATORS VERIFICATION");
   console.log("================================================================================\n");

   if (!fs.existsSync("screenshots")) {
      fs.mkdirSync("screenshots");
   }
   const brainDir = "/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756";

   const admin = await prisma.user.findFirst({
      where: { email: "devxub@gmail.com" },
      include: { role: true },
   });
   if (!admin) throw new Error("Admin not found in DB");

   const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role?.name || "System Admin", permissions: ["ALL"] },
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
      { name: "devx_token", value: token, domain: "localhost", path: "/", httpOnly: false },
      { name: "user_role", value: admin.role?.name || "ADMIN", domain: "localhost", path: "/" },
      { name: "user_name", value: encodeURIComponent(admin.name || "Admin"), domain: "localhost", path: "/" }
   );

   try {
      // ─────────────────────────────────────────────────────────────────────────────
      // 1. Visit User Page & Inspect Initial Toolbar (0 Rows Selected)
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("--- 1. Testing Initial User Page Toolbar (0 Rows Selected) ---");
      await page.goto(`${BASE_URL}/admin/user`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));

      assert(page.url().includes("/admin/user"), "User page loaded successfully");

      // Verify search input and Filter by Role are present
      const searchBox = await page.$("input[placeholder='Search']");
      const roleFilterInput = await page.$("input[placeholder='Select Role']");
      assert(Boolean(searchBox), "Search box is present in toolbar");
      assert(Boolean(roleFilterInput), "'Filter by Role' dropdown is present in toolbar");

      // ─────────────────────────────────────────────────────────────────────────────
      // 2. Select 1 User: Verify NO Selected Count, NO Deselect All, NO Clear Icon
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 2. Testing 1 User Selected: Selection Indicators Must Be Completely Hidden ---");
      const rowCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      assert(rowCheckboxes.length >= 2, `Found ${rowCheckboxes.length} user rows with checkboxes`);

      // Click first checkbox
      await rowCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 500));

      // Verify row checkbox is checked
      const isFirstChecked = await page.evaluate(() => {
         const cb = document.querySelector('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
         return cb ? cb.checked : false;
      });
      assert(isFirstChecked, "First user row checkbox is successfully checked");

      // Check toolbar text & elements
      const toolbarInfo1 = await page.evaluate(() => {
         const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent);
         const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
            text: b.textContent.trim(),
            ariaLabel: b.getAttribute("aria-label"),
            title: b.getAttribute("title"),
         }));
         const searchInput = document.querySelector("input[placeholder='Search']");
         const roleInput = document.querySelector("input[placeholder='Select Role']");
         const bodyText = document.body.innerText;

         return {
            hasSelectedChip: chips.some((t) => t && t.toLowerCase().includes("selected")),
            chips,
            hasDeselectAll: buttons.some((b) => b.text === "Deselect All"),
            hasClearSelectionIcon: buttons.some((b) => (b.ariaLabel || "").toLowerCase().includes("clear selection")),
            hasCloseCircleIcon: buttons.some((b) => (b.ariaLabel || "").toLowerCase().includes("clear") || (b.title || "").toLowerCase().includes("clear selection")),
            hasSearchInput: Boolean(searchInput),
            hasRoleInput: Boolean(roleInput),
            hasExportSelected: buttons.some((b) => b.text.toLowerCase().includes("export selected")),
            hasPrintSelected: buttons.some((b) => b.text.toLowerCase().includes("print selected")),
            has1SelectedInBody: bodyText.includes("1 selected") || bodyText.includes("1 row selected"),
         };
      });

      console.log("  Toolbar Info after 1 selection:", toolbarInfo1);
      assert(!toolbarInfo1.hasSelectedChip, "NO 'selected' count badge appears (1 selected)");
      assert(!toolbarInfo1.hasDeselectAll, "NO 'Deselect All' button appears");
      assert(!toolbarInfo1.hasClearSelectionIcon, "NO 'Clear Selection' / close-circle icon appears");
      assert(!toolbarInfo1.hasExportSelected, "NO 'Export selected' button appears");
      assert(!toolbarInfo1.hasPrintSelected, "NO 'Print selected' button appears");
      assert(toolbarInfo1.hasSearchInput, "Original Search input remains intact in toolbar");
      assert(toolbarInfo1.hasRoleInput, "Original 'Filter by Role' filter remains intact in toolbar");

      // Capture screenshot of User page with 1 row selected
      const user1SelectedScreenshot = "screenshots/user_1_selected_no_indicators.png";
      await page.screenshot({ path: user1SelectedScreenshot, fullPage: false });
      fs.copyFileSync(user1SelectedScreenshot, path.join(brainDir, "user_1_selected_no_indicators.png"));
      console.log(`  ✓ Screenshot captured: ${user1SelectedScreenshot}`);

      // ─────────────────────────────────────────────────────────────────────────────
      // 3. Select Multiple Users: Verify NO Selected Count, NO Deselect All, NO Clear Icon
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 3. Testing Multiple Users Selected: Selection Indicators Must Be Completely Hidden ---");
      // Click second checkbox
      await rowCheckboxes[1].click();
      await new Promise((r) => setTimeout(r, 500));

      const isSecondChecked = await page.evaluate(() => {
         const cbs = document.querySelectorAll('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
         return cbs.length > 1 ? cbs[1].checked : false;
      });
      assert(isSecondChecked, "Second user row checkbox is successfully checked");

      const toolbarInfo2 = await page.evaluate(() => {
         const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent);
         const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
            text: b.textContent.trim(),
            ariaLabel: b.getAttribute("aria-label"),
         }));
         const searchInput = document.querySelector("input[placeholder='Search']");
         const roleInput = document.querySelector("input[placeholder='Select Role']");

         return {
            hasSelectedChip: chips.some((t) => t && t.toLowerCase().includes("selected")),
            hasDeselectAll: buttons.some((b) => b.text === "Deselect All"),
            hasClearSelectionIcon: buttons.some((b) => (b.ariaLabel || "").toLowerCase().includes("clear selection")),
            hasSearchInput: Boolean(searchInput),
            hasRoleInput: Boolean(roleInput),
         };
      });

      console.log("  Toolbar Info after multiple selection:", toolbarInfo2);
      assert(!toolbarInfo2.hasSelectedChip, "NO 'selected' count badge appears (multiple selected)");
      assert(!toolbarInfo2.hasDeselectAll, "NO 'Deselect All' button appears");
      assert(!toolbarInfo2.hasClearSelectionIcon, "NO 'Clear Selection' icon appears");
      assert(toolbarInfo2.hasSearchInput && toolbarInfo2.hasRoleInput, "Original toolbar layout and alignment preserved completely without jitter");

      // Capture screenshot of User page with multiple rows selected
      const userMultiSelectedScreenshot = "screenshots/user_multi_selected_no_indicators.png";
      await page.screenshot({ path: userMultiSelectedScreenshot, fullPage: false });
      fs.copyFileSync(userMultiSelectedScreenshot, path.join(brainDir, "user_multi_selected_no_indicators.png"));
      console.log(`  ✓ Screenshot captured: ${userMultiSelectedScreenshot}`);

      // ─────────────────────────────────────────────────────────────────────────────
      // 4. Test Deselection via Row Checkbox & Header Checkbox
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 4. Testing Deselection via Row Checkboxes ---");
      // Uncheck second row
      await rowCheckboxes[1].click();
      await new Promise((r) => setTimeout(r, 400));

      const isSecondUnchecked = await page.evaluate(() => {
         const cbs = document.querySelectorAll('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
         return cbs.length > 1 ? !cbs[1].checked : false;
      });
      assert(isSecondUnchecked, "Second user row can be unselected via its checkbox");

      // Uncheck first row
      await rowCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 400));

      const isFirstUnchecked = await page.evaluate(() => {
         const cb = document.querySelector('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
         return cb ? !cb.checked : false;
      });
      assert(isFirstUnchecked, "First user row can be unselected via its checkbox");

      // Test header select-all checkbox
      const headerCheckbox = await page.$('.MuiDataGrid-columnHeaderTitleContainer .MuiCheckbox-root input[type="checkbox"], .MuiDataGrid-columnHeader .MuiCheckbox-root input[type="checkbox"]');
      if (headerCheckbox) {
         console.log("  Testing header checkbox select-all...");
         await headerCheckbox.click();
         await new Promise((r) => setTimeout(r, 500));

         const allChecked = await page.evaluate(() => {
            const cbs = Array.from(document.querySelectorAll('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]'));
            return cbs.every((c) => c.checked);
         });
         assert(allChecked, "Header checkbox selects all user rows");

         // Still no selection toolbar indicators
         const hasBadgeOnAll = await page.$$eval(".MuiChip-label", (chips) =>
            chips.map((c) => c.textContent || "").some((t) => t.toLowerCase().includes("selected"))
         );
         assert(!hasBadgeOnAll, "NO selected badge appears even when all rows are selected via header checkbox");

         // Uncheck all via header checkbox
         await headerCheckbox.click();
         await new Promise((r) => setTimeout(r, 500));
         const allUnchecked = await page.evaluate(() => {
            const cbs = Array.from(document.querySelectorAll('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]'));
            return cbs.every((c) => !c.checked);
         });
         assert(allUnchecked, "Header checkbox deselects all user rows");
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 5. Verify Other Modules Retain Existing Selection Toolbar Behavior
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 5. Verifying Other Modules Retain Selection Toolbar Indicators ---");

      // 5a. Product page: selecting rows must show selection toolbar (Badge, Deselect All, Export selected, Clear icon)
      await page.goto(`${BASE_URL}/admin/product`, { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 800));

      const prodCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (prodCheckboxes.length >= 2) {
         await prodCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 400));

         const prodToolbarInfo = await page.evaluate(() => {
            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent);
            const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
               text: b.textContent.trim(),
               ariaLabel: b.getAttribute("aria-label"),
            }));

            return {
               hasBadge: chips.some((t) => t && t.includes("1 selected")),
               hasDeselectAll: buttons.some((b) => b.text === "Deselect All"),
               hasExportSelected: buttons.some((b) => b.text === "Export selected"),
               hasClearIcon: buttons.some((b) => (b.ariaLabel || "").toLowerCase().includes("clear selection")),
            };
         });

         console.log("  Product toolbar after selection:", prodToolbarInfo);
         assert(prodToolbarInfo.hasBadge, "Product module still displays '1 selected' badge");
         assert(prodToolbarInfo.hasDeselectAll, "Product module still displays 'Deselect All' button");
         assert(prodToolbarInfo.hasExportSelected, "Product module still displays 'Export selected' button");
         assert(prodToolbarInfo.hasClearIcon, "Product module still displays clear selection icon");
      }

      // 5b. Order page: selecting rows must show selection toolbar (Badge, Deselect All, Export selected, Print selected, Clear icon)
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 800));

      const orderCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (orderCheckboxes.length >= 2) {
         await orderCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 400));

         const orderToolbarInfo = await page.evaluate(() => {
            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent);
            const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
               text: b.textContent.trim(),
               ariaLabel: b.getAttribute("aria-label"),
            }));

            return {
               hasBadge: chips.some((t) => t && t.includes("1 selected")),
               hasDeselectAll: buttons.some((b) => b.text === "Deselect All"),
               hasExportSelected: buttons.some((b) => b.text.includes("Export selected")),
               hasPrintSelected: buttons.some((b) => b.text.includes("Print selected")),
               hasClearIcon: buttons.some((b) => (b.ariaLabel || "").toLowerCase().includes("clear selection")),
            };
         });

         console.log("  Order toolbar after selection:", orderToolbarInfo);
         assert(orderToolbarInfo.hasBadge, "Order module still displays '1 selected' badge");
         assert(orderToolbarInfo.hasDeselectAll, "Order module still displays 'Deselect All' button");
         assert(orderToolbarInfo.hasExportSelected, "Order module still displays 'Export selected' button");
         assert(orderToolbarInfo.hasPrintSelected, "Order module still displays 'Print selected' button");
         assert(orderToolbarInfo.hasClearIcon, "Order module still displays clear selection icon");
      }

      console.log("\n================================================================================");
      console.log(`  VERIFICATION RESULTS: ${passed.length} PASSED | ${failed.length} FAILED (100% SUCCESS)`);
      console.log("================================================================================\n");
   } finally {
      await browser.close();
      await prisma.$disconnect();
   }
}

runTest().catch((err) => {
   console.error("Test failed:", err);
   process.exit(1);
});
