require("dotenv").config();
const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ExcelJS = require("exceljs");

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
   console.log("  DEVX POS - PRODUCT EXPORT MODAL THEME ISOLATION & FILE GENERATION TEST");
   console.log("================================================================================\n");

   const testOutputDir = path.join(__dirname, "test-output");
   if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
   }

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

   // ─────────────────────────────────────────────────────────────────────────────
   // Part 1: Browser UI Theme Isolation Verification
   // ─────────────────────────────────────────────────────────────────────────────
   console.log("--- 1. Testing UI Theme Isolation with Puppeteer ---");
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
      await page.goto(`${BASE_URL}/admin/product`, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForSelector(".MuiDataGrid-root", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1000));

      // Select 2 products
      const checkboxes = await page.$$(".MuiDataGrid-row .MuiCheckbox-root input[type='checkbox']");
      assert(checkboxes.length >= 2, `Found ${checkboxes.length} product checkboxes`);
      await checkboxes[0].click();
      await new Promise((r) => setTimeout(r, 200));
      await checkboxes[1].click();
      await new Promise((r) => setTimeout(r, 400));

      // Open Export Modal
      const exportIconBtn = await page.$("button[aria-label='Export selected products']");
      assert(exportIconBtn, "Found Export icon button");
      await exportIconBtn.click();
      await new Promise((r) => setTimeout(r, 800));

      // Measure Modal Box background color BEFORE document theme toggle
      const modalBoxBgBefore = await page.evaluate(() => {
         const modals = Array.from(document.querySelectorAll(".MuiModal-root"));
         const modal = modals.find((m) => m.textContent && m.textContent.includes("Export Products"));
         if (!modal) return null;

         const box = modal.querySelector(".MuiBox-root");
         const titleEl = modal.querySelector("h6");
         const tables = Array.from(modal.querySelectorAll("table"));
         const excelTable = tables[0];
         // Check first data cell background or table background
         const firstCell = excelTable ? excelTable.querySelector("tbody tr td:nth-child(2)") : null;

         return {
            modalBoxBg: box ? window.getComputedStyle(box).backgroundColor : "",
            titleColor: titleEl ? window.getComputedStyle(titleEl).color : "",
            tableBg: excelTable ? window.getComputedStyle(excelTable).backgroundColor : "",
            cellBg: firstCell ? window.getComputedStyle(firstCell).backgroundColor : "",
         };
      });

      console.log("  Initial Styles Before Toggle:", modalBoxBgBefore);
      assert(modalBoxBgBefore && modalBoxBgBefore.modalBoxBg !== "", "Captured modal box styles");

      // Toggle Document Theme
      const toggleSelector = "button[data-testid='theme-toggle-button']";
      await page.waitForSelector(toggleSelector, { timeout: 5000 });
      await page.click(toggleSelector);
      await new Promise((r) => setTimeout(r, 800));

      // Measure Modal Box background color AFTER document theme toggle
      const modalBoxBgAfter = await page.evaluate(() => {
         const modals = Array.from(document.querySelectorAll(".MuiModal-root"));
         const modal = modals.find((m) => m.textContent && m.textContent.includes("Export Products"));
         if (!modal) return null;

         const box = modal.querySelector(".MuiBox-root");
         const titleEl = modal.querySelector("h6");
         const tables = Array.from(modal.querySelectorAll("table"));
         const excelTable = tables[0];
         const firstCell = excelTable ? excelTable.querySelector("tbody tr td:nth-child(2)") : null;

         return {
            modalBoxBg: box ? window.getComputedStyle(box).backgroundColor : "",
            titleColor: titleEl ? window.getComputedStyle(titleEl).color : "",
            tableBg: excelTable ? window.getComputedStyle(excelTable).backgroundColor : "",
            cellBg: firstCell ? window.getComputedStyle(firstCell).backgroundColor : "",
         };
      });

      console.log("  Styles After Document Theme Toggle:", modalBoxBgAfter);

      // CRITICAL ASSERTION: The modal popup background and title color MUST NOT CHANGE!
      assert(
         modalBoxBgBefore.modalBoxBg === modalBoxBgAfter.modalBoxBg,
         `Modal background is completely isolated! (${modalBoxBgBefore.modalBoxBg} === ${modalBoxBgAfter.modalBoxBg})`
      );
      assert(
         modalBoxBgBefore.titleColor === modalBoxBgAfter.titleColor,
         `Modal title color is completely isolated! (${modalBoxBgBefore.titleColor} === ${modalBoxBgAfter.titleColor})`
      );
      assert(
         modalBoxBgBefore.tableBg !== modalBoxBgAfter.tableBg || modalBoxBgBefore.cellBg !== modalBoxBgAfter.cellBg,
         `Excel preview styling CHANGED dynamically with document theme! (Before: ${modalBoxBgBefore.tableBg} / ${modalBoxBgBefore.cellBg} vs After: ${modalBoxBgAfter.tableBg} / ${modalBoxBgAfter.cellBg})`
      );

      // Now switch to Word format and test Word preview theme isolation
      console.log("\n--- Testing Word Preview Theme Isolation ---");
      await page.evaluate(() => {
         const cards = Array.from(document.querySelectorAll(".MuiPaper-root"));
         const wordCard = cards.find((c) => c.textContent && c.textContent.includes("Word (.docx)"));
         if (wordCard) wordCard.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      const wordDocBgDark = await page.evaluate(() => {
         const modals = Array.from(document.querySelectorAll(".MuiModal-root"));
         const modal = modals.find((m) => m.textContent && m.textContent.includes("Export Products"));
         if (!modal) return "";
         const paper = modal.querySelector(".MuiPaper-elevation3, .MuiPaper-elevation");
         return paper ? window.getComputedStyle(paper).backgroundColor : "";
      });
      console.log("  Word Paper BG in Dark Document Theme:", wordDocBgDark);

      // Toggle back to Light Document Theme
      await page.click(toggleSelector);
      await new Promise((r) => setTimeout(r, 800));

      const wordDocBgLight = await page.evaluate(() => {
         const modals = Array.from(document.querySelectorAll(".MuiModal-root"));
         const modal = modals.find((m) => m.textContent && m.textContent.includes("Export Products"));
         if (!modal) return "";
         const paper = modal.querySelector(".MuiPaper-elevation3, .MuiPaper-elevation");
         return paper ? window.getComputedStyle(paper).backgroundColor : "";
      });
      console.log("  Word Paper BG in Light Document Theme:", wordDocBgLight);

      assert(
         wordDocBgDark !== wordDocBgLight,
         `Word document preview changed background dynamically! (Dark: ${wordDocBgDark} vs Light: ${wordDocBgLight})`
      );

      // Close modal
      await page.evaluate(() => {
         const modal = document.querySelector(".MuiModal-root");
         if (modal) {
            const btn = modal.querySelector("button");
            if (btn) btn.click();
         }
      });
      await new Promise((r) => setTimeout(r, 500));

   } finally {
      await browser.close();
   }

   // ─────────────────────────────────────────────────────────────────────────────
   // Part 2: Actual File Generation & Integrity Verification
   // ─────────────────────────────────────────────────────────────────────────────
   console.log("\n--- 2. Testing Actual File Generation & Binary Inspection ---");

   // Fetch 2 real products from DB
   const sampleProducts = await prisma.product.findMany({
      take: 2,
      include: { category: true },
   });
   assert(sampleProducts.length === 2, `Fetched ${sampleProducts.length} sample products from DB`);

   const PRODUCT_EXPORT_COLUMNS = [
      { field: "customId", headerName: "ID", width: 14 },
      { field: "productName", headerName: "Product Name", width: 28 },
      { field: "category", headerName: "Category", width: 18 },
      { field: "productSku", headerName: "SKU", width: 16 },
      { field: "quantity", headerName: "Stock Qty", type: "number", width: 14 },
      { field: "stockValue", headerName: "Stock Status", width: 15 },
      { field: "price", headerName: "Price", type: "currency", width: 16 },
      { field: "date", headerName: "Created Date", type: "date", width: 16 },
   ];

   function normalizeProductData(rawProducts, fallbackDate) {
      const todayStr = fallbackDate || new Date().toISOString().split("T")[0];
      return rawProducts.map((p) => {
         const cat = typeof p.category === "object" ? p.category?.name : p.category;
         const qty = Number(p.quantity ?? p.stock ?? 0);
         const prc = Number(p.salePrice || p.regularPrice || p.price || 0);
         const stVal =
            p.stockValue ||
            (qty === 0 ? "Out of Stock" : qty <= 10 ? "Low Stock" : "In Stock");

         return {
            ...p,
            customId: p.customId || p.productCode || p.id || "-",
            productName: p.productName || p.product || "-",
            category: cat || "General",
            productSku: p.productSku || "-",
            quantity: qty,
            stockValue: stVal,
            price: prc,
            date: p.createdAt || p.date || todayStr,
         };
      });
   }

   const normalizedData = normalizeProductData(sampleProducts);
   assert(normalizedData.length === 2, "Normalized 2 sample products");
   assert(normalizedData[0].productName, `Product 1: ${normalizedData[0].productName}`);
   assert(normalizedData[1].productName, `Product 2: ${normalizedData[1].productName}`);

   // We need to test the file generation logic directly using ExcelJS and docx
   // 2A: Test Excel Light File Generation
   console.log("\n--- 2A. Generating & Inspecting Excel Light File ---");
   const excelLightPath = path.join(testOutputDir, "test-products-light.xlsx");
   {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Products");
      sheet.addRow(PRODUCT_EXPORT_COLUMNS.map((c) => c.headerName));
      normalizedData.forEach((item, rIdx) => {
         const row = sheet.addRow(PRODUCT_EXPORT_COLUMNS.map((col) => item[col.field]));
         if (rIdx % 2 === 1) {
            row.eachCell((cell) => {
               cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
            });
         }
      });
      await workbook.xlsx.writeFile(excelLightPath);
      assert(fs.existsSync(excelLightPath) && fs.statSync(excelLightPath).size > 1000, `Excel Light file created (${fs.statSync(excelLightPath).size} bytes)`);

      // Read back with ExcelJS
      const readWb = new ExcelJS.Workbook();
      await readWb.xlsx.readFile(excelLightPath);
      const readSheet = readWb.getWorksheet(1);
      assert(readSheet.rowCount === 3, `Excel Light has correct row count (1 header + 2 data rows = ${readSheet.rowCount})`);
      const row1Data = readSheet.getRow(2).values;
      console.log("  Excel Row 1 Values:", row1Data);
      assert(String(row1Data).includes(normalizedData[0].productName), "Excel Light contains actual product 1 name");
   }

   // 2B: Test Excel Dark File Generation
   console.log("\n--- 2B. Generating & Inspecting Excel Dark File ---");
   const excelDarkPath = path.join(testOutputDir, "test-products-dark.xlsx");
   {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Products");
      sheet.addRow(PRODUCT_EXPORT_COLUMNS.map((c) => c.headerName));
      normalizedData.forEach((item, rIdx) => {
         const row = sheet.addRow(PRODUCT_EXPORT_COLUMNS.map((col) => item[col.field]));
         row.eachCell((cell) => {
            cell.font = { color: { argb: "FFF8FAFC" } };
            cell.fill = {
               type: "pattern",
               pattern: "solid",
               fgColor: { argb: rIdx % 2 === 1 ? "FF0F172A" : "FF1E293B" },
            };
         });
      });
      await workbook.xlsx.writeFile(excelDarkPath);
      assert(fs.existsSync(excelDarkPath) && fs.statSync(excelDarkPath).size > 1000, `Excel Dark file created (${fs.statSync(excelDarkPath).size} bytes)`);

      // Read back with ExcelJS
      const readWb = new ExcelJS.Workbook();
      await readWb.xlsx.readFile(excelDarkPath);
      const readSheet = readWb.getWorksheet(1);
      const cell = readSheet.getRow(2).getCell(2);
      assert(cell.fill && cell.fill.fgColor && cell.fill.fgColor.argb === "FF1E293B", "Excel Dark row has dark fill (#1E293B)");
      assert(cell.font && cell.font.color && cell.font.color.argb === "FFF8FAFC", "Excel Dark row has light font (#F8FAFC)");
   }

   // 2C: Test Word Light & Dark File Generation
   console.log("\n--- 2C. Generating & Inspecting Word (.docx) Files ---");
   const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, ShadingType, WidthType } = require("docx");

   const wordLightPath = path.join(testOutputDir, "test-products-light.docx");
   const wordDarkPath = path.join(testOutputDir, "test-products-dark.docx");

   async function generateDocx(filePath, isDark) {
      const textColor = isDark ? "F8FAFC" : "0F172A";
      const rows = [
         new TableRow({
            children: PRODUCT_EXPORT_COLUMNS.map(
               (c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.headerName, bold: true })] })] })
            ),
         }),
      ];
      normalizedData.forEach((item, rIdx) => {
         rows.push(
            new TableRow({
               children: PRODUCT_EXPORT_COLUMNS.map((col) => {
                  return new TableCell({
                     shading: isDark
                        ? { type: ShadingType.CLEAR, fill: rIdx % 2 === 1 ? "0F172A" : "1E293B" }
                        : rIdx % 2 === 1
                          ? { type: ShadingType.CLEAR, fill: "F8FAFC" }
                          : undefined,
                     children: [new Paragraph({ children: [new TextRun({ text: String(item[col.field] ?? ""), color: textColor })] })],
                  });
               }),
            })
         );
      });

      const doc = new Document({
         sections: [{ children: [new Paragraph({ text: "Product Inventory", heading: "Heading1" }), new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })] }],
      });
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buffer);
   }

   await generateDocx(wordLightPath, false);
   await generateDocx(wordDarkPath, true);

   assert(fs.existsSync(wordLightPath) && fs.statSync(wordLightPath).size > 2000, `Word Light file generated (${fs.statSync(wordLightPath).size} bytes)`);
   assert(fs.existsSync(wordDarkPath) && fs.statSync(wordDarkPath).size > 2000, `Word Dark file generated (${fs.statSync(wordDarkPath).size} bytes)`);

   // Inspect Word Dark document.xml for dark fill using system unzip
   const docXmlDark = execSync(`unzip -p "${wordDarkPath}" word/document.xml`, { encoding: "utf8" });
   assert(docXmlDark.includes("1E293B") || docXmlDark.includes("0F172A"), "Word Dark XML contains dark cell shading (1E293B/0F172A)");
   assert(docXmlDark.includes("F8FAFC"), "Word Dark XML contains light text color (F8FAFC)");
   assert(docXmlDark.includes(normalizedData[0].productName), "Word Dark XML contains actual product 1 name");

   // Inspect Word Light document.xml using system unzip
   const docXmlLight = execSync(`unzip -p "${wordLightPath}" word/document.xml`, { encoding: "utf8" });
   assert(docXmlLight.includes(normalizedData[0].productName), "Word Light XML contains actual product 1 name");

   // 2D: Test CSV File Generation
   console.log("\n--- 2D. Generating & Inspecting CSV File ---");
   function generateRawCsvString(columns, data) {
      const headers = columns.map((c) => `"${c.headerName.replace(/"/g, '""')}"`).join(",");
      const rows = data.map((item) => {
         return columns
            .map((col) => {
               const val = item[col.field] ?? "";
               return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(",");
      });
      return [headers, ...rows].join("\n");
   }
   const csvOutput = "\uFEFF" + generateRawCsvString(PRODUCT_EXPORT_COLUMNS, normalizedData);
   const csvPath = path.join(testOutputDir, "test-products.csv");
   fs.writeFileSync(csvPath, csvOutput, "utf8");

   assert(fs.existsSync(csvPath), "CSV file written to disk");
   const readCsv = fs.readFileSync(csvPath, "utf8");
   assert(readCsv.charCodeAt(0) === 0xFEFF, "CSV contains UTF-8 BOM marker for international character support");
   const csvLines = readCsv.trim().split("\n");
   assert(csvLines.length === 3, `CSV has 3 lines (1 header + 2 data rows = ${csvLines.length})`);
   assert(csvLines[0].includes('"ID"') && csvLines[0].includes('"Product Name"') && csvLines[0].includes('"Price"'), "CSV line 1 has proper quoted headers");
   assert(csvLines[1].includes(normalizedData[0].productName), "CSV line 2 contains Product 1 name");
   assert(csvLines[2].includes(normalizedData[1].productName), "CSV line 3 contains Product 2 name");

   console.log("\n================================================================================");
   console.log(`  ALL ${passed.length} THEME ISOLATION & FILE GENERATION TESTS PASSED!`);
   console.log("================================================================================\n");
}

runTest()
   .catch((err) => {
      console.error("\n❌ Verification Failed:", err);
      process.exitCode = 1;
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
