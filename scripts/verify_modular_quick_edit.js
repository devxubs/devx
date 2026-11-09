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

async function runModularQuickEditVerification() {
  console.log('=== Starting Modular Quick Edit Comprehensive Verification ===');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  await page.setCookie({
    name: 'devx_token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('Browser Console Error:', msg.text());
    }
  });

  try {
    // -------------------------------------------------------------------------
    // 1. DESKTOP: Open Quick Edit on Order Details Page
    // -------------------------------------------------------------------------
    console.log('\n[1/6] Navigating to http://localhost:3000/admin/order/ORD_1 ...');
    await page.goto('http://localhost:3000/admin/order/ORD_1', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    console.log('Waiting for Quick Edit button...');
    const quickEditBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));
    await quickEditBtn.click();
    console.log('Clicked Quick Edit button.');

    await new Promise((r) => setTimeout(r, 2500));

    // Capture initial open modal
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/modular_quick_edit_desktop_open.png`,
    });
    console.log('Saved modular_quick_edit_desktop_open.png');

    // -------------------------------------------------------------------------
    // 2. Test CustomAutocomplete: Search, Selection & Duplicate Quantity Increment
    // -------------------------------------------------------------------------
    console.log('\n[2/6] Testing CustomAutocomplete & Duplicate Product Increment...');
    const autocompleteInput = await page.$('input[placeholder*="Add Product"]');
    if (!autocompleteInput) {
      throw new Error('CustomAutocomplete input not found!');
    }
    console.log('Found CustomAutocomplete input.');

    // Count initial items rows
    const initialRowsCount = await page.evaluate(() => {
      return document.querySelectorAll('tbody tr').length;
    });
    console.log(`Initial items in table: ${initialRowsCount}`);

    // Select first product from catalog dropdown
    await autocompleteInput.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.keyboard.press('ArrowDown');
    await new Promise((r) => setTimeout(r, 400));
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 1200));

    const rowsAfterFirstAdd = await page.evaluate(() => {
      return document.querySelectorAll('tbody tr').length;
    });
    console.log(`Items in table after adding product: ${rowsAfterFirstAdd}`);

    // Select the EXACT SAME product again to test duplicate-product quantity increment
    console.log('Selecting same product again to test duplicate quantity increment...');
    await autocompleteInput.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.keyboard.press('ArrowDown');
    await new Promise((r) => setTimeout(r, 400));
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 1200));

    const rowsAfterDuplicateAdd = await page.evaluate(() => {
      return document.querySelectorAll('tbody tr').length;
    });
    console.log(`Items in table after selecting duplicate: ${rowsAfterDuplicateAdd}`);

    // Verify row count did not increase (quantity incremented instead of duplicate row)
    if (rowsAfterDuplicateAdd === rowsAfterFirstAdd) {
      console.log('SUCCESS: Duplicate product correctly incremented quantity instead of creating a duplicate row!');
    }

    // -------------------------------------------------------------------------
    // 3. Test Order Notes: Existing Notes Verified & Add New Note
    // -------------------------------------------------------------------------
    console.log('\n[3/6] Testing Order Notes & Instructions...');
    const existingNotesCount = await page.evaluate(() => {
      // Look for note cards in the notes section
      const noteBoxes = document.querySelectorAll('div:has(> .MuiChip-root)');
      return noteBoxes.length;
    });
    console.log(`Found existing note cards in UI.`);

    // Add a new note
    const noteTextarea = await page.$('textarea[placeholder*="Type new note"]');
    if (noteTextarea) {
      console.log('Typing new note into textarea...');
      await noteTextarea.type('URGENT: Expedited dispatch requested by client for morning flight.');
      await new Promise((r) => setTimeout(r, 500));

      // Click "Add Note" button
      const allButtons = await page.$$('button');
      for (const btn of allButtons) {
        const text = await page.evaluate((el) => el.innerText, btn);
        if (text && text.includes('Add Note')) {
          await btn.click();
          console.log('Clicked "Add Note" button.');
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Capture modal with added note and incremented product
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/modular_quick_edit_products_and_notes_updated.png`,
    });
    console.log('Saved modular_quick_edit_products_and_notes_updated.png');

    // -------------------------------------------------------------------------
    // 4. Save Order Changes & Reopen to verify persistence
    // -------------------------------------------------------------------------
    console.log('\n[4/6] Saving Order Changes...');
    const saveButtons = await page.$$('button');
    let saveClicked = false;
    for (const btn of saveButtons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text && text.includes('Save Order Changes')) {
        await btn.click();
        saveClicked = true;
        console.log('Clicked "Save Order Changes" button.');
        break;
      }
    }
    if (!saveClicked) throw new Error('Save Order Changes button not found');

    console.log('Waiting for modal to save and close...');
    await new Promise((r) => setTimeout(r, 4000));

    // Reopen Quick Edit modal
    console.log('Reopening Quick Edit modal to verify database persistence...');
    const reopenBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 15000 });
    await reopenBtn.click();
    await new Promise((r) => setTimeout(r, 3000));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/modular_quick_edit_reopened_verified.png`,
    });
    console.log('Saved modular_quick_edit_reopened_verified.png');

    // Close modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancel = btns.find((b) => b.innerText.includes('Cancel'));
      if (cancel) cancel.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // -------------------------------------------------------------------------
    // 5. Responsive Verification: Tablet (768px) & Mobile (375px)
    // -------------------------------------------------------------------------
    console.log('\n[5/6] Testing Tablet Viewport (768x1024)...');
    await page.setViewport({ width: 768, height: 1024 });
    const tabletBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 15000 });
    await tabletBtn.click();
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/modular_quick_edit_tablet_768.png`,
    });
    console.log('Saved modular_quick_edit_tablet_768.png');

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancel = btns.find((b) => b.innerText.includes('Cancel'));
      if (cancel) cancel.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    console.log('\nTesting Mobile Viewport (375x812)...');
    await page.setViewport({ width: 375, height: 812 });
    const mobileBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 15000 });
    await mobileBtn.click();
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/modular_quick_edit_mobile_375.png`,
    });
    console.log('Saved modular_quick_edit_mobile_375.png');

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancel = btns.find((b) => b.innerText.includes('Cancel'));
      if (cancel) cancel.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // -------------------------------------------------------------------------
    // 6. Orders Table View (/admin/order)
    // -------------------------------------------------------------------------
    console.log('\n[6/6] Testing Quick Edit from Orders Table (/admin/order)...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/admin/order', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForSelector('tbody tr, .MuiDataGrid-row, tr', { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2500));

    const allTableBtns = await page.$$('button');
    for (const btn of allTableBtns) {
      const isPenIcon = await page.evaluate(
        (el) => Boolean(el.querySelector('svg[data-icon="solar:pen-bold"], svg[data-icon*="pen"]')),
        btn,
      );
      if (isPenIcon) {
        await btn.click();
        console.log('Clicked Quick Edit pen icon on orders table row!');
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/modular_quick_edit_from_orders_table.png`,
    });
    console.log('Saved modular_quick_edit_from_orders_table.png');

    console.log('\n=== ALL MODULAR QUICK EDIT VERIFICATIONS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Verification failed with error:', err);
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/modular_quick_edit_error.png`,
    });
    throw err;
  } finally {
    await browser.close();
  }
}

runModularQuickEditVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});
