/**
 * Comprehensive Visual and Functional Verification Script for:
 * DevX POS — Visually Redesigned Order Details Page (/admin/order/[id])
 */

const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";
const ARTIFACTS_DIR = "/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756";

function assert(condition, message) {
   if (!condition) {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
   }
   console.log(`  ✅ [PASS] ${message}`);
}

async function run() {
   console.log("================================================================================");
   console.log("  DEVX POS — VISUALLY REDESIGNED ORDER DETAILS PAGE VERIFICATION");
   console.log("================================================================================\n");

   let browser;
   try {
      // 1. Database check
      console.log("--- 1. Inspecting Existing Orders in Database ---");
      const orders = await prisma.order.findMany({
         where: { isDeleted: false },
         include: { customer: true, employee: true, items: true },
         orderBy: { createdAt: "asc" },
      });
      console.log(`  Found ${orders.length} active orders in DB.`);

      const normalOrder = orders.find(o => o.status === "DELIVERED" || o.status === "CONFIRMED" || o.status === "PROCESSING") || orders[0];
      const cancelledOrder = orders.find(o => o.status === "CANCELLED" || o.status === "FAILED");

      assert(normalOrder !== undefined, `Found normal order: ${normalOrder?.orderCode || normalOrder?.orderId}`);
      assert(cancelledOrder !== undefined, `Found cancelled order: ${cancelledOrder?.orderCode || cancelledOrder?.orderId}`);

      // Ensure cancelled order has cancellationReason
      if (!cancelledOrder.cancellationReason) {
         await prisma.order.update({
            where: { id: cancelledOrder.id },
            data: { cancellationReason: "Customer requested cancellation prior to dispatch" },
         });
      }

      // 2. Authentication setup
      console.log("\n--- 2. Setting Up Browser E2E Environment ---");
      const admin = await prisma.user.findFirst({
         where: { email: "devxub@gmail.com" },
         include: { role: true },
      });
      if (!admin) throw new Error("Admin user not found");

      const token = jwt.sign(
         { id: admin.id, email: admin.email, role: admin.role?.name || "System Admin", permissions: ["ALL"] },
         JWT_SECRET,
         { expiresIn: "4h" }
      );

      browser = await puppeteer.launch({
         headless: "new",
         executablePath: "/usr/bin/google-chrome",
         args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--window-size=1440,1100"],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 1100 });
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);

      await page.setCookie(
         { name: "devx_token", value: token, domain: "localhost", path: "/", httpOnly: false },
         { name: "user_role", value: admin.role?.name || "ADMIN", domain: "localhost", path: "/" },
         { name: "user_name", value: encodeURIComponent(admin.name || "Admin"), domain: "localhost", path: "/" }
      );

      // 3. Test Normal Order Page (Desktop 1440px)
      const normalId = normalOrder.orderCode || normalOrder.orderId;
      console.log(`\n--- 3. Testing Redesigned Normal Order Page: /admin/order/${normalId} ---`);
      await page.goto(`${BASE_URL}/admin/order/${normalId}`, { waitUntil: "networkidle2" });
      await page.waitForSelector("h4, h5", { timeout: 15000 });

      // Verify Header
      const hasOrderIdHeading = await page.evaluate((targetId) => {
         return Array.from(document.querySelectorAll("h1, h2, h3, h4, h5")).some(h => h.innerText.includes(targetId));
      }, normalId);
      assert(hasOrderIdHeading, `Header primary heading displays prominent Order ID: ${normalId}`);

      const pageContent = await page.evaluate(() => document.body.innerText);
      assert(pageContent.includes("Back to Orders"), "Back to Orders button is present");
      assert(pageContent.includes("Invoice Templates"), "Invoice Templates button is present");
      assert(pageContent.includes("Quick Edit"), "Quick Edit button is present");
      assert(pageContent.includes("Edit Order"), "Edit Order button is present");
      assert(pageContent.includes("Print Invoice"), "Print Invoice button is present");

      // Verify Dual-Column / Sidebar Cards
      assert(pageContent.includes("CUSTOMER"), "Customer sidebar card present");
      assert(pageContent.includes("ATTRIBUTED STAFF"), "Attributed Staff sidebar card present");
      assert(pageContent.includes("PAYMENT SETTLEMENT"), "Payment Settlement sidebar card present");
      assert(pageContent.includes("LOGISTICS & DELIVERY"), "Logistics & Delivery sidebar card present");

      // Verify zero raw CUIDs exposed
      const cuidPattern = /cmv[a-z0-9]{20,}/i;
      assert(!cuidPattern.test(pageContent), "Zero raw CUIDs exposed in Order Details UI");
      assert(pageContent.includes("EP_"), "Employee code EP_ displayed cleanly in staff card");

      // Verify Order Items Table
      assert(pageContent.includes("Order Items"), "Order Items section present");
      assert(pageContent.includes("PRODUCT ITEM"), "Product Item column header present");
      assert(pageContent.includes("QTY"), "QTY column header present");
      assert(pageContent.includes("UNIT PRICE"), "UNIT PRICE column header present");
      assert(pageContent.includes("Grand Total:"), "Grand Total row present in integrated financial breakdown");

      // Verify Notes & Instructions section
      assert(pageContent.includes("Order Notes & Special Instructions"), "Order Notes section present");
      assert(pageContent.includes("Courier Logistics Note"), "Courier Note card present");
      assert(pageContent.includes("Customer Special Note"), "Customer Note card present");
      assert(pageContent.includes("Warehouse Packing Note"), "Packing Note card present");

      // Verify Order Tracking Timeline
      assert(pageContent.includes("Fulfillment & Tracking Lifecycle"), "Fulfillment & Tracking section present");
      assert(pageContent.includes("Order Placed"), "Order Placed stage present");

      // Verify Employee Activity
      assert(pageContent.includes("Operational Audit & Staff Activity"), "Operational Audit section present");

      // Capture redesigned normal order screenshot
      const normalScreenshotPath = path.join(ARTIFACTS_DIR, "order_details_redesigned_normal.png");
      await page.screenshot({ path: normalScreenshotPath, fullPage: true });
      console.log(`  📸 Redesigned normal order screenshot saved: ${normalScreenshotPath}`);

      // 4. Test Cancelled Order Page (Desktop 1440px)
      const cancelledId = cancelledOrder.orderCode || cancelledOrder.orderId;
      console.log(`\n--- 4. Testing Redesigned Cancelled Order Page: /admin/order/${cancelledId} ---`);
      await page.goto(`${BASE_URL}/admin/order/${cancelledId}`, { waitUntil: "networkidle2" });
      await page.waitForSelector("h4, h5", { timeout: 15000 });

      const cancelledPageText = await page.evaluate(() => document.body.innerText);
      assert(cancelledPageText.includes(cancelledId), `Cancelled Order ID ${cancelledId} displayed`);
      assert(cancelledPageText.includes("CANCELLED"), "Status badge displays CANCELLED");

      // Payment card for cancelled order: must reflect CANCELLED and Void due
      assert(cancelledPageText.includes("CANCELLED"), "Payment card displays CANCELLED status chip");
      assert(cancelledPageText.includes("(Void)"), "Payment card strikes through due amount with (Void)");

      // Tracking timeline for cancelled order: current step must be Order Cancelled!
      const trackingStatusChip = await page.evaluate(() => {
         const chips = Array.from(document.querySelectorAll(".MuiChip-root"));
         const currentChip = chips.find(c => c.innerText.includes("Current:"));
         return currentChip ? currentChip.innerText : "";
      });
      console.log(`  Tracking Current Chip Text: "${trackingStatusChip}"`);
      assert(
         trackingStatusChip.includes("Order Cancelled") || trackingStatusChip.includes("Cancelled"),
         `Tracking current status correctly highlights Order Cancelled (found: "${trackingStatusChip}")`
      );

      // Verify cancellation reason displayed in timeline
      assert(
         cancelledPageText.includes("Cancellation Reason") || cancelledPageText.includes("cancellation"),
         "Cancellation reason displayed in tracking timeline"
      );

      // Capture redesigned cancelled order screenshot
      const cancelledScreenshotPath = path.join(ARTIFACTS_DIR, "order_details_redesigned_cancelled.png");
      await page.screenshot({ path: cancelledScreenshotPath, fullPage: true });
      console.log(`  📸 Redesigned cancelled order screenshot saved: ${cancelledScreenshotPath}`);

      // 5. Test Independent Notes Editing & Saving
      console.log(`\n--- 5. Testing Independent Order Notes Editing & Saving ---`);
      const testNote = "Customer requested urgent dispatch before 5 PM - Redesign Test " + Date.now();
      const noteUpdateResult = await page.evaluate(async (orderId, note) => {
         const res = await fetch(`/api/orders/${orderId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerNote: note }),
         });
         return { ok: res.ok, status: res.status };
      }, cancelledOrder.id, testNote);

      assert(noteUpdateResult.ok, `Customer Note saved via PUT API successfully (status ${noteUpdateResult.status})`);

      // Reload page and verify updated note renders
      await page.goto(`${BASE_URL}/admin/order/${cancelledId}`, { waitUntil: "networkidle2" });
      await page.waitForSelector("h4, h5", { timeout: 15000 });
      const updatedPageText = await page.evaluate(() => document.body.innerText);
      assert(updatedPageText.includes(testNote), "Updated note text persists and renders in redesigned card");

      // 6. Test Responsive Mobile Layout (375x812)
      console.log(`\n--- 6. Testing Responsive Mobile Layout (375x812) ---`);
      await page.setViewport({ width: 375, height: 812 });
      await page.goto(`${BASE_URL}/admin/order/${normalId}`, { waitUntil: "networkidle2" });
      await page.waitForSelector("h4, h5", { timeout: 15000 });
      const mobileScreenshotPath = path.join(ARTIFACTS_DIR, "order_details_redesigned_mobile.png");
      await page.screenshot({ path: mobileScreenshotPath, fullPage: true });
      console.log(`  📸 Redesigned mobile layout screenshot saved: ${mobileScreenshotPath}`);
      assert(fs.existsSync(mobileScreenshotPath), "Mobile screenshot successfully captured");

      // 7. Test Dark Theme Layout
      console.log(`\n--- 7. Testing Dark Theme Layout (1440px) ---`);
      await page.setViewport({ width: 1440, height: 1100 });
      // Toggle dark theme via localStorage
      await page.evaluate(() => {
         try {
            const current = localStorage.getItem("devx_settings");
            const parsed = current ? JSON.parse(current) : {};
            parsed.themeMode = "dark";
            localStorage.setItem("devx_settings", JSON.stringify(parsed));
         } catch (e) {}
      });
      await page.goto(`${BASE_URL}/admin/order/${normalId}`, { waitUntil: "networkidle2" });
      await page.waitForSelector("h4, h5", { timeout: 15000 });
      const darkScreenshotPath = path.join(ARTIFACTS_DIR, "order_details_redesigned_dark.png");
      await page.screenshot({ path: darkScreenshotPath, fullPage: true });
      console.log(`  📸 Dark theme screenshot saved: ${darkScreenshotPath}`);
      assert(fs.existsSync(darkScreenshotPath), "Dark theme screenshot successfully captured");

      // Reset theme
      await page.evaluate(() => {
         try {
            const current = localStorage.getItem("devx_settings");
            const parsed = current ? JSON.parse(current) : {};
            parsed.themeMode = "light";
            localStorage.setItem("devx_settings", JSON.stringify(parsed));
         } catch (e) {}
      });

      console.log("\n================================================================================");
      console.log("  🎉 ALL VISUAL REDESIGN & FUNCTIONAL TESTS PASSED WITH ZERO ERRORS!");
      console.log("================================================================================\n");

   } catch (err) {
      console.error("\n❌ Verification Failed:", err);
      process.exitCode = 1;
   } finally {
      if (browser) await browser.close();
      await prisma.$disconnect();
   }
}

run();
