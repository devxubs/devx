const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');

const ARTIFACTS_DIR = '/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });

  const token = jwt.sign(
    { id: 'cmvrtax2v00000swqrpleclyr', email: 'devxub@gmail.com', name: 'jubayer', role: 'admin' },
    'devx-pos-secure-jwt-secret-key-32chars-minimum!'
  );
  await page.setCookie({ name: 'devx_token', value: token, domain: 'localhost', path: '/' });

  await page.goto('http://localhost:3000/admin/order/ORD_1', { waitUntil: 'networkidle0' });

  // Click Quick Edit button
  await page.evaluate(() => {
    const b = document.querySelector('button[aria-label="Quick Edit"]');
    if (b) b.click();
  });

  await new Promise((r) => setTimeout(r, 2000));

  // Find the quick edit modal and its bounding rect
  const rect = await page.evaluate(() => {
    const modals = Array.from(document.querySelectorAll('.MuiModal-root'));
    const qeModal = modals.find((m) => m.innerText && m.innerText.includes('Quick Edit Order Items'));
    if (!qeModal) return null;
    const box = qeModal.querySelector('.MuiBox-root');
    if (!box) return null;
    const r = box.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  console.log('Modal box rect:', rect);

  // Scroll inside modal box to notes section
  await page.evaluate(() => {
    const modals = Array.from(document.querySelectorAll('.MuiModal-root'));
    const qeModal = modals.find((m) => m.innerText && m.innerText.includes('Quick Edit Order Items'));
    if (!qeModal) return;

    // Find scrollable container inside modal
    const scrollContainers = Array.from(qeModal.querySelectorAll('div')).filter(
      (d) => d.scrollHeight > d.clientHeight && d.clientHeight > 100
    );
    console.log('Found scroll containers in modal:', scrollContainers.length);
    for (const sc of scrollContainers) {
      sc.scrollTop = sc.scrollHeight; // scroll to bottom (notes section)
    }
  });

  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: `${ARTIFACTS_DIR}/redesigned_notes_mobile_responsive.png`,
  });
  console.log('Saved redesigned_notes_mobile_responsive.png successfully!');

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
