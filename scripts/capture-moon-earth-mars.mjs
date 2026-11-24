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
  await sleep(1000);

  // Click splash
  await page.keyboard.press('Space');
  await page.mouse.click(640, 400);
  await sleep(2000);

  // Directly Start Journey
  console.log('Starting Journey...');
  const startBtn = page.locator('#btn-start-journey, .nms-hero-action-btn').first();
  await startBtn.waitFor({ state: 'visible', timeout: 10000 });
  await startBtn.click();

  await page.waitForSelector('.story-stage-skip, .story-dialogue-wrapper, .story-cinematic-stage', { timeout: 25000 });
  const skipBtn = page.locator('button[title*="Skip directly to destination choice"], .story-stage-skip').first();
  await skipBtn.waitFor({ state: 'visible', timeout: 8000 });
  await skipBtn.click({ force: true });
  await sleep(2500);

  // Enter Moon Showroom
  console.log('Entering Moon Showroom...');
  const moonChoiceBtn = page.locator('.moon-choice-card .choice-dest-btn');
  await moonChoiceBtn.waitFor({ state: 'visible', timeout: 8000 });
  await moonChoiceBtn.click();

  const showroomCanvas = page.locator('.showroom-viewport canvas');
  await showroomCanvas.waitFor({ state: 'visible', timeout: 25000 });
  await sleep(4000);

  // Capture wide surface shot
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '21_moon_ultra_landscape_rover.png') });
  console.log('✓ Captured 21_moon_ultra_landscape_rover.png');

  // To look up at Earth in the sky:
  // OrbitControls: dragging up pitches camera down; dragging down pitches camera UP.
  // Wait, let's verify OrbitControls:
  // In Three.js OrbitControls:
  // spherical.phi -= 2 * Math.PI * deltaY / element.clientHeight;
  // If deltaY is NEGATIVE (moving up), phi INCREASES (camera goes higher / looks down).
  // If deltaY is POSITIVE (moving down), phi DECREASES (camera goes lower to ground / looks UP towards sky)!
  // That means moving the mouse DOWN tilts the camera to look up!
  // BUT in our previous test:
  // When mouse moved down (+150), camera went from ground level looking forward to looking down from above the rover.
  // Why? Because in OrbitControls standard rotate:
  // deltaY > 0 -> rotateLeft/Up!
  // Let's test using evaluate to rotate the camera controls directly, which is 100% precise!
  await page.evaluate(() => {
    // Look towards Earth at [-65, 38, -120]
    const canvas = document.querySelector('.showroom-viewport canvas');
    // Dispatch mouse drag
  });

  const cBox = await showroomCanvas.boundingBox();
  if (cBox) {
    // Let's drag up (towards top of screen)
    await page.mouse.move(cBox.x + cBox.width * 0.5, cBox.y + cBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(cBox.x + cBox.width * 0.5 + 220, cBox.y + cBox.height * 0.5 - 180, { steps: 15 });
    await page.mouse.up();
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '22_moon_drag_look_at_earth.png') });
    console.log('✓ Captured 22_moon_drag_look_at_earth.png');
  }

  // Go to Mars Showroom
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

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '23_mars_surface_ultra.png') });
    console.log('✓ Captured 23_mars_surface_ultra.png');

    // Switch to Opportunity
    const oppyTab = page.locator('.showroom-vehicle-tab', { hasText: 'OPPORTUNITY' }).first();
    if (await oppyTab.isVisible()) {
      await oppyTab.click();
      await sleep(3500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '24_mars_oppy_wide_shadows.png') });
      console.log('✓ Captured 24_mars_oppy_wide_shadows.png');
    }
  }

  await browser.close();
  console.log('Completed successfully!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
