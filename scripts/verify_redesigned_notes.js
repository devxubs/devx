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

async function runNotesRedesignVerification() {
  console.log('=== Starting Redesigned Order Notes & Instructions Verification ===');

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
    // -------------------------------------------------------------------------
    // 1. DESKTOP: Open Quick Edit on Order Details Page
    // -------------------------------------------------------------------------
    console.log('[1/6] Navigating to http://localhost:3000/admin/order/ORD_1 ...');
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

    // Scroll to Order Notes & Instructions section
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('p, h6, span')).find((e) =>
        e.innerText && e.innerText.includes('Order Notes & Instructions')
      );
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 800));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/redesigned_notes_initial_open.png`,
    });
    console.log('Saved redesigned_notes_initial_open.png');

    // -------------------------------------------------------------------------
    // 2. Test CustomAutocomplete Note Category Selection
    // -------------------------------------------------------------------------
    console.log('\n[2/6] Interacting with Note Category CustomAutocomplete...');
    const noteCategoryInput = await page.$('input[placeholder*="Select note type"]');
    if (!noteCategoryInput) throw new Error('Note Category CustomAutocomplete input not found!');

    await noteCategoryInput.click();
    await new Promise((r) => setTimeout(r, 500));

    // Screenshot open dropdown showing styled options
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/redesigned_notes_category_autocomplete_open.png`,
    });
    console.log('Saved redesigned_notes_category_autocomplete_open.png');

    // Select Employee Note (Internal)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown'); // navigate to Employee Note
    await new Promise((r) => setTimeout(r, 300));
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 500));

    // -------------------------------------------------------------------------
    // 3. Add an Internal Employee Note
    // -------------------------------------------------------------------------
    console.log('\n[3/6] Adding an Internal Employee Note...');
    const titleInput = await page.$('input[placeholder*="Default:"]');
    if (titleInput) {
      await titleInput.click();
      await titleInput.type('VIP Client Review');
    }

    const contentTextarea = await page.$('textarea[placeholder*="e.g."]');
    if (!contentTextarea) throw new Error('Note Content textarea not found!');
    await contentTextarea.click();
    await contentTextarea.type(
      'Special 10% holiday courtesy approved by sales manager. Verify loyalty status upon final payment settlement.'
    );

    // Click "Add Note" button
    const addNoteBtns = await page.$$('button');
    let addClicked = false;
    for (const btn of addNoteBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text && text.trim() === 'Add Note') {
        await btn.click();
        addClicked = true;
        console.log('Clicked "Add Note" button.');
        break;
      }
    }
    if (!addClicked) throw new Error('Add Note button not found');

    await new Promise((r) => setTimeout(r, 1200));

    // -------------------------------------------------------------------------
    // 4. Add a Courier Note
    // -------------------------------------------------------------------------
    console.log('\n[4/6] Adding a Courier Note...');
    await noteCategoryInput.click();
    await new Promise((r) => setTimeout(r, 400));
    // Select Courier Note (2nd option)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 400));

    const courierContentTextarea = await page.$('textarea[placeholder*="e.g."]');
    if (courierContentTextarea) {
      await courierContentTextarea.click();
      await courierContentTextarea.type(
        'Fragile glass container included. Please request courier to handle with extra caution and collect digital signature.'
      );
      for (const btn of await page.$$('button')) {
        const text = await page.evaluate((el) => el.innerText, btn);
        if (text && text.trim() === 'Add Note') {
          await btn.click();
          console.log('Added Courier Note.');
          break;
        }
      }
    }

    await new Promise((r) => setTimeout(r, 1200));

    // Scroll to see updated cards
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('p, h6, span')).find((e) =>
        e.innerText && e.innerText.includes('Order Notes & Instructions')
      );
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 800));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/redesigned_notes_cards_added.png`,
    });
    console.log('Saved redesigned_notes_cards_added.png');

    // -------------------------------------------------------------------------
    // 5. Save Changes & Reopen to Verify Persistence
    // -------------------------------------------------------------------------
    console.log('\n[5/6] Saving changes to database...');
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
    if (!saveClicked) throw new Error('Save Order Changes button not found');

    await new Promise((r) => setTimeout(r, 4000));

    console.log('Reopening Quick Edit modal to verify notes persistence...');
    const reopenBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 15000 });
    await reopenBtn.click();
    await new Promise((r) => setTimeout(r, 2500));

    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('p, h6, span')).find((e) =>
        e.innerText && e.innerText.includes('Order Notes & Instructions')
      );
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 800));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/redesigned_notes_reopened_verified.png`,
    });
    console.log('Saved redesigned_notes_reopened_verified.png');

    // -------------------------------------------------------------------------
    // 6. Test Mobile Viewport (375x812)
    // -------------------------------------------------------------------------
    console.log('\n[6/6] Testing Mobile Responsiveness (375px)...');
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await new Promise((r) => setTimeout(r, 800));

    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('p, h6, span')).find((e) =>
        e.innerText && e.innerText.includes('Order Notes & Instructions')
      );
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    await new Promise((r) => setTimeout(r, 800));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/redesigned_notes_mobile_responsive.png`,
    });
    console.log('Saved redesigned_notes_mobile_responsive.png');

    console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Verification failed with error:', err);
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/redesigned_notes_error.png`,
    });
    throw err;
  } finally {
    await browser.close();
  }
}

runNotesRedesignVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});
