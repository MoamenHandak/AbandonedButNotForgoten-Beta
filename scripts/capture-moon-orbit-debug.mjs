import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'test-artifacts', 'screenshots');

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
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  await page.goto('http://localhost:4173/AbandonedButNotForgoten-Beta/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.keyboard.press('Space');
  await page.waitForTimeout(1000);
  await page.locator('#btn-start-journey, .nms-hero-action-btn').first().click();
  await page.waitForTimeout(1500);
  const skipBtn = page.locator('.story-stage-skip').first();
  if (await skipBtn.isVisible()) await skipBtn.click();
  await page.waitForTimeout(2000);
  await page.locator('.moon-choice-card .choice-dest-btn').click();

  const canvas = page.locator('.showroom-viewport canvas[data-engine*="three.js"]').first();
  await canvas.waitFor({ state: 'visible', timeout: 25000 });
  await page.waitForTimeout(3000);

  // Switch to dot index 2 (LRO orbiter)
  const dots = page.locator('.showroom-inspect-dot');
  await dots.nth(2).click();
  await page.waitForTimeout(4000);

  // Now click ORBIT OVERVIEW button if present
  const overviewBtn = page.locator('button:has-text("ORBIT OVERVIEW")');
  if (await overviewBtn.isVisible()) {
    console.log('Clicking ORBIT OVERVIEW button...');
    await overviewBtn.click();
    await page.waitForTimeout(3500);
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify_moon_orbit_overview_fixed.png') });
  console.log('Captured verify_moon_orbit_overview_fixed.png');
  await browser.close();
}

run().catch(console.error);
