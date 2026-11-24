import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'test-artifacts', 'screenshots');
const BASE_URL = process.env.BASE_URL || 'http://localhost:4173/AbandonedButNotForgoten-Beta/';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('--- Launching browser to verify Ultra preset, Earth shading & terrain shadows ---');
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

  // Pre-seed localStorage with 'ultra' preset
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

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('favicon') && !txt.includes('AudioContext') && !txt.includes('audio')) {
        console.warn('Browser error:', txt);
      }
    }
  });

  console.log('Navigating to', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  await page.waitForSelector('.main-boot-loader', { state: 'detached', timeout: 30000 }).catch(() => null);
  await sleep(1000);

  // Click start journey or title splash
  await page.keyboard.press('Space');
  await page.mouse.click(640, 400);
  await sleep(1500);

  // 1. Verify Settings Modal with Ultra preset
  console.log('Checking Settings Modal for Ultra graphics preset...');
  const settingsBtn = page.locator('#btn-settings, button[aria-label="Settings"], .nms-hero-action-btn[title*="Settings"]').first();
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await sleep(800);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '09_settings_modal_ultra.png'),
    });
    console.log('✓ Captured 09_settings_modal_ultra.png');

    // Close settings modal
    const closeBackBtn = page.locator('#setBack, .ui-panel .ui-btn, button:has-text("BACK")').first();
    if (await closeBackBtn.isVisible()) {
      await closeBackBtn.click();
      await sleep(600);
    }
  }

  // 2. Start Journey -> Skip Prologue -> Destination Choice
  console.log('Navigating to Destination Choice...');
  const startJourneyBtn = page.locator('#btn-start-journey, .nms-hero-action-btn').first();
  if (await startJourneyBtn.isVisible()) {
    await startJourneyBtn.click();
  }

  await page.waitForSelector('.story-stage-skip, .story-dialogue-wrapper, .story-cinematic-stage', { timeout: 20000 });
  const skipBtn = page.locator('button[title*="Skip directly to destination choice"], .story-stage-skip').first();
  await skipBtn.waitFor({ state: 'visible', timeout: 8000 });
  await skipBtn.click({ force: true });
  await sleep(2000);

  // 3. Enter Moon Showroom
  console.log('Entering Moon Showroom...');
  const moonChoiceBtn = page.locator('.moon-choice-card .choice-dest-btn');
  await moonChoiceBtn.waitFor({ state: 'visible', timeout: 8000 });
  await moonChoiceBtn.click();

  const showroomCanvas = page.locator('.showroom-viewport canvas');
  await showroomCanvas.waitFor({ state: 'visible', timeout: 25000 });
  await sleep(4000);

  // Capture wide surface view with Moon terrain, Apollo LRV, and Earth in the sky
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '10_moon_ultra_surface_and_earth.png'),
  });
  console.log('✓ Captured 10_moon_ultra_surface_and_earth.png');

  // Drag camera upwards/sideways to get a magnificent close look at Earth in the sky with its cel-shaded terminator & halo
  const cBox = await showroomCanvas.boundingBox();
  if (cBox) {
    // Drag down to tilt camera up towards the sky/Earth
    await page.mouse.move(cBox.x + cBox.width * 0.5, cBox.y + cBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(cBox.x + cBox.width * 0.5 + 180, cBox.y + cBox.height * 0.5 + 150, { steps: 12 });
    await page.mouse.up();
    await sleep(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '11_moon_earth_crescent_terminator.png'),
    });
    console.log('✓ Captured 11_moon_earth_crescent_terminator.png');
  }

  // Switch to Apollo Lunar Module to verify wide landscape shadows across terrain
  const lmTab = page.locator('.showroom-vehicle-tab', { hasText: 'APOLLO' }).first();
  if (await lmTab.isVisible()) {
    await lmTab.click();
    await sleep(3500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '12_moon_apollo_lm_terrain_shadows.png'),
    });
    console.log('✓ Captured 12_moon_apollo_lm_terrain_shadows.png');
  }

  // 4. Return to destination choice and enter Mars Showroom
  console.log('Navigating to Mars Showroom...');
  const destChoiceBtn = page.locator('.showroom-back-dest-btn, button[title*="Destination"], button:has-text("DESTINATIONS")').first();
  if (await destChoiceBtn.isVisible()) {
    await destChoiceBtn.click();
    await sleep(2000);

    const marsChoiceBtn = page.locator('.mars-choice-card .choice-dest-btn');
    await marsChoiceBtn.waitFor({ state: 'visible', timeout: 8000 });
    await marsChoiceBtn.click();

    await showroomCanvas.waitFor({ state: 'visible', timeout: 25000 });
    await sleep(4000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '13_mars_ultra_surface_and_dunes.png'),
    });
    console.log('✓ Captured 13_mars_ultra_surface_and_dunes.png');

    // Select InSight lander on Mars
    const insightTab = page.locator('.showroom-vehicle-tab', { hasText: 'INSIGHT' }).first();
    if (await insightTab.isVisible()) {
      await insightTab.click();
      await sleep(3500);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '14_mars_insight_terrain_shadows.png'),
      });
      console.log('✓ Captured 14_mars_insight_terrain_shadows.png');
    }
  }

  console.log('--- All visual verification steps complete! ---');
  await browser.close();
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
