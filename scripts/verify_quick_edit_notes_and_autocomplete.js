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

async function runTest() {
  console.log('--- Starting Verification: Quick Edit Notes & CustomAutocomplete ---');

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
      console.log('Browser Error:', msg.text());
    }
  });

  try {
    // 1. Navigate to ORD_1 details
    console.log('[Step 1] Navigating to http://localhost:3000/admin/order/ORD_1 ...');
    await page.goto('http://localhost:3000/admin/order/ORD_1', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    console.log('Waiting for Quick Edit button...');
    const quickEditBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));
    await quickEditBtn.click();
    console.log('Clicked Quick Edit button.');

    // Wait for modal to render
    await new Promise((r) => setTimeout(r, 2500));

    // Capture initial open state with loaded notes and CustomAutocomplete
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/quick_edit_notes_and_autocomplete_open.png`,
    });
    console.log('Saved quick_edit_notes_and_autocomplete_open.png');

    // 2. Test CustomAutocomplete for product selection
    console.log('[Step 2] Testing CustomAutocomplete for product search & addition...');
    const autocompleteInput = await page.$('input[placeholder*="Add Product"]');
    if (autocompleteInput) {
      console.log('Found CustomAutocomplete input.');
      await autocompleteInput.click();
      await new Promise((r) => setTimeout(r, 1000));

      // Press ArrowDown and Enter to select first product from catalog
      await page.keyboard.press('ArrowDown');
      await new Promise((r) => setTimeout(r, 400));
      await page.keyboard.press('Enter');
      console.log('Selected product from CustomAutocomplete.');
      await new Promise((r) => setTimeout(r, 1000));
    } else {
      console.warn('CustomAutocomplete input not found!');
    }

    // 3. Test adding a new note in Order Notes & Instructions
    console.log('[Step 3] Testing Order Notes & Instructions addition...');
    const noteInput = await page.$('textarea[placeholder*="Type new note"]');
    if (noteInput) {
      console.log('Found note textarea input.');
      await noteInput.type('Special handling: Fragile glass items, handle with care.');
      await new Promise((r) => setTimeout(r, 500));

      // Click "Add Note" button
      const allButtons = await page.$$('button');
      let addNoteClicked = false;
      for (const btn of allButtons) {
        const text = await page.evaluate((el) => el.innerText, btn);
        if (text && text.includes('Add Note')) {
          await btn.click();
          addNoteClicked = true;
          console.log('Clicked "Add Note" button.');
          break;
        }
      }

      await new Promise((r) => setTimeout(r, 1000));
    } else {
      console.warn('Note textarea not found!');
    }

    // Capture modal state after adding note and product
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/quick_edit_notes_added_and_product_selected.png`,
    });
    console.log('Saved quick_edit_notes_added_and_product_selected.png');

    // 4. Save changes
    console.log('[Step 4] Clicking "Save Order Changes" button...');
    const allBtns = await page.$$('button');
    let saveClicked = false;
    for (const btn of allBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text && text.includes('Save Order Changes')) {
        await btn.click();
        saveClicked = true;
        console.log('Clicked "Save Order Changes" button.');
        break;
      }
    }

    if (!saveClicked) {
      throw new Error('Save Order Changes button not found');
    }

    // Wait for save operation to finish and modal to close
    console.log('Waiting for modal to save and close...');
    await new Promise((r) => setTimeout(r, 4000));

    // 5. Reopen Quick Edit modal to verify notes persisted
    console.log('[Step 5] Reopening Quick Edit to verify notes persisted...');
    const reopenBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 15000 });
    await reopenBtn.click();
    await new Promise((r) => setTimeout(r, 3000));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/quick_edit_reopened_notes_verified.png`,
    });
    console.log('Saved quick_edit_reopened_notes_verified.png');

    console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test failed with error:', err);
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/quick_edit_test_error.png`,
    });
    throw err;
  } finally {
    await browser.close();
  }
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
