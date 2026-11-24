import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('test-artifacts/screenshots');

async function run() {
  console.log('Testing Moon & Mars Planetary Loaders...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  // Navigate to app
  await page.goto('http://localhost:4173/AbandonedButNotForgoten-Beta/');
  // Wait for title screen
  await page.waitForSelector('#nms-splash', { state: 'visible', timeout: 15000 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // Click Spacecrafts button to open PlanetaryShowroom directly
  const craftsBtn = page.locator('#btn-open-crafts');
  await craftsBtn.click();
  console.log('Opened Showroom / Spacecrafts...');

  // The showroom loader should appear with title and progress
  const loader = page.locator('.showroom-3d-loader');
  if (await loader.count() > 0) {
    await page.screenshot({ path: path.join(outDir, '07_showroom_moon_loader.png') });
    console.log('✓ Captured 07_showroom_moon_loader.png');
  }

  // Wait for 3D showroom to finish loading
  await page.waitForSelector('.showroom-viewport canvas, #showroom-root', { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, '08_moon_showroom_loaded.png') });
  console.log('✓ Captured 08_moon_showroom_loaded.png');

  console.log('Console Errors:', consoleErrors);
  await browser.close();
  console.log('Planet Loaders QA complete!');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
