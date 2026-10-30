const puppeteer = require("puppeteer");
const fs = require("fs");

const pages = [
   "/admin/user",
   "/admin/reports",
   "/admin/bin",
   "/admin/roles",
   "/admin/billing",
];

(async () => {
   // create screenshots folder if not exists
   if (!fs.existsSync("screenshots")) {
      fs.mkdirSync("screenshots");
   }

   const browser = await puppeteer.launch({
      headless: true,
   });

   const page = await browser.newPage();

   // ✅ Set viewport BEFORE navigation
   await page.setViewport({
      width: 1920,
      height: 1080,
   });

   // ✅ Better stability for Next.js
   await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
   );

   for (const route of pages) {
      const url = `http://localhost:3000${route}`;

      try {
         console.log(`🚀 Visiting: ${url}`);

         await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 0,
         });

         // ✅ wait for UI rendering
         await new Promise((resolve) => setTimeout(resolve, 5000));

         const fileName = route === "/" ? "home" : route.replace(/\//g, "_");

         await page.screenshot({
            path: `screenshots/${fileName}.png`,
            fullPage: true,
         });

         console.log(`✅ Screenshot: ${fileName}`);
      } catch (err) {
         console.log(`❌ Failed: ${route}`);
         console.log(err.message);
      }
   }

   await browser.close();
})();
