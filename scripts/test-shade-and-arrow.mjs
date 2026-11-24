import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'test-artifacts', 'screenshots');
const BASE_URL = 'http://localhost:3000/AbandonedButNotForgoten-Beta/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    window.localStorage.setItem('abnf_game_settings', JSON.stringify({ language: 'en', graphicsQuality: 'ultra', muteAudio: true }));
    window.localStorage.setItem('abnf_story_progression_v1', JSON.stringify({
      firstChoice: 'moon', allCompleted: true, completedAreas: { moon: true, mars: true },
      completedQuizzes: { 'lunar-rover': true, 'apollo-lunar-module': true, 'lro-orbiter': true, 'ladee-orbiter': true }
    }));
  });

  const page = await context.newPage();
  console.log('Navigating to', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#initial-loading-screen, .main-boot-loader', { state: 'detached', timeout: 30000 }).catch(() => null);
  await sleep(1200);

  // Dismiss title screen
  console.log('Dismissing title screen...');
  await page.keyboard.press('Space');
  await page.mouse.click(640, 400);
  await sleep(3500);

  // Capture main menu with shaded cards
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'test_menu_shaded.png') });
  console.log('✓ Captured test_menu_shaded.png');

  // Click start journey
  console.log('Clicking start journey...');
  const startBtn = page.locator('#btn-start-journey, .nms-hero-action-btn').first();
  await startBtn.waitFor({ state: 'visible', timeout: 15000 });
  await startBtn.click();

  // Wait for journey loader to finish and prologue/selection to mount
  console.log('Waiting for journey loading / prologue...');
  await page.waitForSelector('.story-stage-skip, .story-dialogue-wrapper, .story-cinematic-stage, .moon-choice-card', { timeout: 30000 });
  const skipBtn = page.locator('button[title*="Skip directly to destination choice"], .story-stage-skip').first();
  if (await skipBtn.isVisible()) {
    console.log('Skipping prologue...');
    await skipBtn.click({ force: true });
    await sleep(2000);
  }

  // Enter Moon
  console.log('Entering Moon Showroom...');
  const moonBtn = page.locator('.moon-choice-card .choice-dest-btn').first();
  await moonBtn.waitFor({ state: 'visible', timeout: 15000 });
  await moonBtn.click();

  const canvas = page.locator('.showroom-viewport canvas[data-engine*="three.js"]').first();
  await canvas.waitFor({ state: 'visible', timeout: 30000 });
  await sleep(4000);

  // Click hide card button on the mission panel
  console.log('Hiding cards via mission-hide-card-btn...');
  const hideBtn = page.locator('.mission-hide-card-btn').first();
  await hideBtn.waitFor({ state: 'visible', timeout: 8000 });
  await hideBtn.click();
  await sleep(1500);

  // Capture screenshot showing arrow moved to the other side of screen
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'test_arrow_hidden.png') });
  console.log('✓ Captured test_arrow_hidden.png');

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
