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
   console.log("  DEVX POS - PRODUCT PAGE UI, TABLE TOOLBAR, MODAL & EXPORT VERIFICATION");
   console.log("================================================================================\n");

   if (!fs.existsSync("screenshots")) {
      fs.mkdirSync("screenshots");
   }

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
      // 1. Visit Product Page & Check Layout / Normal Export Button Position
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("--- 1. Testing Product Page & Header Toolbar (State A: 0 Rows Selected) ---");
      await page.goto(`${BASE_URL}/admin/product`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));

      assert(page.url().includes("/admin/product"), "Product page loaded successfully");

      // Verify "Add product" button is present at page header
      const hasAddProduct = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").includes("Add product"))
      );
      assert(hasAddProduct, "Page-level 'Add product' button preserved in page header");

      // Verify Search box is present on the left
      const searchBox = await page.$("input[placeholder='Search']");
      assert(Boolean(searchBox), "Search box is present in table toolbar");

      // Verify normal Export button is present on the right side of the toolbar (NOT in the filter section)
      const toolbarStructure = await page.evaluate(() => {
         const searchInput = document.querySelector("input[placeholder='Search']");
         const catInput = document.querySelector("input[placeholder='Select Category']");
         const stockInput = document.querySelector("input[placeholder='Select Stock']");
         const allButtons = Array.from(document.querySelectorAll("button"));
         const exportBtn = allButtons.find((b) => (b.textContent || "").trim() === "Export");

         const searchRect = searchInput ? searchInput.getBoundingClientRect() : null;
         const catRect = catInput ? catInput.getBoundingClientRect() : null;
         const stockRect = stockInput ? stockInput.getBoundingClientRect() : null;
         const exportRect = exportBtn ? exportBtn.getBoundingClientRect() : null;

         return {
            hasExportBtn: Boolean(exportBtn),
            exportBtnText: exportBtn ? exportBtn.textContent.trim() : null,
            hasCategory: Boolean(catInput),
            hasStock: Boolean(stockInput),
            isExportOnRight: exportRect && stockRect ? exportRect.left > stockRect.right : false,
         };
      });

      console.log("  Toolbar layout structure:", toolbarStructure);
      assert(toolbarStructure && toolbarStructure.hasExportBtn, "Normal 'Export' button is rendered in toolbar");
      assert(toolbarStructure && toolbarStructure.exportBtnText === "Export", "Normal Export button displays label 'Export'");
      assert(toolbarStructure && toolbarStructure.hasCategory && toolbarStructure.hasStock, "Category and Stock filter inputs are present");
      assert(toolbarStructure && toolbarStructure.isExportOnRight, "Export button is positioned on the RIGHT side of the filter controls (NOT inside/before filter section)");

      // ─────────────────────────────────────────────────────────────────────────────
      // 2. Test Product Filter Widths & Responsive Layout
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 2. Testing Product Filter Widths Across Breakpoints ---");

      // Desktop: 1440px
      const desktopFilterMetrics = await page.evaluate(() => {
         const catInput = document.querySelector("input[placeholder='Select Category']");
         const stockInput = document.querySelector("input[placeholder='Select Stock']");
         const catBox = catInput ? catInput.closest(".MuiAutocomplete-root") : null;
         const stockBox = stockInput ? stockInput.closest(".MuiAutocomplete-root") : null;
         const catArrow = catBox ? catBox.querySelector(".MuiAutocomplete-popupIndicator") : null;
         const stockArrow = stockBox ? stockBox.querySelector(".MuiAutocomplete-popupIndicator") : null;

         return {
            catWidth: catBox ? catBox.getBoundingClientRect().width : 0,
            stockWidth: stockBox ? stockBox.getBoundingClientRect().width : 0,
            hasCatArrow: Boolean(catArrow),
            hasStockArrow: Boolean(stockArrow),
         };
      });
      console.log("  Desktop Filter Metrics:", desktopFilterMetrics);
      assert(desktopFilterMetrics.catWidth >= 220, `Desktop Category filter width is balanced: ${desktopFilterMetrics.catWidth}px (>= 220px)`);
      assert(desktopFilterMetrics.stockWidth >= 180, `Desktop Stock filter width is balanced: ${desktopFilterMetrics.stockWidth}px (>= 180px)`);
      assert(desktopFilterMetrics.hasCatArrow && desktopFilterMetrics.hasStockArrow, "Both Category and Stock dropdowns render dropdown chevron arrows");

      // Tablet: 768px
      await page.setViewport({ width: 768, height: 1024 });
      await new Promise((r) => setTimeout(r, 400));
      const tabletMetrics = await page.evaluate(() => {
         const catInput = document.querySelector("input[placeholder='Select Category']");
         const stockInput = document.querySelector("input[placeholder='Select Stock']");
         const catBox = catInput ? catInput.closest(".MuiAutocomplete-root") : null;
         const stockBox = stockInput ? stockInput.closest(".MuiAutocomplete-root") : null;
         return {
            catWidth: catBox ? catBox.getBoundingClientRect().width : 0,
            stockWidth: stockBox ? stockBox.getBoundingClientRect().width : 0,
         };
      });
      console.log("  Tablet Filter Metrics:", tabletMetrics);
      assert(tabletMetrics.catWidth >= 180, `Tablet Category filter width is responsive: ${tabletMetrics.catWidth}px`);
      assert(tabletMetrics.stockWidth >= 150, `Tablet Stock filter width is responsive: ${tabletMetrics.stockWidth}px`);

      // Mobile: 375px
      await page.setViewport({ width: 375, height: 812 });
      await new Promise((r) => setTimeout(r, 400));
      const mobileMetrics = await page.evaluate(() => {
         const catInput = document.querySelector("input[placeholder='Select Category']");
         const catBox = catInput ? catInput.closest(".MuiAutocomplete-root") : null;
         return {
            catWidth: catBox ? catBox.getBoundingClientRect().width : 0,
         };
      });
      console.log("  Mobile Filter Metrics:", mobileMetrics);
      assert(mobileMetrics.catWidth >= 150, `Mobile Category filter adapts to viewport: ${mobileMetrics.catWidth}px`);

      // Reset to Desktop
      await page.setViewport({ width: 1440, height: 960 });
      await new Promise((r) => setTimeout(r, 500));

      // ─────────────────────────────────────────────────────────────────────────────
      // 3. Test Product View Modal using Reusable CustomModal
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 3. Testing Product View Modal using Reusable CustomModal ---");
      // Click first product ID
      const firstIdCell = await page.$(".MuiDataGrid-cell[data-field='customId'] p, .MuiDataGrid-cell[data-field='customId'] .MuiTypography-root");
      if (firstIdCell) {
         await firstIdCell.click();
      } else {
         const prodName = await page.$(".MuiDataGrid-cell[data-field='product'] p, .MuiDataGrid-cell[data-field='product'] .MuiTypography-root");
         if (prodName) await prodName.click();
      }
      await new Promise((r) => setTimeout(r, 800));

      // Assert CustomModal opened
      const modalInfo = await page.evaluate(() => {
         const modalEl = document.querySelector(".MuiModal-root:not([aria-hidden='true'])");
         if (!modalEl) return null;
         const titleEl = modalEl.querySelector("h6, p, div");
         const text = modalEl.textContent || "";
         const hasSku = text.includes("SKU Code");
         const hasCategory = text.includes("Category");
         const hasRegularPrice = text.includes("Regular Price");
         const hasCurrentStock = text.includes("Current Stock");
         const hasPrintSpec = text.includes("Print Product Spec");
         const closeBtn = Array.from(modalEl.querySelectorAll("button")).find(
            (b) => b.textContent && b.textContent.includes("Close")
         );
         const closeIcon = modalEl.querySelector("button[aria-label], .MuiIconButton-root");

         return {
            isOpen: Boolean(modalEl),
            hasSku,
            hasCategory,
            hasRegularPrice,
            hasCurrentStock,
            hasPrintSpec,
            hasCloseBtn: Boolean(closeBtn),
            hasCloseIcon: Boolean(closeIcon),
            snippet: text.slice(0, 200),
         };
      });

      console.log("  Product View Modal Info:", modalInfo);
      assert(modalInfo && modalInfo.isOpen, "Product View modal opened successfully");
      assert(modalInfo.hasSku && modalInfo.hasCategory, "Product View modal renders SKU Code and Category fields");
      assert(modalInfo.hasRegularPrice && modalInfo.hasCurrentStock, "Product View modal renders Regular Price and Current Stock");
      assert(modalInfo.hasPrintSpec, "Product View modal renders 'Print Product Spec' action");
      assert(modalInfo.hasCloseBtn, "Product View modal renders 'Close' button");

      // Capture screenshot of Product View Modal
      const modalScreenshot = "screenshots/product_view_custom_modal.png";
      await page.screenshot({ path: modalScreenshot, fullPage: false });
      const brainDir = "/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756";
      fs.copyFileSync(modalScreenshot, path.join(brainDir, "product_view_custom_modal.png"));
      console.log(`  ✓ Product View Modal screenshot captured: ${modalScreenshot}`);

      // Close modal
      await page.evaluate(() => {
         const modalEl = document.querySelector(".MuiModal-root:not([aria-hidden='true'])");
         if (!modalEl) return;
         const btns = Array.from(modalEl.querySelectorAll("button"));
         const c = btns.find((b) => b.textContent && b.textContent.includes("Close"));
         if (c) c.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      const isModalClosed = await page.evaluate(() => !document.querySelector(".MuiModal-root:not([aria-hidden='true'])"));
      assert(isModalClosed, "Product View modal closed cleanly");

      // ─────────────────────────────────────────────────────────────────────────────
      // 4. Test Selection Toolbar: Select 1 row, Select 5 rows, Deselect All, Clear
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 4. Testing Selection Toolbar on Products ---");
      const checkboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      assert(checkboxes.length >= 5, `Found ${checkboxes.length} product rows (at least 5 available)`);

      // 4a. Select 1 row
      await checkboxes[0].click();
      await new Promise((r) => setTimeout(r, 400));

      const badge1 = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
      );
      assert(badge1 === "1 selected", `Toolbar shows exact single count: "${badge1}"`);

      // Verify normal Export is REPLACED by selection toolbar (Export button does not appear twice)
      const exportButtonsCount1 = await page.$$eval("button", (btns) =>
         btns.filter((b) => (b.textContent || "").includes("Export")).map((b) => b.textContent.trim())
      );
      console.log("  Export buttons present during 1 selection:", exportButtonsCount1);
      assert(exportButtonsCount1.length === 1 && exportButtonsCount1[0] === "Export selected",
         "Normal Export button is replaced by 'Export selected'; Export button does NOT appear twice");

      // Verify NO 'Print selected' on Products
      const hasPrintSelected = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").toLowerCase().includes("print selected"))
      );
      assert(!hasPrintSelected, "Product page NEVER renders 'Print selected' (strict rule enforced)");

      // 4b. Select 4 more rows (total 5)
      for (let i = 1; i < 5; i++) {
         await checkboxes[i].click();
         await new Promise((r) => setTimeout(r, 200));
      }
      await new Promise((r) => setTimeout(r, 500));

      const badge5 = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
      );
      assert(badge5 === "5 selected", `Selection count updates immediately to: "${badge5}"`);

      // Verify "Deselect All" button exists
      const hasDeselectAll = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").trim() === "Deselect All")
      );
      assert(hasDeselectAll, "'Deselect All' button is present in selection toolbar");

      // Verify clear selection icon exists
      const hasClearIcon = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.getAttribute("aria-label") || "").toLowerCase().includes("clear selection"))
      );
      assert(hasClearIcon, "Clear selection icon button (close-circle) is present");

      // Capture screenshot of Product table with 5 rows selected
      const prod5Screenshot = "screenshots/product_5_selected_toolbar_final.png";
      await page.screenshot({ path: prod5Screenshot, fullPage: false });
      fs.copyFileSync(prod5Screenshot, path.join(brainDir, "product_5_selected_toolbar_final.png"));
      console.log(`  ✓ Product 5 selected screenshot captured: ${prod5Screenshot}`);

      // ─────────────────────────────────────────────────────────────────────────────
      // 5. Test Export Selected Modal Scope Pre-Selection
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 5. Testing 'Export selected' Modal Scope Pre-selection ---");
      await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         const exp = btns.find((b) => (b.textContent || "").includes("Export selected"));
         if (exp) exp.click();
      });
      await new Promise((r) => setTimeout(r, 800));

      const exportModalInfo = await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not([aria-hidden='true'])");
         if (!modal) return null;
         const radios = Array.from(modal.querySelectorAll("input[type='radio']"));
         const checkedRadio = radios.find((r) => r.checked);
         const checkedVal = checkedRadio ? checkedRadio.value : null;
         const text = modal.textContent || "";
         return {
            isOpen: Boolean(modal),
            checkedVal,
            hasSelectedScopeText: text.includes("Export Selected Records Only (5 selected)"),
         };
      });

      console.log("  Export Modal Info:", exportModalInfo);
      assert(exportModalInfo && exportModalInfo.isOpen, "Export Modal opened from 'Export selected'");
      assert(exportModalInfo.checkedVal === "selected", "Export Modal automatically pre-selected 'selected' scope");
      assert(exportModalInfo.hasSelectedScopeText, "Export Modal displays 'Export Selected Records Only (5 selected)'");

      // Close export modal
      await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not([aria-hidden='true'])");
         if (!modal) return;
         const btns = Array.from(modal.querySelectorAll("button"));
         const cancel = btns.find((b) => b.textContent && b.textContent.includes("Cancel"));
         if (cancel) cancel.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      // ─────────────────────────────────────────────────────────────────────────────
      // 6. Test Deselect All & Clear Selection Restores Normal Toolbar
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 6. Testing Deselect All Restores Original Header & Normal Export ---");
      await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         const d = btns.find((b) => (b.textContent || "").trim() === "Deselect All");
         if (d) d.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      const afterDeselectBadge = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).filter((t) => t && t.includes("selected"))
      );
      assert(afterDeselectBadge.length === 0, "Selected count returned to 0 after clicking 'Deselect All'");

      const restoredNormalExport = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").trim() === "Export")
      );
      assert(restoredNormalExport, "Normal 'Export' button restored immediately on the right side");

      // Test clear icon as well
      await checkboxes[0].click();
      await new Promise((r) => setTimeout(r, 300));
      await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         const c = btns.find((b) => (b.getAttribute("aria-label") || "").toLowerCase().includes("clear selection"));
         if (c) c.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      const afterClearIconBadge = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).filter((t) => t && t.includes("selected"))
      );
      assert(afterClearIconBadge.length === 0, "Clear selection icon resets selection to 0");

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
