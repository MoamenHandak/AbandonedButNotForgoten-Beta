import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { toonifyModel } from '../scene/toonify.js';

const MAX_CACHED_BUFFER_BYTES = 5 * 1024 * 1024; // 5 MB per asset cap keeps large terrain out of JS heap cache
const MAX_TOTAL_CACHE_BYTES = 18 * 1024 * 1024; // 18 MB total LRU buffer cache

const bufferCache = new Map(); // url -> Uint8Array
let totalCachedBytes = 0;
const inFlightFetches = new Map(); // url -> { promise, subscribers: Set<(ratio) => void> }

let sharedDracoLoader = null;
let sharedGltfLoader = null;

const BASE = (import.meta.env?.BASE_URL || '/').replace(/\/+$/, '') + '/';

export function resolveAssetUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (/^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith(BASE)) return url;
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  return `${BASE}${cleanUrl}`;
}

function getGLTFLoader() {
  if (!sharedGltfLoader) {
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath(resolveAssetUrl('/draco/'));
    sharedDracoLoader.setWorkerLimit(Math.min(2, navigator.hardwareConcurrency || 2));

    sharedGltfLoader = new GLTFLoader();
    sharedGltfLoader.setDRACOLoader(sharedDracoLoader);
    sharedGltfLoader.setMeshoptDecoder(MeshoptDecoder);
  }
  return sharedGltfLoader;
}

function storeCachedBuffer(url, bytes) {
  if (!bytes || bytes.byteLength > MAX_CACHED_BUFFER_BYTES) return;

  if (bufferCache.has(url)) {
    totalCachedBytes -= bufferCache.get(url).byteLength;
    bufferCache.delete(url);
  }

  while (totalCachedBytes + bytes.byteLength > MAX_TOTAL_CACHE_BYTES && bufferCache.size > 0) {
    const oldestKey = bufferCache.keys().next().value;
    totalCachedBytes -= bufferCache.get(oldestKey).byteLength;
    bufferCache.delete(oldestKey);
  }

  bufferCache.set(url, bytes);
  totalCachedBytes += bytes.byteLength;
}

function fetchBytesDeduplicated(url, { onProgress, cacheBuffer = true } = {}) {
  url = resolveAssetUrl(url);
  const cached = bufferCache.get(url);
  if (cached) {
    // Refresh LRU order
    bufferCache.delete(url);
    bufferCache.set(url, cached);
    if (onProgress) onProgress(1);
    return Promise.resolve(cached);
  }

  let entry = inFlightFetches.get(url);
  if (!entry) {
    const subscribers = new Set();
    const notify = (ratio) => {
      for (const cb of subscribers) cb(ratio);
    };

    const promise = (async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${url}`);
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (!response.body || !contentLength) {
        const buf = await response.arrayBuffer();
        const bytes = new Uint8Array(buf);
        notify(1);
        if (cacheBuffer) storeCachedBuffer(url, bytes);
        return bytes;
      }

      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          notify(Math.min(0.99, received / contentLength));
        }
      }

      const bytes = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }

      notify(1);
      if (cacheBuffer) storeCachedBuffer(url, bytes);
      return bytes;
    })().finally(() => {
      inFlightFetches.delete(url);
    });

    entry = { promise, subscribers };
    inFlightFetches.set(url, entry);
  }

  if (onProgress) entry.subscribers.add(onProgress);
  return entry.promise.finally(() => {
    if (onProgress) entry.subscribers.delete(onProgress);
  });
}

function createAbortError() {
  return new DOMException('Aborted', 'AbortError');
}

/**
 * Checks whether an asset URL corresponds to a planetary globe (Moon, Mars, Earth)
 * that requires smooth, physically plausible continuous terminator lighting rather
 * than discrete stepped cel-shading bands.
 */
export function isGlobeModelUrl(url) {
  if (typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('moon-opt.glb') ||
    lower.includes('mars-opt.glb') ||
    lower.includes('realistic_earth-opt.glb') ||
    lower.includes('moon.glb') ||
    lower.includes('mars.glb')
  );
}

/**
 * Fetches (with in-flight deduplication and optional byte caching) and parses a GLB/GLTF asset.
 * Clones a fresh ArrayBuffer slice prior to parse so worker transfers (e.g. Draco) never detach cached bytes.
 * By default converts PBR materials on spacecraft/vehicles to stylized MeshToonMaterial via shared gradient ramp,
 * while automatically keeping planetary globes smooth.
 */
export async function loadGLTFModel(url, { signal, onProgress, cacheBuffer = true, toonify, toonOptions } = {}) {
  if (signal?.aborted) throw createAbortError();

  const bytes = await fetchBytesDeduplicated(url, { onProgress, cacheBuffer });
  if (signal?.aborted) throw createAbortError();

  // Unless explicitly overridden, planetary globes preserve smooth continuous shading
  const shouldToonify = toonify !== undefined ? Boolean(toonify) : !isGlobeModelUrl(url);

  const loader = getGLTFLoader();
  // Slice a dedicated ArrayBuffer copy so Draco worker transfer cannot detach cached Uint8Array
  const arrayBufferCopy = bytes.slice().buffer;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    let aborted = false;
    const onAbort = () => {
      aborted = true;
      reject(createAbortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    loader.parse(
      arrayBufferCopy,
      '/',
      (gltf) => {
        signal?.removeEventListener('abort', onAbort);
        if (aborted || signal?.aborted) {
          disposeObject3D(gltf.scene);
          reject(createAbortError());
          return;
        }
        if (shouldToonify && gltf?.scene) {
          toonifyModel(gltf.scene, toonOptions);
        }
        resolve(gltf);
      },
      (err) => {
        signal?.removeEventListener('abort', onAbort);
        if (aborted) return;
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    );
  });
}

export function prefetchGLB(url) {
  return fetchBytesDeduplicated(url, { cacheBuffer: true }).catch(() => null);
}

const preloadedImages = new Map();
const preloadedAudioMap = new Map();
let dracoWarmPromise = null;

/**
 * Preloads and GPU-decodes an image asset with in-flight deduplication.
 */
export function preloadImage(url) {
  const resolved = resolveAssetUrl(url);
  if (preloadedImages.has(resolved)) {
    return preloadedImages.get(resolved);
  }
  const promise = new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(true);
    const img = new Image();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(() => finish(true)).catch(() => finish(true));
      } else {
        finish(true);
      }
    };
    img.onerror = () => finish(false);
    img.src = resolved;
    setTimeout(() => finish(true), 4000);
  });
  preloadedImages.set(resolved, promise);
  return promise;
}

/**
 * Preloads and warms audio buffer in the browser cache with deduplication.
 * Resolves on canplaythrough / loadeddata, or graceful safety timeout.
 */
export function preloadAudio(url) {
  const resolved = resolveAssetUrl(url);
  if (preloadedAudioMap.has(resolved)) {
    return preloadedAudioMap.get(resolved);
  }
  const promise = new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(true);
    try {
      const audio = new Audio();
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        audio.removeEventListener('canplaythrough', finish);
        audio.removeEventListener('loadeddata', finish);
        audio.removeEventListener('error', finish);
        resolve(true);
      };

      audio.addEventListener('canplaythrough', finish, { once: true });
      audio.addEventListener('loadeddata', finish, { once: true });
      audio.addEventListener('error', finish, { once: true });
      audio.preload = 'auto';
      audio.src = resolved;
      audio.load();

      // Safety fallback: continue after 3.5s so slow network does not freeze user
      setTimeout(finish, 3500);
    } catch {
      resolve(true);
    }
  });
  preloadedAudioMap.set(resolved, promise);
  return promise;
}

/**
 * Awaits web font loading (Orbitron, Space Grotesk, Cairo, etc.) with a safe timeout
 * so UI typography never flashes after a loading screen dismisses.
 */
export function preloadFonts(timeoutMs = 2500) {
  if (typeof document === 'undefined' || !document.fonts?.ready) {
    return Promise.resolve(true);
  }
  return Promise.race([
    document.fonts.ready.then(() => true).catch(() => true),
    new Promise((resolve) => setTimeout(() => resolve(true), timeoutMs)),
  ]);
}

/**
 * Pre-warms the GLTFLoader singleton and caches Draco WASM/JS decoder binaries.
 */
export function preloadDracoDecoder() {
  if (dracoWarmPromise) return dracoWarmPromise;
  dracoWarmPromise = (async () => {
    try {
      getGLTFLoader();
      if (typeof fetch === 'function') {
        await Promise.allSettled([
          fetch(resolveAssetUrl('/draco/draco_decoder.wasm')).catch(() => null),
          fetch(resolveAssetUrl('/draco/draco_wasm_wrapper.js')).catch(() => null),
        ]);
      }
    } catch {
      // Non-fatal: GLTFLoader will fall back to on-demand loading
    }
    return true;
  })();
  return dracoWarmPromise;
}

const CORE_STORY_IMAGES = [
  '/assets/story/room_bg.jpg',
  '/assets/story/space_bg.jpg',
  '/assets/story/nasa_book_open.webp',
  '/assets/story/nasa_book_open.png',
  '/assets/story/luna/luna_reading.webp',
  '/assets/story/luna/luna_curious.webp',
  '/assets/story/luna/luna_wonder.webp',
  '/assets/story/luna/luna_surprised.webp',
  '/assets/story/scene1_book.jpg',
  '/assets/story/scene2_drift.jpg',
  '/assets/story/scene3_choice_girl.jpg',
  '/assets/story/scene4_moon.jpg',
];

const CORE_AUDIO_TRACKS = [
  '/audio/menu_theme.mp3',
  '/audio/story_music.mp3',
  '/audio/space_music.mp3',
];

const MAIN_MENU_MODELS = [
  '/models/astronaut_helmet-opt.glb',
  '/models/mer_rover-opt.glb',
  '/models/mars-opt.glb',
  '/models/moon-opt.glb',
  '/models/viking_lander-opt.glb',
  '/models/ingenuity-opt.glb',
  '/models/lunar_rover-opt.glb',
];

/**
 * Full Main Menu Boot Preloader — loads EVERYTHING before revealing the Main Menu:
 * 1. Web fonts (document.fonts.ready)
 * 2. Lazy UI & game code chunks (passed via extraTasks)
 * 3. Draco WASM/JS 3D decoder
 * 4. All audio soundtracks (menu, story, space)
 * 5. Mission illustrations, story paintings & Luna character poses (GPU-decoded)
 * 6. All Main Menu & CosmicBackground 3D models (helmet, rovers, Moon & Mars globes)
 */
export async function preloadMainMenuAssets({ onProgress, onPhase, extraTasks = [], lang = 'en' } = {}) {
  const isAr = lang === 'ar';
  const emitPhase = (en, ar) => {
    if (onPhase) onPhase(isAr ? ar : en);
  };

  const phases = [
    {
      en: 'LOADING TYPOGRAPHY & INTERFACE...',
      ar: 'جاري تحميل الخطوط وواجهة النظام...',
      tasks: [() => preloadFonts(), ...extraTasks],
    },
    {
      en: 'SYNCHRONIZING AUDIO SOUNDTRACKS...',
      ar: 'جاري مزامنة المقاطع الصوتية الفضائية...',
      tasks: CORE_AUDIO_TRACKS.map((url) => () => preloadAudio(url)),
    },
    {
      en: 'DECODING MISSION ARTWORK & CHARACTERS...',
      ar: 'جاري فك تشفير رسومات المهمة والشخصيات...',
      tasks: CORE_STORY_IMAGES.map((url) => () => preloadImage(url)),
    },
    {
      en: 'LOADING 3D SPACECRAFT, GLOBES & DECODER...',
      ar: 'جاري تحميل المركبات ثلاثية الأبعاد والكواكب...',
      tasks: [() => preloadDracoDecoder(), ...MAIN_MENU_MODELS.map((url) => () => prefetchGLB(url))],
    },
  ];

  const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0);
  let completed = 0;

  const tick = () => {
    completed += 1;
    if (onProgress) {
      onProgress(Math.min(100, Math.round((completed / Math.max(totalTasks, 1)) * 100)));
    }
  };

  // Run all phases concurrently while updating phase label as each category completes
  emitPhase(phases[0].en, phases[0].ar);
  const phasePromises = phases.map((phase) =>
    Promise.allSettled(
      phase.tasks.map((fn) =>
        Promise.resolve()
          .then(() => fn())
          .catch(() => null)
          .finally(() => {
            tick();
            // Advance displayed phase label progressively based on overall completion
            const ratio = completed / Math.max(totalTasks, 1);
            if (ratio < 0.25) emitPhase(phases[0].en, phases[0].ar);
            else if (ratio < 0.48) emitPhase(phases[1].en, phases[1].ar);
            else if (ratio < 0.78) emitPhase(phases[2].en, phases[2].ar);
            else if (ratio < 1.0) emitPhase(phases[3].en, phases[3].ar);
            else emitPhase('ALL SYSTEMS NOMINAL', 'جميع الأنظمة جاهزة');
          })
      )
    )
  );

  await Promise.allSettled(phasePromises);
  if (onProgress) onProgress(100);
  emitPhase('ALL SYSTEMS NOMINAL', 'جميع الأنظمة جاهزة');
}

/**
 * Comprehensive Story / Journey preloader that loads EVERYTHING needed for Story & Destinations:
 * 1. Web fonts & Draco decoder
 * 2. All visual-novel story backgrounds, illustrations, and Luna character poses
 * 3. All audio soundtracks (menu, story, space)
 * 4. Destination globes & initial lunar/martian spacecraft models
 */
export async function preloadAllCoreAssets(onProgress, { onPhase, lang = 'en' } = {}) {
  const isAr = lang === 'ar';
  const models = [
    '/models/moon-opt.glb',
    '/models/mars-opt.glb',
    '/models/lunar_rover-opt.glb',
    '/models/lunar_module-opt.glb',
  ];

  const allTasks = [
    { fn: () => preloadFonts(), cat: 'fonts' },
    { fn: () => preloadDracoDecoder(), cat: 'decoder' },
    ...CORE_AUDIO_TRACKS.map((aud) => ({ fn: () => preloadAudio(aud), cat: 'audio' })),
    ...CORE_STORY_IMAGES.map((img) => ({ fn: () => preloadImage(img), cat: 'images' })),
    ...models.map((mod) => ({ fn: () => prefetchGLB(mod), cat: 'models' })),
  ];

  const total = allTasks.length;
  let done = 0;

  const tick = () => {
    done += 1;
    const pct = Math.min(100, Math.round((done / total) * 100));
    if (onProgress) onProgress(pct);
    if (onPhase) {
      if (pct < 30) {
        onPhase(isAr ? 'مزامنة الخطوط والمقاطع الصوتية...' : 'SYNCHRONIZING FONTS & AUDIO TRACKS...');
      } else if (pct < 70) {
        onPhase(isAr ? 'تحميل رسومات السجل والشخصيات...' : 'LOADING LOGBOOK PAINTINGS & CHARACTERS...');
      } else {
        onPhase(isAr ? 'تجهيز مجسمات الكواكب والمركبات ثلاثية الأبعاد...' : 'PREPARING 3D GLOBES & SPACECRAFT ASSETS...');
      }
    }
  };

  await Promise.allSettled(allTasks.map((t) => Promise.resolve().then(t.fn).catch(() => null).finally(tick)));
}

/**
 * Preloads non-3D showroom essentials (fonts, Draco decoder, ambient audio, UI portraits)
 * so the Planetary Showroom loading screen guarantees EVERY asset is ready before reveal.
 */
export async function preloadShowroomExtras(planetName, { onProgress } = {}) {
  const tasks = [
    () => preloadFonts(),
    () => preloadDracoDecoder(),
    () => preloadAudio('/audio/space_music.mp3'),
    () => preloadAudio('/audio/story_music.mp3'),
    () => preloadImage('/assets/story/luna/luna_curious.webp'),
    () => preloadImage('/assets/story/luna/luna_wonder.webp'),
  ];

  let done = 0;
  const total = tasks.length;
  await Promise.allSettled(
    tasks.map((fn) =>
      Promise.resolve()
        .then(fn)
        .catch(() => null)
        .finally(() => {
          done += 1;
          if (onProgress) onProgress(done / total);
        })
    )
  );
}

const MATERIAL_TEXTURE_SLOTS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
  'envMap',
  'lightMap',
  'specularMap',
  'clearcoatMap',
  'clearcoatRoughnessMap',
  'clearcoatNormalMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'transmissionMap',
  'thicknessMap',
];

function disposeMaterial(mat) {
  if (!mat) return;
  for (const slot of MATERIAL_TEXTURE_SLOTS) {
    const tex = mat[slot];
    if (tex && typeof tex.dispose === 'function') {
      tex.dispose();
    }
  }
  if (typeof mat.dispose === 'function') {
    mat.dispose();
  }
}

/**
 * Recursively disposes geometries, materials, and texture maps on a Three.js Object3D subtree.
 */
export function disposeObject3D(root) {
  if (!root) return;
  const disposedGeometries = new Set();
  const disposedMaterials = new Set();

  root.traverse((obj) => {
    if (obj.geometry && typeof obj.geometry.dispose === 'function' && !disposedGeometries.has(obj.geometry)) {
      disposedGeometries.add(obj.geometry);
      obj.geometry.dispose();
    }
    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) {
        if (mat && !disposedMaterials.has(mat)) {
          disposedMaterials.add(mat);
          disposeMaterial(mat);
        }
      }
    }
  });
}

let cachedWebGLSupport = null;

export function isWebGLAvailable() {
  if (cachedWebGLSupport !== null) return cachedWebGLSupport;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    cachedWebGLSupport = false;
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    cachedWebGLSupport = Boolean(gl);
  } catch {
    cachedWebGLSupport = false;
  }
  return cachedWebGLSupport;
}

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Computes conservative GPU/quality tier for mobile and low-memory hardware.
 */
export function getDeviceQualityProfile() {
  if (typeof window === 'undefined') {
    return { isConstrained: false, maxDpr: 1.5, shadowSize: 2048, antialias: true };
  }
  const smallViewport = window.innerWidth <= 820;
  const isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
  const lowMem = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;
  const lowCores = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
  const isConstrained = smallViewport || (isTouch && (lowMem || lowCores)) || lowMem;

  return {
    isConstrained,
    maxDpr: isConstrained ? 1.25 : 1.5,
    shadowSize: isConstrained ? 1024 : 2048,
    antialias: !isConstrained || (window.devicePixelRatio || 1) < 2,
  };
}
