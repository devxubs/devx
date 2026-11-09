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

async function testMobileNotesView() {
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

    console.log('Waiting for Quick Edit button...');
    const quickEditBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));
    await quickEditBtn.click();
    console.log('Clicked Quick Edit button on mobile.');
    await new Promise((r) => setTimeout(r, 2500));

    // Scroll down inside the modal to the Order Notes section
    await page.evaluate(() => {
      // Find all scrollable modal containers
      const modalBodies = Array.from(document.querySelectorAll('.MuiDialogContent-root, div[role="dialog"] div'));
      for (const mb of modalBodies) {
        if (mb.scrollHeight > mb.clientHeight) {
          mb.scrollTop = mb.scrollHeight;
        }
      }
      const el = Array.from(document.querySelectorAll('p, h6, span')).find((e) =>
        e.innerText && e.innerText.includes('Order Notes & Instructions')
      );
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });

    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/redesigned_notes_mobile_responsive.png`,
    });
    console.log('Saved redesigned_notes_mobile_responsive.png');
  } finally {
    await browser.close();
  }
}

testMobileNotesView().catch((e) => {
  console.error(e);
  process.exit(1);
});
