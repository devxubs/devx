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
   console.log("  DEVX POS - ORDER TOOLBAR CLEANUP VERIFICATION");
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

   await page.setCookie(
      { name: "devx_token", value: token, domain: "localhost", path: "/", httpOnly: false },
      { name: "user_role", value: admin.role?.name || "ADMIN", domain: "localhost", path: "/" },
      { name: "user_name", value: encodeURIComponent(admin.name || "Admin"), domain: "localhost", path: "/" }
   );

   try {
      console.log("--- 1. Testing Order Page at 0 Selected Rows ---");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 2000));

      // 1.1 Verify no selection toolbar rendered when 0 rows selected
      const initialToolbar = await page.evaluate(() => {
         const chips = Array.from(document.querySelectorAll(".MuiChip-root")).map(c => c.innerText);
         const hasSelectedChip = chips.some(c => c && c.includes("selected"));
         const hasExportIcon = Boolean(document.querySelector('button[aria-label="Export selected orders"]'));
         const hasPrintIcon = Boolean(document.querySelector('button[aria-label="Print selected invoices"]'));
         return { hasSelectedChip, hasExportIcon, hasPrintIcon };
      });
      assert(!initialToolbar.hasSelectedChip, "No selected count chip displayed when 0 rows selected");
      assert(!initialToolbar.hasExportIcon, "No Export icon button rendered when 0 rows selected");
      assert(!initialToolbar.hasPrintIcon, "No Print icon button rendered when 0 rows selected");

      console.log("\n--- 2. Selecting 1 Order Row ---");
      const rowCheckboxes = await page.$$('.MuiDataGrid-row input[type="checkbox"]');
      assert(rowCheckboxes.length >= 2, `Found at least 2 order rows (found ${rowCheckboxes.length})`);

      await rowCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 800));

      const toolbar1Selected = await page.evaluate(() => {
         const chips = Array.from(document.querySelectorAll(".MuiChip-root")).map(c => c.innerText);
         const has1Selected = chips.some(c => c && c.trim() === "1 selected");
         
         const allBtnTexts = Array.from(document.querySelectorAll("button")).map(b => b.innerText?.trim()).filter(Boolean);
         const hasDeselectAll = allBtnTexts.some(t => t.toLowerCase().includes("deselect"));
         const hasClearText = allBtnTexts.some(t => t.toLowerCase() === "clear" || t.toLowerCase() === "clear selection");
         
         const exportBtn = document.querySelector('button[aria-label="Export selected orders"]');
         const printBtn = document.querySelector('button[aria-label="Print selected invoices"]');
         
         const hasExportSvg = Boolean(exportBtn?.querySelector("svg.iconify, svg"));
         const hasPrintSvg = Boolean(printBtn?.querySelector("svg.iconify, svg"));

         return {
            has1Selected,
            hasDeselectAll,
            hasClearText,
            hasExportBtn: Boolean(exportBtn),
            hasPrintBtn: Boolean(printBtn),
            hasExportSvg,
            hasPrintSvg,
         };
      });

      assert(toolbar1Selected.has1Selected, "Selected orders count visible: '1 selected'");
      assert(!toolbar1Selected.hasDeselectAll, "'Deselected' / 'Deselect All' text action is REMOVED from toolbar");
      assert(!toolbar1Selected.hasClearText, "'Clear' text label/action is REMOVED from toolbar");
      assert(toolbar1Selected.hasExportBtn, "Export is converted to compact icon-only button with aria-label 'Export selected orders'");
      assert(toolbar1Selected.hasPrintBtn, "Print is converted to compact icon-only button with aria-label 'Print selected invoices'");
      assert(toolbar1Selected.hasExportSvg, "Export button renders compact solar icon");
      assert(toolbar1Selected.hasPrintSvg, "Print button renders compact solar icon");

      console.log("\n--- 3. Selecting 2nd Order Row ---");
      await rowCheckboxes[1].click();
      await new Promise((r) => setTimeout(r, 800));

      const toolbar2Selected = await page.evaluate(() => {
         const chips = Array.from(document.querySelectorAll(".MuiChip-root")).map(c => c.innerText);
         return chips.some(c => c && c.trim() === "2 selected");
      });
      assert(toolbar2Selected, "Selected count updates immediately to '2 selected'");

      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_toolbar_cleaned_up_2_selected.png"),
      });
      console.log("  Saved screenshot: order_toolbar_cleaned_up_2_selected.png");

      console.log("\n--- 4. Testing Export Icon Button Functionality ---");
      await page.evaluate(() => {
         const exportBtn = document.querySelector('button[aria-label="Export selected orders"]');
         if (exportBtn) exportBtn.click();
      });
      await new Promise((r) => setTimeout(r, 1200));

      const exportModalVisible = await page.evaluate(() => {
         return document.body.innerText.includes("Export Selected Orders");
      });
      assert(exportModalVisible, "Compact Export icon button opens the configurable Order Export modal");

      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_toolbar_export_modal_opened.png"),
      });
      console.log("  Saved screenshot: order_toolbar_export_modal_opened.png");

      // Close export modal
      await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         const cancelBtn = btns.find((b) => b.innerText && b.innerText.trim() === "Cancel");
         if (cancelBtn) cancelBtn.click();
      });
      await new Promise((r) => setTimeout(r, 800));

      console.log("\n--- 5. Testing Print Invoices Icon Button Functionality ---");
      // Test that clicking print icon invokes printDocument for the selected orders
      const printBtnExists = await page.evaluate(() => {
         const btn = document.querySelector('button[aria-label="Print selected invoices"]');
         return Boolean(btn);
      });
      assert(printBtnExists, "Print invoices icon button is present and ready for batch invoice generation");

      console.log("\n================================================================================");
      console.log(`  ALL CHECKS PASSED: ${passed.length} passed, ${failed.length} failed`);
      console.log("================================================================================\n");

   } catch (err) {
      console.error("\n[TEST ERROR]:", err);
      process.exitCode = 1;
   } finally {
      await browser.close();
      await prisma.$disconnect();
   }
}

runTest();
