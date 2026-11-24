import { chromium } from 'playwright';
import path from 'node:path';

async function testLoadingScreenVisual() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await page.goto('http://localhost:4173/AbandonedButNotForgoten-Beta/');

  // Wait for splash screen
  await page.waitForSelector('#nms-splash', { state: 'visible', timeout: 15000 });

  // Press Enter to enter the menu
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // Take screenshot of the Moon Showroom loader when opening spacecrafts
  const craftsBtn = page.locator('#btn-open-crafts');
  await craftsBtn.waitFor({ state: 'visible', timeout: 5000 });
  await craftsBtn.click();
  
  // Capture the showroom loader
  try {
    const showroomLoader = page.locator('.showroom-3d-loader');
    await showroomLoader.waitFor({ state: 'visible', timeout: 3000 });
    await page.screenshot({ path: path.resolve('test-artifacts/screenshots/07_moon_loader_active.png') });
    console.log('✓ Captured 07_moon_loader_active.png');
  } catch (e) {
    console.log('Loader was fast or finished:', e.message);
  }

  // Also wait for the 3D showroom to complete and take a screenshot
  await page.waitForSelector('#showroom-root, .showroom-viewport canvas', { timeout: 25000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.resolve('test-artifacts/screenshots/08_showroom_active.png') });
  console.log('✓ Captured 08_showroom_active.png');

  await browser.close();
}

testLoadingScreenVisual().catch(console.error);
