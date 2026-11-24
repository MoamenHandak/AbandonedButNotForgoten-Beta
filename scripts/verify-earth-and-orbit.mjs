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
  console.log('Launching browser for Earth & Orbit visual verification...');
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
    window.localStorage.setItem(
      'abnf_story_progression_v1',
      JSON.stringify({
        firstChoice: 'moon',
        allCompleted: true,
        completedAreas: { moon: true, mars: true },
        completedQuizzes: {
          'lunar-rover': true,
          'apollo-lunar-module': true,
          'lro-orbiter': true,
          'ladee-orbiter': true,
          'mer-opportunity': true,
          'ingenuity-helicopter': true,
          'viking-lander': true,
          'insight-lander': true,
          'mgs-orbiter': true,
          'odyssey-orbiter': true,
          'mro-orbiter': true,
          'maven-orbiter': true,
        },
      })
    );
  });

  const page = await context.newPage();
  console.log(`Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.main-boot-loader', { state: 'detached', timeout: 30000 }).catch(() => null);
  await sleep(1000);

  // Press any key to enter main menu
  await page.keyboard.press('Space');
  await page.mouse.click(640, 400);
  await sleep(1500);

  // Start Journey
  console.log('Starting Journey...');
  const startBtn = page.locator('#btn-start-journey, .nms-hero-action-btn').first();
  await startBtn.waitFor({ state: 'visible', timeout: 10000 });
  await startBtn.click();

  // Skip dialogue directly to destination selection
  await page.waitForSelector('.story-stage-skip, .story-dialogue-wrapper, .story-cinematic-stage', { timeout: 25000 });
  const skipBtn = page.locator('button[title*="Skip directly to destination choice"], .story-stage-skip').first();
  await skipBtn.waitFor({ state: 'visible', timeout: 8000 });
  await skipBtn.click({ force: true });
  await sleep(2000);

  // 1. Enter Moon Showroom
  console.log('Entering Moon Showroom...');
  const moonChoiceBtn = page.locator('.moon-choice-card .choice-dest-btn');
  await moonChoiceBtn.waitFor({ state: 'visible', timeout: 8000 });
  await moonChoiceBtn.click();

  const showroomCanvas = page.locator('.showroom-viewport canvas[data-engine*="three.js"]').first();
  await showroomCanvas.waitFor({ state: 'visible', timeout: 25000 });
  await sleep(4000);

  // Capture wide surface shot with Lunar Rover and Earth in sky
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_moon_rover_earth.png') });
  console.log('✓ Captured verify_moon_rover_earth.png');

  // Select Apollo Lunar Module (index 1)
  console.log('Selecting Apollo Lunar Module...');
  const dots = page.locator('.showroom-inspect-dot');
  await dots.nth(1).click();
  await sleep(3500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_moon_lm_earth.png') });
  console.log('✓ Captured verify_moon_lm_earth.png');

  // Select Lunar Orbit System Overview (index 2)
  console.log('Selecting Lunar Orbit System Overview...');
  await dots.nth(2).click();
  await sleep(4500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_moon_orbit_overview.png') });
  console.log('✓ Captured verify_moon_orbit_overview.png');

  // Select LRO Orbiter (index 3)
  console.log('Selecting LRO Orbiter...');
  await dots.nth(3).click();
  await sleep(4500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_moon_orbit_lro.png') });
  console.log('✓ Captured verify_moon_orbit_lro.png');

  // 3. Switch to Mars to verify ground noise / moiré fix
  console.log('Navigating to Mars Showroom...');
  const destBackBtn = page.locator('.showroom-back-dest-btn, button:has-text("DESTINATIONS")').first();
  if (await destBackBtn.isVisible()) {
    await destBackBtn.click();
    await sleep(2000);

    const marsBtn = page.locator('.mars-choice-card .choice-dest-btn');
    await marsBtn.waitFor({ state: 'visible', timeout: 8000 });
    await marsBtn.click();

    await showroomCanvas.waitFor({ state: 'visible', timeout: 25000 });
    await sleep(4000);

    // Opportunity is index 0 in Mars
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_mars_surface_smooth.png') });
    console.log('✓ Captured verify_mars_surface_smooth.png');
  }

  await browser.close();
  console.log('All verifications finished successfully!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
