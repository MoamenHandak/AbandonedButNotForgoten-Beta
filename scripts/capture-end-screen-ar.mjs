import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'test-artifacts', 'screenshots');
const BASE_URL = process.env.BASE_URL || 'http://localhost:4173/AbandonedButNotForgoten-Beta/';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    window.localStorage.setItem(
      'abnf_game_settings',
      JSON.stringify({
        language: 'ar',
        muteAudio: true,
        graphicsQuality: 'ultra',
      })
    );
    window.localStorage.setItem('abnf_test_scene', 'the_end');
  });

  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#initial-loading-screen, .main-boot-loader', { state: 'detached', timeout: 35000 }).catch(() => null);
  await sleep(1500);

  const titleScreen = page.locator('#title-screen');
  await titleScreen.waitFor({ state: 'visible', timeout: 15000 });
  await titleScreen.click({ force: true });
  await sleep(1500);

  // Click start journey button
  const startBtn = page.locator('#btn-start-journey, .nms-hero-action-btn').first();
  await startBtn.waitFor({ state: 'visible', timeout: 15000 });
  await startBtn.click();

  const theEndScreen = page.locator('.the-end-screen');
  await theEndScreen.waitFor({ state: 'visible', timeout: 15000 });
  await sleep(2000);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_the_end_screen_ar.png') });
  console.log('✓ Captured verify_the_end_screen_ar.png');

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
