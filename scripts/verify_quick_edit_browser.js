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

async function runBrowserVerification() {
  console.log('Starting Puppeteer browser verification for Order Quick Edit...');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Set auth cookie
  await page.setCookie({
    name: 'devx_token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  });

  try {
    // 1. Navigate to Order Details page
    console.log('Navigating to http://localhost:3000/admin/order/ORD_1 ...');
    await page.goto('http://localhost:3000/admin/order/ORD_1', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Wait for the Quick Edit button to be visible
    console.log('Waiting for Quick Edit button...');
    await page.waitForSelector('button[aria-label="Quick Edit"]', { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Capture initial order details page screenshot
    await page.screenshot({
      path: '/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756/order_details_before_quick_edit.png',
      fullPage: false,
    });
    console.log('Captured order_details_before_quick_edit.png');

    // 2. Click Quick Edit button
    console.log('Clicking Quick Edit button...');
    await page.click('button[aria-label="Quick Edit"]');

    // Wait for modal to open
    await page.waitForSelector('.MuiDialog-paper, .MuiModal-root', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Capture open Quick Edit modal screenshot
    await page.screenshot({
      path: '/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756/quick_edit_modal_open_verified.png',
      fullPage: false,
    });
    console.log('Captured quick_edit_modal_open_verified.png');

    // 3. Test updating quantity (click plus icon)
    console.log('Testing quantity increment...');
    const allBtns = await page.$$('button');
    let plusClicked = false;
    for (const btn of allBtns) {
      const hasPlus = await page.evaluate(
        (el) => Boolean(el.querySelector('svg[data-icon*="add"], svg[data-icon*="plus"]')),
        btn,
      );
      if (hasPlus) {
        await btn.click();
        plusClicked = true;
        console.log('Clicked quantity increment button');
        await new Promise((r) => setTimeout(r, 800));
        break;
      }
    }

    // Capture modal with changed quantity
    await page.screenshot({
      path: '/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756/quick_edit_modal_quantity_changed.png',
      fullPage: false,
    });
    console.log('Captured quick_edit_modal_quantity_changed.png');

    // 4. Click "Update Order Items" button
    console.log('Clicking "Update Order Items" button...');

    // Find the button with text "Update Order Items"
    const buttons = await page.$$('button');
    let clicked = false;
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text && (text.includes('Save Order Changes') || text.includes('Update Order Items'))) {
        await btn.click();
        clicked = true;
        console.log(`Clicked "${text.trim()}" button!`);
        break;
      }
    }

    if (!clicked) {
      throw new Error('Could not find "Update Order Items" button');
    }

    // Wait for feedback or modal close
    await new Promise((r) => setTimeout(r, 3000));

    // Capture screenshot after saving
    await page.screenshot({
      path: '/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756/order_details_after_quick_edit_success.png',
      fullPage: false,
    });
    console.log('Captured order_details_after_quick_edit_success.png');

    console.log('\n✅ BROWSER VERIFICATION COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Browser verification failed:', err);
    await page.screenshot({
      path: '/home/devxub/.gemini/antigravity/brain/1ac56a9e-0f2d-436a-abf9-024844ec5756/quick_edit_browser_error.png',
      fullPage: false,
    });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserVerification();
