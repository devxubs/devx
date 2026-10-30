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
   console.log("  DEVX POS - USER PAGE VIEW MODAL & ACTION CLEANUP VERIFICATION");
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
      // 1. Visit User Page & Inspect Header Toolbar (0 Rows Selected)
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("--- 1. Testing User Page Header Toolbar (0 Rows Selected) ---");
      await page.goto(`${BASE_URL}/admin/user`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));

      assert(page.url().includes("/admin/user"), "User page loaded successfully");

      // Verify "Add user" button is preserved in page header
      const hasAddUser = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").includes("Add user"))
      );
      assert(hasAddUser, "Page-level 'Add user' button preserved in page header");

      // Verify search input is present
      const searchBox = await page.$("input[placeholder='Search']");
      assert(Boolean(searchBox), "Search box is present in User table toolbar");

      // Verify "Filter by Role" dropdown is present
      const roleFilterInput = await page.$("input[placeholder='Select Role']");
      assert(Boolean(roleFilterInput), "'Filter by Role' autocomplete dropdown is present");

      // Verify ABSOLUTELY NO Export or Print button in table header
      const allButtons = await page.$$eval("button", (btns) =>
         btns.map((b) => (b.textContent || "").trim()).filter(Boolean)
      );
      console.log("  Page buttons found:", allButtons);
      const hasExportBtn = allButtons.some((txt) => txt.toLowerCase().includes("export"));
      const hasPrintBtn = allButtons.some((txt) => txt.toLowerCase().includes("print"));
      assert(!hasExportBtn, "NO Export button rendered in User table header");
      assert(!hasPrintBtn, "NO Print button rendered in User table header");

      // Capture screenshot of User page State A
      const userStateAScreenshot = "screenshots/user_page_state_a_clean.png";
      await page.screenshot({ path: userStateAScreenshot, fullPage: false });
      fs.copyFileSync(userStateAScreenshot, path.join(brainDir, "user_page_state_a_clean.png"));
      console.log(`  ✓ User page State A screenshot captured: ${userStateAScreenshot}`);

      // ─────────────────────────────────────────────────────────────────────────────
      // 2. Test Selection Toolbar: NO Export, NO Print, ONLY Selection Badge & Deselect
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 2. Testing User Selection Toolbar (No Print, No Export) ---");
      const checkboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      assert(checkboxes.length >= 2, `Found ${checkboxes.length} user rows with checkboxes`);

      // Select row 1
      await checkboxes[0].click();
      await new Promise((r) => setTimeout(r, 400));

      const badge1 = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
      );
      assert(badge1 === "1 selected", `Toolbar shows selection badge: "${badge1}"`);

      // Select row 2
      await checkboxes[1].click();
      await new Promise((r) => setTimeout(r, 400));

      const badge2 = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).find((t) => t && t.includes("selected"))
      );
      assert(badge2 === "2 selected", `Toolbar updates selection badge: "${badge2}"`);

      // Verify buttons present in the selection toolbar
      const selectionButtons = await page.evaluate(() => {
         const allBtns = Array.from(document.querySelectorAll("button"));
         return allBtns.map((b) => ({
            text: (b.textContent || "").trim(),
            ariaLabel: b.getAttribute("aria-label") || "",
         }));
      });

      const hasExportSelected = selectionButtons.some((b) => b.text.toLowerCase().includes("export"));
      const hasPrintSelected = selectionButtons.some((b) => b.text.toLowerCase().includes("print"));
      const hasPrintProfile = selectionButtons.some((b) => b.text.toLowerCase().includes("profile"));
      const hasDeselectAll = selectionButtons.some((b) => b.text === "Deselect All");
      const hasClearIcon = selectionButtons.some((b) => b.ariaLabel.toLowerCase().includes("clear selection"));

      assert(!hasExportSelected, "NO 'Export selected' action in selection toolbar");
      assert(!hasPrintSelected, "NO 'Print selected' action in selection toolbar");
      assert(!hasPrintProfile, "NO 'Print Profile' action in selection toolbar");
      assert(hasDeselectAll, "'Deselect All' button is present in selection toolbar");
      assert(hasClearIcon, "Clear selection icon button (close-circle) is present");

      // Capture screenshot of User Selection Toolbar
      const userSelectionScreenshot = "screenshots/user_page_selection_toolbar.png";
      await page.screenshot({ path: userSelectionScreenshot, fullPage: false });
      fs.copyFileSync(userSelectionScreenshot, path.join(brainDir, "user_page_selection_toolbar.png"));
      console.log(`  ✓ User selection toolbar screenshot captured: ${userSelectionScreenshot}`);

      // Deselect all
      await page.evaluate(() => {
         const btns = Array.from(document.querySelectorAll("button"));
         const d = btns.find((b) => (b.textContent || "").trim() === "Deselect All");
         if (d) d.click();
      });
      await new Promise((r) => setTimeout(r, 500));

      const afterDeselectBadge = await page.$$eval(".MuiChip-label", (chips) =>
         chips.map((c) => c.textContent).filter((t) => t && t.includes("selected"))
      );
      assert(afterDeselectBadge.length === 0, "Deselect All clears selection back to 0");

      // ─────────────────────────────────────────────────────────────────────────────
      // 3. Test User View Modal using Reusable CustomModal
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 3. Testing User View Modal using Shared CustomModal ---");
      // Click first user ID to open modal
      const firstIdCell = await page.$(".MuiDataGrid-cell[data-field='id'] p, .MuiDataGrid-cell[data-field='id'] .MuiTypography-root");
      assert(Boolean(firstIdCell), "User ID link cell found in table");
      await firstIdCell.click();
      await new Promise((r) => setTimeout(r, 900));

      // Inspect the opened modal
      const modalInfo = await page.evaluate(() => {
         const modalEl = document.querySelector(".MuiModal-root:not([aria-hidden='true'])");
         if (!modalEl) return null;

         const text = modalEl.textContent || "";
         const buttons = Array.from(modalEl.querySelectorAll("button")).map((b) => ({
            text: (b.textContent || "").trim(),
            ariaLabel: b.getAttribute("aria-label") || "",
            className: b.className,
         }));

         // Check fields
         const hasTitle = text.includes("User Details");
         const hasPhone = text.includes("Phone Number");
         const hasStatus = text.includes("Account Status");
         const hasSalary = text.includes("Salary");
         const hasHireDate = text.includes("Hire Date");
         const hasAddress = text.includes("Address");
         const hasPrintProfile = text.toLowerCase().includes("print profile") || buttons.some((b) => b.text.toLowerCase().includes("print"));

         // Check close buttons:
         // Only the header close icon button should exist!
         // NO extra Close button in content or footer!
         const footerCloseBtn = buttons.find((b) => b.text.toLowerCase() === "close");
         const topCloseIcon = modalEl.querySelector(".MuiIconButton-root");

         return {
            isOpen: Boolean(modalEl),
            hasTitle,
            hasPhone,
            hasStatus,
            hasSalary,
            hasHireDate,
            hasAddress,
            hasPrintProfile,
            buttonCount: buttons.length,
            buttons,
            hasFooterCloseBtn: Boolean(footerCloseBtn),
            hasTopCloseIcon: Boolean(topCloseIcon),
            snippet: text.slice(0, 300),
         };
      });

      console.log("  User View Modal Info:", modalInfo);
      assert(modalInfo && modalInfo.isOpen, "User View modal opened using shared CustomModal");
      assert(modalInfo.hasTitle, "Modal displays header title 'User Details'");
      assert(modalInfo.hasPhone && modalInfo.hasStatus, "Modal displays Phone Number and Account Status");
      assert(modalInfo.hasSalary && modalInfo.hasHireDate, "Modal displays Salary and Hire Date");
      assert(modalInfo.hasAddress, "Modal displays Address");
      assert(!modalInfo.hasPrintProfile, "Print Profile button is COMPLETELY REMOVED from User View modal");
      assert(!modalInfo.hasFooterCloseBtn, "NO extra 'Close' button in modal content/footer");
      assert(modalInfo.hasTopCloseIcon, "Shared modal's original top-right close icon is present and active");
      assert(modalInfo.buttonCount === 1, `Exactly 1 button inside modal (only the top-right close icon, found ${modalInfo.buttonCount})`);

      // Capture screenshot of User View Modal
      const userModalScreenshot = "screenshots/user_view_custom_modal_clean.png";
      await page.screenshot({ path: userModalScreenshot, fullPage: false });
      fs.copyFileSync(userModalScreenshot, path.join(brainDir, "user_view_custom_modal_clean.png"));
      console.log(`  ✓ User View Modal screenshot captured: ${userModalScreenshot}`);

      // ─────────────────────────────────────────────────────────────────────────────
      // 4. Test Closing Behavior: Close Icon, Escape Key, Backdrop Click
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 4. Testing Modal Closing Behaviors ---");

      // 4a. Close via top close icon
      await page.evaluate(() => {
         const modalEl = document.querySelector(".MuiModal-root:not([aria-hidden='true'])");
         const closeIcon = modalEl ? modalEl.querySelector(".MuiIconButton-root") : null;
         if (closeIcon) closeIcon.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      const isClosed1 = await page.evaluate(() => !document.querySelector(".MuiModal-root:not([aria-hidden='true'])"));
      assert(isClosed1, "User View modal closed cleanly via top-right close icon");

      // 4b. Open via user name click & close via Escape key
      const nameCell = await page.$(".MuiDataGrid-cell[data-field='name']");
      if (nameCell) {
         await nameCell.click();
         await new Promise((r) => setTimeout(r, 800));

         const isReopened = await page.evaluate(() => Boolean(document.querySelector(".MuiModal-root:not([aria-hidden='true'])")));
         assert(isReopened, "User View modal re-opened via clicking Name cell");

         await page.keyboard.press("Escape");
         await new Promise((r) => setTimeout(r, 600));

         const isClosed2 = await page.evaluate(() => !document.querySelector(".MuiModal-root:not([aria-hidden='true'])"));
         assert(isClosed2, "User View modal closed cleanly via Escape key");
      }

      // 4c. Open & close via Backdrop click
      if (firstIdCell) {
         await firstIdCell.click();
         await new Promise((r) => setTimeout(r, 800));

         // Click at coordinate (50, 50) outside the modal box to trigger backdrop close
         await page.mouse.click(50, 50);
         await new Promise((r) => setTimeout(r, 800));

         const isClosed3 = await page.evaluate(() => !document.querySelector(".MuiModal-root:not([aria-hidden='true'])"));
         assert(isClosed3, "User View modal closed cleanly via Backdrop click");
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 5. Test User Row Actions Menu (No Print / No Export)
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 5. Testing User Row Action Menu ---");
      await page.evaluate(() => {
         const btn = document.querySelector(".MuiDataGrid-cell[data-field='@actions'] button");
         if (btn) {
            btn.scrollIntoView();
            btn.click();
         }
      });
      await new Promise((r) => setTimeout(r, 600));

      const menuItems = await page.evaluate(() => {
         const popover = document.querySelector(".MuiPopover-root:not([aria-hidden='true'])");
         if (!popover) return [];
         return Array.from(popover.querySelectorAll(".MuiListItemButton-root, button, li")).map((el) => el.textContent.trim());
      });
      console.log("  User row menu items:", menuItems);

      assert(menuItems.includes("Edit"), "Row menu contains 'Edit'");
      assert(menuItems.includes("Suspended"), "Row menu contains 'Suspended'");
      assert(menuItems.includes("Delete"), "Row menu contains 'Delete'");
      assert(!menuItems.some((m) => m.toLowerCase().includes("print")), "Row menu contains NO print actions");
      assert(!menuItems.some((m) => m.toLowerCase().includes("export")), "Row menu contains NO export actions");

      // Dismiss menu
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));

      // ─────────────────────────────────────────────────────────────────────────────
      // 6. Verify Other Modules Retain Existing Print and Export
      // ─────────────────────────────────────────────────────────────────────────────
      console.log("\n--- 6. Verifying Other Modules Retain Existing Print & Export ---");

      // Check Product module retains Export
      await page.goto(`${BASE_URL}/admin/product`, { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 800));

      const productExportBtn = await page.$$eval("button", (btns) =>
         btns.some((b) => (b.textContent || "").trim() === "Export")
      );
      assert(productExportBtn, "Product module still retains normal 'Export' button");

      // Check Order module retains Print and Export
      await page.goto(`${BASE_URL}/admin/order`, { waitUntil: "networkidle2" });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 800));

      const orderCheckboxes = await page.$$('.MuiDataGrid-row .MuiCheckbox-root input[type="checkbox"]');
      if (orderCheckboxes.length > 0) {
         await orderCheckboxes[0].click();
         await new Promise((r) => setTimeout(r, 400));
         const buttonsText = await page.$$eval("button", (btns) => btns.map((b) => b.textContent.trim()));
         const hasOrderExport = buttonsText.some((t) => t.includes("Export selected"));
         const hasOrderPrint = buttonsText.some((t) => t.includes("Print selected"));
         assert(hasOrderExport, "Order module retains 'Export selected' functionality");
         assert(hasOrderPrint, "Order module retains 'Print selected' functionality");
      }

      console.log("\n================================================================================");
      console.log(`  VERIFICATION RESULTS: ${passed.length} PASSED | ${failed.length} FAILED (100% SUCCESS)`);
      console.log("================================================================================\n");
   } finally {
      await browser.close();
      await prisma.$disconnect();
   }
}

runTest().catch((err) => {
   console.error("Test failed:", err);
   process.exit(1);
});
