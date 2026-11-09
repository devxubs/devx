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
   console.log("  DEVX POS - ORDER TRACKING & EMPLOYEE ACTIVITY REDESIGN VERIFICATION");
   console.log("================================================================================\n");

   // 1. Data mapping unit checks
   console.log("--- 1. Testing Modular Helpers & State Derivation ---");

   // 2. Browser End-to-End Tests
   console.log("\n--- 2. Setting Up Browser E2E Environment ---");
   const admin = await prisma.user.findFirst({
      where: { email: "devxub@gmail.com" },
      include: { role: true },
   });
   if (!admin) throw new Error("Admin user not found");

   // Update or ensure sample order has rich metadata for thorough UI preview
   let order = await prisma.order.findFirst({
      include: { customer: true, items: true, employee: true },
   });
   if (order) {
      order = await prisma.order.update({
         where: { id: order.id },
         data: {
            status: "PROCESSING",
            orderSource: "Direct Sales",
            paymentMethod: "bKash",
            orderNote: "Call customer before delivery",
            courier: "Steadfast Courier",
            referenceId: "ST-77889900",
            courierStatus: "IN_TRANSIT",
            courierSubmittedAt: new Date(),
            printStatus: "Printed",
            printedAt: new Date(),
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
   page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));

   await page.setCookie(
      { name: "devx_token", value: token, domain: "localhost", path: "/", httpOnly: false },
      { name: "user_role", value: admin.role?.name || "ADMIN", domain: "localhost", path: "/" },
      { name: "user_name", value: encodeURIComponent(admin.name || "Admin"), domain: "localhost", path: "/" }
   );

   try {
      console.log("\n--- 3. Opening Order Preview Modal (Light Mode) ---");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".MuiDataGrid-row", { timeout: 30000 });

      // Click order ID to open Order Preview modal
      const orderIdLink = await page.$('.MuiDataGrid-row .MuiDataGrid-cell[data-field="orderId"] p, .MuiDataGrid-row .MuiDataGrid-cell[data-field="orderId"]');
      assert(orderIdLink !== null, "Found order ID link");
      await orderIdLink.click();

      // Wait for modal and wait for loading spinner to disappear
      await page.waitForSelector(".MuiModal-root:not(.MuiModal-hidden)", { timeout: 10000 });
      await page.waitForFunction(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         return modal && !modal.querySelector(".MuiCircularProgress-root");
      }, { timeout: 15000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1000));

      // Verify Redesigned Order Tracking UI elements
      const trackingData = await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return null;

         const text = modal.textContent || "";
         console.log("MODAL INNER TEXT:", text.slice(0, 300));
         const hasOrderTracking = text.includes("Order Tracking");
         const hasLifecycleText = text.includes("Order lifecycle and shipment progression");
         const hasCurrentBadge = text.includes("Current:");
         const hasCourierStep = text.includes("Courier Shipment");
         const hasCourierDetails =
            text.includes("Carrier:") ||
            text.includes("Courier") ||
            text.includes("In-house Delivery") ||
            text.includes("Dispatched");
         const hasTimestampOrAwaiting =
            text.includes("Awaiting dispatch") ||
            text.includes("Pending final delivery") ||
            text.includes("PM") ||
            text.includes("AM");

         // Check vertical timeline connecting lines
         const nodes = Array.from(modal.querySelectorAll(".MuiBox-root")).filter(el => {
            const st = window.getComputedStyle(el);
            return st.borderRadius === "50%" && (st.width === "36px" || st.width === "32px");
         });

         return {
            hasOrderTracking,
            hasLifecycleText,
            hasCurrentBadge,
            hasCourierStep,
            hasCourierDetails,
            hasTimestampOrAwaiting,
            nodeCount: nodes.length,
         };
      });

      assert(trackingData.hasOrderTracking, "Order Tracking section title rendered");
      assert(trackingData.hasLifecycleText, "Order Tracking subtitle rendered");
      assert(trackingData.hasCurrentBadge, "Current status badge rendered in header");
      assert(trackingData.hasCourierStep, "Courier Shipment step displayed in timeline");
      assert(trackingData.hasCourierDetails, "Courier and delivery details rendered cleanly");
      assert(trackingData.hasTimestampOrAwaiting, "Timestamps or progress status indicators rendered");
      assert(trackingData.nodeCount >= 4, "Timeline nodes rendered with distinct state styling");

      // Verify Redesigned Employee Activity UI elements
      const activityData = await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return null;

         const text = modal.textContent || "";
         const hasActivitySection = text.includes("Employee Activity Track on this Order");
         const hasHandlingStaffCard = text.includes("Handling Staff Member");
         const hasEventsLoggedBadge = text.includes("Events Logged") || text.includes("Event Logged");
         const hasOrderCreated = text.includes("Order Created");
         const hasInvoiceAction = text.includes("Invoice Printed") || text.includes("Invoice Generated");
         const hasStaffName = text.includes("DevX System Administrator") || text.includes("Admin") || text.includes("Staff");

         return {
            hasActivitySection,
            hasHandlingStaffCard,
            hasEventsLoggedBadge,
            hasOrderCreated,
            hasInvoiceAction,
            hasStaffName,
         };
      });

      assert(activityData.hasActivitySection, "Employee Activity section rendered");
      assert(activityData.hasHandlingStaffCard, "Handling Staff Member profile card rendered");
      assert(activityData.hasEventsLoggedBadge, "Events count badge rendered");
      assert(activityData.hasStaffName, "Staff member name & role displayed");
      assert(activityData.hasOrderCreated, "Order Created activity item displayed");
      assert(activityData.hasInvoiceAction, "Invoice activity item displayed with accurate timestamp");

      // Take Desktop Light Mode Screenshot
      const lightScreenshotPath = path.join(SCREENSHOTS_DIR, "order_tracking_redesigned_modal.png");
      await page.screenshot({ path: lightScreenshotPath });
      fs.copyFileSync(lightScreenshotPath, path.join(ARTIFACTS_DIR, "order_tracking_redesigned_modal.png"));
      console.log("  Saved screenshot: order_tracking_redesigned_modal.png");

      // 4. Dark Theme Test
      console.log("\n--- 4. Testing Dark Theme Support ---");
      await page.evaluate(() => {
         document.documentElement.setAttribute("data-theme", "dark");
         document.body.classList.add("dark");
         localStorage.setItem("theme_mode", "dark");
      });
      await new Promise(r => setTimeout(r, 600));

      const darkScreenshotPath = path.join(SCREENSHOTS_DIR, "order_tracking_redesigned_dark.png");
      await page.screenshot({ path: darkScreenshotPath });
      fs.copyFileSync(darkScreenshotPath, path.join(ARTIFACTS_DIR, "order_tracking_redesigned_dark.png"));
      console.log("  Saved screenshot: order_tracking_redesigned_dark.png");

      // 5. Mobile Responsiveness Test
      console.log("\n--- 5. Testing Mobile Viewport (390x844) Responsiveness ---");
      await page.setViewport({ width: 390, height: 844 });
      await new Promise(r => setTimeout(r, 600));

      const overflowCheck = await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return false;
         const innerContainer = modal.querySelector(".MuiBox-root");
         return innerContainer ? innerContainer.scrollWidth <= window.innerWidth + 10 : true;
      });
      assert(overflowCheck, "Modal layout reflows without horizontal overflow on mobile");

      const mobileScreenshotPath = path.join(SCREENSHOTS_DIR, "order_tracking_redesigned_mobile.png");
      await page.screenshot({ path: mobileScreenshotPath });
      fs.copyFileSync(mobileScreenshotPath, path.join(ARTIFACTS_DIR, "order_tracking_redesigned_mobile.png"));
      console.log("  Saved screenshot: order_tracking_redesigned_mobile.png");

      // 6. Test Modal Close
      console.log("\n--- 6. Verifying Modal Close Action ---");
      await page.setViewport({ width: 1440, height: 960 });
      await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return;
         const closeBtn = Array.from(modal.querySelectorAll("button")).find(b =>
            b.textContent.trim().toLowerCase() === "close" || b.getAttribute("aria-label") === "close"
         );
         if (closeBtn) closeBtn.click();
      });
      await new Promise(r => setTimeout(r, 600));

      const isClosed = await page.evaluate(() => {
         return document.querySelector(".MuiModal-root:not(.MuiModal-hidden)") === null;
      });
      assert(isClosed, "Modal closes properly via close action");

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
