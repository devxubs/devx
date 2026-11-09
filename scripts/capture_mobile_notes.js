const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'devx-pos-secure-jwt-secret-key-32chars-minimum!';
const token = jwt.sign(
  {
    id: 'cmvrtax2v00000swqrpleclyr',
    email: 'devxub@gmail.com',
    name: 'jubayer',
    role: 'admin',
  },
  JWT_SECRET,
);

const ARTIFACTS_DIR = '/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });

  await page.setCookie({
    name: 'devx_token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  });

  try {
    await page.goto('http://localhost:3000/admin/order/ORD_1', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    const quickEditBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));
    await quickEditBtn.click();
    console.log('Clicked Quick Edit button.');

    await new Promise((r) => setTimeout(r, 2000));

    // Scroll window to modal box and scroll inside modal box to notes section
    await page.evaluate(() => {
      // Find modal content box
      const modalBox = document.querySelector('.MuiModal-root > div.MuiBox-root, div[role="presentation"] > div');
      if (modalBox) {
        modalBox.scrollIntoView({ behavior: 'instant', block: 'center' });
      }

      // Scroll inside modal to Order Notes & Instructions
      const allHeaders = Array.from(document.querySelectorAll('h6, p, span, div'));
      const notesEl = allHeaders.find((el) => el.innerText && el.innerText.trim() === 'Order Notes & Instructions');
      if (notesEl) {
        notesEl.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });

    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/redesigned_notes_mobile_responsive.png`,
    });
    console.log('Saved redesigned_notes_mobile_responsive.png successfully!');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
