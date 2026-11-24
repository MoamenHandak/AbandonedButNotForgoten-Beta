import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'test-artifacts', 'screenshots');
const BASE_URL = 'http://localhost:4173/AbandonedButNotForgoten-Beta/';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startServer() {
  const srv = spawn('npx.cmd', ['vite', 'preview', '--port', '4173'], {
    cwd: ROOT_DIR,
    stdio: 'ignore',
    shell: true,
  });
  await sleep(2500);
  return srv;
}

async function run() {
  console.log('Starting preview server...');
  const srv = await startServer();

  try {
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
          completedAreas: { moon: true, mars: true },
          allCompleted: true,
          visitedCrafts: {},
          quizScores: {},
          decisions: {},
        })
      );
    });

    const page = await context.newPage();
    console.log('Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('.main-boot-loader', { state: 'detached', timeout: 30000 }).catch(() => null);
    await sleep(1000);

    // Dismiss splash
    await page.keyboard.press('Space');
    await page.mouse.click(640, 400);
    await sleep(1500);

    // Click Start Journey
    const startBtn = page.locator('#btn-start-journey, .nms-hero-action-btn').first();
    await startBtn.waitFor({ state: 'visible', timeout: 10000 });
    await startBtn.click();

    // Skip to destination choice
    await page.waitForSelector('.story-stage-skip, .story-dialogue-wrapper, .story-cinematic-stage', { timeout: 25000 });
    const skipBtn = page.locator('button[title*="Skip directly to destination choice"], .story-stage-skip').first();
    await skipBtn.waitFor({ state: 'visible', timeout: 8000 });
    await skipBtn.click({ force: true });
    await sleep(2500);

    // ==========================================
    // 1. Enter Moon Showroom
    // ==========================================
    console.log('Entering Moon Showroom...');
    const moonChoiceBtn = page.locator('.moon-choice-card .choice-dest-btn');
    await moonChoiceBtn.waitFor({ state: 'visible', timeout: 8000 });
    await moonChoiceBtn.click();

    const showroomCanvas = page.locator('.showroom-viewport canvas');
    await showroomCanvas.waitFor({ state: 'visible', timeout: 25000 });
    await sleep(4000);

    // Capture Lunar Rover + Smooth Ground + Earth in Sky
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_01_moon_rover_and_earth.png') });
    console.log('✓ Captured verify_01_moon_rover_and_earth.png');

    // ==========================================
    // 2. Switch to Moon Orbit View
    // Press ArrowRight twice (from LRV -> LM -> Lunar Orbit System)
    // ==========================================
    console.log('Switching to Lunar Module...');
    await page.keyboard.press('ArrowRight');
    await sleep(3000);

    console.log('Switching to Lunar Orbit System (Earth in center, Moon orbiting it)...');
    await page.keyboard.press('ArrowRight');
    await sleep(4000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_02_earth_moon_orbit_overview.png') });
    console.log('✓ Captured verify_02_earth_moon_orbit_overview.png');

    // Press ArrowRight again to select LRO orbiter
    console.log('Switching to LRO Orbiter...');
    await page.keyboard.press('ArrowRight');
    await sleep(3500);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_03_lro_hero_orbit_view.png') });
    console.log('✓ Captured verify_03_lro_hero_orbit_view.png');

    // ==========================================
    // 3. Switch Destination to Mars
    // ==========================================
    console.log('Opening Pause Menu to change destination to Mars...');
    const menuBtn = page.locator('button[title="Menu"]').first();
    await menuBtn.click();
    await sleep(1000);

    const changeDestBtn = page.locator('button:has-text("CHANGE DESTINATION")').first();
    await changeDestBtn.waitFor({ state: 'visible', timeout: 8000 });
    await changeDestBtn.click();
    await sleep(2500);

    console.log('Entering Mars Showroom...');
    const marsBtn = page.locator('.mars-choice-card .choice-dest-btn');
    await marsBtn.waitFor({ state: 'visible', timeout: 8000 });
    await marsBtn.click();

    await showroomCanvas.waitFor({ state: 'visible', timeout: 25000 });
    await sleep(4500);

    // Opportunity rover on Mars
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_04_mars_oppy_ground_no_noise.png') });
    console.log('✓ Captured verify_04_mars_oppy_ground_no_noise.png');

    await browser.close();
    console.log('All verification captures completed successfully!');
  } finally {
    try {
      srv.kill();
    } catch {}
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
