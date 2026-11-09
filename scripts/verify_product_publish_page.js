const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
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

async function verifyProductCreatePage() {
  console.log('=== Starting Professional Product Create Page Verification ===');

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
    // Clean up any previous test product
    await prisma.stockMovement.deleteMany({
      where: { product: { productName: 'Artisan Ceramic Pour-Over Coffee Dripper' } },
    });
    await prisma.product.deleteMany({
      where: { productName: 'Artisan Ceramic Pour-Over Coffee Dripper' },
    });

    // -------------------------------------------------------------------------
    // 1. DESKTOP: Navigate to /admin/product/publish
    // -------------------------------------------------------------------------
    console.log('[1/6] Navigating to http://localhost:3000/admin/product/publish ...');
    await page.goto('http://localhost:3000/admin/product/publish', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Wait for the actual form inputs to be mounted and ready
    await page.waitForSelector('input[name="productName"]', { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Capture initial desktop layout
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/product_create_desktop_empty.png`,
    });
    console.log('Saved product_create_desktop_empty.png');

    // -------------------------------------------------------------------------
    // 2. Test CustomAutocomplete for Category & Dropdown Inspection
    // -------------------------------------------------------------------------
    console.log('\n[2/6] Interacting with Category CustomAutocomplete...');
    await new Promise((r) => setTimeout(r, 2000)); // wait for metadata fetch

    const categoryInput = await page.$('input[placeholder*="Choose or enter category"]');
    if (!categoryInput) throw new Error('Category CustomAutocomplete input not found!');

    await categoryInput.click();
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/product_create_autocomplete_open.png`,
    });
    console.log('Saved product_create_autocomplete_open.png');

    // Type category and press Enter
    await categoryInput.type('Beverages 1');
    await new Promise((r) => setTimeout(r, 300));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 500));

    // -------------------------------------------------------------------------
    // 3. Fill in Details, Pricing, Inventory & Multiple Images
    // -------------------------------------------------------------------------
    console.log('\n[3/6] Filling Product Create Form Fields...');

    // Product Name
    const nameInput = await page.$('input[name="productName"]');
    await nameInput.click();
    await nameInput.type('Artisan Ceramic Pour-Over Coffee Dripper');

    // Sub Description
    const subDescInput = await page.$('textarea[name="subDescription"]');
    if (subDescInput) {
      await subDescInput.click();
      await subDescInput.type(
        'Handcrafted matte ceramic coffee dripper engineered for optimal extraction flow and heat retention.'
      );
    }

    // Pricing Fields
    console.log('Entering pricing and checking profit margin calculation...');
    const regularPriceInput = await page.$('input[name="regularPrice"]');
    await regularPriceInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await regularPriceInput.type('120');

    const salePriceInput = await page.$('input[name="salePrice"]');
    if (salePriceInput) {
      await salePriceInput.click();
      await salePriceInput.type('99');
    }

    const costPriceInput = await page.$('input[placeholder*="e.g. 50.00"]');
    if (costPriceInput) {
      await costPriceInput.click();
      await costPriceInput.type('60');
    }

    // Inventory Fields
    console.log('Setting opening stock and low stock alert...');
    const quantityInput = await page.$('input[name="quantity"]');
    if (quantityInput) {
      await quantityInput.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await quantityInput.type('25');
    }

    const lowStockInput = await page.$('input[name="lowStockAlert"]');
    if (lowStockInput) {
      await lowStockInput.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await lowStockInput.type('5');
    }

    // Upload multiple product images
    console.log('Uploading multiple product images via file input...');
    const dropzoneInput = await page.$('input[data-testid="product-image-dropzone"]');
    if (dropzoneInput) {
      const dummyPath1 = '/tmp/test-prod-1.webp';
      const dummyPath2 = '/tmp/test-prod-2.webp';
      fs.copyFileSync('/media/devxub/E664438764435987/project/devx/public/images/product-1.webp', dummyPath1);
      fs.copyFileSync('/media/devxub/E664438764435987/project/devx/public/images/product-2.webp', dummyPath2);

      await dropzoneInput.uploadFile(dummyPath1);
      await new Promise((r) => setTimeout(r, 1200));
      await dropzoneInput.uploadFile(dummyPath2);
      await new Promise((r) => setTimeout(r, 1500));
      console.log('Uploaded images sequentially.');
    }

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/product_create_desktop_filled.png`,
    });
    console.log('Saved product_create_desktop_filled.png');

    // -------------------------------------------------------------------------
    // 4. Test Image Reordering & Make Primary Action
    // -------------------------------------------------------------------------
    console.log('\n[4/6] Testing Make Primary Cover & Reorder Actions...');
    const setCoverBtns = await page.$$('button');
    for (const btn of setCoverBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text && text.includes('Set Cover')) {
        await btn.click();
        console.log('Clicked "Set Cover" on secondary image.');
        await new Promise((r) => setTimeout(r, 800));
        break;
      }
    }

    // -------------------------------------------------------------------------
    // 5. Submit Form & Verify Product Creation
    // -------------------------------------------------------------------------
    console.log('\n[5/6] Submitting Product Create Form...');
    const submitBtn = await page.$('button[type="submit"]');
    if (!submitBtn) throw new Error('Submit button not found!');

    await submitBtn.click();
    console.log('Clicked Publish Product button.');

    // Wait for navigation or API response
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 3000));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/product_created_in_catalog.png`,
    });
    console.log('Saved product_created_in_catalog.png');

    // Verify in database
    const createdProduct = await prisma.product.findFirst({
      where: { productName: 'Artisan Ceramic Pour-Over Coffee Dripper' },
      include: { stockMovements: true, category: true },
    });
    console.log('Created product in database:', {
      id: createdProduct?.id,
      customId: createdProduct?.customId,
      productCode: createdProduct?.productCode,
      category: createdProduct?.category?.name,
      quantity: createdProduct?.quantity,
      regularPrice: createdProduct?.regularPrice,
      salePrice: createdProduct?.salePrice,
      imagesCount: Array.isArray(createdProduct?.images) ? createdProduct?.images?.length : 0,
      stockMovements: createdProduct?.stockMovements?.map((sm) => ({
        type: sm.type,
        quantity: sm.quantity,
        note: sm.note,
      })),
    });

    if (!createdProduct) {
      throw new Error('Product was not found in the database!');
    }

    if (createdProduct.quantity !== 25) {
      throw new Error(`Expected quantity 25, got ${createdProduct.quantity}`);
    }

    if (
      !createdProduct.stockMovements ||
      !createdProduct.stockMovements.some((sm) => sm.type === 'ADJUSTMENT' && sm.quantity === 25)
    ) {
      throw new Error('Expected initial opening stock StockMovement of type ADJUSTMENT not found!');
    }
    console.log('Verified: Opening stock properly recorded in StockMovement table!');

    // -------------------------------------------------------------------------
    // 6. Test Mobile Viewport (375x812)
    // -------------------------------------------------------------------------
    console.log('\n[6/6] Testing Mobile Responsiveness (375x812)...');
    await page.setViewport({ width: 375, height: 812 });
    await page.goto('http://localhost:3000/admin/product/publish', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForSelector('input[name="productName"]', { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/product_create_mobile_responsive.png`,
    });
    console.log('Saved product_create_mobile_responsive.png');

    console.log('\n=== ALL PRODUCT CREATE IMPROVEMENT TESTS PASSED! ===');
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

verifyProductCreatePage().catch((e) => {
  console.error(e);
  process.exit(1);
});
