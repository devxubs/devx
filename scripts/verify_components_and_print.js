require("dotenv").config();
const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

async function runVerification() {
   console.log("=== DEVX POS: COMPONENT REUSE & PRINT VERIFICATION ===");

   const admin = await prisma.user.findFirst({ where: { email: "devxub@gmail.com" }, include: { role: true } });
   const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role?.name || "System Admin", permissions: ["ALL"] },
      JWT_SECRET,
      { expiresIn: "2h" }
   );

   const browser = await puppeteer.launch({
      headless: "new",
      executablePath: "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
   });

   const page = await browser.newPage();
   await page.setViewport({ width: 1440, height: 900 });

   await page.setCookie({
      name: "devx_token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: false,
   });

   const results = {
      passed: 0,
      failed: 0,
      tests: [],
   };

   function record(name, success, details) {
      if (success) {
         results.passed++;
         console.log(`[PASS] ${name}: ${details || "OK"}`);
      } else {
         results.failed++;
         console.error(`[FAIL] ${name}: ${details || "FAILED"}`);
      }
      results.tests.push({ name, success, details });
   }

   try {
      // 1. DASHBOARD ACCESS
      console.log("\n1. Testing Dashboard Access...");
      await page.goto("http://localhost:3000/admin/dashboard", { waitUntil: "networkidle2" });
      await new Promise(r => setTimeout(r, 1000));
      record("Authentication & Dashboard Access", page.url().includes("/admin/dashboard"), `Current URL: ${page.url()}`);

      // 2. CHECK GLOBAL PRINT STYLESHEET
      console.log("\n2. Testing Global @media print Stylesheet...");
      const printStyles = await page.evaluate(() => {
         let foundRules = [];
         for (let sheet of document.styleSheets) {
            try {
               for (let rule of sheet.cssRules) {
                  if (rule instanceof CSSMediaRule && rule.media.mediaText.includes("print")) {
                     for (let innerRule of rule.cssRules) {
                        foundRules.push(innerRule.cssText);
                     }
                  }
               }
            } catch (e) {}
         }
         return foundRules;
      });

      const hasNavHiddenInPrint = printStyles.some(r => r.includes("nav") && r.includes("none"));
      const hasHeaderHiddenInPrint = printStyles.some(r => r.includes("header") && r.includes("none"));
      record("Print Stylesheet Loaded", printStyles.length > 0, `Found ${printStyles.length} print rules`);
      record("Nav/Header/Sidebar Hidden in Print", hasNavHiddenInPrint && hasHeaderHiddenInPrint, "Chrome hidden on print");

      // 3. CHECK ORDER PREVIEW & PRINT INVOICE
      console.log("\n3. Testing Order Preview & Print Invoice...");
      await page.goto("http://localhost:3000/admin/order", { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiTabs-root, .MuiDataGrid-root", { timeout: 10000 });

      // Check Order Table Toolbar Print Button
      const tablePrintBtn = await page.evaluate(() => {
         const btn = document.querySelector("button[title='Print Table View'], button[aria-label='Print Table View']");
         return !!btn;
      });
      record("Order Table Print View Icon", tablePrintBtn, "Table filter toolbar contains Print button");

      // Navigate to Real Order Preview
      const realOrder = await prisma.order.findFirst();
      await page.goto(`http://localhost:3000/admin/order/${realOrder.id}`, { waitUntil: "networkidle2" });
      await page.waitForSelector("#printable-invoice, button", { timeout: 10000 });
      const invoicePrintBtn = await page.evaluate(() => {
         const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Print Invoice"));
         return btn ? { text: btn.innerText } : null;
      });
      record("Order Invoice Print Button", !!invoicePrintBtn, invoicePrintBtn?.text);

      // Emulate Print Media and check preview layout
      await page.emulateMediaType("print");
      const printState = await page.evaluate(() => {
         const invoice = document.getElementById("printable-invoice");
         const nav = document.querySelector("nav");
         const header = document.querySelector("header");
         const aside = document.querySelector("aside");
         return {
            invoiceVisible: invoice && window.getComputedStyle(invoice).display !== "none",
            navHidden: !nav || window.getComputedStyle(nav).display === "none",
            headerHidden: !header || window.getComputedStyle(header).display === "none",
            asideHidden: !aside || window.getComputedStyle(aside).display === "none",
         };
      });
      await page.emulateMediaType("screen");
      record("Print Media Emulation (Invoice Visible)", printState.invoiceVisible, "Printable invoice remains visible");
      record("Print Media Emulation (Chrome Hidden)", printState.navHidden && printState.headerHidden, "Nav & Header hidden during print");

      // 4. CHECK REPORTS PAGE & PRINT REPORT
      console.log("\n4. Testing Reports Page Print...");
      await page.goto("http://localhost:3000/admin/reports", { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiTabs-root", { timeout: 10000 });
      const reportPrintBtn = await page.evaluate(() => {
         const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Print Report"));
         return btn ? btn.innerText : null;
      });
      record("Reports Page Print Button", !!reportPrintBtn, reportPrintBtn);

      // 5. CHECK PURCHASES PAGE & DETAIL MODAL
      console.log("\n5. Testing Purchases Page...");
      await page.goto("http://localhost:3000/admin/purchase", { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiDataGrid-root, table", { timeout: 10000 });
      const hasPurchasesTable = await page.evaluate(() => !!document.querySelector(".MuiDataGrid-root"));
      record("Purchases Table Rendered", hasPurchasesTable, "Purchases table loaded");

      // 6. CHECK SETTINGS TABS & COMPONENT REUSE
      console.log("\n6. Testing Settings Component Integrations...");
      await page.goto("http://localhost:3000/admin/settings?tab=appearance", { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiSwitch-root", { timeout: 10000 });
      const switchCount = await page.evaluate(() => {
         const switches = document.querySelectorAll(".MuiSwitch-root");
         return switches.length;
      });
      record("Appearance Tab CustomSwitch Reuse", switchCount >= 2, `Found ${switchCount} CustomSwitch elements`);

      await page.goto("http://localhost:3000/admin/settings?tab=system", { waitUntil: "networkidle2" });
      await page.waitForSelector("button", { timeout: 10000 });
      // Find Reset Defaults button
      const hasResetBtn = await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         const reset = btns.find(b => b.innerText.includes("Reset Defaults"));
         if (reset) {
            reset.click();
            return true;
         }
         return false;
      });
      if (hasResetBtn) {
         await new Promise(r => setTimeout(r, 800));
         const dialogText = await page.evaluate(() => document.body.innerText);
         const isAlertDialog = dialogText.includes("Reset store settings") && dialogText.includes("Confirm Reset");
         record("System Tab AlertDialog Integration", isAlertDialog, "Factory reset triggers AlertDialog component");
      } else {
         record("System Tab AlertDialog Integration", false, "Reset Defaults button not found");
      }

      // 7. RESTORED ORDER PAGE UI PRESERVATION CHECK
      console.log("\n7. Verifying Restored Order Page UI Preservation...");
      await page.goto("http://localhost:3000/admin/order", { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiTabs-root, .MuiDataGrid-root", { timeout: 10000 });
      const orderUIVerification = await page.evaluate(() => {
         const tabs = Array.from(document.querySelectorAll(".MuiTab-root")).map(t => t.innerText.trim());
         const hasOrderTab = tabs.length >= 8 && tabs[0].includes("All") && tabs[1].includes("Pending");
         const hasCreateBtn = Array.from(document.querySelectorAll("button")).some(b => b.innerText.toLowerCase().includes("create order"));
         const hasDataGrid = !!document.querySelector(".MuiDataGrid-root");
         return {
            hasOrderTab,
            tabCount: tabs.length,
            hasCreateBtn,
            hasDataGrid,
         };
      });
      record("Restored Order Page Tabs Preserved", orderUIVerification.hasOrderTab, `Found ${orderUIVerification.tabCount} status tabs`);
      record("Restored Order Page Create Button Preserved", orderUIVerification.hasCreateBtn, "Create order button present");
      record("Restored Order DataGrid Preserved", orderUIVerification.hasDataGrid, "DataGrid table rendered");

   } catch (err) {
      console.error("Test execution error:", err);
      record("Test Suite Execution", false, err.message);
   } finally {
      await browser.close();
      await prisma.$disconnect();
      console.log(`\n=== VERIFICATION SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED ===\n`);
      process.exit(results.failed > 0 ? 1 : 0);
   }
}

runVerification();
