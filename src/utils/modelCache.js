import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const MAX_CACHED_BUFFER_BYTES = 5 * 1024 * 1024; // 5 MB per asset cap keeps large terrain out of JS heap cache
const MAX_TOTAL_CACHE_BYTES = 18 * 1024 * 1024; // 18 MB total LRU buffer cache

const bufferCache = new Map(); // url -> Uint8Array
let totalCachedBytes = 0;
const inFlightFetches = new Map(); // url -> { promise, subscribers: Set<(ratio) => void> }

let sharedDracoLoader = null;
let sharedGltfLoader = null;

function getGLTFLoader() {
  if (!sharedGltfLoader) {
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath('/draco/');
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
 * Fetches (with in-flight deduplication and optional byte caching) and parses a GLB/GLTF asset.
 * Clones a fresh ArrayBuffer slice prior to parse so worker transfers (e.g. Draco) never detach cached bytes.
 */
export async function loadGLTFModel(url, { signal, onProgress, cacheBuffer = true } = {}) {
  if (signal?.aborted) throw createAbortError();

  const bytes = await fetchBytesDeduplicated(url, { onProgress, cacheBuffer });
  if (signal?.aborted) throw createAbortError();

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

export function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
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
