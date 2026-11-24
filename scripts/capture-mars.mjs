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
    window.localStorage.setItem(
      'abnf_story_progression_v1',
      JSON.stringify({
        firstChoice: 'moon',
        completedQuizzes: { 'lunar-rover': true, 'apollo-lunar-module': true },
        completedAreas: { moon: true, mars: false },
        allCompleted: true,
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

  // Start Journey
  const startBtn = page.locator('#btn-start-journey, .nms-hero-action-btn').first();
  await startBtn.waitFor({ state: 'visible', timeout: 10000 });
  await startBtn.click();

  await page.waitForSelector('.story-stage-skip, .story-dialogue-wrapper, .story-cinematic-stage', { timeout: 25000 });
  const skipBtn = page.locator('button[title*="Skip directly to destination choice"], .story-stage-skip').first();
  await skipBtn.waitFor({ state: 'visible', timeout: 8000 });
  await skipBtn.click({ force: true });
  await sleep(2500);

  // Select MARS choice card
  console.log('Selecting Mars...');
  const marsChoiceBtn = page.locator('.mars-choice-card .choice-dest-btn');
  await marsChoiceBtn.waitFor({ state: 'visible', timeout: 8000 });
  await marsChoiceBtn.click();

  const showroomCanvas = page.locator('.showroom-viewport canvas');
  await showroomCanvas.waitFor({ state: 'visible', timeout: 30000 });
  await sleep(4500);

  // Capture Opportunity on cel-shaded terrain with wide shadows and dunes
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '25_mars_ultra_oppy_terrain.png') });
  console.log('✓ Captured 25_mars_ultra_oppy_terrain.png');

  // Switch to InSight
  const insightTab = page.locator('.showroom-vehicle-tab', { hasText: 'INSIGHT' }).first();
  if (await insightTab.isVisible()) {
    await insightTab.click();
    await sleep(3500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '26_mars_ultra_insight_terrain.png') });
    console.log('✓ Captured 26_mars_ultra_insight_terrain.png');
  }

  // Switch to Ingenuity
  const ingTab = page.locator('.showroom-vehicle-tab', { hasText: 'INGENUITY' }).first();
  if (await ingTab.isVisible()) {
    await ingTab.click();
    await sleep(3500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '27_mars_ultra_ingenuity_terrain.png') });
    console.log('✓ Captured 27_mars_ultra_ingenuity_terrain.png');
  }

  await browser.close();
  console.log('Mars capture complete!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
