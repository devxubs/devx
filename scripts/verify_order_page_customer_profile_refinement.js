/**
 * Automated Verification for DEVX POS — Customer Profile & Order History UI Refinement
 * Exclusively on the Order page.
 */

const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

function assert(condition, message) {
   if (!condition) {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
   }
   console.log(`  [PASS] ${message}`);
}

async function run() {
   console.log("================================================================================");
   console.log("  DEVX POS - ORDER PAGE CUSTOMER PROFILE & ORDER HISTORY UI REFINEMENT");
   console.log("================================================================================\n");

   let browser;
   try {
      console.log("--- 1. Verifying Database Customer ---");
      const customer = await prisma.customer.findFirst({
         where: { customId: "CUS_ANALYTICS_TEST" },
         include: { orders: true },
      });
      assert(customer !== null, "Test customer CUS_ANALYTICS_TEST exists in database");

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

      // 3. Navigate to Order Page and open Customer Profile modal
      console.log("\n--- 3. Opening Customer Profile Modal from Order Page (/admin/order) ---");
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiDataGrid-row", { timeout: 35000 });

      // Click customer cell in the row
      const customerCell = await page.$('.MuiDataGrid-row .MuiDataGrid-cell[data-field="customer"]');
      assert(customerCell !== null, "Found customer cell in Order table row");
      await customerCell.click();

      // Wait for modal to render
      await page.waitForSelector(".MuiModal-root:not(.MuiModal-hidden)", { timeout: 15000 });
      await page.waitForFunction(() => {
         const m = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         return m && m.innerText && m.innerText.includes("Customer Profile & Order History") && !m.querySelector(".MuiCircularProgress-root");
      }, { timeout: 25000 });

      const modalText = await page.evaluate(() => {
         const m = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         return m ? m.innerText : "";
      });

      // --- 4. Verify Requirement 1: Customer ID header ---
      console.log("\n--- 4. Verifying Customer ID in Header ---");
      assert(modalText.includes("CUS_ANALYTICS_TEST"), "Customer ID displayed as CUS_ANALYTICS_TEST in header");

      // --- 5. Verify Requirement 2: Compact Icon-Only Contact Buttons ---
      console.log("\n--- 5. Verifying Compact Icon-Only Contact Buttons (Copy Phone Number & Call Now) ---");
      const buttonMetrics = await page.evaluate((targetPhone) => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return null;
         const copyBtn = modal.querySelector('button[aria-label="Copy Phone Number"]');
         const callBtn = modal.querySelector('button[aria-label="Call Now"]');

         const copyHasIconButton = copyBtn ? copyBtn.classList.contains("MuiIconButton-root") : false;
         const callHasIconButton = callBtn ? callBtn.classList.contains("MuiIconButton-root") : false;
         const copyHasSmall = copyBtn ? copyBtn.classList.contains("MuiIconButton-sizeSmall") : false;
         const callHasSmall = callBtn ? callBtn.classList.contains("MuiIconButton-sizeSmall") : false;

         // Check that text labels were removed from inside the buttons
         const copyTextInside = copyBtn ? copyBtn.innerText.trim() : "N/A";
         const callTextInside = callBtn ? callBtn.innerText.trim() : "N/A";

         // Check phone container alignment
         const phoneEl = Array.from(modal.querySelectorAll("p, span")).find((el) =>
            el.textContent && el.textContent.includes(targetPhone || "017")
         );
         const parentStack = phoneEl ? phoneEl.closest(".MuiStack-root") : null;
         const bothInSameContainer = parentStack && copyBtn && callBtn && parentStack.contains(copyBtn) && parentStack.contains(callBtn);

         return {
            hasCopy: Boolean(copyBtn),
            hasCall: Boolean(callBtn),
            copyHasIconButton,
            callHasIconButton,
            copyHasSmall,
            callHasSmall,
            copyTextInside,
            callTextInside,
            copyHeight: copyBtn ? copyBtn.getBoundingClientRect().height : 0,
            callHeight: callBtn ? callBtn.getBoundingClientRect().height : 0,
            bothInSameContainer: Boolean(bothInSameContainer),
         };
      }, customer.phone);

      assert(buttonMetrics.hasCopy, "Compact Copy Phone Number button present with aria-label");
      assert(buttonMetrics.hasCall, "Compact Call Now button present with aria-label");
      assert(buttonMetrics.copyHasIconButton, "Copy Phone Number button uses MUI IconButton");
      assert(buttonMetrics.callHasIconButton, "Call Now button uses MUI IconButton");
      assert(buttonMetrics.copyHasSmall, "Copy Phone Number IconButton has size='small'");
      assert(buttonMetrics.callHasSmall, "Call Now IconButton has size='small'");
      assert(buttonMetrics.copyTextInside === "", `Copy Phone Number button has NO text labels (innerText: '${buttonMetrics.copyTextInside}')`);
      assert(buttonMetrics.callTextInside === "", `Call Now button has NO text labels (innerText: '${buttonMetrics.callTextInside}')`);
      assert(buttonMetrics.copyHeight <= 32, `Copy Phone Number button is compact (height=${buttonMetrics.copyHeight}px <= 32px)`);
      assert(buttonMetrics.callHeight <= 32, `Call Now button is compact (height=${buttonMetrics.callHeight}px <= 32px)`);
      assert(buttonMetrics.bothInSameContainer, "Both icon buttons are properly aligned beside the customer phone number");

      // --- 6. Verify Requirement 3: Overall Order Statistics ---
      console.log("\n--- 6. Verifying Refined Overall Order Statistics ---");
      assert(modalText.includes("Overall Order Statistics"), "Overall Order Statistics section header present");
      assert(modalText.includes("Total Orders"), "Metric: Total Orders present");
      assert(modalText.includes("Delivered"), "Metric: Delivered present");
      assert(modalText.includes("Failed"), "Metric: Failed present");
      assert(modalText.includes("Pending"), "Metric: Pending present");
      assert(modalText.includes("Total Ordered"), "Metric: Total Ordered present");
      assert(modalText.includes("Delivered Amt"), "Metric: Delivered Amt present");

      // --- 7. Verify Requirement 4: Merged Courier Performance Section ---
      console.log("\n--- 7. Verifying Single Merged Courier Performance Section ---");
      assert(modalText.includes("Courier Performance"), "Single section named 'Courier Performance' present");
      assert(!modalText.includes("Courier Performance Summary"), "Duplicate 'Courier Performance Summary' removed");
      assert(!modalText.includes("Courier-wise Statistics"), "Duplicate 'Courier-wise Statistics' title removed");
      assert(modalText.includes("Steadfast"), "Courier: Steadfast present");
      assert(modalText.includes("Pathao"), "Courier: Pathao present");
      assert(modalText.includes("RedX"), "Courier: RedX present");

      // Verify badges where data supports it
      assert(modalText.includes("Most Used"), "Most-used courier badge displayed based on data");
      assert(modalText.includes("Best Rate"), "Best delivery success rate badge displayed based on data");

      // --- 8. Verify Requirement 5: Filters (Search removed, Autocomplete used) ---
      console.log("\n--- 8. Verifying Filters (Search removed, Shared Autocomplete used) ---");
      const filterChecks = await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return null;
         // Verify no search input
         const searchInputs = Array.from(modal.querySelectorAll('input[placeholder*="Search"]'));
         // Verify Autocomplete inputs
         const autocompleteEls = Array.from(modal.querySelectorAll(".MuiAutocomplete-root"));
         const labels = Array.from(modal.querySelectorAll(".MuiInputLabel-root")).map(l => l.textContent);
         return {
            searchInputsCount: searchInputs.length,
            autocompleteCount: autocompleteEls.length,
            hasStatusAutocomplete: labels.some(l => l && l.includes("Order Status")),
            hasCourierAutocomplete: labels.some(l => l && l.includes("Courier Company")),
         };
      });

      assert(filterChecks.searchInputsCount === 0, "Search bar is completely removed from Customer Order History filters");
      assert(filterChecks.autocompleteCount >= 2, `Shared Autocomplete component used (found ${filterChecks.autocompleteCount} Autocompletes)`);
      assert(filterChecks.hasStatusAutocomplete, "Autocomplete: Order Status filter present");
      assert(filterChecks.hasCourierAutocomplete, "Autocomplete: Courier Company filter present");

      // --- 9. Verify Requirement 6: Consistent borderRadius: 1 ---
      console.log("\n--- 9. Verifying Consistent borderRadius: 1 ---");
      const borderRadiusCheck = await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
         if (!modal) return { ok: true, details: "" };
         const papers = Array.from(modal.querySelectorAll(".MuiPaper-root"));
         // Check computed border-radius on papers (MUI borderRadius: 1 corresponds to 4px)
         const invalidRadii = [];
         for (const p of papers) {
            const r = window.getComputedStyle(p).borderRadius;
            if (r !== "12px" && r !== "0px") {
               invalidRadii.push(r);
            }
         }
         return {
            ok: invalidRadii.length === 0,
            invalidCount: invalidRadii.length,
            sampleRadius: papers.length > 0 ? window.getComputedStyle(papers[0]).borderRadius : "",
         };
      });
      assert(borderRadiusCheck.ok, `All papers and containers use theme borderRadius: 1 (12px) consistently (invalidCount: ${borderRadiusCheck.invalidCount})`);

      // Save screenshot
      const screenshotsDir = path.join(__dirname, "../screenshots");
      if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

      const refinedScreenshotPath = path.join(screenshotsDir, "customer_profile_order_page_refined.png");
      await page.screenshot({ path: refinedScreenshotPath });
      console.log("  Saved screenshot: customer_profile_order_page_refined.png");

      // Copy to artifact directory
      const artifactDir = "/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756";
      if (fs.existsSync(artifactDir)) {
         fs.copyFileSync(refinedScreenshotPath, path.join(artifactDir, "customer_profile_order_page_refined.png"));
      }

      console.log("\n================================================================================");
      console.log("  ALL 20+ REFINEMENT VERIFICATIONS PASSED SUCCESSFULLY!");
      console.log("================================================================================\n");
   } finally {
      if (browser) await browser.close();
      await prisma.$disconnect();
   }
}

run().catch((err) => {
   console.error("Test failed with error:", err);
   process.exit(1);
});
