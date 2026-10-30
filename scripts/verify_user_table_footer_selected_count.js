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
   console.log("  DEVX POS - RESTORE SELECTED ROW COUNT IN USER TABLE FOOTER VERIFICATION");
   console.log("================================================================================\n");

   if (!fs.existsSync("screenshots")) {
      fs.mkdirSync("screenshots");
   }
   const brainDir = "/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756";

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
      // ─────────────────────────────────────────────────────────────────────────────
      // 1. Visit User Page & Inspect Footer and Toolbar (0 Rows Selected)
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("--- 1. Testing User Page: 0 Rows Selected ---");
      await page.goto(`${BASE_URL}/admin/user`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));

      assert(page.url().includes("/admin/user"), "User page loaded successfully");

      const getFooterAndToolbarState = async () => {
         return await page.evaluate(() => {
            const footerContainer = document.querySelector(".MuiDataGrid-footerContainer");
            const footerSelectedRowCount = document.querySelector(".MuiDataGrid-selectedRowCount");
            const footerText = footerContainer ? footerContainer.textContent.trim() : "";
            const selectedRowCountText = footerSelectedRowCount ? footerSelectedRowCount.textContent.trim() : "";

            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent.trim());
            const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
               text: b.textContent.trim(),
               ariaLabel: b.getAttribute("aria-label"),
               title: b.getAttribute("title"),
            }));
            const searchInput = document.querySelector("input[placeholder='Search']");
            const roleInput = document.querySelector("input[placeholder='Select Role']");

            return {
               footerText,
               selectedRowCountText,
               hasFooterSelectedCount: Boolean(selectedRowCountText && selectedRowCountText.length > 0),
               chips,
               hasTopSelectedChip: chips.some((t) => t && t.toLowerCase().includes("selected")),
               hasDeselectAll: buttons.some((b) => b.text === "Deselect All"),
               hasClearSelectionIcon: buttons.some((b) => (b.ariaLabel || "").toLowerCase().includes("clear selection")),
               hasExportSelected: buttons.some((b) => b.text.toLowerCase().includes("export selected")),
               hasPrintSelected: buttons.some((b) => b.text.toLowerCase().includes("print selected")),
               hasSearchInput: Boolean(searchInput),
               hasRoleInput: Boolean(roleInput),
            };
         });
      };

      const state0 = await getFooterAndToolbarState();
      console.log("  Initial State (0 selected):", state0);

      assert(!state0.hasFooterSelectedCount, "Footer displays NO selected row count when 0 rows are selected");
      assert(!state0.hasTopSelectedChip, "Top toolbar has NO selected count badge");
      assert(!state0.hasDeselectAll, "Top toolbar has NO 'Deselect All' button");
      assert(!state0.hasClearSelectionIcon, "Top toolbar has NO 'Clear Selection' icon");
      assert(!state0.hasExportSelected, "Top toolbar has NO 'Export selected' button");
      assert(!state0.hasPrintSelected, "Top toolbar has NO 'Print selected' button");
      assert(state0.hasSearchInput, "Original Search input is visible in toolbar");
      assert(state0.hasRoleInput, "Original 'Filter by Role' input is visible in toolbar");

      // Capture screenshot of User page with 0 rows selected
      const user0Screenshot = "screenshots/user_footer_0_selected.png";
      await page.screenshot({ path: user0Screenshot, fullPage: false });
      fs.copyFileSync(user0Screenshot, path.join(brainDir, "user_footer_0_selected.png"));

      // ─────────────────────────────────────────────────────────────────────────────
      // 2. Select 1 User: Verify Footer shows "1 row selected", Top Toolbar Clean
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 2. Testing 1 User Selected: Footer Must Display '1 row selected' ---");
      const rowCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      assert(rowCheckboxes.length >= 2, `Found ${rowCheckboxes.length} user rows with checkboxes`);

      await rowCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 600));

      const state1 = await getFooterAndToolbarState();
      console.log("  State after 1 selection:", state1);

      assert(state1.hasFooterSelectedCount, "Footer displays selected row count");
      assert(
         state1.selectedRowCountText.toLowerCase().includes("1 row selected") ||
         state1.selectedRowCountText.toLowerCase().includes("1 selected"),
         `Footer selected count text is '${state1.selectedRowCountText}' (expected to include '1 row selected')`
      );
      assert(!state1.hasTopSelectedChip, "Top toolbar still has NO selected count badge");
      assert(!state1.hasDeselectAll, "Top toolbar still has NO 'Deselect All' button");
      assert(!state1.hasClearSelectionIcon, "Top toolbar still has NO 'Clear Selection' icon");
      assert(!state1.hasExportSelected, "Top toolbar still has NO 'Export selected' button");
      assert(!state1.hasPrintSelected, "Top toolbar still has NO 'Print selected' button");
      assert(state1.hasSearchInput, "Original Search input remains in toolbar");
      assert(state1.hasRoleInput, "Original 'Filter by Role' remains in toolbar");

      // Capture screenshot of User page with 1 row selected
      const user1Screenshot = "screenshots/user_footer_1_selected.png";
      await page.screenshot({ path: user1Screenshot, fullPage: false });
      fs.copyFileSync(user1Screenshot, path.join(brainDir, "user_footer_1_selected.png"));
      console.log(`  ✓ Screenshot captured: ${user1Screenshot}`);

      // ─────────────────────────────────────────────────────────────────────────────
      // 3. Select 2 Users: Verify Footer updates to "2 rows selected", Top Toolbar Clean
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 3. Testing 2 Users Selected: Footer Must Update to '2 rows selected' ---");
      await rowCheckboxes[1].click();
      await new Promise((r) => setTimeout(r, 600));

      const state2 = await getFooterAndToolbarState();
      console.log("  State after 2 selections:", state2);

      assert(state2.hasFooterSelectedCount, "Footer displays selected row count");
      assert(
         state2.selectedRowCountText.toLowerCase().includes("2 rows selected") ||
         state2.selectedRowCountText.toLowerCase().includes("2 selected"),
         `Footer selected count text is '${state2.selectedRowCountText}' (expected to include '2 rows selected')`
      );
      assert(!state2.hasTopSelectedChip, "Top toolbar still has NO selected count badge");
      assert(!state2.hasDeselectAll, "Top toolbar still has NO 'Deselect All' button");
      assert(!state2.hasClearSelectionIcon, "Top toolbar still has NO 'Clear Selection' icon");

      // Capture screenshot of User page with 2 rows selected
      const user2Screenshot = "screenshots/user_footer_2_selected.png";
      await page.screenshot({ path: user2Screenshot, fullPage: false });
      fs.copyFileSync(user2Screenshot, path.join(brainDir, "user_footer_2_selected.png"));
      console.log(`  ✓ Screenshot captured: ${user2Screenshot}`);

      // ─────────────────────────────────────────────────────────────────────────────
      // 4. Deselect 1 User: Verify Footer updates back to "1 row selected"
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 4. Testing Deselect 1 User: Footer Must Update back to '1 row selected' ---");
      await rowCheckboxes[1].click();
      await new Promise((r) => setTimeout(r, 600));

      const stateDeselect1 = await getFooterAndToolbarState();
      console.log("  State after deselecting second row:", stateDeselect1);

      assert(stateDeselect1.hasFooterSelectedCount, "Footer still displays selected row count");
      assert(
         stateDeselect1.selectedRowCountText.toLowerCase().includes("1 row selected") ||
         stateDeselect1.selectedRowCountText.toLowerCase().includes("1 selected"),
         `Footer selected count updated to '${stateDeselect1.selectedRowCountText}'`
      );

      // ─────────────────────────────────────────────────────────────────────────────
      // 5. Deselect All Users: Verify Footer count Disappears Completely
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 5. Testing Deselect Remaining User: Footer Count Must Disappear ---");
      await rowCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 600));

      const stateCleared = await getFooterAndToolbarState();
      console.log("  State after clearing all selections:", stateCleared);

      assert(!stateCleared.hasFooterSelectedCount, "Footer selected row count completely disappeared when 0 rows are selected");
      assert(!stateCleared.hasTopSelectedChip, "Top toolbar has NO selected count badge");

      // ─────────────────────────────────────────────────────────────────────────────
      // 6. Header Checkbox Test: Select All Rows
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 6. Testing Header Checkbox (Select All / Deselect All) ---");
      const headerCheckbox = await page.$('.MuiDataGrid-columnHeader .MuiCheckbox-root input[type="checkbox"]');
      if (headerCheckbox) {
         await headerCheckbox.click();
         await new Promise((r) => setTimeout(r, 600));

         const stateHeaderAll = await getFooterAndToolbarState();
         console.log("  State after header select-all:", stateHeaderAll);
         assert(stateHeaderAll.hasFooterSelectedCount, "Footer displays selected count after header select-all");
         assert(!stateHeaderAll.hasTopSelectedChip, "Top toolbar has NO selected badge even after header select-all");

         // Deselect via header checkbox
         await headerCheckbox.click();
         await new Promise((r) => setTimeout(r, 600));

         const stateHeaderCleared = await getFooterAndToolbarState();
         console.log("  State after header deselect-all:", stateHeaderCleared);
         assert(!stateHeaderCleared.hasFooterSelectedCount, "Footer selected count disappeared after header deselect-all");
      } else {
         console.log("  (Header checkbox not rendered, skipping header checkbox test)");
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 7. Verify Regression: Product Page retains top selection toolbar & export
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 7. Verifying Product Page: Retains Top Selection Toolbar & Export ---");
      await page.goto(`${BASE_URL}/admin/product`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));

      const productCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (productCheckboxes.length > 0) {
         await productCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 600));

         const productState = await page.evaluate(() => {
            const chips = Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent.trim());
            const buttons = Array.from(document.querySelectorAll("button")).map((b) => b.textContent.trim());
            const footerCount = document.querySelector(".MuiDataGrid-selectedRowCount")?.textContent?.trim() || "";
            return {
               chips,
               hasSelectedChip: chips.some((t) => t && t.toLowerCase().includes("selected")),
               hasExportSelected: buttons.some((b) => b.toLowerCase().includes("export selected")),
               hasDeselectAll: buttons.some((b) => b === "Deselect All"),
               footerCount,
            };
         });
         console.log("  Product Page State with 1 selection:", productState);
         assert(productState.hasSelectedChip, "Product page still displays top selection count badge");
         assert(productState.hasExportSelected, "Product page still displays 'Export selected' button");
         assert(productState.hasDeselectAll, "Product page still displays 'Deselect All' button");
      }

      console.log("\n================================================================================");
      console.log(`  ALL ${passed.length} VERIFICATION CHECKS PASSED SUCCESSFULLY!`);
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
