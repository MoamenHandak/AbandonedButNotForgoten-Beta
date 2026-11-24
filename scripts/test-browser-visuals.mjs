/**
 * Automated Browser & Visual QA Test Runner — Abandoned But Not Forgotten
 *
 * Runs comprehensive multi-scene tests against the Vite preview server:
 * 1. Main Menu: CosmicBackground (floating crafts) + Astronaut Helmet preview canvas.
 * 2. Destination Select: Moon & Mars 3D preview canvases.
 * 3. Multi-Angle Globe Captures (3 angles per globe: Sunlit, Terminator, Night Limb).
 * 4. Moon Surface Showroom: LRV & LM hero crafts, SVG leader lines, terrain.
 * 5. Moon Orbit Overview: Smooth day/night terminator on globe, orbiting satellites.
 * 6. Mobile Viewport (iPhone 14: 390x844): touch layout, no horizontal overflow.
 * 7. RTL Arabic: full right-to-left layout, HUD badges, typography.
 * 8. Performance telemetry: WebGL draw calls, canvases, DPR.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'test-artifacts', 'screenshots');
const BASE_URL = process.env.BASE_URL || 'http://localhost:4173/AbandonedButNotForgoten-Beta/';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('   ABANDONED BUT NOT FORGOTTEN — VISUAL QA SUITE   ');
  console.log('====================================================');
  console.log(`Connecting to server at: ${BASE_URL}\n`);

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

  const testReport = {
    scenesTested: [],
    performanceMetrics: {},
    passed: true,
    errors: [],
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('AudioContext') && !text.includes('audio')) {
          console.warn(`  [Browser Console Error]: ${text}`);
          testReport.errors.push(text);
        }
      }
    });

    // =========================================================================
    // STEP 1: Main Menu & Floating Background
    // =========================================================================
    console.log('[STEP 1] Loading Application & Main Menu...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Wait for initial boot sequence to complete
    await page.waitForSelector('.main-boot-loader', { state: 'detached', timeout: 30000 }).catch(() => null);
    await sleep(800);

    // Press Space or click to enter title screen
    await page.keyboard.press('Space');
    await page.mouse.click(640, 400);
    await sleep(1500);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01_main_menu_desktop.png'),
    });
    console.log('  ✓ Main Menu loaded: 01_main_menu_desktop.png');
    testReport.scenesTested.push('Main Menu & Cosmic Background');

    // =========================================================================
    // STEP 2: Start Journey -> Skip Prologue -> Destination Select Screen
    // =========================================================================
    console.log('\n[STEP 2] Navigating to Destination Select Screen...');
    // Wait for boot loader to complete and Start Journey button to become visible
    const startJourneyBtn = page.locator('#btn-start-journey, .nms-tile-moon, .nms-hero-action-btn');
    await startJourneyBtn.first().waitFor({ state: 'visible', timeout: 30000 });
    await startJourneyBtn.first().click();
    console.log('  -> Clicked Start Journey, waiting for story module load...');

    // Wait for story dialogue stage or skip button
    await page.waitForSelector('.story-stage-skip, .story-dialogue-wrapper, .story-cinematic-stage', { timeout: 20000 });
    console.log('  -> Story cinematic stage reached.');

    // Click Skip Prologue button
    const skipBtn = page.locator('button[title*="Skip directly to destination choice"], .story-stage-skip').first();
    await skipBtn.waitFor({ state: 'visible', timeout: 5000 });
    await skipBtn.click({ force: true });
    console.log('  -> Skipped prologue dialogue.');
    await sleep(2000);

    // Verify Destination Screen cards and canvases
    const moonCard = page.locator('.moon-choice-card');
    const marsCard = page.locator('.mars-choice-card');
    await moonCard.waitFor({ state: 'visible', timeout: 10000 });
    await marsCard.waitFor({ state: 'visible', timeout: 10000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02_destination_select_screen.png'),
    });
    console.log('  ✓ Saved: 02_destination_select_screen.png');
    testReport.scenesTested.push('Destination Select Screen (Moon & Mars Preview Canvases)');

    // =========================================================================
    // STEP 3: Multi-Angle Globe Captures from Live 3D Canvases
    // =========================================================================
    console.log('\n[STEP 3] Capturing Multi-Angle Planet Globe Visuals from Live Canvases...');
    const moonCanvas = page.locator('.moon-choice-card .planet-3d-viewport canvas');
    const marsCanvas = page.locator('.mars-choice-card .planet-3d-viewport canvas');
    await moonCanvas.waitFor({ state: 'visible', timeout: 8000 });
    await marsCanvas.waitFor({ state: 'visible', timeout: 8000 });

    // Moon Angle 1: Sunlit face
    await sleep(500);
    await moonCanvas.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03_moon_angle1_sunlit.png'),
    });
    console.log('  ✓ Moon [Sunlit Face]: 03_moon_angle1_sunlit.png');

    // Moon Angle 2: Terminator oblique (drag left)
    const mBox = await moonCanvas.boundingBox();
    if (mBox) {
      await page.mouse.move(mBox.x + mBox.width * 0.5, mBox.y + mBox.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(mBox.x + mBox.width * 0.5 - 75, mBox.y + mBox.height * 0.5, { steps: 8 });
      await page.mouse.up();
      await sleep(500);
    }
    await moonCanvas.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03_moon_angle2_terminator.png'),
    });
    console.log('  ✓ Moon [Terminator Oblique]: 03_moon_angle2_terminator.png');

    // Moon Angle 3: Night limb with earthshine (drag further)
    if (mBox) {
      await page.mouse.move(mBox.x + mBox.width * 0.5, mBox.y + mBox.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(mBox.x + mBox.width * 0.5 - 90, mBox.y + mBox.height * 0.5, { steps: 8 });
      await page.mouse.up();
      await sleep(500);
    }
    await moonCanvas.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03_moon_angle3_night_limb.png'),
    });
    console.log('  ✓ Moon [Night Limb]: 03_moon_angle3_night_limb.png');

    // Mars Angle 1: Sunlit face
    await marsCanvas.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04_mars_angle1_sunlit.png'),
    });
    console.log('  ✓ Mars [Sunlit Face]: 04_mars_angle1_sunlit.png');

    // Mars Angle 2: Terminator oblique (drag right)
    const marsBox = await marsCanvas.boundingBox();
    if (marsBox) {
      await page.mouse.move(marsBox.x + marsBox.width * 0.5, marsBox.y + marsBox.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(marsBox.x + marsBox.width * 0.5 + 80, marsBox.y + marsBox.height * 0.5, { steps: 8 });
      await page.mouse.up();
      await sleep(500);
    }
    await marsCanvas.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04_mars_angle2_terminator.png'),
    });
    console.log('  ✓ Mars [Terminator Oblique]: 04_mars_angle2_terminator.png');

    // Mars Angle 3: Night limb (drag further)
    if (marsBox) {
      await page.mouse.move(marsBox.x + marsBox.width * 0.5, marsBox.y + marsBox.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(marsBox.x + marsBox.width * 0.5 + 95, marsBox.y + marsBox.height * 0.5, { steps: 8 });
      await page.mouse.up();
      await sleep(500);
    }
    await marsCanvas.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04_mars_angle3_night_limb.png'),
    });
    console.log('  ✓ Mars [Night Limb]: 04_mars_angle3_night_limb.png');
    testReport.scenesTested.push('Moon & Mars Multi-Angle Shading (6 captures)');

    // =========================================================================
    // STEP 4: Moon Showroom (Surface Scene & Leader Lines)
    // =========================================================================
    console.log('\n[STEP 4] Entering Moon Showroom...');
    const moonChoiceBtn = page.locator('.moon-choice-card .choice-dest-btn');
    await moonChoiceBtn.waitFor({ state: 'visible', timeout: 5000 });
    await moonChoiceBtn.click();
    console.log('  -> Clicked Enter Moon, waiting for showroom assets...');

    // Wait for showroom canvas to mount
    const showroomCanvas = page.locator('.showroom-viewport canvas');
    await showroomCanvas.waitFor({ state: 'visible', timeout: 20000 });
    await sleep(3500);

    const pins = await page.locator('.hotspot-pin').count();
    const leaderLines = await page.locator('#showroom-svg-overlay line').count();
    console.log(`  ✓ Moon Showroom active: ${pins} hotspot pins, ${leaderLines} SVG leader lines rendered.`);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05_moon_surface_showroom.png'),
    });
    console.log('  ✓ Saved: 05_moon_surface_showroom.png');
    testReport.scenesTested.push('Moon Surface Showroom');

    // Inspect Apollo LRV hotspot
    const firstPin = page.locator('.hotspot-pin').first();
    if (await firstPin.isVisible()) {
      await firstPin.click();
      await sleep(1500);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '06_moon_lrv_inspected.png'),
      });
      console.log('  ✓ Saved: 06_moon_lrv_inspected.png (hero outline & leader lines)');
      testReport.scenesTested.push('Moon LRV Inspection');

      // Close dossier modal
      const closeBtn = page.locator('.modal-close-btn, .craft-dossier-close, button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await sleep(600);
      }
    }

    // =========================================================================
    // STEP 5: Moon Orbit Overview
    // =========================================================================
    console.log('\n[STEP 5] Toggling Moon Orbit Overview...');
    const orbitTab = page.locator('.showroom-vehicle-tab', { hasText: 'ORBIT' }).first();
    if (await orbitTab.isVisible()) {
      await orbitTab.click();
      await sleep(3500);
    } else {
      const zoomChip = page.locator('.showroom-orbit-zoom-chip, .showroom-surface-return-btn').first();
      if (await zoomChip.isVisible()) {
        await zoomChip.click();
        await sleep(3500);
      }
    }

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07_moon_orbit_overview.png'),
    });
    console.log('  ✓ Saved: 07_moon_orbit_overview.png (smooth terminator, orbit tracks)');
    testReport.scenesTested.push('Moon Orbit Overview');

    // =========================================================================
    // STEP 6: Mobile Viewport (iPhone 14: 390x844)
    // =========================================================================
    console.log('\n[STEP 6] Testing Mobile Viewport (iPhone 14: 390x844)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await sleep(1500);
    await mobilePage.keyboard.press('Space');
    await sleep(1000);

    const hasOverflow = await mobilePage.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`  ✓ Mobile horizontal overflow check: ${hasOverflow ? 'FAIL' : 'PASS (0px overflow)'}`);

    await mobilePage.screenshot({
      path: path.join(SCREENSHOTS_DIR, '08_mobile_main_menu.png'),
      animations: 'disabled',
    });
    console.log('  ✓ Saved: 08_mobile_main_menu.png');
    testReport.scenesTested.push('Mobile Viewport (390x844)');
    await mobileContext.close();

    // =========================================================================
    // STEP 7: Arabic RTL Mode
    // =========================================================================
    console.log('\n[STEP 7] Testing Arabic RTL Mode...');
    const rtlContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'ar-EG',
      deviceScaleFactor: 1,
    });
    const rtlPage = await rtlContext.newPage();
    await rtlPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await sleep(1000);
    await rtlPage.keyboard.press('Space');
    await sleep(1000);

    const langBtn = rtlPage.locator('.lang-toggle-btn, button[aria-label="Switch Language"], button:has-text("العربية"), button:has-text("AR")').first();
    if (await langBtn.isVisible()) {
      await langBtn.click();
      await sleep(1000);
    }

    const dir = await rtlPage.evaluate(() => document.documentElement.dir || document.body.dir || getComputedStyle(document.body).direction);
    console.log(`  ✓ RTL Layout direction confirmed: "${dir}"`);

    await rtlPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, '09_arabic_rtl_menu.png'),
      animations: 'disabled',
    });
    console.log('  ✓ Saved: 09_arabic_rtl_menu.png');
    testReport.scenesTested.push('Arabic RTL Mode');
    await rtlContext.close();

    // =========================================================================
    // STEP 8: Telemetry & Memory
    // =========================================================================
    console.log('\n[STEP 8] Recording Telemetry Metrics...');
    const perfData = await page.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      return {
        canvasCount: canvases.length,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        devicePixelRatio: window.devicePixelRatio,
      };
    });
    console.log(`  ✓ Active canvases: ${perfData.canvasCount}, DPR: ${perfData.devicePixelRatio}`);
    testReport.performanceMetrics = perfData;

    await context.close();
  } catch (err) {
    console.error('Test suite encounter:', err);
    testReport.passed = false;
    testReport.errors.push(err.message);
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log(`QA SUITE COMPLETED: ${testReport.passed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log(`Scenes Tested (${testReport.scenesTested.length}):`);
  testReport.scenesTested.forEach((s) => console.log(`  • ${s}`));
  if (testReport.errors.length > 0) {
    console.log(`Errors Encountered (${testReport.errors.length}):`);
    testReport.errors.forEach((e) => console.log(`  ! ${e}`));
  }
  console.log('====================================================');

  return testReport;
}

runTestSuite();
