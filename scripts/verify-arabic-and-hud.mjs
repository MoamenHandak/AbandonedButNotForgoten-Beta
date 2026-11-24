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
  
  // Set Arabic language in localStorage
  await context.addInitScript(() => {
    window.localStorage.setItem('abnf_game_settings', JSON.stringify({ language: 'ar', graphicsQuality: 'ultra', muteAudio: true }));
    window.localStorage.setItem('abnf_story_progression_v1', JSON.stringify({
      firstChoice: 'moon', allCompleted: false, completedAreas: {},
      completedQuizzes: {}
    }));
  });

  const page = await context.newPage();
  console.log('Navigating to', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#initial-loading-screen, .main-boot-loader', { state: 'detached', timeout: 30000 }).catch(() => null);
  await sleep(1200);

  // 1. Capture main menu (Spacecrafts card with Lunar Rover)
  console.log('Dismissing title screen...');
  await page.keyboard.press('Space');
  await page.mouse.click(640, 400);
  await sleep(2500);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_main_menu_lunar_rover.png') });
  console.log('✓ Captured verify_main_menu_lunar_rover.png');

  // 2. Start Journey into Moon
  console.log('Starting Journey...');
  const startBtn = page.locator('#btn-start-journey, .nms-hero-action-btn').first();
  await startBtn.waitFor({ state: 'visible', timeout: 15000 });
  await startBtn.click();

  // Wait for journey loader to finish and prologue/selection to mount
  console.log('Waiting for journey loading / prologue...');
  await page.waitForSelector('.story-stage-skip, .story-dialogue-wrapper, .story-cinematic-stage, .moon-choice-card', { timeout: 30000 });
  const skipBtn = page.locator('button[title*="تخطي"], button[title*="Skip"], .story-stage-skip').first();
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

  // Capture Arabic Moon Showroom with mission info card visible
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_ar_showroom_card.png') });
  console.log('✓ Captured verify_ar_showroom_card.png');

  // 3. Open Details panel in Arabic
  console.log('Opening Details panel in Arabic...');
  const viewDetailsBtn = page.locator('.mission-view-details-btn').first();
  await viewDetailsBtn.click();
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_ar_details_info.png') });
  console.log('✓ Captured verify_ar_details_info.png');

  // Switch to Task tab by clicking confirm
  console.log('Switching to Task tab...');
  const confirmInfoBtn = page.locator('.details-section-nav-btn.is-confirm').first();
  await confirmInfoBtn.click();
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_ar_details_tasks.png') });
  console.log('✓ Captured verify_ar_details_tasks.png');

  // Close details
  await page.locator('.details-close-btn').click();
  await sleep(1000);

  // 4. Test Environment Inspection mode (Hide HUD)
  console.log('Testing Hide HUD...');
  const hideHudBtn = page.locator('.mission-hide-card-btn').first();
  await hideHudBtn.click();
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_environment_inspect_mode.png') });
  console.log('✓ Captured verify_environment_inspect_mode.png');

  // Test restore HUD via floating pill
  console.log('Restoring HUD via pill...');
  const restorePill = page.locator('.showroom-restore-ui-pill').first();
  await restorePill.click();
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_environment_restored.png') });
  console.log('✓ Captured verify_environment_restored.png');

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
