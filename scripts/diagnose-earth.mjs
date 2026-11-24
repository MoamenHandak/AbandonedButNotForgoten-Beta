import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:4173/AbandonedButNotForgoten-Beta/';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.addInitScript(() => {
    window.localStorage.setItem('abnf_game_settings', JSON.stringify({ muteAudio: true, graphicsQuality: 'ultra' }));
    window.localStorage.setItem('abnf_story_progression_v1', JSON.stringify({ firstChoice: 'moon', allCompleted: true }));
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(1000);
  await page.keyboard.press('Space');
  await page.mouse.click(640, 400);
  await sleep(1500);

  const startBtn = page.locator('#btn-start-journey, .nms-hero-action-btn').first();
  await startBtn.waitFor({ state: 'visible' });
  await startBtn.click();

  const skipBtn = page.locator('button[title*="Skip directly to destination choice"], .story-stage-skip').first();
  await skipBtn.waitFor({ state: 'visible', timeout: 15000 });
  await skipBtn.click({ force: true });
  await sleep(2000);

  const moonBtn = page.locator('.moon-choice-card .choice-dest-btn');
  await moonBtn.waitFor({ state: 'visible' });
  await moonBtn.click();

  const canvas = page.locator('.showroom-viewport canvas[data-engine*="three.js"]').first();
  await canvas.waitFor({ state: 'visible', timeout: 25000 });
  await sleep(4000);

  const diag = await page.evaluate(() => {
    const s = window.__threeRef?.current;
    if (!s) return { error: 'no threeRef' };
    const cam = s.camera;
    const earth = s.earthMesh;
    const scene = s.scene;

    const lights = [];
    scene.traverse((obj) => {
      if (obj.isLight) {
        lights.push({
          type: obj.type,
          color: obj.color.getHexString(),
          intensity: obj.intensity,
          layersMask: obj.layers.mask,
          pos: [obj.position.x, obj.position.y, obj.position.z],
        });
      }
    });

    let earthDiag = null;
    if (earth) {
      const worldPos = new window.THREE.Vector3();
      earth.getWorldPosition(worldPos);

      // Project worldPos to screen coordinates (-1 to +1)
      const screenPos = worldPos.clone().project(cam);

      const children = [];
      earth.traverse((c) => {
        children.push({
          type: c.type,
          visible: c.visible,
          layersMask: c.layers.mask,
          isMesh: Boolean(c.isMesh),
          matRoughness: c.material?.roughness,
          matMetalness: c.material?.metalness,
          matColor: c.material?.color?.getHexString(),
          matVisible: c.material?.visible,
        });
      });

      earthDiag = {
        visible: earth.visible,
        parentVisible: earth.parent?.visible,
        parentType: earth.parent?.type,
        layersMask: earth.layers.mask,
        localPos: [earth.position.x, earth.position.y, earth.position.z],
        worldPos: [worldPos.x, worldPos.y, worldPos.z],
        screenPos: [screenPos.x, screenPos.y, screenPos.z],
        childrenCount: children.length,
        children: children.slice(0, 5),
      };
    }

    return {
      cam: {
        pos: [cam.position.x, cam.position.y, cam.position.z],
        target: [s.controls.target.x, s.controls.target.y, s.controls.target.z],
        layersMask: cam.layers.mask,
        near: cam.near,
        far: cam.far,
      },
      earth: earthDiag,
      lights,
    };
  });

  console.log(JSON.stringify(diag, null, 2));
  await browser.close();
}

run().catch(console.error);
