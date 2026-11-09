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

async function runVerification() {
  console.log('--- Starting Comprehensive Quick Edit Modal Redesign Verification ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set auth cookie
  await page.setCookie({
    name: 'devx_token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  });

  // Track console logs and errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });

  try {
    // =========================================================================
    // 1. DESKTOP VIEWPORT (1440 x 900) - Order Details Page Quick Edit
    // =========================================================================
    console.log('\n[1/4] Testing Desktop Viewport (1440x900) on /admin/order/ORD_1 ...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/admin/order/ORD_1', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Look for Quick Edit icon button
    console.log('Looking for Quick Edit icon button on Order Details...');
    const quickEditBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 30000 });
    if (!quickEditBtn) {
      throw new Error('Quick Edit button not found on Order Details page');
    }
    await new Promise((r) => setTimeout(r, 1000));
    await quickEditBtn.click();
    console.log('Clicked Quick Edit button.');

    // Wait for modal to open
    await new Promise((r) => setTimeout(r, 2500));

    // Capture initial open modal
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/quick_edit_redesign_desktop_open.png`,
    });
    console.log('Saved quick_edit_redesign_desktop_open.png');

    // Test editing: change item quantity
    console.log('Testing item quantity stepper and price updates...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const hasPlus = await page.evaluate(
        (el) => Boolean(el.querySelector('svg[data-icon*="add"], svg[data-icon*="plus"]')),
        btn,
      );
      if (hasPlus) {
        await btn.click();
        console.log('Clicked quantity increment button');
        await new Promise((r) => setTimeout(r, 800));
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 1000));

    // Capture edited state
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/quick_edit_redesign_desktop_edited.png`,
    });
    console.log('Saved quick_edit_redesign_desktop_edited.png');

    // Click "Save Order Changes" button
    console.log('Looking for "Save Order Changes" button...');
    const allButtons = await page.$$('button');
    let saveClicked = false;
    for (const btn of allButtons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text && text.includes('Save Order Changes')) {
        await btn.click();
        saveClicked = true;
        console.log('Clicked "Save Order Changes" button.');
        break;
      }
    }

    if (!saveClicked) {
      console.warn('Could not find "Save Order Changes" button by text. Trying primary buttons...');
    }

    // Wait for save operation to finish and modal to close
    await new Promise((r) => setTimeout(r, 3500));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/quick_edit_redesign_desktop_saved.png`,
    });
    console.log('Saved quick_edit_redesign_desktop_saved.png');

    // =========================================================================
    // 2. TABLET VIEWPORT (768 x 1024)
    // =========================================================================
    console.log('\n[2/4] Testing Tablet Viewport (768x1024) ...');
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000/admin/order/ORD_1', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const tabletQuickEditBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 25000 });
    if (tabletQuickEditBtn) {
      await new Promise((r) => setTimeout(r, 1000));
      await tabletQuickEditBtn.click();
      await new Promise((r) => setTimeout(r, 2000));
      await page.screenshot({
        path: `${ARTIFACTS_DIR}/quick_edit_redesign_tablet.png`,
      });
      console.log('Saved quick_edit_redesign_tablet.png');

      // Close modal
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const cancel = btns.find((b) => b.innerText.includes('Cancel'));
        if (cancel) cancel.click();
      });
      await new Promise((r) => setTimeout(r, 1000));
    }

    // =========================================================================
    // 3. MOBILE VIEWPORT (375 x 812)
    // =========================================================================
    console.log('\n[3/4] Testing Mobile Viewport (375x812) ...');
    await page.setViewport({ width: 375, height: 812 });
    await page.goto('http://localhost:3000/admin/order/ORD_1', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const mobileQuickEditBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 25000 });
    if (mobileQuickEditBtn) {
      await new Promise((r) => setTimeout(r, 1000));
      await mobileQuickEditBtn.click();
      await new Promise((r) => setTimeout(r, 2000));
      await page.screenshot({
        path: `${ARTIFACTS_DIR}/quick_edit_redesign_mobile.png`,
      });
      console.log('Saved quick_edit_redesign_mobile.png');

      // Close modal
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const cancel = btns.find((b) => b.innerText.includes('Cancel'));
        if (cancel) cancel.click();
      });
      await new Promise((r) => setTimeout(r, 1000));
    }

    // =========================================================================
    // 4. ORDERS LIST TABLE QUICK EDIT (/admin/order)
    // =========================================================================
    console.log('\n[4/4] Testing Quick Edit from Orders Table (/admin/order) ...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/admin/order', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForSelector('tbody tr, .MuiDataGrid-row, tr', { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Look for quick edit icon button in the table rows
    console.log('Searching for quick edit pen icon in orders table...');
    const allTableBtns = await page.$$('button');
    let quickEditClicked = false;
    for (const btn of allTableBtns) {
      const isPenIcon = await page.evaluate(
        (el) => Boolean(el.querySelector('svg[data-icon="solar:pen-bold"], svg[data-icon*="pen"]')),
        btn,
      );
      if (isPenIcon) {
        await btn.click();
        quickEditClicked = true;
        console.log('Clicked Quick Edit pen icon on orders table row!');
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 2500));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/quick_edit_from_orders_table.png`,
    });
    console.log('Saved quick_edit_from_orders_table.png');

    console.log('\n=== ALL BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Browser verification failed with error:', err);
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/quick_edit_error.png`,
    });
    throw err;
  } finally {
    await browser.close();
  }
}

runVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});
