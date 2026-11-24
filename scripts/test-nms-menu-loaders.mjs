import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('test-artifacts/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('Launching browser for NMS Menu & Loaders QA...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  const url = 'http://localhost:4173/AbandonedButNotForgoten-Beta/';
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // 1. Initial Loading Screen
  console.log('[STEP 1] Checking Initial Loading Screen...');
  const initialLoader = page.locator('#initial-loading-screen');
  await initialLoader.waitFor({ state: 'attached', timeout: 5000 });
  await page.screenshot({ path: path.join(outDir, '01_initial_loader.png') });
  console.log('✓ Captured 01_initial_loader.png');

  // Wait for initial loader to auto-continue and fade out
  console.log('[STEP 2] Waiting for Initial Loader to auto-continue...');
  await page.waitForSelector('#nms-splash', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2200); // let title and prompt entrance animations finish
  await page.screenshot({ path: path.join(outDir, '02_title_screen.png') });
  console.log('✓ Captured 02_title_screen.png');

  // 3. Press key to enter menu
  console.log('[STEP 3] Entering Main Menu...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200); // allow entrance animation to settle

  const moonBtn = page.locator('#btn-start-journey');
  const marsBtn = page.locator('#btn-open-crafts');
  const settingsBtn = page.locator('#btn-open-settings');
  const creditsBtn = page.locator('#btn-open-credits');
  const moonViewer = page.locator('#moon-viewer');
  const marsViewer = page.locator('#mars-viewer');

  console.log('Verifying Menu Elements:');
  console.log('  moon button visible:', await moonBtn.isVisible());
  console.log('  mars button visible:', await marsBtn.isVisible());
  console.log('  settings button visible:', await settingsBtn.isVisible());
  console.log('  credits button visible:', await creditsBtn.isVisible());
  console.log('  moon viewer attached:', (await moonViewer.count()) > 0);
  console.log('  mars viewer attached:', (await marsViewer.count()) > 0);

  await page.screenshot({ path: path.join(outDir, '03_main_menu.png') });
  console.log('✓ Captured 03_main_menu.png');

  // 4. Test Credits Modal
  console.log('[STEP 4] Opening Credits Modal...');
  await creditsBtn.click();
  await page.waitForTimeout(3500); // allow rolling credits to scroll into view
  const creditsModal = page.locator('#credits-modal');
  console.log('  credits modal visible:', await creditsModal.isVisible());
  await page.screenshot({ path: path.join(outDir, '04_credits_modal.png') });
  console.log('✓ Captured 04_credits_modal.png');

  // Press Space to pause
  console.log('  Testing Space to pause credits...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  const isPaused = await page.evaluate(() => document.getElementById('credits-modal')?.classList.contains('is-paused'));
  console.log('  credits paused via Space:', isPaused);

  // Press Esc to close
  console.log('  Testing Esc to close credits...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  console.log('  credits modal closed:', !(await creditsModal.isVisible()));

  // 5. Test Mobile Viewport
  console.log('[STEP 5] Testing Mobile Viewport (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '05_main_menu_mobile.png') });
  console.log('✓ Captured 05_main_menu_mobile.png');

  // Reset to desktop viewport
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(400);

  // 6. Test Start Journey & Journey Loading Screen
  console.log('[STEP 6] Clicking Start Journey...');
  await moonBtn.click();
  // Wait for launch loading screen or story entry
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '06_journey_screen.png') });
  console.log('✓ Captured 06_journey_screen.png');

  console.log('\n====================================');
  console.log('Console Errors:', consoleErrors);
  console.log('====================================');

  await browser.close();
  console.log('QA Test complete!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
