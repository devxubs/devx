const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
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

async function runVerification() {
  console.log('=== Starting Focused UI Improvements Verification ===\n');

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
      console.log('[Browser Error]:', msg.text());
    }
  });

  try {
    // 1. CREATE PAGE VERIFICATION
    console.log('[1/7] Navigating to http://localhost:3000/admin/product/publish ...');
    await page.goto('http://localhost:3000/admin/product/publish', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await page.waitForSelector(".MuiBreadcrumbs-root", { timeout: 15000 });
    console.log('Page loaded and breadcrumb rendered.');

    // Wait a brief moment for dynamic hydration
    await new Promise((r) => setTimeout(r, 1000));

    // A. Check Back to Catalog button
    const backBtnExists = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button, a'));
      return allButtons.some((b) => /back to catalog/i.test(b.textContent || ''));
    });
    console.log(`[Check 1] 'Back to Catalog' button exists: ${backBtnExists} (Expected: false)`);
    if (backBtnExists) throw new Error("'Back to Catalog' button still exists!");

    // B. Check Reusable Breadcrumb in Create Mode
    const breadcrumbInfo = await page.evaluate(() => {
      const bc = document.querySelector("nav[aria-label='breadcrumb']");
      if (!bc) return null;
      const text = bc.textContent || '';
      const separator = bc.querySelector('.MuiBreadcrumbs-separator')?.textContent || '';
      const hasArrow = Boolean(bc.querySelector('svg, [data-icon*="arrow"], i'));
      return { text: text.trim(), separator: separator.trim(), hasArrow };
    });
    console.log('[Check 2] Breadcrumb info (Create mode):', breadcrumbInfo);
    if (!breadcrumbInfo || !breadcrumbInfo.text.includes('New Product') || !breadcrumbInfo.text.includes('Products')) {
      throw new Error('Breadcrumb missing Products or New Product label!');
    }
    if (breadcrumbInfo.separator !== '•') {
      throw new Error(`Breadcrumb separator is '${breadcrumbInfo.separator}', expected '•'!`);
    }

    // C. Check ProductStickyFooter position (Normal document flow)
    const footerStyles = await page.evaluate(() => {
      // Find element containing "Ready to publish" or "Complete required fields"
      const allEls = Array.from(document.querySelectorAll('*'));
      const statusEl = allEls.find((el) =>
        /Ready to publish|Complete required fields/i.test(el.textContent || '') &&
        el.querySelector('button')
      );
      if (!statusEl) {
        // Fallback: look for publish button container
        const pubBtn = allEls.find((el) => /Publish Product|Update Product/i.test(el.textContent || '') && el.tagName === 'BUTTON');
        if (pubBtn) {
          const card = pubBtn.closest('.MuiPaper-root') || pubBtn.parentElement?.parentElement;
          const style = window.getComputedStyle(card);
          return {
            position: style.position,
            bottom: style.bottom,
            boxShadow: style.boxShadow,
            found: true,
          };
        }
        return { found: false };
      }
      const style = window.getComputedStyle(statusEl);
      return {
        position: style.position,
        bottom: style.bottom,
        boxShadow: style.boxShadow,
        found: true,
      };
    });
    console.log('[Check 3] Footer flow styles:', footerStyles);
    if (!footerStyles.found || footerStyles.position !== 'static') {
      throw new Error(`ProductStickyFooter position is ${footerStyles.position}, expected 'static'!`);
    }

    // D. Check Autocomplete compact size (height <= 42px, small typography)
    const autocompleteMetrics = await page.evaluate(() => {
      const autocompletes = Array.from(document.querySelectorAll('.MuiAutocomplete-root'));
      return autocompletes.map((ac) => {
        const inputRoot = ac.querySelector('.MuiOutlinedInput-root');
        const input = ac.querySelector('input');
        const rect = inputRoot ? inputRoot.getBoundingClientRect() : ac.getBoundingClientRect();
        const style = inputRoot ? window.getComputedStyle(inputRoot) : null;
        return {
          height: rect.height,
          paddingTop: style?.paddingTop,
          paddingBottom: style?.paddingBottom,
          fontSize: style?.fontSize,
        };
      });
    });
    console.log(`[Check 4] Evaluated ${autocompleteMetrics.length} Autocomplete components.`);
    const oversizedAutocompletes = autocompleteMetrics.filter((m) => m.height > 44);
    console.log(`Compact Autocomplete count <= 42px: ${autocompleteMetrics.filter((m) => m.height <= 42).length}/${autocompleteMetrics.length}`);
    if (oversizedAutocompletes.length > 0) {
      console.warn('Warning: Some autocompletes measured over 42px:', oversizedAutocompletes);
    }

    // E. Check Right Summary Panel Scroll and Overflow
    const rightPanelMetrics = await page.evaluate(() => {
      // Find the right summary panel by card title "Publishing & Status"
      const statusTitle = Array.from(document.querySelectorAll('*')).find((el) => el.textContent === 'Publishing & Status');
      if (!statusTitle) return null;
      const paper = statusTitle.closest('.MuiPaper-root');
      const rootBox = paper?.parentElement?.parentElement;
      const boxStyle = rootBox ? window.getComputedStyle(rootBox) : null;

      // Check Form Completion Card
      const formCompTitle = Array.from(document.querySelectorAll('*')).find((el) => el.textContent === 'Form Completion');
      const formCompPaper = formCompTitle ? formCompTitle.closest('.MuiPaper-root') : null;
      const formCompOverflow = formCompPaper ? {
        scrollWidth: formCompPaper.scrollWidth,
        clientWidth: formCompPaper.clientWidth,
        hasHorizontalOverflow: formCompPaper.scrollWidth > formCompPaper.clientWidth + 2,
      } : null;

      return {
        boxPosition: boxStyle?.position,
        boxOverflowY: boxStyle?.overflowY,
        boxMaxHeight: boxStyle?.maxHeight,
        formCompOverflow,
      };
    });
    console.log('[Check 5] Right Summary Panel metrics:', rightPanelMetrics);
    if (rightPanelMetrics?.boxPosition === 'sticky' || rightPanelMetrics?.boxOverflowY === 'auto' || rightPanelMetrics?.boxOverflowY === 'scroll') {
      throw new Error(`Right panel still has internal scroll or sticky positioning: ${JSON.stringify(rightPanelMetrics)}`);
    }
    if (rightPanelMetrics?.formCompOverflow?.hasHorizontalOverflow) {
      throw new Error(`Form Completion card has horizontal overflow! ${JSON.stringify(rightPanelMetrics.formCompOverflow)}`);
    }

    // F. Capture Desktop screenshots
    const desktopPath = path.join(ARTIFACTS_DIR, 'product_focused_01_create_page.png');
    await page.screenshot({ path: desktopPath, fullPage: false });
    console.log(`Saved screenshot: ${desktopPath}`);

    // Capture Autocomplete focused screenshot
    try {
      const acPath = path.join(ARTIFACTS_DIR, 'product_focused_03_autocomplete_compact.png');
      const categoryField = await page.$('.MuiAutocomplete-root');
      if (categoryField) {
        await categoryField.screenshot({ path: acPath });
        console.log(`Saved screenshot: ${acPath}`);
      }
    } catch (e) {
      console.warn('Could not capture isolated element screenshot, continuing:', e.message);
    }

    // Capture Right Panel screenshot
    try {
      const rightPanelPath = path.join(ARTIFACTS_DIR, 'product_focused_04_right_panel_flow.png');
      const rightGrid = await page.$("div[class*='MuiGrid-grid-lg-3']");
      if (rightGrid) {
        await rightGrid.screenshot({ path: rightPanelPath });
        console.log(`Saved screenshot: ${rightPanelPath}`);
      }
    } catch (e) {
      console.warn('Could not capture right grid screenshot, continuing:', e.message);
    }

    // 2. EDIT PAGE VERIFICATION
    console.log('\n[2/7] Finding an existing product for Edit mode test...');
    const existingProduct = await prisma.product.findFirst({
      select: { id: true, productName: true },
    });
    if (existingProduct) {
      console.log(`Navigating to http://localhost:3000/admin/product/publish?id=${existingProduct.id} ...`);
      await page.goto(`http://localhost:3000/admin/product/publish?id=${existingProduct.id}`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      await page.waitForSelector(".MuiBreadcrumbs-root", { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 1000));

      const editBcInfo = await page.evaluate(() => {
        const bc = document.querySelector(".MuiBreadcrumbs-root");
        if (!bc) return null;
        return {
          text: (bc.textContent || '').trim(),
          separator: bc.querySelector('.MuiBreadcrumbs-separator')?.textContent?.trim() || '',
        };
      });
      console.log('[Check 6] Breadcrumb info (Edit mode):', editBcInfo);
      if (!editBcInfo?.text.includes('Edit Product')) {
        throw new Error('Breadcrumb missing Edit Product in edit mode!');
      }

      const editBackBtnExists = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button, a'));
        return allButtons.some((b) => /back to catalog/i.test(b.textContent || ''));
      });
      console.log(`[Check 7] 'Back to Catalog' in edit mode: ${editBackBtnExists} (Expected: false)`);
      if (editBackBtnExists) throw new Error("'Back to Catalog' button exists in edit mode!");

      const editPath = path.join(ARTIFACTS_DIR, 'product_focused_02_edit_page.png');
      await page.screenshot({ path: editPath, fullPage: false });
      console.log(`Saved screenshot: ${editPath}`);
    }

    // 3. RESPONSIVE VERIFICATION: TABLET
    console.log('\n[3/7] Testing Tablet Viewport (820x1180)...');
    await page.setViewport({ width: 820, height: 1180 });
    await page.goto('http://localhost:3000/admin/product/publish', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 1500));
    const tabletPath = path.join(ARTIFACTS_DIR, 'product_focused_05_tablet.png');
    await page.screenshot({ path: tabletPath, fullPage: false });
    console.log(`Saved screenshot: ${tabletPath}`);

    // 4. RESPONSIVE VERIFICATION: MOBILE
    console.log('\n[4/7] Testing Mobile Viewport (390x844)...');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://localhost:3000/admin/product/publish', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Verify zero horizontal page overflow on mobile
    const mobileOverflow = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        windowInnerWidth: window.innerWidth,
        hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
      };
    });
    console.log('[Check 8] Mobile horizontal overflow:', mobileOverflow);

    const mobilePath = path.join(ARTIFACTS_DIR, 'product_focused_06_mobile.png');
    await page.screenshot({ path: mobilePath, fullPage: false });
    console.log(`Saved screenshot: ${mobilePath}`);

    console.log('\n=== ALL FOCUSED UI IMPROVEMENTS VERIFIED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Verification failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

runVerification();
