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
  console.log('Launching browser for comprehensive view captures...');
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

  // ==========================================
  // PART 1: MOON SHOWROOM
  // ==========================================
  console.log('Entering Moon Showroom...');
  const moonChoiceBtn = page.locator('.moon-choice-card .choice-dest-btn');
  await moonChoiceBtn.waitFor({ state: 'visible', timeout: 8000 });
  await moonChoiceBtn.click();

  const showroomCanvas = page.locator('.showroom-viewport canvas[data-engine*="three.js"]').first();
  await showroomCanvas.waitFor({ state: 'visible', timeout: 25000 });
  await sleep(4000);

  // Rotate camera on Moon surface to look towards Earth in the black sky
  const cBox = await showroomCanvas.boundingBox();
  if (cBox) {
    // Drag mouse downwards to tilt camera up towards the sky
    await page.mouse.move(cBox.x + cBox.width * 0.5, cBox.y + cBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(cBox.x + cBox.width * 0.5 - 180, cBox.y + cBox.height * 0.5 + 160, { steps: 20 });
    await page.mouse.up();
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_moon_rover_earth_sky.png') });
    console.log('✓ Captured verify_moon_rover_earth_sky.png');
  }

  // Select Apollo Lunar Module (index 1) and pull back camera to view with Earth
  console.log('Selecting Apollo Lunar Module...');
  const dots = page.locator('.showroom-inspect-dot');
  await dots.nth(1).click();
  await sleep(3500);

  if (cBox) {
    // Zoom out with mouse wheel and tilt up
    await page.mouse.move(cBox.x + cBox.width * 0.45, cBox.y + cBox.height * 0.5);
    await page.mouse.wheel(0, 600);
    await sleep(1000);
    await page.mouse.down();
    await page.mouse.move(cBox.x + cBox.width * 0.45 - 160, cBox.y + cBox.height * 0.5 + 140, { steps: 20 });
    await page.mouse.up();
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_moon_lm_earth_wide.png') });
    console.log('✓ Captured verify_moon_lm_earth_wide.png');
  }

  // ==========================================
  // PART 2: MARS SHOWROOM (Smooth ground test)
  // ==========================================
  console.log('Navigating directly to Mars...');
  const page2 = await context.newPage();
  await page2.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(1000);
  await page2.keyboard.press('Space');
  await page2.mouse.click(640, 400);
  await sleep(1500);

  const startBtn2 = page2.locator('#btn-start-journey, .nms-hero-action-btn').first();
  await startBtn2.waitFor({ state: 'visible', timeout: 10000 });
  await startBtn2.click();

  await page2.waitForSelector('.story-stage-skip, .story-dialogue-wrapper, .story-cinematic-stage', { timeout: 25000 });
  const skipBtn2 = page2.locator('button[title*="Skip directly to destination choice"], .story-stage-skip').first();
  await skipBtn2.waitFor({ state: 'visible', timeout: 8000 });
  await skipBtn2.click({ force: true });
  await sleep(2000);

  const marsChoiceBtn = page2.locator('.mars-choice-card .choice-dest-btn');
  await marsChoiceBtn.waitFor({ state: 'visible', timeout: 8000 });
  await marsChoiceBtn.click();

  const marsCanvas = page2.locator('.showroom-viewport canvas[data-engine*="three.js"]').first();
  await marsCanvas.waitFor({ state: 'visible', timeout: 25000 });
  await sleep(4500);

  await page2.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_mars_surface_smooth.png') });
  console.log('✓ Captured verify_mars_surface_smooth.png');

  await browser.close();
  console.log('All captures completed successfully!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
