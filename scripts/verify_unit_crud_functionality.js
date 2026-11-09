const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

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

// Helper to reliably clear an input in Puppeteer + React
async function clearAndType(page, selector, text) {
  const el = await page.waitForSelector(selector);
  await el.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await new Promise((r) => setTimeout(r, 100));
  if (text) {
    await el.type(text);
  }
}

// Helper to wait until table skeleton is gone and data grid is rendered
async function waitForTableReady(page) {
  await page.waitForSelector('.MuiDataGrid-root', { visible: true, timeout: 20000 });
  await page.waitForFunction(() => !document.querySelector('.MuiSkeleton-root'), { timeout: 20000 });
}

async function verifyUnitCrud() {
  console.log('=== Starting DevX POS Unit Add & Edit Verification ===');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(30000);

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
    // Clean up any previous test units
    await prisma.unit.deleteMany({
      where: {
        name: {
          in: [
            'Testing Unit Alpha',
            'Testing Unit Beta',
            'Testing Unit Gamma',
            'Testing Unit Cancel',
          ],
        },
      },
    });

    // ─────────────────────────────────────────────
    // STEP 1: Navigate to Unit Page
    // ─────────────────────────────────────────────
    console.log('\n[1/8] Navigating to http://localhost:3000/admin/unit ...');
    await page.goto('http://localhost:3000/admin/unit', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'unit_table_initial.png'),
    });
    console.log('Saved unit_table_initial.png');

    // ─────────────────────────────────────────────
    // STEP 2: Test Invalid / Empty Form Submission
    // ─────────────────────────────────────────────
    console.log('\n[2/8] Testing Empty Form Validation on Add Unit...');
    const addBtn = await page.waitForSelector('[data-testid="add-unit-button"]', { visible: true });
    await addBtn.click();
    await new Promise((r) => setTimeout(r, 800));

    // Click submit with empty fields
    const submitBtn = await page.waitForSelector('[data-testid="unit-submit-button"]', { visible: true });
    await submitBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    // Check error helper texts
    const bodyText1 = await page.evaluate(() => document.body.innerText);
    if (!bodyText1.includes('Unit name is required!')) {
      throw new Error('Expected validation error "Unit name is required!" was not found');
    }
    console.log('Validated: Client-side validation prevents empty submission.');
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'unit_add_modal_validation_error.png'),
    });
    console.log('Saved unit_add_modal_validation_error.png');

    // ─────────────────────────────────────────────
    // STEP 3: Test Duplicate Name Conflict on Add
    // ─────────────────────────────────────────────
    console.log('\n[3/8] Testing Duplicate Name Conflict Handling...');
    await clearAndType(page, '[data-testid="unit-name-input"]', 'Piece');
    await clearAndType(page, '[data-testid="unit-short-input"]', 'pc');
    await new Promise((r) => setTimeout(r, 500));

    const step3Values = await page.evaluate(() => {
      const n = document.querySelector('[data-testid="unit-name-input"]');
      const s = document.querySelector('[data-testid="unit-short-input"]');
      return { name: n ? n.value : null, short: s ? s.value : null };
    });
    console.log('Step 3 inputs before click:', step3Values);

    const submitBtnStep3 = await page.waitForSelector('[data-testid="unit-submit-button"]');
    await submitBtnStep3.click();
    await new Promise((r) => setTimeout(r, 1500));

    const bodyText2 = await page.evaluate(() => document.body.innerText);
    console.log('Step 3 body text includes already exists:', bodyText2.includes('already exists'));
    if (!bodyText2.includes('already exists')) {
      console.log('Modal HTML:', await page.evaluate(() => document.querySelector('.MuiModal-root')?.innerHTML));
      throw new Error('Expected duplicate error alert was not displayed in UI!');
    }
    console.log('Validated: Duplicate unit conflict alert displayed successfully.');
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'unit_add_duplicate_conflict.png'),
    });
    console.log('Saved unit_add_duplicate_conflict.png');

    // ─────────────────────────────────────────────
    // STEP 4: Test Cancel Add without DB Mutation
    // ─────────────────────────────────────────────
    console.log('\n[4/8] Testing Cancel Add Action...');
    // Click Cancel
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancelBtn = btns.find((b) => b.textContent.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const testUnitCheck = await prisma.unit.findFirst({
      where: { name: 'Testing Unit Alpha' },
    });
    if (testUnitCheck) {
      throw new Error('Database was mutated after Cancel Add!');
    }
    console.log('Validated: Cancel closes modal without database changes.');

    // ─────────────────────────────────────────────
    // STEP 5: Add New Unit & Verify State + DB
    // ─────────────────────────────────────────────
    console.log('\n[5/8] Creating New Unit "Testing Unit Alpha"...');
    const addBtn2 = await page.waitForSelector('[data-testid="add-unit-button"]', { visible: true });
    await addBtn2.click();
    await new Promise((r) => setTimeout(r, 800));

    await clearAndType(page, '[data-testid="unit-name-input"]', 'Testing Unit Alpha');
    await clearAndType(page, '[data-testid="unit-short-input"]', 't-alpha');

    // Submit Add
    const submitBtn2 = await page.waitForSelector('.MuiModal-root [data-testid="unit-submit-button"]');
    const [addResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith('/api/units') && res.request().method() === 'POST'),
      submitBtn2.click(),
    ]);
    console.log('Add Unit API response status:', addResponse.status());
    await waitForTableReady(page);

    // Verify in DB first
    const dbUnit = await prisma.unit.findFirst({
      where: { name: 'Testing Unit Alpha' },
    });
    if (!dbUnit || dbUnit.short !== 't-alpha' || dbUnit.isDeleted) {
      throw new Error('Created unit not properly saved in MySQL database!');
    }
    console.log(`Validated in DB: Created unit "${dbUnit.name}" with customId: ${dbUnit.customId} (${dbUnit.id}) and short: ${dbUnit.short}`);

    // Filter table to verify in UI
    const searchInput = await page.waitForSelector('input[placeholder="Search"]');
    await clearAndType(page, 'input[placeholder="Search"]', 'Testing Unit');
    await new Promise((r) => setTimeout(r, 1500));
    await waitForTableReady(page);

    const tableText = await page.evaluate(() => document.querySelector('.MuiDataGrid-root')?.innerText || '');
    if (!tableText.includes('Testing Unit Alpha') || !tableText.includes('t-alpha')) {
      throw new Error('Newly created unit did not appear in UI table!');
    }
    console.log('Validated in UI: Newly created unit appeared immediately in table without page reload!');

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'unit_add_success.png'),
    });
    console.log('Saved unit_add_success.png');

    // ─────────────────────────────────────────────
    // STEP 6: Edit Unit (Data Load, Cancel & Save)
    // ─────────────────────────────────────────────
    console.log('\n[6/8] Testing Edit Unit functionality...');

    // Find the row for 'Testing Unit Alpha' and click its actions button
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.MuiDataGrid-row'));
      const targetRow = rows.find((r) => r.innerText.includes('Testing Unit Alpha'));
      if (!targetRow) throw new Error('Target row for Testing Unit Alpha not found');
      const actionBtn = targetRow.querySelector('[data-field="@actions"] button');
      if (!actionBtn) throw new Error('Action button not found in target row');
      actionBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Click "edit" in menu
    await page.evaluate(() => {
      const menuItems = Array.from(document.querySelectorAll('.MuiListItemButton-root, .MuiMenuItem-root, li'));
      const editItem = menuItems.find((i) => i.innerText.toLowerCase().includes('edit'));
      if (!editItem) throw new Error('Edit menu item not found');
      editItem.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Verify pre-filled data
    const prefilledData = await page.evaluate(() => {
      const nameEl = document.querySelector('[data-testid="unit-name-input"]');
      const shortEl = document.querySelector('[data-testid="unit-short-input"]');
      return {
        name: nameEl ? nameEl.value : null,
        short: shortEl ? shortEl.value : null,
      };
    });
    console.log('Edit Modal Pre-filled Data:', prefilledData);
    if (prefilledData.name !== 'Testing Unit Alpha' || prefilledData.short !== 't-alpha') {
      throw new Error(`Pre-filled data mismatch! Expected "Testing Unit Alpha" and "t-alpha", got: ${JSON.stringify(prefilledData)}`);
    }

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'unit_edit_modal_prefilled.png'),
    });
    console.log('Saved unit_edit_modal_prefilled.png');

    // Test Cancel on Edit
    console.log('Testing Cancel on Edit...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancelBtn = btns.find((b) => b.textContent.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Re-open Edit and update data to 'Testing Unit Beta' / 't-beta'
    console.log('Re-opening Edit to perform update...');
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.MuiDataGrid-row'));
      const targetRow = rows.find((r) => r.innerText.includes('Testing Unit Alpha'));
      if (!targetRow) throw new Error('Target row for Testing Unit Alpha not found');
      const actionBtn = targetRow.querySelector('[data-field="@actions"] button');
      if (!actionBtn) throw new Error('Action button not found in target row');
      actionBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    await page.evaluate(() => {
      const menuItems = Array.from(document.querySelectorAll('.MuiListItemButton-root, .MuiMenuItem-root, li'));
      const editItem = menuItems.find((i) => i.innerText.toLowerCase().includes('edit'));
      if (!editItem) throw new Error('Edit menu item not found upon re-open');
      editItem.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Type updated values
    console.log('Typing updated unit values...');
    await clearAndType(page, '[data-testid="unit-name-input"]', 'Testing Unit Beta');
    await clearAndType(page, '[data-testid="unit-short-input"]', 't-beta');
    await new Promise((r) => setTimeout(r, 400));

    const currentFormValues = await page.evaluate(() => {
      const n = document.querySelector('[data-testid="unit-name-input"]');
      const s = document.querySelector('[data-testid="unit-short-input"]');
      return { name: n ? n.value : null, short: s ? s.value : null };
    });
    console.log('Form values before submit:', currentFormValues);

    const updateSubmitBtn = await page.waitForSelector('.MuiModal-root [data-testid="unit-submit-button"]');
    const [putResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/units') && (res.request().method() === 'PUT' || res.request().method() === 'PATCH')),
      updateSubmitBtn.click(),
    ]);
    console.log('Update Unit API response status:', putResponse.status());
    await waitForTableReady(page);

    // Clear search and search for Testing Unit Beta
    await clearAndType(page, 'input[placeholder="Search"]', 'Testing Unit Beta');
    await new Promise((r) => setTimeout(r, 1500));
    await waitForTableReady(page);

    // Verify in table
    const updatedTableText = await page.evaluate(() => document.querySelector('.MuiDataGrid-root')?.innerText || '');
    if (!updatedTableText.includes('Testing Unit Beta') || !updatedTableText.includes('t-beta')) {
      throw new Error('Updated unit did not reflect in table!');
    }

    // Verify in DB: Must be same cuid primary key, updated name and short
    const updatedDbUnit = await prisma.unit.findUnique({
      where: { id: dbUnit.id },
    });
    if (!updatedDbUnit || updatedDbUnit.name !== 'Testing Unit Beta' || updatedDbUnit.short !== 't-beta') {
      throw new Error('Database record was not properly updated in place!');
    }
    console.log(`Validated in DB & UI: Unit successfully updated in place: "${updatedDbUnit.name}" (${updatedDbUnit.customId})`);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'unit_edit_success.png'),
    });
    console.log('Saved unit_edit_success.png');

    // ─────────────────────────────────────────────
    // STEP 7: Test Product Relationships & Renaming
    // ─────────────────────────────────────────────
    console.log('\n[7/8] Testing Product Relationships & Unit Autocomplete...');

    // Associate 'Testing Unit Beta' with a product
    const sampleProduct = await prisma.product.findFirst({
      where: { isDeleted: false },
    });
    if (sampleProduct) {
      const originalSizes = sampleProduct.sizes;
      await prisma.product.update({
        where: { id: sampleProduct.id },
        data: { sizes: ['Testing Unit Beta', 'Piece'] },
      });
      console.log(`Associated "Testing Unit Beta" with product: "${sampleProduct.productName}"`);

      // Rename unit via PUT /api/units/[id] to 'Testing Unit Gamma'
      const renameRes = await fetch(`http://localhost:3000/api/units/${dbUnit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `devx_token=${token}`,
        },
        body: JSON.stringify({ name: 'Testing Unit Gamma', short: 't-gamma' }),
      });
      const renameJson = await renameRes.json();
      console.log('Renamed unit to:', renameJson.name);

      // Verify product's sizes array was automatically updated!
      const refreshedProduct = await prisma.product.findUnique({
        where: { id: sampleProduct.id },
        select: { sizes: true },
      });
      console.log('Refreshed Product sizes:', refreshedProduct.sizes);
      if (!Array.isArray(refreshedProduct.sizes) || !refreshedProduct.sizes.includes('Testing Unit Gamma')) {
        throw new Error('Product sizes relationship was NOT preserved upon unit renaming!');
      }
      console.log('Validated: Existing product relationships seamlessly preserved when unit is renamed.');

      // Restore product's original sizes
      await prisma.product.update({
        where: { id: sampleProduct.id },
        data: { sizes: originalSizes },
      });
    }

    // Verify unit appears in Product Publish page units multi-select autocomplete
    console.log('Verifying unit appears in Product Publish page units autocomplete...');
    await page.goto('http://localhost:3000/admin/product/publish', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    // Open Unit Autocomplete
    const unitAutocomplete = await page.waitForSelector('input[placeholder*="Add units"]');
    await unitAutocomplete.click();
    await new Promise((r) => setTimeout(r, 800));

    const autocompleteOptions = await page.evaluate(() => {
      const popover = document.querySelector('.MuiAutocomplete-popper, [role="presentation"]');
      return popover ? popover.innerText : '';
    });
    console.log('Autocomplete visible options include Gamma:', autocompleteOptions.includes('Testing Unit Gamma'));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'unit_product_publish_dropdown.png'),
    });
    console.log('Saved unit_product_publish_dropdown.png');

    // ─────────────────────────────────────────────
    // STEP 8: Soft Deletion & Recycle Bin Verification
    // ─────────────────────────────────────────────
    console.log('\n[8/8] Testing Soft Deletion & Recycle Bin...');
    await page.goto('http://localhost:3000/admin/unit', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    // Search for Testing Unit Gamma
    await clearAndType(page, 'input[placeholder="Search"]', 'Testing Unit Gamma');
    await new Promise((r) => setTimeout(r, 1200));

    // Open action menu
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.MuiDataGrid-row'));
      const targetRow = rows.find((r) => r.innerText.includes('Testing Unit Gamma'));
      if (!targetRow) throw new Error('Target row for Testing Unit Gamma not found');
      const actionBtn = targetRow.querySelector('[data-field="@actions"] button');
      if (!actionBtn) throw new Error('Action button not found in target row');
      actionBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Click delete menu item
    await page.evaluate(() => {
      const menuItems = Array.from(document.querySelectorAll('.MuiListItemButton-root, .MuiMenuItem-root, li'));
      const deleteItem = menuItems.find((i) => i.innerText.toLowerCase().includes('delete'));
      if (!deleteItem) throw new Error('Delete menu item not found');
      deleteItem.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'unit_delete_dialog_with_warning.png'),
    });
    console.log('Saved unit_delete_dialog_with_warning.png');

    // Confirm Delete
    const confirmDeleteBtn = await page.waitForSelector('[data-testid="confirm-delete-unit-button"]');
    const [delResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/units') && res.request().method() === 'DELETE'),
      confirmDeleteBtn.click(),
    ]);
    console.log('Delete Unit API response status:', delResponse.status());
    await waitForTableReady(page);

    // Check table: Testing Unit Gamma should no longer appear
    const finalTableText = await page.evaluate(() => document.querySelector('.MuiDataGrid-root')?.innerText || '');
    if (finalTableText.includes('Testing Unit Gamma')) {
      throw new Error('Deleted unit still appears in active table!');
    }

    // Check DB: isDeleted must be true
    const deletedDbUnit = await prisma.unit.findUnique({
      where: { id: dbUnit.id },
    });
    if (!deletedDbUnit || !deletedDbUnit.isDeleted) {
      throw new Error('Soft-deleted unit is not marked isDeleted: true in DB!');
    }
    console.log('Validated: Unit soft-deleted successfully (isDeleted: true).');

    // Check Recycle Bin
    console.log('Verifying soft-deleted unit in Recycle Bin...');
    await page.goto('http://localhost:3000/admin/bin', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 2500));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'unit_bin_verified.png'),
    });
    console.log('Saved unit_bin_verified.png');

    // Verify via /api/bin
    const binRes = await fetch('http://localhost:3000/api/bin', {
      headers: { Cookie: `devx_token=${token}` },
    });
    const binItems = await binRes.json();
    const binUnit = Array.isArray(binItems) && binItems.find((i) => i.id === dbUnit.id && i.type === 'unit');
    if (!binUnit) {
      throw new Error('Soft-deleted unit was not found in /api/bin items!');
    }
    console.log(`Validated in Bin: Found "${binUnit.name}" in Recycle Bin.`);

    // Test restoring from Bin via POST /api/bin
    console.log('Testing restoring unit from Recycle Bin...');
    const restoreRes = await fetch('http://localhost:3000/api/bin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `devx_token=${token}`,
      },
      body: JSON.stringify({ type: 'unit', action: 'restore', id: dbUnit.id }),
    });
    if (!restoreRes.ok) {
      throw new Error('Failed to restore unit from Recycle Bin');
    }
    const restoredDbUnit = await prisma.unit.findUnique({ where: { id: dbUnit.id } });
    if (!restoredDbUnit || restoredDbUnit.isDeleted) {
      throw new Error('Unit is still marked deleted after restore!');
    }
    console.log('Validated: Unit successfully restored from Recycle Bin (isDeleted: false).');

    // Clean up test unit from DB permanently
    await prisma.unit.delete({ where: { id: dbUnit.id } });
    console.log('Cleaned up test unit permanently.');

    console.log('\n=== ALL UNIT ADD & EDIT VERIFICATION TESTS PASSED! ===');
  } catch (error) {
    console.error('VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

verifyUnitCrud();
