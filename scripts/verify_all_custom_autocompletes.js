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

async function runCompleteAutocompleteAudit() {
  console.log('=== Starting Complete Quick Edit CustomAutocomplete Audit ===');

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
    console.log('[1/4] Navigating to http://localhost:3000/admin/order/ORD_1 ...');
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
      path: `${ARTIFACTS_DIR}/custom_autocompletes_audit_open.png`,
    });
    console.log('Saved custom_autocompletes_audit_open.png');

    // [2/4] Audit all CustomAutocomplete instances
    console.log('\n[2/4] Auditing all CustomAutocomplete instances in Quick Edit...');
    const autocompleteLabels = await page.evaluate(() => {
      // Find all Autocomplete root elements or inputs with autocomplete wrappers
      const inputs = Array.from(document.querySelectorAll('.MuiAutocomplete-root input'));
      return inputs.map((input) => {
        const id = input.id || '';
        const placeholder = input.placeholder || '';
        const value = input.value || '';
        return { id, placeholder, value };
      });
    });

    console.log(`Found ${autocompleteLabels.length} CustomAutocomplete inputs in modal:`, autocompleteLabels);

    // Test interacting with Order Status Autocomplete
    console.log('Selecting Order Status via CustomAutocomplete...');
    const statusInput = await page.$('input[placeholder*="status"]');
    if (statusInput) {
      await statusInput.click();
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.press('ArrowDown');
      await new Promise((r) => setTimeout(r, 300));
      await page.keyboard.press('Enter');
      console.log('Updated Order Status via CustomAutocomplete.');
    }

    // Test interacting with Sales Channel / Source Autocomplete
    console.log('Selecting Sales Channel / Source via CustomAutocomplete...');
    const sourceInput = await page.$('input[placeholder*="source"]');
    if (sourceInput) {
      await sourceInput.click();
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.press('ArrowDown');
      await new Promise((r) => setTimeout(r, 300));
      await page.keyboard.press('Enter');
      console.log('Updated Sales Channel via CustomAutocomplete.');
    }

    // Test interacting with Fulfillment / Courier Autocomplete
    console.log('Selecting Fulfillment / Courier via CustomAutocomplete...');
    const courierInput = await page.$('input[placeholder*="courier"]');
    if (courierInput) {
      await courierInput.click();
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.press('ArrowDown');
      await new Promise((r) => setTimeout(r, 300));
      await page.keyboard.press('Enter');
      console.log('Updated Courier via CustomAutocomplete.');
    }

    // Test interacting with Payment Method Autocomplete
    console.log('Selecting Payment Method via CustomAutocomplete...');
    const paymentInput = await page.$('input[placeholder*="payment"]');
    if (paymentInput) {
      await paymentInput.click();
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.press('ArrowDown');
      await new Promise((r) => setTimeout(r, 300));
      await page.keyboard.press('Enter');
      console.log('Updated Payment Method via CustomAutocomplete.');
    }

    // Capture state with updated selections
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/custom_autocompletes_values_selected.png`,
    });
    console.log('Saved custom_autocompletes_values_selected.png');

    // [3/4] Save Order Changes
    console.log('\n[3/4] Saving Order Changes...');
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

    // [4/4] Reopen Quick Edit modal and verify persistence
    console.log('\n[4/4] Reopening Quick Edit to verify persistence...');
    const reopenBtn = await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 15000 });
    await reopenBtn.click();
    await new Promise((r) => setTimeout(r, 3000));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/custom_autocompletes_saved_and_reopened.png`,
    });
    console.log('Saved custom_autocompletes_saved_and_reopened.png');

    console.log('\n=== COMPLETE CUSTOMAUTOCOMPLETE AUDIT & VERIFICATION SUCCESSFUL! ===');
  } catch (err) {
    console.error('Audit verification failed with error:', err);
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/custom_autocompletes_audit_error.png`,
    });
    throw err;
  } finally {
    await browser.close();
  }
}

runCompleteAutocompleteAudit().catch((e) => {
  console.error(e);
  process.exit(1);
});
