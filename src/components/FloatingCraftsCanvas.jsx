import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  loadGLTFModel,
  disposeObject3D,
  isWebGLAvailable,
  prefersReducedMotion,
  getDeviceQualityProfile,
} from '../utils/modelCache';
import {
  readStoredSettings,
  resolveGraphicsProfile,
  getEffectivePixelRatio,
} from '../constants/settings';

// Optimized craft derivatives ordered lightest-first so first floating crafts appear within milliseconds
const MODELS = [
  { url: '/models/mars-opt.glb', size: 3.0 },
  { url: '/models/viking_lander-opt.glb', size: 3.4 },
  { url: '/models/ingenuity-opt.glb', size: 3.8 },
  { url: '/models/moon-opt.glb', size: 3.0 },
  { url: '/models/mer_rover-opt.glb', size: 3.2 },
  { url: '/models/lunar_rover-opt.glb', size: 3.2 },
];

const MAX_AT_ONCE = 3;
const SPAWN_EVERY = [3, 7];
const SPEED = [1.6, 2.8];
const TUMBLE = 0.35;
const START_Z = -42;
const END_Z = -1;
const CAMERA_FOV = 50;

export default function FloatingCraftsCanvas({ paused = false }) {
  const canvasRef = useRef(null);
  const pausedRef = useRef(paused);
  const syncLoopRef = useRef(null);
  pausedRef.current = paused;

  useEffect(() => {
    syncLoopRef.current?.();
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion() || !isWebGLAvailable()) return;

    let isDisposed = false;
    let contextLost = false;
    let animId = null;
    const abortController = new AbortController();
    let activeQuality = resolveGraphicsProfile(
      readStoredSettings().graphicsQuality,
      getDeviceQualityProfile()
    );

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: activeQuality.antialias,
        powerPreference: 'default',
      });
    } catch {
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 200);

    // Streamlined toon lighting: 1 warm directional key + 1 soft hemisphere fill
    // Balanced intensity (1.85 key + 0.75 fill) to prevent washed-out cel regions
    scene.add(new THREE.HemisphereLight(0xbfd6ff, 0x2c0f0c, 0.75));
    const key = new THREE.DirectionalLight(0xffc9a0, 1.85);
    key.position.set(-6, 5, 8);
    scene.add(key);

    function resize() {
      if (isDisposed || contextLost) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setPixelRatio(getEffectivePixelRatio(activeQuality));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    const onSettingsChange = (e) => {
      const nextQuality = resolveGraphicsProfile(
        e?.detail?.graphicsQuality,
        getDeviceQualityProfile()
      );
      if (nextQuality.maxDpr === activeQuality.maxDpr) return;
      activeQuality = nextQuality;
      resize();
      if (!isDisposed && !contextLost && templates.length) {
        renderer.render(scene, camera);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('gameSettingsChange', onSettingsChange);

    const templates = [];
    const active = [];
    const rand = (a, b) => a + Math.random() * (b - a);
    let nextSpawn = 0;
    const timer = new THREE.Timer();
    let seededInitial = false;

    function spawn(progress = 0) {
      if (!templates.length) return;
      const tpl = templates[(Math.random() * templates.length) | 0];
      const obj = tpl.clone(true);
      const baseScale = tpl.userData.scale;

      const dist = 0 - START_Z;
      const halfH = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)) * dist;
      const halfW = halfH * camera.aspect;
      const side = Math.random() < 0.5 ? -1 : 1;

      obj.position.set(side * rand(0.4, 0.9) * halfW, rand(-0.7, 0.7) * halfH, START_Z);
      obj.rotation.set(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28));

      const speed = rand(SPEED[0], SPEED[1]);
      const state = {
        obj,
        baseScale,
        speed,
        vx: side * rand(0.05, 0.4),
        vy: rand(-0.2, 0.2),
        spin: new THREE.Vector3(rand(-TUMBLE, TUMBLE), rand(-TUMBLE, TUMBLE), rand(-TUMBLE, TUMBLE)),
      };

      obj.position.z += (END_Z - START_Z) * progress;
      obj.position.x += state.vx * progress * ((END_Z - START_Z) / speed);
      obj.scale.setScalar(0.0001);
      scene.add(obj);
      active.push(state);
    }

    function tick(now) {
      if (isDisposed || contextLost || document.hidden || pausedRef.current || !templates.length) {
        animId = null;
        return;
      }

      animId = requestAnimationFrame(tick);
      timer.update(now);
      const dt = Math.min(timer.getDelta(), 0.1);

      nextSpawn -= dt;
      if (nextSpawn <= 0 && active.length < MAX_AT_ONCE) {
        spawn();
        nextSpawn = rand(SPAWN_EVERY[0], SPAWN_EVERY[1]);
      }

      for (let i = active.length - 1; i >= 0; i--) {
        const s = active[i];
        const o = s.obj;
        o.position.z += s.speed * dt;
        o.position.x += s.vx * dt;
        o.position.y += s.vy * dt;
        o.rotation.x += s.spin.x * dt;
        o.rotation.y += s.spin.y * dt;
        o.rotation.z += s.spin.z * dt;

        const t = (o.position.z - START_Z) / (END_Z - START_Z);
        const fade = Math.min(1, t / 0.12, (1 - t) / 0.1);
        o.scale.setScalar(Math.max(0.0001, s.baseScale * Math.max(0, fade)));

        if (t >= 1) {
          scene.remove(o);
          active.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    }

    const syncLoop = () => {
      if (isDisposed || contextLost || document.hidden || pausedRef.current || !templates.length) {
        if (animId !== null) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      } else if (animId === null) {
        timer.update();
        animId = requestAnimationFrame(tick);
      }
    };
    syncLoopRef.current = syncLoop;
    document.addEventListener('visibilitychange', syncLoop);

    const onContextLost = (e) => {
      e.preventDefault();
      contextLost = true;
      syncLoop();
    };
    const onContextRestored = () => {
      contextLost = false;
      syncLoop();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    const addTemplate = (gltf, size) => {
      const root = gltf.scene;
      const box = new THREE.Box3().setFromObject(root);
      const dims = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      root.position.sub(center);

      const holder = new THREE.Group();
      holder.add(root);
      holder.userData.scale = size / (Math.max(dims.x, dims.y, dims.z) || 1);
      templates.push(holder);

      if (!seededInitial) {
        seededInitial = true;
        spawn(0.15);
        spawn(0.5);
        syncLoop();
      }
    };

    // Defer model fetching slightly so first splash paint completes without network contention,
    // then load light models first and heavier lunar rover last
    const startFetchTimer = setTimeout(() => {
      if (isDisposed) return;
      MODELS.forEach((m, index) => {
        const delay = index >= 4 ? 250 * (index - 3) : 0;
        setTimeout(() => {
          if (isDisposed) return;
          const isGlobe = m.url.includes('moon') || m.url.includes('mars');
          loadGLTFModel(m.url, { signal: abortController.signal, cacheBuffer: true, toonify: !isGlobe })
            .then((gltf) => {
              if (isDisposed) {
                disposeObject3D(gltf.scene);
                return;
              }
              addTemplate(gltf, m.size);
            })
            .catch((err) => {
              if (err?.name !== 'AbortError') {
                console.warn('[floating-crafts] could not load', m.url, err);
              }
            });
        }, delay);
      });
    }, 60);

    return () => {
      isDisposed = true;
      syncLoopRef.current = null;
      clearTimeout(startFetchTimer);
      abortController.abort();
      document.removeEventListener('visibilitychange', syncLoop);
      window.removeEventListener('resize', resize);
      window.removeEventListener('gameSettingsChange', onSettingsChange);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      if (animId !== null) cancelAnimationFrame(animId);
      templates.forEach((tpl) => disposeObject3D(tpl));
      disposeObject3D(scene);
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} id="nms-floating-crafts" aria-hidden="true" />;
}
