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
  console.log('Launching browser to capture redesigned TheEndScreen...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: [
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--window-size=1280,800',
    ],
  });

  // 1. English Capture
  const contextEn = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  await contextEn.addInitScript(() => {
    window.localStorage.setItem(
      'abnf_game_settings',
      JSON.stringify({
        language: 'en',
        masterVolume: 75,
        musicVolume: 70,
        sfxVolume: 80,
        muteAudio: true,
        graphicsQuality: 'ultra',
      })
    );
    window.localStorage.setItem('abnf_test_scene', 'the_end');
  });

  const pageEn = await contextEn.newPage();
  await pageEn.goto(BASE_URL, { waitUntil: 'networkidle' });
  await pageEn.waitForSelector('.main-boot-loader', { state: 'detached', timeout: 30000 }).catch(() => null);
  await sleep(800);

  // Press any key on splash
  await pageEn.keyboard.press('Space');
  await pageEn.mouse.click(640, 400);
  await sleep(1200);

  // Click Start Journey
  const startBtn = pageEn.locator('#btn-start-journey, .nms-hero-action-btn').first();
  await startBtn.waitFor({ state: 'visible', timeout: 10000 });
  await startBtn.click();

  // Wait for The End Screen to appear
  const theEndScreen = pageEn.locator('.the-end-screen');
  await theEndScreen.waitFor({ state: 'visible', timeout: 15000 });
  await sleep(2000);

  await pageEn.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_the_end_screen_en.png') });
  console.log('✓ Captured verify_the_end_screen_en.png');

  // Test jump to credits via screen click
  console.log('Testing jump to credits via screen click...');
  await theEndScreen.click();
  await sleep(1500);

  const creditsModal = pageEn.locator('#credits-modal');
  if (await creditsModal.isVisible()) {
    console.log('✓ Credits modal opened successfully from The End Screen');
    await pageEn.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_the_end_credits_opened.png') });
  }

  // 2. Arabic Capture
  const contextAr = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  await contextAr.addInitScript(() => {
    window.localStorage.setItem(
      'abnf_game_settings',
      JSON.stringify({
        language: 'ar',
        masterVolume: 75,
        musicVolume: 70,
        sfxVolume: 80,
        muteAudio: true,
        graphicsQuality: 'ultra',
      })
    );
    window.localStorage.setItem('abnf_test_scene', 'the_end');
  });

  const pageAr = await contextAr.newPage();
  await pageAr.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await pageAr.waitForSelector('.main-boot-loader', { state: 'detached', timeout: 30000 }).catch(() => null);
  await sleep(800);

  await pageAr.keyboard.press('Space');
  await pageAr.mouse.click(640, 400);
  await sleep(1200);

  const startBtnAr = pageAr.locator('#btn-start-journey, .nms-hero-action-btn').first();
  await startBtnAr.waitFor({ state: 'visible', timeout: 10000 });
  await startBtnAr.click();

  const theEndScreenAr = pageAr.locator('.the-end-screen');
  await theEndScreenAr.waitFor({ state: 'visible', timeout: 15000 });
  await sleep(2000);

  await pageAr.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_the_end_screen_ar.png') });
  console.log('✓ Captured verify_the_end_screen_ar.png');

  await browser.close();
  console.log('The End Screen verification completed successfully!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
