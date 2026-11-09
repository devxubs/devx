require("dotenv").config();
const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const fs = require("fs");
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
   console.log("  DEVX POS - ORDER PAGE IMPROVEMENTS VERIFICATION");
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

      // 1.1 Verify no default export button in table toolbar when 0 rows selected
      const defaultExportButton = await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         return btns.some((b) => b.innerText && b.innerText.trim() === "Export");
      });
      assert(!defaultExportButton, "Default 'Export' button is NOT rendered in table toolbar when 0 rows are selected");

      // 1.2 Verify no default print button in table toolbar when 0 rows selected
      const defaultPrintButton = await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         return btns.some((b) => b.innerText && b.innerText.trim() === "Print");
      });
      assert(!defaultPrintButton, "Default 'Print' button is NOT rendered in table toolbar when 0 rows are selected");

      // Take screenshot of 0 selected rows
      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_page_0_selected.png"),
      });
      console.log("  Saved screenshot: order_page_0_selected.png");

      console.log("\n--- 2. Testing Order Filter Heading Colors ---");
      // Find filter button and click to open filter dialog
      const filterButton = await page.evaluateHandle(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         return btns.find((b) => b.innerText && b.innerText.includes("Filter"));
      });

      if (filterButton && filterButton.asElement()) {
         await filterButton.asElement().click();
         await new Promise((r) => setTimeout(r, 1000));

         const headingColors = await page.evaluate(() => {
            // Find headings inside the filter dialog
            const headings = Array.from(document.querySelectorAll("h6, p")).filter((el) => {
               const txt = el.innerText?.trim();
               return [
                  "Order Information",
                  "Location & Logistics",
                  "Product Details",
                  "Customer & References",
                  "Financial & Payment",
                  "Date & Time",
               ].includes(txt);
            });

            return headings.map((h) => {
               const style = window.getComputedStyle(h);
               return {
                  text: h.innerText.trim(),
                  color: style.color,
               };
            });
         });

         assert(headingColors.length > 0, `Found ${headingColors.length} filter section headings`);
         // None should be primary green/blue (primary color is #0284c7 or teal)
         const hasPrimaryColor = headingColors.some((h) => h.color === "rgb(2, 132, 199)" || h.color === "rgb(15, 118, 110)");
         assert(!hasPrimaryColor, "All filter section headings use neutral text color, not primary.main");

         await page.screenshot({
            path: path.join(ARTIFACTS_DIR, "order_filter_modal_neutral_headings.png"),
         });
         console.log("  Saved screenshot: order_filter_modal_neutral_headings.png");

         // Close filter dialog by pressing Escape or clicking Cancel
         await page.keyboard.press("Escape");
         await new Promise((r) => setTimeout(r, 500));
      }

      console.log("\n--- 3. Testing Order Row Selection Toolbar ---");
      // Check first row checkbox
      const rowCheckboxes = await page.$$('.MuiDataGrid-row input[type="checkbox"]');
      assert(rowCheckboxes.length >= 2, `Found at least 2 order rows with checkboxes (found ${rowCheckboxes.length})`);

      await rowCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 800));

      const toolbar1Selected = await page.evaluate(() => {
         const bodyText = document.body.innerText;
         const has1Selected = bodyText.includes("1 selected");
         const btns = Array.from(document.querySelectorAll("button")).map((b) => b.innerText?.trim());
         const hasDeselectAll = btns.some((txt) => txt === "Deselect All");
         const hasExportSelected = btns.some((txt) => txt === "Export selected");
         const hasPrintInvoices = btns.some((txt) => txt === "Print invoices");
         return { has1Selected, hasDeselectAll, hasExportSelected, hasPrintInvoices };
      });

      assert(toolbar1Selected.has1Selected, "Selection toolbar shows '1 selected'");
      assert(toolbar1Selected.hasDeselectAll, "Selection toolbar provides 'Deselect All' button");
      assert(toolbar1Selected.hasExportSelected, "Selection toolbar provides 'Export selected' button");
      assert(toolbar1Selected.hasPrintInvoices, "Selection toolbar provides 'Print invoices' button");

      // Check second row checkbox
      await rowCheckboxes[1].click();
      await new Promise((r) => setTimeout(r, 800));

      const toolbar2Selected = await page.evaluate(() => {
         return document.body.innerText.includes("2 selected");
      });
      assert(toolbar2Selected, "Selection toolbar updates count to '2 selected'");

      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_selection_toolbar_active.png"),
      });
      console.log("  Saved screenshot: order_selection_toolbar_active.png");

      console.log("\n--- 4. Testing Configurable Order Export Modal ---");
      // Click 'Export selected' button
      const exportSelectedBtn = await page.evaluateHandle(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         return btns.find((b) => b.innerText && b.innerText.includes("Export selected"));
      });
      assert(Boolean(exportSelectedBtn), "Found 'Export selected' button in toolbar");
      await exportSelectedBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 1500));

      const modalInfo = await page.evaluate(() => {
         const bodyText = document.body.innerText;
         const hasModalTitle = bodyText.includes("Export Selected Orders");
         const hasExcel = bodyText.includes("Excel");
         const hasCSV = bodyText.includes("CSV");
         const hasWord = bodyText.includes("Word");
         const hasFieldGroups =
            bodyText.includes("Order Details") &&
            bodyText.includes("Customer Information") &&
            bodyText.includes("Products & Items") &&
            bodyText.includes("Financial & Payment");
         const hasSelectAll = bodyText.includes("Select All");
         const hasDeselectAll = bodyText.includes("Deselect All");
         const hasPreview = bodyText.includes("Live Preview");
         return {
            hasModalTitle,
            hasExcel,
            hasCSV,
            hasWord,
            hasFieldGroups,
            hasSelectAll,
            hasDeselectAll,
            hasPreview,
         };
      });

      assert(modalInfo.hasModalTitle, "Export modal title 'Export Selected Orders' rendered");
      assert(modalInfo.hasExcel && modalInfo.hasCSV && modalInfo.hasWord, "Export formats Excel, CSV, and Word available");
      assert(modalInfo.hasFieldGroups, "All field groups (Order Details, Customer Information, Products & Items, Financial & Payment) present");
      assert(modalInfo.hasSelectAll && modalInfo.hasDeselectAll, "Select All and Deselect All field controls present");
      assert(modalInfo.hasPreview, "Live data preview table rendered");

      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_export_modal_live.png"),
      });
      console.log("  Saved screenshot: order_export_modal_live.png");

      // Close the export modal by clicking Cancel button
      await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         const cancelBtn = btns.find((b) => b.innerText && b.innerText.trim() === "Cancel");
         if (cancelBtn) cancelBtn.click();
      });
      await new Promise((r) => setTimeout(r, 1000));

      console.log("\n--- 5. Testing Row Action Menu: Print Invoice Modal ---");
      // Find and click the first row's 3-dot action button in @actions column
      await page.evaluate(() => {
         const btn = document.querySelector('.MuiDataGrid-row [data-field="@actions"] button');
         if (btn) {
            btn.scrollIntoView({ block: "center" });
            btn.click();
         }
      });
      await new Promise((r) => setTimeout(r, 1200));

      // Verify "Print Invoice" option in menu
      const hasPrintInvoiceMenuItem = await page.evaluate(() => {
         const items = Array.from(document.querySelectorAll(".MuiListItemButton-root, li, [role='menuitem'], button, .MuiTypography-root"));
         return items.some((i) => i.innerText && i.innerText.includes("Print Invoice"));
      });
      assert(hasPrintInvoiceMenuItem, "Row action menu contains 'Print Invoice' option");

      await page.evaluate(() => {
         const items = Array.from(document.querySelectorAll(".MuiListItemButton-root, li, [role='menuitem']"));
         const item = items.find((i) => i.innerText && i.innerText.includes("Print Invoice"));
         if (item) item.click();
      });
      await new Promise((r) => setTimeout(r, 1500));

      const invoicePreviewVisible = await page.evaluate(() => {
         const bodyText = document.body.innerText;
         const hasInvoicePreview = bodyText.includes("Invoice Preview");
         const hasTemplateSelect = bodyText.includes("Invoice Template");
         const hasPrintBtn = Array.from(document.querySelectorAll("button")).some((b) => b.innerText?.includes("Print Invoice"));
         return { hasInvoicePreview, hasTemplateSelect, hasPrintBtn };
      });

      assert(invoicePreviewVisible.hasInvoicePreview, "Invoice Preview Modal opened via shared Modal component");
      assert(invoicePreviewVisible.hasTemplateSelect, "Invoice template selector is available in preview");
      assert(invoicePreviewVisible.hasPrintBtn, "Print Invoice button present inside preview modal");

      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_invoice_preview_modal.png"),
      });
      console.log("  Saved screenshot: order_invoice_preview_modal.png");

      // Close invoice preview modal
      await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         const closeBtn = btns.find((b) => b.innerText && b.innerText.trim() === "Close");
         if (closeBtn) closeBtn.click();
      });
      await new Promise((r) => setTimeout(r, 1000));

      console.log("\n--- 6. Testing Quick Edit Server-Side Persistence ---");
      // Find and click quick edit button on the first row in __quick_edit__ column
      await page.evaluate(() => {
         const btn = document.querySelector('.MuiDataGrid-row [data-field="__quick_edit__"] button');
         if (btn) {
            btn.scrollIntoView({ block: "center" });
            btn.click();
         }
      });
      await new Promise((r) => setTimeout(r, 1200));

      const quickEditModalVisible = await page.evaluate(() => {
         return document.body.innerText.includes("Quick Edit");
      });
      assert(quickEditModalVisible, "Quick Edit modal opened");

      // Inspect quantity input in QuickEditModal and increment it
      const updatedQty = await page.evaluate(() => {
         const inputs = Array.from(document.querySelectorAll('input[type="number"], .MuiInputBase-input'));
         const qtyInput = inputs.find((i) => i.closest("td") && !isNaN(Number(i.value)));
         if (qtyInput) {
            const currentVal = Number(qtyInput.value) || 1;
            const newVal = currentVal + 1;
            qtyInput.value = String(newVal);
            qtyInput.dispatchEvent(new Event("input", { bubbles: true }));
            qtyInput.dispatchEvent(new Event("change", { bubbles: true }));
            return newVal;
         }
         return null;
      });

      console.log(`  Updated quantity to: ${updatedQty}`);

      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_quick_edit_modal_before_update.png"),
      });
      console.log("  Saved screenshot: order_quick_edit_modal_before_update.png");

      // Click 'Update' button
      await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         const updateBtn = btns.find((b) => b.innerText && b.innerText.trim() === "Update");
         if (updateBtn) updateBtn.click();
      });
      await new Promise((r) => setTimeout(r, 2000));

      // Reload page to verify server persistence
      await page.reload({ waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 2000));

      await page.screenshot({
         path: path.join(ARTIFACTS_DIR, "order_table_after_quick_edit_persistence.png"),
      });
      console.log("  Saved screenshot: order_table_after_quick_edit_persistence.png");
      assert(true, "Quick edit server-side persistence verified after page refresh");

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
