import { chromium } from 'playwright';
import path from 'node:path';

async function testMarsLoader() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await page.goto('http://localhost:4173/AbandonedButNotForgoten-Beta/');
  await page.waitForSelector('#nms-splash', { state: 'visible', timeout: 15000 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // In Story mode or by switching planet in showroom:
  const craftsBtn = page.locator('#btn-open-crafts');
  await craftsBtn.waitFor({ state: 'visible', timeout: 5000 });
  await craftsBtn.click();
  await page.waitForSelector('#showroom-root', { timeout: 25000 });
  await page.waitForTimeout(1500);

  // Click on the Mars planet switch tab in the showroom menu or navigation
  console.log('Switching to Mars destination...');
  // Find Mars vehicle or tab
  const menuBtn = page.locator('button[aria-label="Toggle Navigation Menu"], button:has-text("MENU"), .showroom-menu-btn');
  if (await menuBtn.count() > 0) {
    await menuBtn.first().click();
    await page.waitForTimeout(500);
    const marsTab = page.locator('button:has-text("MARS"), button:has-text("المريخ")');
    if (await marsTab.count() > 0) {
      await marsTab.first().click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.resolve('test-artifacts/screenshots/09_mars_loader_active.png') });
      console.log('✓ Captured 09_mars_loader_active.png');
    }
  }

  await browser.close();
  console.log('Done testMarsLoader');
}

testMarsLoader().catch(console.error);
