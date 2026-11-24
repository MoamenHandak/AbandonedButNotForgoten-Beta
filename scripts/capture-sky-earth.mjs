import { chromium } from 'playwright';
import fs from 'node:fs';
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
    args: [
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--window-size=1280,800',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
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
  });

  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.main-boot-loader', { state: 'detached', timeout: 30000 }).catch(() => null);
  await sleep(1200);

  // Click splash screen to mount Main Menu buttons
  await page.keyboard.press('Space');
  await page.mouse.click(640, 400);
  await sleep(2000);

  // 1. Capture Settings Modal with Ultra preset
  console.log('Capturing Settings Modal...');
  const settingsBtn = page.locator('#btn-settings, button:has-text("SETTINGS")').first();
  await settingsBtn.waitFor({ state: 'visible', timeout: 10000 });
  await settingsBtn.click();
  await sleep(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '18_settings_modal_ultra.png') });
  console.log('✓ Captured 18_settings_modal_ultra.png');
  const closeBtn = page.locator('#setBack, .ui-panel .ui-btn, button:has-text("BACK")').first();
  if (await closeBtn.isVisible()) await closeBtn.click();
  await sleep(1000);

  // 2. Start Journey -> Skip Prologue -> Enter Moon Showroom
  console.log('Starting Journey...');
  const startBtn = page.locator('#btn-start-journey, .nms-hero-action-btn').first();
  await startBtn.waitFor({ state: 'visible', timeout: 10000 });
  await startBtn.click();

  await page.waitForSelector('.story-stage-skip, .story-dialogue-wrapper, .story-cinematic-stage', { timeout: 25000 });
  const skipBtn = page.locator('button[title*="Skip directly to destination choice"], .story-stage-skip').first();
  await skipBtn.waitFor({ state: 'visible', timeout: 8000 });
  await skipBtn.click({ force: true });
  await sleep(2500);

  const moonChoiceBtn = page.locator('.moon-choice-card .choice-dest-btn');
  await moonChoiceBtn.waitFor({ state: 'visible', timeout: 8000 });
  await moonChoiceBtn.click();

  const showroomCanvas = page.locator('.showroom-viewport canvas');
  await showroomCanvas.waitFor({ state: 'visible', timeout: 25000 });
  await sleep(4000);

  // 3. Pan / tilt up to capture Earth in the sky
  const cBox = await showroomCanvas.boundingBox();
  if (cBox) {
    // Drag upwards to pitch camera UP towards Earth in the sky
    await page.mouse.move(cBox.x + cBox.width * 0.5, cBox.y + cBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(cBox.x + cBox.width * 0.5 - 140, cBox.y + cBox.height * 0.5 - 180, { steps: 16 });
    await page.mouse.up();
    await sleep(2000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '19_earth_in_lunar_sky.png') });
    console.log('✓ Captured 19_earth_in_lunar_sky.png');
  }

  // 4. Also go to Mars Showroom and capture the Opportunity & InSight terrain
  const destBackBtn = page.locator('.showroom-back-dest-btn, button:has-text("DESTINATIONS")').first();
  if (await destBackBtn.isVisible()) {
    await destBackBtn.click();
    await sleep(2000);

    const marsBtn = page.locator('.mars-choice-card .choice-dest-btn');
    await marsBtn.waitFor({ state: 'visible', timeout: 8000 });
    await marsBtn.click();

    await showroomCanvas.waitFor({ state: 'visible', timeout: 25000 });
    await sleep(4000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '20_mars_surface_ultra.png') });
    console.log('✓ Captured 20_mars_surface_ultra.png');
  }

  await browser.close();
  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
