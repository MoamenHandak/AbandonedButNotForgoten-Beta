import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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

/**
 * Lightweight reusable Three.js preview canvas replacing <model-viewer> so all 3D
 * previews share one Three.js runtime, local Draco decoder, deduplicated asset cache,
 * visibility/modal pausing, and deterministic WebGL cleanup.
 */
export default function ModelPreviewCanvas({
  id,
  src,
  alt,
  autoRotate = true,
  rotationPerSecond = 8,
  cameraControls = false,
  exposure = 1.1,
  paused = false,
  className = '',
  style,
}) {
  const hostRef = useRef(null);
  const [fallbackMode, setFallbackMode] = useState(() => !isWebGLAvailable());
  const pausedRef = useRef(paused);
  const syncLoopRef = useRef(null);
  pausedRef.current = paused;

  useEffect(() => {
    const container = hostRef.current;
    if (!container || !isWebGLAvailable()) {
      setFallbackMode(true);
      return;
    }

    let isDisposed = false;
    const abortController = new AbortController();
    let activeQuality = resolveGraphicsProfile(
      readStoredSettings().graphicsQuality,
      getDeviceQualityProfile()
    );

    const width = Math.max(container.clientWidth || 220, 64);
    const height = Math.max(container.clientHeight || 220, 64);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: activeQuality.antialias,
        alpha: true,
        powerPreference: 'default',
      });
    } catch {
      setFallbackMode(true);
      return;
    }

    renderer.setPixelRatio(getEffectivePixelRatio(activeQuality));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.outline = 'none';
    if (cameraControls) {
      canvas.style.cursor = 'grab';
    }
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.05, 500);
    camera.position.set(0, 0.4, 3);

    // Streamlined stylized toon lighting: 1 directional key + 1 soft hemisphere fill
    // Balanced intensities (1.75 key + 0.70 fill) matching showroom cel lighting
    const hemi = new THREE.HemisphereLight(0xd8e6ff, 0x181826, 0.70);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 1.75);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const pivot = new THREE.Group();
    scene.add(pivot);

    let controls = null;
    let controlsInteracting = false;
    if (cameraControls) {
      controls = new OrbitControls(camera, canvas);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
    }

    const timer = new THREE.Timer();
    let modelLoaded = false;
    let isVisible = true;
    let isInViewport = true;
    let contextLost = false;
    let rafId = null;
    const radPerSec = (Number(rotationPerSecond) || 0) * (Math.PI / 180);

    const shouldLoop = () => {
      if (isDisposed || contextLost || !modelLoaded || !isVisible || !isInViewport || pausedRef.current) {
        return false;
      }
      const reduced = prefersReducedMotion();
      if (autoRotate && radPerSec !== 0 && !reduced) return true;
      return Boolean(controls && controlsInteracting);
    };

    const renderOnce = () => {
      if (isDisposed || contextLost || !modelLoaded) return;
      if (controls) controls.update();
      renderer.render(scene, camera);
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const startOrRender = () => {
      if (isDisposed || contextLost || !modelLoaded) return;
      if (shouldLoop()) {
        if (rafId === null) {
          timer.update();
          rafId = requestAnimationFrame(tick);
        }
      } else {
        stopLoop();
        renderOnce();
      }
    };
    syncLoopRef.current = () => {
      if (pausedRef.current) stopLoop();
      else startOrRender();
    };

    const tick = (now) => {
      if (!shouldLoop()) {
        rafId = null;
        return;
      }
      timer.update(now);
      const dt = Math.min(timer.getDelta(), 0.05);
      if (autoRotate && radPerSec !== 0 && !prefersReducedMotion() && !controlsInteracting) {
        pivot.rotation.y += radPerSec * dt;
      }
      if (controls) controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };

    const onControlStart = () => {
      controlsInteracting = true;
      canvas.style.cursor = 'grabbing';
      startOrRender();
    };
    const onControlEnd = () => {
      controlsInteracting = false;
      canvas.style.cursor = 'grab';
      renderOnce();
      startOrRender();
    };
    const onControlChange = () => {
      if (!shouldLoop()) renderOnce();
    };

    if (controls) {
      controls.addEventListener('start', onControlStart);
      controls.addEventListener('end', onControlEnd);
      controls.addEventListener('change', onControlChange);
    }

    const onContextLost = (e) => {
      e.preventDefault();
      contextLost = true;
      stopLoop();
    };
    const onContextRestored = () => {
      contextLost = false;
      startOrRender();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    const onVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        timer.update();
        startOrRender();
      } else {
        stopLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    let io = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isInViewport = entry ? entry.isIntersecting : true;
          if (isInViewport) startOrRender();
          else stopLoop();
        },
        { threshold: 0.01 }
      );
      io.observe(container);
    }

    const resize = () => {
      if (isDisposed || contextLost) return;
      const w = Math.max(container.clientWidth || width, 64);
      const h = Math.max(container.clientHeight || height, 64);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(getEffectivePixelRatio(activeQuality));
      renderer.setSize(w, h, false);
      renderOnce();
    };

    const onSettingsChange = (e) => {
      const nextQuality = resolveGraphicsProfile(
        e?.detail?.graphicsQuality,
        getDeviceQualityProfile()
      );
      if (nextQuality.maxDpr === activeQuality.maxDpr) return;
      activeQuality = nextQuality;
      resize();
    };
    window.addEventListener('gameSettingsChange', onSettingsChange);

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize);
      ro.observe(container);
    } else {
      window.addEventListener('resize', resize);
    }

    const isGlobe = typeof src === 'string' && (src.includes('moon') || src.includes('mars') || src.includes('earth'));
    loadGLTFModel(src, { signal: abortController.signal, cacheBuffer: true, toonify: !isGlobe })
      .then((gltf) => {
        if (isDisposed) {
          disposeObject3D(gltf.scene);
          return;
        }
        const model = gltf.scene;

        if (isGlobe) {
          model.traverse((child) => {
            if (child.isMesh && child.material) {
              if (child.material.map) {
                child.material.map.anisotropy = 4;
                child.material.map.needsUpdate = true;
              }
              child.material.needsUpdate = true;
            }
          });
        }
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.001);

        model.position.sub(center);
        pivot.add(model);
        pivot.updateMatrixWorld(true);

        // Compute true vertex-level bounding radius around the pivot origin so
        // spheres (Moon/Mars) frame at identical visual scale without Box3 diagonal inflation.
        const vTmp = new THREE.Vector3();
        let maxRadiusSq = 0;
        pivot.traverse((child) => {
          if (!child.isMesh || !child.geometry) return;
          const posAttr = child.geometry.attributes?.position;
          if (!posAttr) return;
          const step = posAttr.count > 12000 ? Math.ceil(posAttr.count / 12000) : 1;
          for (let i = 0; i < posAttr.count; i += step) {
            vTmp.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld);
            const rSq = vTmp.lengthSq();
            if (rSq > maxRadiusSq) maxRadiusSq = rSq;
          }
        });
        const sphereRadius = maxRadiusSq > 0 ? Math.sqrt(maxRadiusSq) : maxDim * 0.5;
        const fovRad = THREE.MathUtils.degToRad(camera.fov);
        const aspectFit = camera.aspect < 1 ? camera.aspect : 1;
        const radius = Math.max(sphereRadius, 0.001);
        const dist = (radius / Math.sin((fovRad * aspectFit) / 2)) * 1.14;

        camera.position.set(0, dist * 0.24, dist);
        camera.near = Math.max(0.01, dist * 0.02);
        camera.far = dist * 20;
        camera.updateProjectionMatrix();

        if (controls) {
          controls.target.set(0, 0, 0);
          controls.minDistance = dist;
          controls.maxDistance = dist;
          controls.update();
        } else {
          camera.lookAt(0, 0, 0);
        }

        modelLoaded = true;
        renderOnce();
        startOrRender();
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || isDisposed) return;
        setFallbackMode(true);
      });

    return () => {
      isDisposed = true;
      syncLoopRef.current = null;
      abortController.abort();
      stopLoop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('gameSettingsChange', onSettingsChange);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
      if (controls) {
        controls.removeEventListener('start', onControlStart);
        controls.removeEventListener('end', onControlEnd);
        controls.removeEventListener('change', onControlChange);
        controls.dispose();
      }
      disposeObject3D(pivot);
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, [src, autoRotate, rotationPerSecond, cameraControls, exposure]);

  // Resume or pause RAF immediately when `paused` prop flips
  useEffect(() => {
    syncLoopRef.current?.();
  }, [paused]);

  return (
    <div
      ref={hostRef}
      id={id}
      className={`model-preview-canvas ${className}`.trim()}
      role="img"
      aria-label={alt}
      style={style}
    >
      {fallbackMode && (
        <div className="model-preview-fallback" aria-hidden="true">
          <span>3D</span>
        </div>
      )}
    </div>
  );
}
