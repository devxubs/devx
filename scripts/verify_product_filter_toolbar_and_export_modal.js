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
   console.log("  DEVX POS - PRODUCT FILTER, SELECTION TOOLBAR & EXPORT MODAL VERIFICATION");
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
      // 1. Visit Product Page & Initial State (0 Products Selected)
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("--- 1. Testing Initial Product Page State (0 Products Selected) ---");
      await page.goto(`${BASE_URL}/admin/product`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));

      assert(page.url().includes("/admin/product"), "Product page loaded successfully");

      // Verify Category and Stock Autocompletes exist
      const categoryInput = await page.$("input[placeholder='Select Category']");
      const stockInput = await page.$("input[placeholder='Select Stock']");
      const searchInput = await page.$("input[placeholder='Search']");

      assert(Boolean(searchInput), "Search input is present in toolbar");
      assert(Boolean(categoryInput), "Category Autocomplete input is present");
      assert(Boolean(stockInput), "Stock Autocomplete input is present");

      // Inspect widths of Category and Stock boxes
      const filterBoxDimensions = await page.evaluate(() => {
         const catInput = document.querySelector("input[placeholder='Select Category']");
         const stInput = document.querySelector("input[placeholder='Select Stock']");
         const catBox = catInput ? catInput.closest(".MuiBox-root") : null;
         const stBox = stInput ? stInput.closest(".MuiBox-root") : null;

         const catRect = catBox ? catBox.getBoundingClientRect() : null;
         const stRect = stBox ? stBox.getBoundingClientRect() : null;

         return {
            catWidth: catRect ? Math.round(catRect.width) : 0,
            stWidth: stRect ? Math.round(stRect.width) : 0,
         };
      });

      console.log("  Filter input widths:", filterBoxDimensions);
      assert(
         filterBoxDimensions.catWidth >= 200 && filterBoxDimensions.catWidth <= 280,
         `Category filter box width (${filterBoxDimensions.catWidth}px) is appropriately sized (expected 200-280px)`
      );
      assert(
         filterBoxDimensions.stWidth >= 200 && filterBoxDimensions.stWidth <= 280,
         `Stock filter box width (${filterBoxDimensions.stWidth}px) is appropriately sized (expected 200-280px)`
      );
      assert(
         Math.abs(filterBoxDimensions.catWidth - filterBoxDimensions.stWidth) <= 10,
         `Category and Stock input widths are balanced and consistent (${filterBoxDimensions.catWidth}px vs ${filterBoxDimensions.stWidth}px)`
      );

      // Verify that when 0 products are selected: NO Export icon or button appears!
      const headerState0 = await page.evaluate(() => {
         const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
            text: b.textContent.trim(),
            ariaLabel: b.getAttribute("aria-label"),
            title: b.getAttribute("title"),
         }));
         const exportBtns = buttons.filter(
            (b) =>
               (b.ariaLabel && b.ariaLabel.toLowerCase().includes("export")) ||
               (b.title && b.title.toLowerCase().includes("export")) ||
               (b.text && b.text.toLowerCase().includes("export"))
         );
         return {
            buttonsCount: buttons.length,
            exportBtns,
            hasExportBtn: exportBtns.length > 0,
         };
      });

      console.log("  Header Export buttons when 0 selected:", headerState0.exportBtns);
      assert(
         !headerState0.hasExportBtn,
         "When 0 products are selected, NO Export icon or button appears in the toolbar"
      );

      // Capture screenshot of normal Product page with 0 rows selected
      const productNormalScreenshot = "screenshots/product_normal_header_0_selected.png";
      await page.screenshot({ path: productNormalScreenshot, fullPage: false });
      fs.copyFileSync(productNormalScreenshot, path.join(brainDir, "product_normal_header_0_selected.png"));
      console.log(`  ✓ Screenshot captured: ${productNormalScreenshot}`);

      // ─────────────────────────────────────────────────────────────────────────────
      // 2. Test Filter Interactions Without Skeleton Loading
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 2. Testing Filter Interactions (No Unwanted Skeletons) ---");

      // Set up a MutationObserver or check for .MuiSkeleton-root while typing
      await page.type("input[placeholder='Search']", "a");
      await new Promise((r) => setTimeout(r, 200));

      // Verify DataGrid remained mounted throughout
      const dataGridStillMounted = await page.evaluate(() => {
         const grid = document.querySelector(".MuiDataGrid-root");
         const skeleton = document.querySelector(".MuiSkeleton-root");
         return {
            hasGrid: Boolean(grid),
            hasSkeleton: Boolean(skeleton),
         };
      });

      console.log("  Grid and Skeleton state during search typing:", dataGridStillMounted);
      assert(dataGridStillMounted.hasGrid, "Table DataGrid remains stably mounted during typing");
      assert(!dataGridStillMounted.hasSkeleton, "NO full-table skeleton appears during search typing");

      // Clear search input
      await page.evaluate(() => {
         const input = document.querySelector("input[placeholder='Search']");
         if (input) {
            input.value = "";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
         }
      });
      await new Promise((r) => setTimeout(r, 600));

      // ─────────────────────────────────────────────────────────────────────────────
      // 3. Test Selection Toolbar: 1 and 2 Products Selected
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 3. Testing Selection Toolbar: Exactly ONE Export Icon Only ---");
      const rowCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      assert(rowCheckboxes.length >= 2, `Found ${rowCheckboxes.length} product rows with checkboxes`);

      // Check first product row
      await rowCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 600));

      // Inspect selection toolbar after 1 product selected
      const getToolbarElements = async () => {
         return await page.evaluate(() => {
            const allButtons = Array.from(document.querySelectorAll("button")).map((b) => ({
               text: b.textContent.trim(),
               ariaLabel: b.getAttribute("aria-label"),
               title: b.getAttribute("title"),
               className: b.className,
            }));

            const exportIconButtons = allButtons.filter(
               (b) =>
                  (b.ariaLabel && b.ariaLabel.toLowerCase().includes("export selected products")) ||
                  (b.title && b.title.toLowerCase().includes("export selected products"))
            );

            const allExportButtons = allButtons.filter(
               (b) =>
                  (b.ariaLabel && b.ariaLabel.toLowerCase().includes("export")) ||
                  (b.title && b.title.toLowerCase().includes("export")) ||
                  (b.text && b.text.toLowerCase().includes("export"))
            );

            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent.trim());
            const topSelectionChips = chips.filter((c) => c.toLowerCase().includes("selected"));

            const hasDeselectAll = allButtons.some((b) => b.text === "Deselect All");
            const hasClearSelectionIcon = allButtons.some((b) => (b.ariaLabel || "").toLowerCase().includes("clear selection"));
            const hasPrintSelected = allButtons.some((b) => (b.text || "").toLowerCase().includes("print selected"));

            return {
               exportIconButtons,
               allExportButtons,
               topSelectionChips,
               hasDeselectAll,
               hasClearSelectionIcon,
               hasPrintSelected,
            };
         });
      };

      const toolbar1 = await getToolbarElements();
      console.log("  Toolbar with 1 product selected:", toolbar1);

      assert(toolbar1.exportIconButtons.length === 1, "Exactly ONE Export icon button appears in the selection toolbar");
      assert(toolbar1.allExportButtons.length === 1, "NO duplicate Export buttons appear");
      assert(toolbar1.topSelectionChips.length === 0, "NO selected count badge appears in the top toolbar");
      assert(!toolbar1.hasDeselectAll, "NO 'Deselect All' button appears in the toolbar");
      assert(!toolbar1.hasClearSelectionIcon, "NO 'Clear Selection' icon appears in the toolbar");
      assert(!toolbar1.hasPrintSelected, "NO 'Print selected' button appears in the toolbar");

      // Check second product row
      await rowCheckboxes[1].click();
      await new Promise((r) => setTimeout(r, 600));

      const toolbar2 = await getToolbarElements();
      console.log("  Toolbar with 2 products selected:", toolbar2);

      assert(toolbar2.exportIconButtons.length === 1, "Still exactly ONE Export icon button appears with multiple products selected");
      assert(toolbar2.topSelectionChips.length === 0, "Top toolbar remains completely free of selected count badges");
      assert(!toolbar2.hasDeselectAll, "Top toolbar remains free of Deselect All button");

      // Capture screenshot of Product table with selection toolbar
      const productSelectionScreenshot = "screenshots/product_selection_single_export_icon.png";
      await page.screenshot({ path: productSelectionScreenshot, fullPage: false });
      fs.copyFileSync(productSelectionScreenshot, path.join(brainDir, "product_selection_single_export_icon.png"));
      console.log(`  ✓ Screenshot captured: ${productSelectionScreenshot}`);

      // ─────────────────────────────────────────────────────────────────────────────
      // 4. Test Advanced Product Export Configuration Modal
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 4. Testing Advanced Product Export Configuration Modal ---");

      // Click the Export icon button
      const exportIconBtn = await page.$('button[aria-label="Export selected products"]');
      assert(Boolean(exportIconBtn), "Found Export icon button with aria-label 'Export selected products'");
      await exportIconBtn.click();
      await new Promise((r) => setTimeout(r, 800));

      // Inspect Modal contents
      const modalInfo = await page.evaluate(() => {
         const modals = Array.from(document.querySelectorAll(".MuiModal-root"));
         const modal = modals.find((m) => m.textContent && m.textContent.includes("Export Products"));
         const titleEl = modal ? Array.from(modal.querySelectorAll(".MuiTypography-root")).find((t) => t.textContent.includes("Export Products")) : null;
         const titleText = titleEl ? titleEl.textContent.trim() : "";
         const bodyText = modal ? modal.textContent : "";

         // Scope / Selection count in modal
         const hasScope = bodyText.includes("Selected Products") || bodyText.includes("2 Selected");
         const hasSelectedDesc = bodyText.includes("Only the 2 products currently selected");

         // Formats
         const hasExcel = bodyText.includes("Excel (.xlsx)");
         const hasWord = bodyText.includes("Word (.docx)");
         const hasCsv = bodyText.includes("CSV (.csv)");

         // File name input
         const fileNameInput = modal ? modal.querySelector("input[label='Target File Name'], input[placeholder*='devx-products']") || modal.querySelector("input[value*='devx-products']") : null;
         const currentFileName = fileNameInput ? fileNameInput.value : "";

         // Branding Options
         const hasLogoOption = bodyText.includes("Company Logo");
         const hasCompanyNameOption = bodyText.includes("Company Name");
         const hasContactOption = bodyText.includes("Contact Info");
         const hasDateOption = bodyText.includes("Export Date");
         const hasHeaderStyle = bodyText.includes("Table Header Styling");
         const hasBorderStyle = bodyText.includes("Table Border Styling");

         // Preview table rows
         const previewRows = modal ? modal.querySelectorAll("table tbody tr") : [];

         return {
            hasModal: Boolean(modal),
            titleText,
            hasScope,
            hasSelectedDesc,
            hasExcel,
            hasWord,
            hasCsv,
            currentFileName,
            hasLogoOption,
            hasCompanyNameOption,
            hasContactOption,
            hasDateOption,
            hasHeaderStyle,
            hasBorderStyle,
            previewRowsCount: previewRows.length,
         };
      });

      console.log("  Export Modal State:", modalInfo);
      assert(modalInfo.hasModal, "Export Configuration Modal opened successfully");
      assert(modalInfo.titleText.includes("Export Products"), `Modal title is 'Export Products' (found: '${modalInfo.titleText}')`);
      assert(modalInfo.hasScope, "Modal displays accurate selected product scope and count (2 Selected)");
      assert(modalInfo.hasSelectedDesc, "Modal explains only selected products will be exported");
      assert(modalInfo.hasExcel && modalInfo.hasWord && modalInfo.hasCsv, "Modal provides Excel, Word, and CSV format choices");
      assert(modalInfo.currentFileName.includes("devx-products"), `File name input has default name '${modalInfo.currentFileName}'`);
      assert(modalInfo.hasLogoOption && modalInfo.hasCompanyNameOption && modalInfo.hasContactOption, "Document design & branding options are provided");
      assert(modalInfo.previewRowsCount === 2, `Data preview table displays exactly 2 selected products (found: ${modalInfo.previewRowsCount})`);

      // Test CSV format-aware behavior: Visual branding options must be disabled/hidden
      console.log("\n--- Testing Format-Aware Branding (CSV Mode) ---");
      await page.evaluate(() => {
         const papers = Array.from(document.querySelectorAll(".MuiPaper-root"));
         const csvCard = papers.find((p) => p.textContent && p.textContent.includes("CSV (.csv)"));
         if (csvCard) csvCard.click();
      });
      await new Promise((r) => setTimeout(r, 400));

      const csvNoticeInfo = await page.evaluate(() => {
         const modals = Array.from(document.querySelectorAll(".MuiModal-root"));
         const modal = modals.find((m) => m.textContent && m.textContent.includes("Export Products"));
         const text = modal ? modal.textContent : "";
         return {
            hasCsvNotice: text ? text.includes("CSV Plain Tabular Format") || text.includes("CSV is a raw text tabular format") : false,
            hasHeaderStyle: text ? text.includes("Table Header Styling") : false,
         };
      });

      console.log("  CSV Format-aware state:", csvNoticeInfo);
      assert(csvNoticeInfo.hasCsvNotice, "Informational alert explains CSV does not support visual branding/styling");
      assert(!csvNoticeInfo.hasHeaderStyle, "Visual header/border styling controls are hidden for CSV");

      // Switch back to Excel format
      await page.evaluate(() => {
         const papers = Array.from(document.querySelectorAll(".MuiPaper-root"));
         const excelCard = papers.find((p) => p.textContent && p.textContent.includes("Excel (.xlsx)"));
         if (excelCard) excelCard.click();
      });
      await new Promise((r) => setTimeout(r, 400));

      // Capture screenshot of the modal
      const modalScreenshot = "screenshots/product_advanced_export_modal.png";
      await page.screenshot({ path: modalScreenshot, fullPage: false });
      fs.copyFileSync(modalScreenshot, path.join(brainDir, "product_advanced_export_modal.png"));
      console.log(`  ✓ Screenshot captured: ${modalScreenshot}`);

      // ─────────────────────────────────────────────────────────────────────────────
      // 5. Test Export Execution
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 5. Testing Export Action Execution ---");
      const exportSubmitBtn = await page.evaluate(() => {
         const modals = Array.from(document.querySelectorAll(".MuiModal-root"));
         const modal = modals.find((m) => m.textContent && m.textContent.includes("Export Products"));
         const buttons = modal ? Array.from(modal.querySelectorAll("button")) : [];
         const btn = buttons.find((b) => b.textContent && b.textContent.includes("Export 2 Products"));
         if (btn) {
            btn.click();
            return true;
         }
         return false;
      });
      assert(exportSubmitBtn, "Clicked 'Export 2 Products' button in modal");
      await new Promise((r) => setTimeout(r, 1200));

      const exportSuccess = await page.evaluate(() => {
         const alert = document.querySelector(".MuiAlert-message");
         return alert ? alert.textContent : "";
      });
      console.log("  Export Result Message:", exportSuccess);
      assert(
         exportSuccess.toLowerCase().includes("successfully exported 2 products") ||
         exportSuccess.toLowerCase().includes("success"),
         `Export completed with success feedback: '${exportSuccess}'`
      );

      // Close modal
      await page.evaluate(() => {
         const modals = Array.from(document.querySelectorAll(".MuiModal-root"));
         const modal = modals.find((m) => m.textContent && m.textContent.includes("Export Products"));
         const closeBtns = modal ? Array.from(modal.querySelectorAll("button")) : [];
         const cancelBtn = closeBtns.find((b) => b.textContent && b.textContent.includes("Cancel"));
         if (cancelBtn) cancelBtn.click();
         else {
            const closeX = modal ? modal.querySelector("button svg") : null;
            if (closeX && closeX.parentElement) closeX.parentElement.click();
         }
      });
      await new Promise((r) => setTimeout(r, 500));

      // ─────────────────────────────────────────────────────────────────────────────
      // 6. Test Clearing Selection: Export Icon Disappears and Normal Header Restores
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 6. Testing Selection Clear: Export Icon Disappears ---");
      // Uncheck the selected rows
      await rowCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 400));
      await rowCheckboxes[1].click();
      await new Promise((r) => setTimeout(r, 600));

      const clearedState = await getToolbarElements();
      console.log("  Toolbar after clearing selection:", clearedState);

      assert(clearedState.exportIconButtons.length === 0, "Export icon button completely disappears when selection is cleared");
      assert(clearedState.allExportButtons.length === 0, "No export buttons remain visible in normal toolbar");

      // Verify normal filter inputs are visible and functional
      const searchRestored = await page.$("input[placeholder='Search']");
      const categoryRestored = await page.$("input[placeholder='Select Category']");
      const stockRestored = await page.$("input[placeholder='Select Stock']");

      assert(Boolean(searchRestored), "Search box is restored in normal header");
      assert(Boolean(categoryRestored), "Category Autocomplete is restored in normal header");
      assert(Boolean(stockRestored), "Stock Autocomplete is restored in normal header");

      // ─────────────────────────────────────────────────────────────────────────────
      // 7. Regression Check: User Page
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 7. Verifying User Page Regression Safety ---");
      await page.goto(`${BASE_URL}/admin/user`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));

      const userRowCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (userRowCheckboxes.length > 0) {
         await userRowCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 500));

         const userState = await page.evaluate(() => {
            const footerText = document.querySelector(".MuiDataGrid-selectedRowCount")?.textContent?.trim() || "";
            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent.trim());
            const hasTopSelectedChip = chips.some((c) => c.toLowerCase().includes("selected"));
            return {
               footerText,
               hasTopSelectedChip,
            };
         });
         console.log("  User Page State with 1 selection:", userState);
         assert(userState.footerText.includes("1 row selected"), "User page footer continues to display '1 row selected'");
         assert(!userState.hasTopSelectedChip, "User page top toolbar remains free of selection indicators");
      }

      console.log("\n================================================================================");
      console.log(`  ALL ${passed.length} PRODUCT VERIFICATION CHECKS PASSED!`);
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
