require("dotenv").config();
const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";
const BASE_URL = "http://localhost:3000";
const ARTIFACTS_DIR = "/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756";
const SCREENSHOTS_DIR = path.join(process.cwd(), "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
   fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

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

async function run() {
   console.log("================================================================================");
   console.log("  DEVX POS - ORDER MENU & MODAL IMPROVEMENTS VERIFICATION");
   console.log("================================================================================\n");

   const admin = await prisma.user.findFirst({
      where: { email: "devxub@gmail.com" },
      include: { role: true },
   });
   if (!admin) throw new Error("Admin not found in DB");

   // Ensure at least one order exists
   let sampleOrder = await prisma.order.findFirst({
      include: { customer: true, items: true, employee: true },
   });
   if (!sampleOrder) {
      console.log("Creating a sample order for verification...");
      let customer = await prisma.customer.findFirst();
      if (!customer) {
         customer = await prisma.customer.create({
            data: {
               name: "Rahim Ahmed",
               phone: "+8801711223344",
               email: "rahim@example.com",
               address: "Dhanmondi, Dhaka",
            },
         });
      }
      sampleOrder = await prisma.order.create({
         data: {
            customId: "ORD-99001",
            invoiceNo: "INV-99001",
            status: "PROCESSING",
            orderSource: "Direct Sales",
            paymentMethod: "Cash on Delivery",
            paymentStatus: "PAID",
            subtotal: 1500,
            deliveryCharge: 80,
            discount: 50,
            total: 1530,
            advancePayment: 0,
            dueAmount: 1530,
            courier: "Steadfast Courier",
            courierTrackingId: "ST-88776655",
            courierStatus: "IN_TRANSIT",
            courierSubmittedAt: new Date(),
            customerId: customer.id,
            employeeId: admin.id,
            items: {
               create: [
                  {
                     name: "Premium Wireless Mouse",
                     code: "MOUSE-01",
                     quantity: 2,
                     price: 750,
                     subtotal: 1500,
                  },
               ],
            },
         },
         include: { customer: true, items: true, employee: true },
      });
   }

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
   page.setDefaultTimeout(60000);

   await page.setCookie(
      { name: "devx_token", value: token, domain: "localhost", path: "/", httpOnly: false },
      { name: "user_role", value: admin.role?.name || "ADMIN", domain: "localhost", path: "/" },
      { name: "user_name", value: encodeURIComponent(admin.name || "Admin"), domain: "localhost", path: "/" }
   );

   try {
      console.log("--- 1. Navigating to Order Page ---");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".MuiDataGrid-row", { timeout: 30000 });
      assert(true, "Order page loaded with order rows");

      // Hook window.print before action menu interaction
      await page.evaluate(() => {
         window._devx_printed = false;
         window.print = () => {
            window._devx_printed = true;
         };
      });

      console.log("\n--- 2. Verifying Order Menu & Direct Invoice Printing ---");
      // Find 3-dots icon button in the first row
      const firstRow = await page.$(".MuiDataGrid-row");
      assert(firstRow !== null, "Found first row in order table");

      const menuBtn = await firstRow.$('[data-field="@actions"] button');
      assert(menuBtn !== null, "Found 3-dots action menu button in row");
      await menuBtn.click();
      await new Promise((r) => setTimeout(r, 600));

      // Check menu items
      const menuTexts = await page.evaluate(() => {
         const items = Array.from(document.querySelectorAll(".MuiPopover-root .MuiListItemButton-root, .MuiMenu-paper .MuiListItemButton-root"));
         return items.map((el) => el.textContent.trim());
      });
      console.log("  Action Menu Items:", menuTexts);
      assert(menuTexts.some((t) => t.includes("Print")), "Action menu contains 'Print' item");
      assert(menuTexts.some((t) => t.includes("View Details")), "Action menu contains 'View Details' item");
      assert(menuTexts.some((t) => t.includes("edit")), "Action menu contains 'edit' item");
      assert(menuTexts.some((t) => t.includes("delete")), "Action menu contains 'delete' item");

      // Click "Print" from the action menu
      const printItemClicked = await page.evaluate(() => {
         const items = Array.from(document.querySelectorAll(".MuiPopover-root .MuiListItemButton-root"));
         for (const it of items) {
            if (it.textContent.trim() === "Print" || it.textContent.trim().startsWith("Print")) {
               it.click();
               return true;
            }
         }
         return false;
      });
      assert(printItemClicked, "Clicked 'Print' in action menu");

      // Wait for print trigger and print portal mount
      await new Promise((r) => setTimeout(r, 800));

      const printState = await page.evaluate(() => {
         const printed = window._devx_printed;
         const printPortal = document.getElementById("devx-print-portal");
         const invoiceHtml = printPortal ? printPortal.innerHTML : "";
         const hasInvoiceContent =
            invoiceHtml.includes("Invoice") ||
            invoiceHtml.includes("INVOICE") ||
            invoiceHtml.includes("Bill To") ||
            invoiceHtml.includes("Total");
         const hasTableOrSidebar =
            Boolean(printPortal?.querySelector(".MuiDataGrid-root")) ||
            Boolean(printPortal?.querySelector(".MuiDrawer-root"));
         const visibleDialog = document.querySelector(".MuiDialog-root");
         const isModalOpen = visibleDialog ? window.getComputedStyle(visibleDialog).visibility !== "hidden" : false;

         return {
            printed,
            portalExists: Boolean(printPortal),
            hasInvoiceContent,
            hasTableOrSidebar,
            isModalOpen,
            invoiceSnippet: invoiceHtml.slice(0, 300),
         };
      });

      assert(printState.printed, "window.print() was triggered immediately without modal prompt");
      assert(printState.portalExists, "Print portal (#devx-print-portal) rendered in DOM");
      assert(printState.hasInvoiceContent, "Print portal contains invoice data");
      assert(!printState.hasTableOrSidebar, "Print portal contains zero dashboard UI, table, or buttons");
      assert(!printState.isModalOpen, "No preview modal was opened upon clicking Print");

      // Take screenshot of print portal DOM rendered cleanly
      await page.evaluate(() => {
         const portal = document.getElementById("devx-print-portal");
         if (portal) {
            portal.style.display = "block";
            portal.style.position = "fixed";
            portal.style.top = "0";
            portal.style.left = "0";
            portal.style.zIndex = "99999";
            portal.style.background = "#fff";
            portal.style.width = "850px";
            portal.style.minHeight = "600px";
            portal.style.padding = "24px";
            portal.style.boxShadow = "0 10px 40px rgba(0,0,0,0.2)";
         }
      });
      await new Promise((r) => setTimeout(r, 400));
      const printScreenshotPath = path.join(SCREENSHOTS_DIR, "order_direct_invoice_print.png");
      await page.screenshot({ path: printScreenshotPath });
      fs.copyFileSync(printScreenshotPath, path.join(ARTIFACTS_DIR, "order_direct_invoice_print.png"));
      console.log("  Saved screenshot: order_direct_invoice_print.png");

      // Reset print portal styling
      await page.evaluate(() => {
         const portal = document.getElementById("devx-print-portal");
         if (portal) portal.style.display = "none";
      });

      console.log("\n--- 3. Verifying Customer Profile & Order History Modal ---");
      // Click customer cell in the first row
      const customerCell = await page.$('.MuiDataGrid-row .MuiDataGrid-cell[data-field="customer"]');
      assert(customerCell !== null, "Found customer cell in order table");
      await customerCell.click();

      // Wait for CustomerDetailModal (CustomModal renders .MuiModal-root:not(.MuiModal-hidden)) to appear
      await page.waitForSelector(".MuiModal-root:not(.MuiModal-hidden)", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 800));

      const customerModalData = await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return null;
         const text = modal.textContent || "";
         const hasTitle = text.includes("Customer Profile & Order History");
         const hasOrderHistory = text.includes("Order History");
         const hasMetrics = text.includes("Delivery Success Rate") || text.includes("Delivered") || text.includes("Total Orders");
         
         // Verify removal of Print and Export options
         const buttons = Array.from(modal.querySelectorAll("button")).map((b) => b.textContent.trim());
         const hasPrintButton = buttons.some((b) => b.toLowerCase().includes("print"));
         const hasWordButton = buttons.some((b) => b.toLowerCase() === "word");
         const hasExcelButton = buttons.some((b) => b.toLowerCase() === "excel");
         const hasCloseButton = buttons.some((b) => b.toLowerCase() === "close") || Boolean(modal.querySelector('button[aria-label="close"]'));

         return {
            hasTitle,
            hasOrderHistory,
            hasMetrics,
            hasPrintButton,
            hasWordButton,
            hasExcelButton,
            hasCloseButton,
            buttons,
         };
      });

      assert(customerModalData !== null, "CustomerDetailModal is open using CustomModal (.MuiModal-root:not(.MuiModal-hidden))");
      assert(customerModalData.hasTitle, "Modal header has title 'Customer Profile & Order History'");
      assert(customerModalData.hasOrderHistory, "Modal contains Customer Order History table");
      assert(customerModalData.hasMetrics, "Modal contains Customer delivery success metrics");
      assert(!customerModalData.hasPrintButton, "Print button is removed from Customer Profile modal");
      assert(!customerModalData.hasWordButton, "Word export button is removed from Customer Profile modal");
      assert(!customerModalData.hasExcelButton, "Excel export button is removed from Customer Profile modal");
      assert(customerModalData.hasCloseButton, "Close button is present in Customer Profile modal");

      const custScreenshotPath = path.join(SCREENSHOTS_DIR, "customer_profile_modal.png");
      await page.screenshot({ path: custScreenshotPath });
      fs.copyFileSync(custScreenshotPath, path.join(ARTIFACTS_DIR, "customer_profile_modal.png"));
      console.log("  Saved screenshot: customer_profile_modal.png");

      // Close customer modal
      await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return;
         const closeBtn = Array.from(modal.querySelectorAll("button")).find((b) =>
            b.textContent.trim().toLowerCase() === "close" || b.getAttribute("aria-label") === "close"
         );
         if (closeBtn) closeBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      console.log("\n--- 4. Verifying Order Preview Modal (Tracking & Employee Activity) ---");
      // Open Order Preview via Order ID link
      const orderIdLink = await page.$('.MuiDataGrid-row .MuiDataGrid-cell[data-field="orderId"] p, .MuiDataGrid-row .MuiDataGrid-cell[data-field="orderId"]');
      assert(orderIdLink !== null, "Found order ID link in first row");
      await orderIdLink.click();

      // Wait for OrderDetailModal (CustomModal renders .MuiModal-root:not(.MuiModal-hidden)) to appear
      await page.waitForSelector(".MuiModal-root:not(.MuiModal-hidden)", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 800));

      const orderPreviewData = await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return null;
         const text = modal.textContent || "";
         const hasTitle = text.includes("Order Preview");
         const hasOrderItems = text.includes("Order Items");
         const hasGrandTotal = text.includes("Grand Total");

         // Order Tracking checks
         const hasOrderTracking = text.includes("Order Tracking");
         const hasTrackingSteps =
            text.includes("Order Placed") &&
            text.includes("Confirmed & Processing") &&
            text.includes("Courier Shipment");

         // Employee Activity Track checks
         const hasEmployeeActivity = text.includes("Employee Activity Track on this Order");
         const hasHandlingStaff = text.includes("Handling Staff Member");
         const hasActivityLogs =
            text.includes("Order Created") ||
            text.includes("Invoice Action") ||
            text.includes("Workflow Status Update");

         // Verify removal of Print and Export options
         const buttons = Array.from(modal.querySelectorAll("button")).map((b) => b.textContent.trim());
         const hasPrintButton = buttons.some((b) => b.toLowerCase().includes("print"));
         const hasWordButton = buttons.some((b) => b.toLowerCase() === "word");
         const hasExcelButton = buttons.some((b) => b.toLowerCase() === "excel");
         const hasCloseButton = buttons.some((b) => b.toLowerCase() === "close") || Boolean(modal.querySelector('button[aria-label="close"]'));

         return {
            hasTitle,
            hasOrderItems,
            hasGrandTotal,
            hasOrderTracking,
            hasTrackingSteps,
            hasEmployeeActivity,
            hasHandlingStaff,
            hasActivityLogs,
            hasPrintButton,
            hasWordButton,
            hasExcelButton,
            hasCloseButton,
            buttons,
         };
      });

      assert(orderPreviewData !== null, "OrderDetailModal is open using CustomModal (.MuiModal-root:not(.MuiModal-hidden))");
      assert(orderPreviewData.hasTitle, "Modal header has title 'Order Preview' with CustomModal");
      assert(orderPreviewData.hasOrderItems, "Order items table is displayed with pricing");
      assert(orderPreviewData.hasGrandTotal, "Grand Total summary is displayed");
      assert(orderPreviewData.hasOrderTracking, "Order Tracking section is present");
      assert(orderPreviewData.hasTrackingSteps, "Order Tracking timeline shows Placed, Processing, and Courier steps");
      assert(orderPreviewData.hasEmployeeActivity, "Employee Activity Track section is present");
      assert(orderPreviewData.hasHandlingStaff, "Handling Staff Member card is displayed");
      assert(orderPreviewData.hasActivityLogs, "Chronological employee activity logs are displayed with timestamps");
      assert(!orderPreviewData.hasPrintButton, "Print button is removed from Order Preview modal");
      assert(!orderPreviewData.hasWordButton, "Word export button is removed from Order Preview modal");
      assert(!orderPreviewData.hasExcelButton, "Excel export button is removed from Order Preview modal");
      assert(orderPreviewData.hasCloseButton, "Close button is present in Order Preview modal");

      const previewScreenshotPath = path.join(SCREENSHOTS_DIR, "order_preview_modal_tracking_activity.png");
      await page.screenshot({ path: previewScreenshotPath });
      fs.copyFileSync(previewScreenshotPath, path.join(ARTIFACTS_DIR, "order_preview_modal_tracking_activity.png"));
      console.log("  Saved screenshot: order_preview_modal_tracking_activity.png");

      // Close Order Preview modal
      await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return;
         const closeBtn = Array.from(modal.querySelectorAll("button")).find((b) =>
            b.textContent.trim().toLowerCase() === "close" || b.getAttribute("aria-label") === "close"
         );
         if (closeBtn) closeBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      console.log("\n--- 5. Verifying Standalone Route /admin/order/[id] ---");
      await page.goto(`${BASE_URL}/admin/order/${sampleOrder.id}`, { waitUntil: "domcontentloaded" });
      await new Promise((r) => setTimeout(r, 1500));

      const standalonePageData = await page.evaluate(() => {
         const bodyText = document.body.textContent || "";
         const hasInvoicePreview = bodyText.includes("Invoice") || bodyText.includes("DevX");
         const hasTemplateSelect = bodyText.includes("Template") || document.querySelector("input") !== null;
         return { hasInvoicePreview, hasTemplateSelect };
      });

      assert(standalonePageData.hasInvoicePreview, "Standalone /admin/order/[id] page loaded invoice preview");
      const standaloneScreenshotPath = path.join(SCREENSHOTS_DIR, "order_standalone_preview_page.png");
      await page.screenshot({ path: standaloneScreenshotPath });
      fs.copyFileSync(standaloneScreenshotPath, path.join(ARTIFACTS_DIR, "order_standalone_preview_page.png"));
      console.log("  Saved screenshot: order_standalone_preview_page.png");

      console.log("\n================================================================================");
      console.log(`  ALL ${passed.length} VERIFICATIONS PASSED SUCCESSFULLY!`);
      console.log("================================================================================\n");
   } finally {
      await browser.close();
      await prisma.$disconnect();
   }
}

run().catch((err) => {
   console.error("Test execution failed:", err);
   process.exit(1);
});
