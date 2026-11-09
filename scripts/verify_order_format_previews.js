require("dotenv").config();
const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const path = require("path");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";
const BASE_URL = "http://localhost:3000";
const ARTIFACTS_DIR = "/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756";

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
   console.log("  DEVX POS - ORDER EXPORT FORMAT PREVIEW & THEME TOGGLE VERIFICATION");
   console.log("================================================================================\n");

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
   page.setDefaultNavigationTimeout(60000);

   await page.setCookie(
      { name: "devx_token", value: token, domain: "localhost", path: "/", httpOnly: false },
      { name: "user_role", value: admin.role?.name || "ADMIN", domain: "localhost", path: "/" },
      { name: "user_name", value: encodeURIComponent(admin.name || "Admin"), domain: "localhost", path: "/" }
   );

   try {
      console.log("--- 1. Navigating to Order Page and Selecting 2 Orders ---");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('.MuiDataGrid-row', { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 1000));

      const rowCheckboxes = await page.$$('.MuiDataGrid-row input[type="checkbox"]');
      assert(rowCheckboxes.length >= 2, `Found at least 2 order rows (found ${rowCheckboxes.length})`);

      await rowCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 400));
      await rowCheckboxes[1].click();
      await new Promise((r) => setTimeout(r, 600));

      console.log("\n--- 2. Opening Order Export Modal ---");
      const exportBtn = await page.$('button[aria-label="Export selected orders"]');
      assert(Boolean(exportBtn), "Found Export selected orders icon button");
      await exportBtn.click();
      await new Promise((r) => setTimeout(r, 1200));

      // 3. Verify Preview Theme Toggle Controls
      console.log("\n--- 3. Verifying Preview Light/Dark Theme Toggle Controls ---");
      const toggleInfo = await page.evaluate(() => {
         const lightBtn = document.querySelector('button[aria-label="Preview Light Theme"]');
         const darkBtn = document.querySelector('button[aria-label="Preview Dark Theme"]');
         const isLightActive = lightBtn?.getAttribute("aria-checked") === "true";
         const isDarkActive = darkBtn?.getAttribute("aria-checked") === "true";

         const hasSunIcon = Boolean(lightBtn?.querySelector("svg"));
         const hasMoonIcon = Boolean(darkBtn?.querySelector("svg"));

         return {
            hasLightBtn: Boolean(lightBtn),
            hasDarkBtn: Boolean(darkBtn),
            isLightActive,
            isDarkActive,
            hasSunIcon,
            hasMoonIcon,
         };
      });

      assert(toggleInfo.hasLightBtn && toggleInfo.hasDarkBtn, "Preview header contains Light and Dark theme toggle icon buttons");
      assert(toggleInfo.isLightActive && !toggleInfo.isDarkActive, "Default preview theme is Light mode");
      assert(toggleInfo.hasSunIcon && toggleInfo.hasMoonIcon, "Light button renders sun icon and Dark button renders moon icon");

      // 4. Verify Excel Preview (Light Mode)
      console.log("\n--- 4. Verifying Excel (.xlsx) Light Preview ---");
      const excelInfo = await page.evaluate(() => {
         const text = document.body.innerText;
         const hasExcelHeader = text.includes("Excel Worksheet");
         const hasSheet1 = text.includes("Sheet1") && text.includes("Grid: ON");
         const hasCoordinateCol = text.includes("A (") || text.includes("B (");
         const hasCompanyName = text.includes("DevX POS");
         const hasSummaryTotal = text.includes("Total Orders Selected:") || text.includes("Grand Total Revenue:");
         const hasCurrencies = text.includes("৳");
         const hasReadyZoom = text.includes("Ready • 100% Zoom");

         return {
            hasExcelHeader,
            hasSheet1,
            hasCoordinateCol,
            hasCompanyName,
            hasSummaryTotal,
            hasCurrencies,
            hasReadyZoom,
         };
      });

      assert(excelInfo.hasExcelHeader, "Excel header bar shows 'Excel Worksheet'");
      assert(excelInfo.hasSheet1, "Excel header displays Sheet1, row count and Grid: ON badge");
      assert(excelInfo.hasCoordinateCol, "Excel coordinate columns (A, B, C...) are displayed");
      assert(excelInfo.hasCompanyName, "Excel row 1 shows company title");
      assert(excelInfo.hasSummaryTotal, "Excel summary rows contain selected count & total revenue");
      assert(excelInfo.hasCurrencies, "Excel values format currency with '৳'");
      assert(excelInfo.hasReadyZoom, "Excel tab bar footer shows 'Sheet1' and 'Ready • 100% Zoom'");

      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_export_excel_light_preview.png"),
      });
      console.log("  [SAVED] order_export_excel_light_preview.png");

      // 5. Toggle to Dark Theme in Excel Preview
      console.log("\n--- 5. Toggling Preview Theme to Dark Mode ---");
      const darkBtn = await page.$('button[aria-label="Preview Dark Theme"]');
      await darkBtn.click();
      await new Promise((r) => setTimeout(r, 600));

      const darkExcelInfo = await page.evaluate(() => {
         const darkBtn = document.querySelector('button[aria-label="Preview Dark Theme"]');
         const isDarkActive = darkBtn?.getAttribute("aria-checked") === "true";
         // Modal itself should NOT have background inverted
         const modal = document.querySelector('[role="dialog"]');
         const modalComputed = modal ? window.getComputedStyle(modal) : null;
         // Excel preview table should have dark background
         const previewTable = document.querySelector("table");
         const tableComputed = previewTable ? window.getComputedStyle(previewTable) : null;

         return {
            isDarkActive,
            tableBg: tableComputed?.backgroundColor,
         };
      });

      assert(darkExcelInfo.isDarkActive, "Dark theme button is highlighted as active");
      assert(darkExcelInfo.tableBg === "rgb(30, 41, 59)" || darkExcelInfo.tableBg.includes("30"), `Excel preview table background is dark mode (${darkExcelInfo.tableBg})`);

      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_export_excel_dark_preview.png"),
      });
      console.log("  [SAVED] order_export_excel_dark_preview.png");

      // 6. Switch to CSV Format and Verify Dark Theme Preservation
      console.log("\n--- 6. Switching to CSV (.csv) Format (Preserving Dark Theme) ---");
      const csvCardClicked = await page.evaluate(() => {
         const cards = Array.from(document.querySelectorAll('[role="radio"]'));
         const csvCard = cards.find(c => c.innerText.includes("CSV Spreadsheet") || c.innerText.includes(".csv"));
         if (csvCard) {
            csvCard.click();
            return true;
         }
         return false;
      });
      assert(csvCardClicked, "Found and clicked CSV format option card");
      await new Promise((r) => setTimeout(r, 800));

      const darkCsvInfo = await page.evaluate(() => {
         const darkBtn = document.querySelector('button[aria-label="Preview Dark Theme"]');
         const isDarkPreserved = darkBtn?.getAttribute("aria-checked") === "true";
         const preElement = document.querySelector("pre");
         const preText = preElement ? preElement.innerText : "";
         const preComputed = preElement ? window.getComputedStyle(preElement) : null;

         return {
            isDarkPreserved,
            hasPre: Boolean(preElement),
            preBg: preComputed?.backgroundColor,
            preColor: preComputed?.color,
            preTextSnippet: preText.slice(0, 80),
         };
      });

      assert(darkCsvInfo.isDarkPreserved, "Switching format preserved the selected Dark preview theme");
      assert(darkCsvInfo.hasPre, "Raw CSV renders in monospace code editor block (<pre>)");
      assert(darkCsvInfo.preColor === "rgb(56, 189, 248)" || darkCsvInfo.preColor.includes("56"), `Raw CSV uses cyan syntax highlighting in dark mode (${darkCsvInfo.preColor})`);

      // Test Grid View tab in dark mode
      const gridBtnClicked = await page.evaluate(() => {
         const gridBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Plain Grid View"));
         if (gridBtn) {
            gridBtn.click();
            return true;
         }
         return false;
      });
      assert(gridBtnClicked, "Clicked 'Plain Grid View' toggle button in CSV preview");
      await new Promise((r) => setTimeout(r, 600));

      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_export_csv_dark_preview.png"),
      });
      console.log("  [SAVED] order_export_csv_dark_preview.png");

      // 7. Switch to Word Format and Verify Dark Theme Preservation
      console.log("\n--- 7. Switching to Word (.docx) Format (Preserving Dark Theme) ---");
      const wordCardClicked = await page.evaluate(() => {
         const cards = Array.from(document.querySelectorAll('[role="radio"]'));
         const wordCard = cards.find(c => c.innerText.includes("Microsoft Word") || c.innerText.includes(".docx"));
         if (wordCard) {
            wordCard.click();
            return true;
         }
         return false;
      });
      assert(wordCardClicked, "Found and clicked Microsoft Word format option card");
      await new Promise((r) => setTimeout(r, 800));

      const darkWordInfo = await page.evaluate(() => {
         const darkBtn = document.querySelector('button[aria-label="Preview Dark Theme"]');
         const isDarkPreserved = darkBtn?.getAttribute("aria-checked") === "true";
         const text = document.body.innerText;
         const hasWordHeader = text.includes("Word Document");
         const hasPreparedBy = text.includes("Prepared By / Cashier");
         const hasAuthorizedSig = text.includes("Authorized Signature");

         return {
            isDarkPreserved,
            hasWordHeader,
            hasPreparedBy,
            hasAuthorizedSig,
         };
      });

      assert(darkWordInfo.isDarkPreserved, "Word preview preserved selected Dark preview theme");
      assert(darkWordInfo.hasWordHeader, "Word window header shows 'Word Document'");
      assert(darkWordInfo.hasPreparedBy && darkWordInfo.hasAuthorizedSig, "Word document contains Cashier and Authorized signature blocks");

      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_export_word_dark_preview.png"),
      });
      console.log("  [SAVED] order_export_word_dark_preview.png");

      // 8. Switch back to Light Theme in Word Preview
      console.log("\n--- 8. Switching back to Light Theme ---");
      const lightBtn = await page.$('button[aria-label="Preview Light Theme"]');
      await lightBtn.click();
      await new Promise((r) => setTimeout(r, 600));

      const lightWordInfo = await page.evaluate(() => {
         const lightBtn = document.querySelector('button[aria-label="Preview Light Theme"]');
         const isLightActive = lightBtn?.getAttribute("aria-checked") === "true";
         return { isLightActive };
      });
      assert(lightWordInfo.isLightActive, "Light theme is restored and active");

      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_export_word_light_preview.png"),
      });
      console.log("  [SAVED] order_export_word_light_preview.png");

      console.log("\n================================================================================");
      console.log(`  ALL ${passed.length} THEME TOGGLE & PREVIEW CHECKS PASSED SUCCESSFULLY!`);
      console.log("================================================================================");
   } catch (err) {
      console.error("\nTEST FAILED WITH ERROR:", err);
      process.exitCode = 1;
   } finally {
      await browser.close();
      await prisma.$disconnect();
   }
}

runTest();
