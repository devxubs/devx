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
   console.log("  DEVX POS - 8 PAGES REMOVE SELECTION ACTIONS VERIFICATION");
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
      const targetPages = [
         { name: "Category", path: "/admin/categories", hasBulkExportOrPrint: false },
         { name: "Unit", path: "/admin/unit", hasBulkExportOrPrint: false },
         { name: "Order", path: "/admin/order", hasBulkExportOrPrint: true },
         { name: "Customers", path: "/admin/customers", hasBulkExportOrPrint: true },
         { name: "Suppliers", path: "/admin/suppliers", hasBulkExportOrPrint: true },
         { name: "Purchase", path: "/admin/purchase", hasBulkExportOrPrint: true },
         { name: "Expenses", path: "/admin/expense", hasBulkExportOrPrint: true },
         { name: "Assets", path: "/admin/assets", hasBulkExportOrPrint: true },
      ];

      for (const target of targetPages) {
         console.log(`\n--- Testing ${target.name} Page (${target.path}) ---`);
         await page.goto(`${BASE_URL}${target.path}`, { waitUntil: "networkidle2", timeout: 30000 });
         await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
         await new Promise((r) => setTimeout(r, 1000));

         // 1. Initial State
         const searchInput = await page.$("input[placeholder='Search']");
         assert(Boolean(searchInput), `${target.name}: Search input is present in initial toolbar`);

         const initialToolbar = await page.evaluate(() => {
            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent || "");
            const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
               text: (b.textContent || "").trim(),
               ariaLabel: b.getAttribute("aria-label"),
            }));
            return {
               hasSelectedBadge: chips.some((t) => t.toLowerCase().includes("selected")),
               hasDeselectAll: buttons.some((b) => b.text.toLowerCase().includes("deselect")),
               hasClearIcon: buttons.some((b) => (b.ariaLabel || "").toLowerCase().includes("clear selection")),
            };
         });
         assert(!initialToolbar.hasSelectedBadge, `${target.name}: Initial toolbar has NO 'selected' badge`);
         assert(!initialToolbar.hasDeselectAll, `${target.name}: Initial toolbar has NO 'Deselect All' button`);
         assert(!initialToolbar.hasClearIcon, `${target.name}: Initial toolbar has NO 'Clear selection' icon`);

         // 2. Select Row(s)
         const checkboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
         assert(checkboxes.length > 0, `${target.name}: Table has row checkboxes for selection`);

         await checkboxes[0].click();
         await new Promise((r) => setTimeout(r, 600));

         const selectedToolbar = await page.evaluate(() => {
            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent || "");
            const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
               text: (b.textContent || "").trim(),
               ariaLabel: b.getAttribute("aria-label"),
               title: b.getAttribute("title"),
            }));
            return {
               hasSelectedBadge: chips.some((t) => t.toLowerCase().includes("selected")),
               hasDeselectAll: buttons.some((b) => b.text.toLowerCase().includes("deselect")),
               hasClearIcon: buttons.some((b) =>
                  (b.ariaLabel || "").toLowerCase().includes("clear selection") ||
                  (b.title || "").toLowerCase().includes("clear selection")
               ),
               hasExportSelected: buttons.some((b) => b.text.toLowerCase().includes("export selected")),
               hasPrintSelected: buttons.some((b) => b.text.toLowerCase().includes("print selected")),
            };
         });

         assert(!selectedToolbar.hasSelectedBadge, `${target.name}: 'Selected' indicator removed (NO selected badge)`);
         assert(!selectedToolbar.hasDeselectAll, `${target.name}: 'Deselected' indicator removed (NO Deselect All button)`);
         assert(!selectedToolbar.hasClearIcon, `${target.name}: 'Clear' selection action removed (NO Clear icon)`);

         if (target.hasBulkExportOrPrint) {
            assert(
               selectedToolbar.hasExportSelected || selectedToolbar.hasPrintSelected,
               `${target.name}: Bulk Export/Print preserved in selection toolbar`
            );
         } else {
            assert(
               !selectedToolbar.hasExportSelected && !selectedToolbar.hasPrintSelected,
               `${target.name}: Exclusive selection toolbar completely removed (Search toolbar preserved)`
            );
         }

         // Uncheck row
         await checkboxes[0].click();
         await new Promise((r) => setTimeout(r, 400));
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // SCOPE RESTRICTIONS VERIFICATION: Product and User remain untouched
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- Testing Scope Restrictions: Product & User Selection Unchanged ---");

      // Product Page: Retains custom selection export button
      await page.goto(`${BASE_URL}/admin/product`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));
      const pCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (pCheckboxes.length > 0) {
         await pCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 600));
         const prodExportBtn = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            return btns.some((b) => (b.getAttribute("aria-label") || "").includes("Export selected") || b.innerHTML.includes("download"));
         });
         assert(prodExportBtn, "Product: Custom selection export button retained");
      }

      // User Page: Retains hidden toolbar indicators
      await page.goto(`${BASE_URL}/admin/user`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));
      const uCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (uCheckboxes.length > 0) {
         await uCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 600));
         const userToolbar = await page.evaluate(() => {
            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent || "");
            const buttons = Array.from(document.querySelectorAll("button")).map((b) => (b.textContent || "").trim());
            return {
               hasSelectedBadge: chips.some((t) => t.includes("selected")),
               hasDeselectAll: buttons.some((b) => b === "Deselect All"),
            };
         });
         assert(!userToolbar.hasSelectedBadge, "User: Selection indicators remain hidden as required");
         assert(!userToolbar.hasDeselectAll, "User: Deselect All remains hidden as required");
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
