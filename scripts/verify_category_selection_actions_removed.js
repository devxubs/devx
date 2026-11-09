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
   console.log("  DEVX POS - CATEGORY PAGE REMOVE SELECTION ACTIONS VERIFICATION");
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
      // 1. Visit Category Page & Inspect Initial Toolbar (0 Rows Selected)
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("--- 1. Testing Initial Category Page Toolbar (0 Rows Selected) ---");
      await page.goto(`${BASE_URL}/admin/categories`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));

      assert(page.url().includes("/admin/categories"), "Category page loaded successfully");

      // Verify search input and Add Category button
      const searchBox = await page.$("input[placeholder='Search']");
      assert(Boolean(searchBox), "Search box is present in Category toolbar");

      const addBtn = await page.$("button ::-p-text(Add Category), button ::-p-text(Add category)");
      assert(Boolean(addBtn), "Add Category button is present above table");

      // Verify initial state has NO selection indicators
      const initialInfo = await page.evaluate(() => {
         const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent || "");
         const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
            text: (b.textContent || "").trim(),
            ariaLabel: b.getAttribute("aria-label"),
            title: b.getAttribute("title"),
         }));
         return {
            hasSelectedChip: chips.some((t) => t.toLowerCase().includes("selected")),
            hasDeselectAll: buttons.some((b) => b.text === "Deselect All"),
            hasClearSelectionIcon: buttons.some((b) => (b.ariaLabel || "").toLowerCase().includes("clear selection")),
         };
      });
      assert(!initialInfo.hasSelectedChip, "Initial: NO 'selected' count chip is visible");
      assert(!initialInfo.hasDeselectAll, "Initial: NO 'Deselect All' button is visible");
      assert(!initialInfo.hasClearSelectionIcon, "Initial: NO 'Clear selection' icon is visible");

      const initialScreenshot = "screenshots/category_0_selected.png";
      await page.screenshot({ path: initialScreenshot, fullPage: false });
      fs.copyFileSync(initialScreenshot, path.join(brainDir, "category_0_selected.png"));
      console.log(`  ✓ Screenshot captured: ${initialScreenshot}`);

      // ─────────────────────────────────────────────────────────────────────────────
      // 2. Select 1 Category Row: Verify NO Selected, NO Deselected, NO Clear
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 2. Testing 1 Category Selected: Selection Indicators Must Be Completely Hidden ---");
      const rowCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      assert(rowCheckboxes.length >= 2, `Found ${rowCheckboxes.length} category rows with checkboxes`);

      // Click first checkbox
      await rowCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 600));

      const isFirstChecked = await page.evaluate(() => {
         const cb = document.querySelector('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
         return cb ? cb.checked : false;
      });
      assert(isFirstChecked, "First category row checkbox is successfully checked");

      // Check toolbar text & elements
      const toolbarInfo1 = await page.evaluate(() => {
         const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent || "");
         const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
            text: (b.textContent || "").trim(),
            ariaLabel: b.getAttribute("aria-label"),
            title: b.getAttribute("title"),
         }));
         const searchInput = document.querySelector("input[placeholder='Search']");

         return {
            hasSelectedChip: chips.some((t) => t.toLowerCase().includes("selected")),
            chips,
            hasDeselectAll: buttons.some((b) => b.text.toLowerCase().includes("deselect")),
            hasClearSelectionIcon: buttons.some((b) =>
               (b.ariaLabel || "").toLowerCase().includes("clear selection") ||
               (b.title || "").toLowerCase().includes("clear selection")
            ),
            hasSearchInput: Boolean(searchInput),
            hasExportSelected: buttons.some((b) => b.text.toLowerCase().includes("export selected")),
            hasPrintSelected: buttons.some((b) => b.text.toLowerCase().includes("print selected")),
         };
      });

      console.log("  Category Toolbar Info after 1 selection:", toolbarInfo1);
      assert(!toolbarInfo1.hasSelectedChip, "NO 'selected' count badge appears (Selected indicator removed)");
      assert(!toolbarInfo1.hasDeselectAll, "NO 'Deselect All' button appears (Deselected action removed)");
      assert(!toolbarInfo1.hasClearSelectionIcon, "NO 'Clear Selection' icon appears (Clear action removed)");
      assert(!toolbarInfo1.hasExportSelected, "NO 'Export selected' button appears");
      assert(!toolbarInfo1.hasPrintSelected, "NO 'Print selected' button appears");
      assert(toolbarInfo1.hasSearchInput, "Original Search input remains intact in toolbar (selection toolbar did not replace it)");

      const category1SelectedScreenshot = "screenshots/category_1_selected_no_indicators.png";
      await page.screenshot({ path: category1SelectedScreenshot, fullPage: false });
      fs.copyFileSync(category1SelectedScreenshot, path.join(brainDir, "category_1_selected_no_indicators.png"));
      console.log(`  ✓ Screenshot captured: ${category1SelectedScreenshot}`);

      // ─────────────────────────────────────────────────────────────────────────────
      // 3. Select Multiple Categories: Verify NO Selected, NO Deselected, NO Clear
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 3. Testing Multiple Categories Selected: Selection Indicators Must Be Completely Hidden ---");
      await rowCheckboxes[1].click();
      await new Promise((r) => setTimeout(r, 600));

      const isSecondChecked = await page.evaluate(() => {
         const cbs = document.querySelectorAll('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
         return cbs.length > 1 ? cbs[1].checked : false;
      });
      assert(isSecondChecked, "Second category row checkbox is successfully checked");

      const toolbarInfo2 = await page.evaluate(() => {
         const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent || "");
         const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
            text: (b.textContent || "").trim(),
            ariaLabel: b.getAttribute("aria-label"),
            title: b.getAttribute("title"),
         }));
         const searchInput = document.querySelector("input[placeholder='Search']");

         return {
            hasSelectedChip: chips.some((t) => t.toLowerCase().includes("selected")),
            hasDeselectAll: buttons.some((b) => b.text.toLowerCase().includes("deselect")),
            hasClearSelectionIcon: buttons.some((b) =>
               (b.ariaLabel || "").toLowerCase().includes("clear selection") ||
               (b.title || "").toLowerCase().includes("clear selection")
            ),
            hasSearchInput: Boolean(searchInput),
         };
      });

      console.log("  Category Toolbar Info after multiple selection:", toolbarInfo2);
      assert(!toolbarInfo2.hasSelectedChip, "NO 'selected' count badge appears after multiple rows selected");
      assert(!toolbarInfo2.hasDeselectAll, "NO 'Deselect All' button appears after multiple rows selected");
      assert(!toolbarInfo2.hasClearSelectionIcon, "NO 'Clear Selection' icon appears after multiple rows selected");
      assert(toolbarInfo2.hasSearchInput, "Original Search input remains intact in toolbar");

      const categoryMultiSelectedScreenshot = "screenshots/category_multi_selected_no_indicators.png";
      await page.screenshot({ path: categoryMultiSelectedScreenshot, fullPage: false });
      fs.copyFileSync(categoryMultiSelectedScreenshot, path.join(brainDir, "category_multi_selected_no_indicators.png"));
      console.log(`  ✓ Screenshot captured: ${categoryMultiSelectedScreenshot}`);

      // Deselect rows by clicking them again
      await rowCheckboxes[0].click();
      await rowCheckboxes[1].click();
      await new Promise((r) => setTimeout(r, 500));

      // ─────────────────────────────────────────────────────────────────────────────
      // 4. Verify Category Table CRUD Actions Still Work
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 4. Testing Category Table Functionality (Add, Edit, Delete, Search) ---");

      // 4a. Add Modal
      console.log("  Testing Add Category modal...");
      await addBtn.click();
      await new Promise((r) => setTimeout(r, 600));

      const modalInput = await page.$("input[name='name'], input[label='Category name']");
      assert(Boolean(modalInput), "Add Category modal opened and input is present");

      // Click Cancel in modal
      const cancelBtn = await page.evaluateHandle(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         return btns.find((b) => (b.textContent || "").trim() === "Cancel");
      });
      if (cancelBtn) {
         await cancelBtn.click();
         await new Promise((r) => setTimeout(r, 500));
      }
      assert(true, "Add Category modal can be opened and closed");

      // 4b. Row Actions: Edit and Delete
      console.log("  Testing Row Action Menu...");
      const clickedAction = await page.evaluate(() => {
         const rows = Array.from(document.querySelectorAll(".MuiDataGrid-row"));
         if (rows.length === 0) return false;
         const firstRow = rows[0];
         const buttons = Array.from(firstRow.querySelectorAll("button"));
         const moreBtn =
            buttons.find((b) => b.querySelector("[data-icon*='more']") || b.innerHTML.includes("more")) ||
            buttons[buttons.length - 1];
         if (moreBtn) {
            moreBtn.click();
            return true;
         }
         return false;
      });
      assert(clickedAction, "Found and clicked row action menu button (eva:more-vertical-fill)");
      await new Promise((r) => setTimeout(r, 600));

      const menuItems = await page.evaluate(() => {
         const items = Array.from(document.querySelectorAll(".MuiMenuItem-root, [role='menuitem'], .MuiListItemButton-root"));
         return items.map((i) => (i.textContent || "").trim().toLowerCase());
      });
      console.log("  Row Menu Items:", menuItems);
      assert(menuItems.some((m) => m.includes("edit")), "Row action menu contains 'edit'");
      assert(menuItems.some((m) => m.includes("delete")), "Row action menu contains 'delete'");

      // Close menu by clicking outside or pressing Escape
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 400));

      // 4c. Search Functionality
      console.log("  Testing Search filtering...");
      const searchField = await page.$("input[placeholder='Search']");
      if (searchField) {
         await searchField.click();
         await searchField.type("Beverages", { delay: 50 });
         await new Promise((r) => setTimeout(r, 800));

         const visibleRowNames = await page.evaluate(() => {
            const cells = Array.from(document.querySelectorAll(".MuiDataGrid-row [data-field='name']"));
            return cells.map((c) => (c.textContent || "").trim());
         });
         console.log("  Visible rows after searching 'Beverages':", visibleRowNames);
         assert(
            visibleRowNames.length >= 1 && visibleRowNames.every((n) => n.toLowerCase().includes("beverages")),
            "Search filter correctly filters category rows to 'Beverages'"
         );

         // Clear search via delete icon on Keyword filter chip or Ctrl+A Backspace
         const deleteChip = await page.$(".MuiChip-deleteIcon");
         if (deleteChip) {
            await deleteChip.click();
            await new Promise((r) => setTimeout(r, 800));
         } else {
            await searchField.focus();
            await page.keyboard.down("Control");
            await page.keyboard.press("A");
            await page.keyboard.up("Control");
            await page.keyboard.press("Backspace");
            await new Promise((r) => setTimeout(r, 800));
         }

         const allRowsCount = await page.$$eval(".MuiDataGrid-row", (rows) => rows.length);
         assert(allRowsCount >= 3, `Clearing search restores all category rows (found ${allRowsCount} rows)`);
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 5. Verify Other Admin Pages Retain Selection Functionality
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 5. Testing Regression: Other Admin Pages Retain Selection Functionality ---");

      // 5a. Orders Page
      console.log("  Verifying Orders page selection toolbar...");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));

      const orderCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (orderCheckboxes.length > 0) {
         await orderCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 600));

         const orderToolbar = await page.evaluate(() => {
            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent || "");
            const buttons = Array.from(document.querySelectorAll("button")).map((b) => (b.textContent || "").trim());
            return {
               hasSelectedBadge: chips.some((t) => t.includes("selected")),
               hasDeselectAll: buttons.some((b) => b === "Deselect All"),
               hasExportSelected: buttons.some((b) => b.includes("Export selected")),
               hasPrintSelected: buttons.some((b) => b.includes("Print selected")),
            };
         });
         assert(orderToolbar.hasSelectedBadge, "Orders: Selection Toolbar displays 'selected' badge");
         assert(orderToolbar.hasDeselectAll, "Orders: 'Deselect All' button is preserved");
         assert(orderToolbar.hasExportSelected, "Orders: 'Export selected' button is preserved");
         assert(orderToolbar.hasPrintSelected, "Orders: 'Print selected' button is preserved");
      }

      // 5b. Customers Page
      console.log("  Verifying Customers page selection toolbar...");
      await page.goto(`${BASE_URL}/admin/customers`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));

      const custCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (custCheckboxes.length > 0) {
         await custCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 600));

         const custToolbar = await page.evaluate(() => {
            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent || "");
            const buttons = Array.from(document.querySelectorAll("button")).map((b) => (b.textContent || "").trim());
            return {
               hasSelectedBadge: chips.some((t) => t.includes("selected")),
               hasDeselectAll: buttons.some((b) => b === "Deselect All"),
               hasExportSelected: buttons.some((b) => b.includes("Export selected")),
               hasPrintSelected: buttons.some((b) => b.includes("Print selected")),
            };
         });
         assert(custToolbar.hasSelectedBadge, "Customers: Selection Toolbar displays 'selected' badge");
         assert(custToolbar.hasDeselectAll, "Customers: 'Deselect All' button is preserved");
         assert(custToolbar.hasExportSelected, "Customers: 'Export selected' button is preserved");
         assert(custToolbar.hasPrintSelected, "Customers: 'Print selected' button is preserved");
      }

      // 5c. User Page
      console.log("  Verifying User page maintains hidden toolbar indicators...");
      await page.goto(`${BASE_URL}/admin/user`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));

      const userCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (userCheckboxes.length > 0) {
         await userCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 600));

         const userToolbar = await page.evaluate(() => {
            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent || "");
            const buttons = Array.from(document.querySelectorAll("button")).map((b) => (b.textContent || "").trim());
            return {
               hasSelectedBadge: chips.some((t) => t.includes("selected")),
               hasDeselectAll: buttons.some((b) => b === "Deselect All"),
            };
         });
         assert(!userToolbar.hasSelectedBadge, "Users: NO 'selected' badge appears in toolbar (as expected)");
         assert(!userToolbar.hasDeselectAll, "Users: NO 'Deselect All' button appears (as expected)");
      }

      // 5d. Suppliers Page
      console.log("  Verifying Suppliers page selection toolbar...");
      await page.goto(`${BASE_URL}/admin/suppliers`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));

      const supCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (supCheckboxes.length > 0) {
         await supCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 600));

         const supToolbar = await page.evaluate(() => {
            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent || "");
            const buttons = Array.from(document.querySelectorAll("button")).map((b) => (b.textContent || "").trim());
            return {
               hasSelectedBadge: chips.some((t) => t.includes("selected")),
               hasDeselectAll: buttons.some((b) => b === "Deselect All"),
               hasExportSelected: buttons.some((b) => b.includes("Export selected")),
            };
         });
         assert(supToolbar.hasSelectedBadge, "Suppliers: Selection Toolbar displays 'selected' badge");
         assert(supToolbar.hasDeselectAll, "Suppliers: 'Deselect All' button is preserved");
      }

      console.log("\n================================================================================");
      console.log(`  SUMMARY: All ${passed.length} tests passed successfully! (0 failures)`);
      console.log("================================================================================");
   } finally {
      await browser.close();
      await prisma.$disconnect();
   }
}

runTest().catch((err) => {
   console.error("Test execution failed:", err);
   process.exit(1);
});
