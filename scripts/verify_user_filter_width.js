require("dotenv").config();
const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

async function runVerification() {
   console.log("=== VERIFYING USER PAGE: FILTER BY ROLE FIELD WIDTH & FUNCTIONALITY ===");

   if (!fs.existsSync("screenshots")) {
      fs.mkdirSync("screenshots");
   }

   const admin = await prisma.user.findFirst({
      where: { email: "devxub@gmail.com" },
      include: { role: true }
   });
   if (!admin) throw new Error("Admin user not found in DB");

   const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role?.name || "System Admin", permissions: ["ALL"] },
      JWT_SECRET,
      { expiresIn: "2h" }
   );

   const browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
   });

   try {
      const page = await browser.newPage();

      await page.setCookie({
         name: "devx_token",
         value: token,
         domain: "localhost",
         path: "/",
         httpOnly: false,
      });

      // 1. Desktop Test (1440x900)
      console.log("\n--- Testing Desktop View (1440x900) ---");
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto("http://localhost:3000/admin/user", { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 2000));

      // Locate Filter by Role element
      const desktopMetrics = await page.evaluate(() => {
         const inputs = Array.from(document.querySelectorAll("input"));
         const roleInput = inputs.find(
            (i) => i.placeholder === "Select Role" || i.getAttribute("aria-label") === "Filter by Role"
         );
         if (!roleInput) return null;

         const autocompleteRoot = roleInput.closest(".MuiAutocomplete-root");
         const stackWrapper = autocompleteRoot ? autocompleteRoot.parentElement : null;
         const rect = autocompleteRoot ? autocompleteRoot.getBoundingClientRect() : null;
         const wrapperRect = stackWrapper ? stackWrapper.getBoundingClientRect() : null;

         const labelEl = autocompleteRoot ? autocompleteRoot.querySelector("label") : null;
         const arrowIcon = autocompleteRoot ? autocompleteRoot.querySelector(".MuiAutocomplete-popupIndicator") : null;

         return {
            hasInput: true,
            label: labelEl ? labelEl.textContent.trim() : null,
            placeholder: roleInput.placeholder,
            width: rect ? rect.width : 0,
            height: rect ? rect.height : 0,
            wrapperWidth: wrapperRect ? wrapperRect.width : 0,
            hasDropdownArrow: Boolean(arrowIcon),
         };
      });

      console.log("Desktop Role Filter Metrics:", desktopMetrics);
      if (!desktopMetrics) throw new Error("Filter by Role component not found on page!");
      if (desktopMetrics.width < 240) {
         throw new Error(`Filter by Role width is too small on desktop: ${desktopMetrics.width}px! Expected ~260px.`);
      }
      if (!desktopMetrics.hasDropdownArrow) {
         throw new Error("Dropdown arrow is missing on Filter by Role!");
      }
      console.log(`✓ Desktop width passed: ${desktopMetrics.width.toFixed(1)}px (Expected: 260px)`);
      console.log(`✓ Label: "${desktopMetrics.label}", Placeholder: "${desktopMetrics.placeholder}", Dropdown Arrow: Present`);

      // 2. Tablet Test (768x1024)
      console.log("\n--- Testing Tablet View (768x1024) ---");
      await page.setViewport({ width: 768, height: 1024 });
      await new Promise((r) => setTimeout(r, 600));

      const tabletMetrics = await page.evaluate(() => {
         const inputs = Array.from(document.querySelectorAll("input"));
         const roleInput = inputs.find(
            (i) => i.placeholder === "Select Role" || i.getAttribute("aria-label") === "Filter by Role"
         );
         if (!roleInput) return null;
         const autocompleteRoot = roleInput.closest(".MuiAutocomplete-root");
         const rect = autocompleteRoot ? autocompleteRoot.getBoundingClientRect() : null;
         return {
            width: rect ? rect.width : 0,
         };
      });

      console.log("Tablet Role Filter Metrics:", tabletMetrics);
      if (!tabletMetrics || tabletMetrics.width < 220) {
         throw new Error(`Filter by Role width is too small on tablet: ${tabletMetrics?.width}px! Expected ~240px.`);
      }
      console.log(`✓ Tablet width passed: ${tabletMetrics.width.toFixed(1)}px (Expected: 240px)`);

      // 3. Mobile Test (375x812)
      console.log("\n--- Testing Mobile View (375x812) ---");
      await page.setViewport({ width: 375, height: 812 });
      await new Promise((r) => setTimeout(r, 600));

      const mobileMetrics = await page.evaluate(() => {
         const inputs = Array.from(document.querySelectorAll("input"));
         const roleInput = inputs.find(
            (i) => i.placeholder === "Select Role" || i.getAttribute("aria-label") === "Filter by Role"
         );
         if (!roleInput) return null;
         const autocompleteRoot = roleInput.closest(".MuiAutocomplete-root");
         const rect = autocompleteRoot ? autocompleteRoot.getBoundingClientRect() : null;
         return {
            width: rect ? rect.width : 0,
         };
      });

      console.log("Mobile Role Filter Metrics:", mobileMetrics);
      if (!mobileMetrics || mobileMetrics.width < 100) {
         throw new Error(`Filter by Role width is too small on mobile: ${mobileMetrics?.width}px!`);
      }
      console.log(`✓ Mobile responsive width passed: ${mobileMetrics.width.toFixed(1)}px`);

      // 4. Return to Desktop for Interactive Functional Test & Screenshot
      console.log("\n--- Testing Interactive Selection & Row Filtering (Desktop) ---");
      await page.setViewport({ width: 1440, height: 900 });
      await new Promise((r) => setTimeout(r, 800));

      // Get initial table rows count
      const initialRowCount = await page.evaluate(() => {
         return document.querySelectorAll(".MuiDataGrid-row").length;
      });
      console.log(`Initial .MuiDataGrid-row count: ${initialRowCount}`);

      // Click the Autocomplete popup indicator
      const popupIndicator = await page.$(".MuiAutocomplete-popupIndicator");
      if (popupIndicator) {
         await popupIndicator.click();
      } else {
         const inputEl = await page.$("input[placeholder='Select Role']");
         await inputEl.click();
      }
      await new Promise((r) => setTimeout(r, 600));

      // Get open options
      const options = await page.evaluate(() => {
         const listbox = document.querySelector(".MuiAutocomplete-popper, ul[role='listbox']");
         if (!listbox) return [];
         return Array.from(listbox.querySelectorAll("li")).map((li) => li.textContent.trim());
      });
      console.log("Visible dropdown options:", options);
      if (options.length === 0) {
         throw new Error("Dropdown options did not appear when popup indicator was clicked!");
      }

      // Test filtering by "Staff"
      console.log(`Selecting role option: "Staff"...`);
      await page.evaluate(() => {
         const listbox = document.querySelector(".MuiAutocomplete-popper, ul[role='listbox']");
         if (!listbox) return;
         const items = Array.from(listbox.querySelectorAll("li"));
         const matched = items.find((li) => li.textContent.trim() === "Staff");
         if (matched) matched.click();
      });
      await new Promise((r) => setTimeout(r, 800));

      const staffRowCount = await page.evaluate(() => {
         return document.querySelectorAll(".MuiDataGrid-row").length;
      });
      console.log(`Table row count with "Staff" filter: ${staffRowCount}`);
      if (staffRowCount === 0) {
         throw new Error("Expected rows to match 'Staff' filter!");
      }

      // Test filtering by "Cashier" (no cashier users currently exist in DB)
      // Open dropdown again
      await page.click(".MuiAutocomplete-popupIndicator");
      await new Promise((r) => setTimeout(r, 600));
      console.log(`Selecting role option: "Cashier"...`);
      await page.evaluate(() => {
         const listbox = document.querySelector(".MuiAutocomplete-popper, ul[role='listbox']");
         if (!listbox) return;
         const items = Array.from(listbox.querySelectorAll("li"));
         const matched = items.find((li) => li.textContent.trim() === "Cashier");
         if (matched) matched.click();
      });
      await new Promise((r) => setTimeout(r, 800));

      const cashierRowCount = await page.evaluate(() => {
         return document.querySelectorAll(".MuiDataGrid-row").length;
      });
      console.log(`Table row count with "Cashier" filter: ${cashierRowCount}`);
      if (cashierRowCount !== 0) {
         throw new Error("Expected 0 rows for 'Cashier' filter since none have Cashier role!");
      }

      // Clear filter by clicking clear button
      const clearBtn = await page.$(".MuiAutocomplete-clearIndicator");
      if (clearBtn) {
         await clearBtn.click();
         await new Promise((r) => setTimeout(r, 800));
         const restoredRowCount = await page.evaluate(() => {
            return document.querySelectorAll(".MuiDataGrid-row").length;
         });
         console.log(`Table row count after clearing filter: ${restoredRowCount}`);
         if (restoredRowCount !== initialRowCount) {
            throw new Error(`Expected restored row count ${initialRowCount}, got ${restoredRowCount}`);
         }
      }

      // Now set to Staff again for the screenshot so we see a clean filled filter with chip and active table
      await page.click(".MuiAutocomplete-popupIndicator");
      await new Promise((r) => setTimeout(r, 600));
      await page.evaluate(() => {
         const listbox = document.querySelector(".MuiAutocomplete-popper, ul[role='listbox']");
         if (!listbox) return;
         const items = Array.from(listbox.querySelectorAll("li"));
         const matched = items.find((li) => li.textContent.trim() === "Staff");
         if (matched) matched.click();
      });
      await new Promise((r) => setTimeout(r, 800));

      // Verify screenshot capture
      const screenshotPath = "screenshots/user_filter_role_fixed.png";
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`✓ Screenshot captured at ${screenshotPath}`);

      // Copy to artifact directory
      const artifactDir = "/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756";
      const targetArtifactPath = path.join(artifactDir, "user_filter_role_fixed.png");
      fs.copyFileSync(screenshotPath, targetArtifactPath);
      console.log(`✓ Screenshot copied to artifact directory: ${targetArtifactPath}`);

      console.log("\n=======================================================");
      console.log("ALL USER PAGE ROLE FILTER WIDTH TESTS PASSED SUCCESSFULLY!");
      console.log("=======================================================");
   } finally {
      await browser.close();
      await prisma.$disconnect();
   }
}

runVerification().catch((err) => {
   console.error("Verification failed:", err);
   process.exit(1);
});
