/**
 * Orbit Layer — Three.js Scene Module (NASA Space Apps 2026)
 *
 * Implements a true NASA "Eyes on the Solar System" cinematic orbital exploration mode:
 * - 3D Planet Globe (Moon or Mars) centered in orbital space with realistic PBR shading,
 *   crescent terminator lighting, and smooth axial rotation.
 * - Scaled spacecraft (LRO, LADEE, MGS, Odyssey, MRO, MAVEN) actively orbiting around
 *   the planet with realistic orbital inclinations, velocities, and tangent flight vectors.
 * - HUD-style glowing orbit tracks and radial tick marks wrapping directly around the planet globe.
 * - Martian moons (Phobos and Deimos) orbiting Mars at astronomical distances.
 * - Dynamic framing: spacecraft in crisp foreground with the huge planet globe curving
 *   in the background, matching NASA Eyes on the Solar System & deep-space mission art.
 */

import * as THREE from 'three';
import { loadGLTFModel, disposeObject3D, prefersReducedMotion } from '../utils/modelCache';
import { getOrbitOverviewCamera as computeOrbitOverview } from './cameraAutoFit';
import { toonifyModel, updateHeroOutline, detachHeroOutline } from './toonify';

// Planetary configurations for orbital scenes
// For Moon view: The Moon is the central globe at (0, 0, 0) with lunar orbiters (LRO, LADEE) encircling it,
// and Earth is placed far in the background in deep space.
// For Mars view: Mars is the central globe, with Phobos & Deimos orbiting at astronomical distances.
const PLANET_CONFIGS = {
  moon: {
    radius: 24.0, // Moon at the orbital center (diameter 48)
    modelSrc: '/models/moon-opt.glb',
    spinSpeed: 0.008,
    fallbackColor: 0x989da3,
    roughness: 0.92,
    metalness: 0.04,
  },
  mars: {
    radius: 26.0,
    modelSrc: '/models/mars-opt.glb',
    spinSpeed: 0.014,
    fallbackColor: 0xc45532,
    roughness: 0.85,
    metalness: 0.04,
  },
};

// Distant Earth in space visible from the Moon orbit view
const DISTANT_EARTH_CONFIG = {
  radius: 18.0,
  position: [-240, -12, -130],
  modelSrc: '/models/realistic_earth-opt.glb',
  spinSpeed: 0.010,
  fallbackColor: 0x1f5fa8,
  roughness: 0.65,
  metalness: 0.02,
};

// Orbit configurations for each orbiter
// For Moon: LRO and LADEE orbit directly around the central Moon
// For Mars: MGS, Odyssey, MRO, and MAVEN orbit around Mars
const ORBIT_CONFIGS = {
  moon: [
    {
      id: 'lro-orbiter',
      name: 'LRO',
      label: 'LRO',
      modelSrc: '/models/lro-opt.glb',
      orbitRadiusA: 40.0,
      orbitRadiusB: 38.0,
      center: [0, 0, 0],
      inclination: [1.45, 0.2, 0.1], // Near-polar mapping orbit around the Moon
      speed: 0.24, // ~26s revolution
      initialAngle: 0.85,
      ambientScale: 0.040,
      heroScale: 0.085, // ~10% Moon diameter
      color: 0x00e5ff,
    },
    {
      id: 'ladee-orbiter',
      name: 'LADEE',
      label: 'LADEE',
      modelSrc: '/models/ladee-opt.glb',
      orbitRadiusA: 46.0,
      orbitRadiusB: 43.5,
      center: [0, 0, 0],
      inclination: [0.35, 0.45, 0.2], // Equatorial/inclined orbit around the Moon
      speed: 0.20, // ~31s revolution
      initialAngle: 2.7,
      ambientScale: 0.022,
      heroScale: 0.044, // ~10% Moon diameter
      color: 0x8de1ff,
    },
  ],
  mars: [
    {
      id: 'mgs-orbiter',
      name: 'MGS',
      label: 'MGS',
      modelSrc: '/models/mgs-opt.glb',
      orbitRadiusA: 44.0,
      orbitRadiusB: 42.0,
      center: [0, 0, 0],
      inclination: [0.55, 0.25, 0.1],
      speed: 0.25, // ~25s revolution
      initialAngle: 0.4,
      ambientScale: 0.022,
      heroScale: 0.046, // ~10% Mars diameter (5.2 units)
      stationedPos: [43.0, 0.5, 7.0],
      color: 0x00e5ff,
    },
    {
      id: 'odyssey-orbiter',
      name: 'Odyssey',
      label: 'ODYSSEY',
      modelSrc: '/models/odyssey-opt.glb',
      orbitRadiusA: 48.0,
      orbitRadiusB: 45.0,
      center: [0, 0, 0],
      inclination: [-0.42, 0.35, 0.2],
      speed: 0.22, // ~28s revolution
      initialAngle: 1.9,
      ambientScale: 0.020,
      heroScale: 0.055, // ~10% Mars diameter (framing clearly on the satellite)
      cameraDistanceMult: 0.75, // start much closer, framed clearly
      stationedPos: [0.4, 15.5, 45.0],
      color: 0x64d2ff,
    },
    {
      id: 'mro-orbiter',
      name: 'MRO',
      label: 'MRO',
      modelSrc: '/models/mro-opt.glb',
      orbitRadiusA: 52.0,
      orbitRadiusB: 49.0,
      center: [0, 0, 0],
      inclination: [1.5, -0.25, 0.15],
      speed: 0.20, // ~31s revolution
      initialAngle: 3.6,
      ambientScale: 0.026,
      heroScale: 0.055, // ~9.6% Mars diameter (5.0 units)
      stationedPos: [-43.0, 35.0, -10.0],
      color: 0x00e5ff,
    },
    {
      id: 'maven-orbiter',
      name: 'MAVEN',
      label: 'MAVEN',
      modelSrc: '/models/maven-opt.glb',
      orbitRadiusA: 58.0,
      orbitRadiusB: 46.0,
      center: [4.0, 0, -4.0],
      inclination: [-0.65, 0.45, 0.35],
      speed: 0.18, // ~35s revolution
      initialAngle: 5.1,
      ambientScale: 0.18,
      heroScale: 0.38, // ~10% Mars diameter (5.1 units)
      stationedPos: [8.5, -23.0, -51.0],
      color: 0xffcc73,
    },
  ],
};

/**
 * Creates procedural potato-shaped asteroid moon (Phobos / Deimos).
 */
function createMartianMoonMesh(radius, seed) {
  const geo = new THREE.IcosahedronGeometry(radius, 2);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      Math.sin(v.x * 0.7 + seed) *
      Math.cos(v.y * 0.9 + seed * 1.3) *
      Math.sin(v.z * 0.8 + seed * 2.1);
    const n2 = Math.sin(v.y * 1.5 + v.x * 1.1) * 0.3;
    const factor = 1.0 + 0.22 * n + 0.12 * n2;
    v.multiplyScalar(factor);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8a847e,
    roughness: 0.92,
    metalness: 0.08,
    fog: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  toonifyModel(mesh);
  return mesh;
}

/**
 * Builds a HUD ellipse track encircling the planet globe.
 */
function createOrbitTrackGroup(cfg) {
  const trackGroup = new THREE.Group();
  const segments = 128;
  const positions = new Float32Array((segments + 1) * 3);

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    positions[i * 3] = cfg.orbitRadiusA * Math.cos(theta);
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = cfg.orbitRadiusB * Math.sin(theta);
  }

  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const trackMat = new THREE.LineBasicMaterial({
    color: cfg.color || 0x00e5ff,
    transparent: true,
    opacity: 0.20,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });

  const lineLoop = new THREE.Line(trackGeo, trackMat);
  trackGroup.add(lineLoop);

  // Apply inclination and orbital center
  trackGroup.rotation.set(...cfg.inclination);
  const cx = cfg.center ? cfg.center[0] : 0;
  const cy = cfg.center ? cfg.center[1] : 0;
  const cz = cfg.center ? cfg.center[2] : 0;
  trackGroup.position.set(cx, cy, cz);

  return { trackGroup, lineLoop, trackGeo, trackMat };
}

/**
 * Creates an always-visible pulsing 3D HUD label sprite for orbiters.
 * Shows reticle + short name (e.g. "MGS") so the satellite is instantly located against the planet.
 */
function createOrbiterLabelSprite(name, colorHex = '#00e5ff') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 128);

  // Outer glowing ring
  ctx.beginPath();
  ctx.arc(64, 64, 30, 0, Math.PI * 2);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = colorHex;
  ctx.stroke();

  // Inner dot
  ctx.beginPath();
  ctx.arc(64, 64, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Horizontal HUD tick
  ctx.beginPath();
  ctx.moveTo(96, 64);
  ctx.lineTo(122, 64);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = colorHex;
  ctx.stroke();

  // Text label
  ctx.font = 'bold 38px "NMSGeoSans", monospace, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 12;
  ctx.fillText(name, 132, 77);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(6.5, 3.25, 1.0);
  sprite.renderOrder = 10;

  return { sprite, texture, mat };
}

/**
 * Initializes and manages the Orbit Layer for a destination.
 */
export function createOrbitLayer({ scene, destination, profile, signal, onProgress }) {
  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  const pConfig = PLANET_CONFIGS[destination] || PLANET_CONFIGS.moon;
  const isMoon = destination === 'moon';
  const configs = ORBIT_CONFIGS[destination] || [];
  const orbiters = [];
  const tracks = [];
  const ambientMoons = [];
  const loadPromises = [];
  const totalAssetLoads = (isMoon ? 2 : 1) + configs.length;
  let completedAssetLoads = 0;

  const markAssetLoaded = () => {
    completedAssetLoads += 1;
    if (onProgress) {
      onProgress(Math.min(1, completedAssetLoads / Math.max(totalAssetLoads, 1)));
    }
  };

  const trailsEnabled = Boolean(profile && profile.shadowsEnabled);
  const isReducedMotion = prefersReducedMotion();

  let isPaused = false;
  let isOrbitalMode = false;
  let selectedOrbiterId = null;
  let isHeroZoomed = true;
  let isDisposed = false;

  // By default, hide until entering orbital view
  layerGroup.visible = false;

  // =========================================================================
  // 1. CENTRAL PLANET GLOBE (Earth in Moon View, Mars in Mars View)
  // =========================================================================
  const planetGroup = new THREE.Group();
  layerGroup.add(planetGroup);

  // Instant procedural fallback sphere so there is zero pop-in delay
  const sphereGeo = new THREE.SphereGeometry(pConfig.radius, 64, 64);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: pConfig.fallbackColor,
    roughness: pConfig.roughness,
    metalness: pConfig.metalness || 0.05,
    envMapIntensity: isMoon ? 0.05 : 0.45,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0.0,
    fog: false,
  });
  const fallbackSphere = new THREE.Mesh(sphereGeo, sphereMat);
  fallbackSphere.castShadow = false;
  fallbackSphere.receiveShadow = false;
  planetGroup.add(fallbackSphere);

  let planetMesh = null;
  const planetLoadPromise = loadGLTFModel(pConfig.modelSrc, { signal, cacheBuffer: true, toonify: false })
    .then((gltf) => {
      if (isDisposed || (signal && signal.aborted)) {
        if (gltf) disposeObject3D(gltf.scene);
        return;
      }
      const model = gltf.scene;

      // Fix issue 3: Accurately measure model's bounding sphere so planet scales to exact pConfig.radius
      // regardless of internal node transformations (e.g. node scale 100 in mars-opt.glb)
      model.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(model);
      const bsphere = bbox.getBoundingSphere(new THREE.Sphere());
      const rawRadius = bsphere.radius > 0.001 ? bsphere.radius : 1.0;
      const scaleFactor = pConfig.radius / rawRadius;
      model.scale.setScalar(scaleFactor);
      model.position.set(-bsphere.center.x * scaleFactor, -bsphere.center.y * scaleFactor, -bsphere.center.z * scaleFactor);

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          if (child.material) {
            child.material.roughness = pConfig.roughness;
            child.material.metalness = pConfig.metalness || 0.04;
            child.material.envMapIntensity = isMoon ? 0.05 : 0.45;
            child.material.fog = false;
            if (isMoon && child.material.emissive) {
              child.material.emissive.set(0x000000);
              child.material.emissiveIntensity = 0.0;
            }
            if (child.material.color) {
              child.material.color.setHex(0xffffff);
            }
            if (child.material.map) {
              child.material.map.anisotropy = 4;
              child.material.map.generateMipmaps = true;
              child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
              child.material.map.magFilter = THREE.LinearFilter;
              child.material.map.needsUpdate = true;
            }
            child.material.needsUpdate = true;
          }
        }
      });
      planetMesh = model;
      planetGroup.remove(fallbackSphere);
      sphereGeo.dispose();
      sphereMat.dispose();
      planetGroup.add(model);
    })
    .catch((err) => {
      if (err?.name === 'AbortError') return;
      console.warn(`Planet globe GLB load notice (${destination}):`, err);
    })
    .finally(markAssetLoaded);
  loadPromises.push(planetLoadPromise);

  // =========================================================================
  // 1.25 DISTANT EARTH IN DEEP SPACE (When in Moon destination)
  // Moon is at (0, 0, 0). Earth is far away in background space with consistent
  // sunward illumination and dark night hemisphere fading into the cosmos.
  // =========================================================================
  const distantEarthGroup = new THREE.Group();
  let distantEarthMesh = null;
  let distantEarthFallbackMesh = null;
  let distantEarthFallbackGeo = null;
  let distantEarthFallbackMat = null;
  let distantEarthSpinGroup = null;

  // Pre-allocated temporary vectors
  const _tmpPos = new THREE.Vector3();
  const _tmpTangentPos = new THREE.Vector3();
  const _tmpRot = new THREE.Euler();
  const _tmpMat = new THREE.Matrix4();

  function calculateOrbitPosition(cfg, angle, out) {
    const x0 = cfg.orbitRadiusA * Math.cos(angle);
    const z0 = cfg.orbitRadiusB * Math.sin(angle);
    _tmpPos.set(x0, 0, z0);

    _tmpRot.set(...cfg.inclination);
    _tmpMat.makeRotationFromEuler(_tmpRot);
    _tmpPos.applyMatrix4(_tmpMat);

    const cx = cfg.center ? cfg.center[0] : 0;
    const cy = cfg.center ? cfg.center[1] : 0;
    const cz = cfg.center ? cfg.center[2] : 0;

    out.set(_tmpPos.x + cx, _tmpPos.y + cy, _tmpPos.z + cz);
  }

  if (isMoon) {
    layerGroup.add(distantEarthGroup);
    distantEarthGroup.position.set(...DISTANT_EARTH_CONFIG.position);

    distantEarthSpinGroup = new THREE.Group();
    distantEarthSpinGroup.rotation.z = 0.41; // Earth axial tilt
    distantEarthGroup.add(distantEarthSpinGroup);

    distantEarthFallbackGeo = new THREE.SphereGeometry(DISTANT_EARTH_CONFIG.radius, 48, 48);
    distantEarthFallbackMat = new THREE.MeshStandardMaterial({
      color: DISTANT_EARTH_CONFIG.fallbackColor,
      roughness: DISTANT_EARTH_CONFIG.roughness,
      metalness: DISTANT_EARTH_CONFIG.metalness,
      envMapIntensity: 0.0,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
      fog: false,
    });
    distantEarthFallbackMesh = new THREE.Mesh(distantEarthFallbackGeo, distantEarthFallbackMat);
    distantEarthFallbackMesh.castShadow = false;
    distantEarthFallbackMesh.receiveShadow = false;
    distantEarthSpinGroup.add(distantEarthFallbackMesh);

    // Load detailed realistic Earth GLTF model
    const earthLoadPromise = loadGLTFModel(DISTANT_EARTH_CONFIG.modelSrc, { signal, cacheBuffer: true, toonify: false })
      .then((gltf) => {
        if (isDisposed || (signal && signal.aborted)) {
          if (gltf) disposeObject3D(gltf.scene);
          return;
        }
        const model = gltf.scene;
        model.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(model);
        const bsphere = bbox.getBoundingSphere(new THREE.Sphere());
        const rawRadius = bsphere.radius > 0.001 ? bsphere.radius : 1.0;
        const scaleFactor = DISTANT_EARTH_CONFIG.radius / rawRadius;
        model.scale.setScalar(scaleFactor);
        model.position.set(-bsphere.center.x * scaleFactor, -bsphere.center.y * scaleFactor, -bsphere.center.z * scaleFactor);

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            if (child.material) {
              child.material.roughness = DISTANT_EARTH_CONFIG.roughness;
              child.material.metalness = DISTANT_EARTH_CONFIG.metalness;
              child.material.envMapIntensity = 0.0;
              child.material.fog = false;
              if (child.material.emissive) {
                child.material.emissive.set(0x000000);
                child.material.emissiveIntensity = 0.0;
              }
              if (child.material.color) {
                child.material.color.setHex(0xffffff);
              }
              if (child.material.map) {
                child.material.map.anisotropy = 4;
                child.material.map.generateMipmaps = true;
                child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                child.material.map.magFilter = THREE.LinearFilter;
                child.material.map.needsUpdate = true;
              }
              child.material.needsUpdate = true;
            }
          }
        });
        distantEarthMesh = model;
        if (distantEarthFallbackMesh) {
          distantEarthSpinGroup.remove(distantEarthFallbackMesh);
          distantEarthFallbackGeo.dispose();
          distantEarthFallbackMat.dispose();
          distantEarthFallbackMesh = null;
        }
        distantEarthSpinGroup.add(model);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.warn('Distant Earth GLB notice:', err);
      })
      .finally(markAssetLoaded);
    loadPromises.push(earthLoadPromise);
  }

  // =========================================================================
  // 1.5 CINEMATIC ORBITAL LIGHTING (NASA Eyes on the Solar System style)
  // Balanced directional sun producing identical ~40-45% day/night terminator across planets
  // + subtle deep space ambient fill (so dark sides of planets stay deep black).
  // =========================================================================
  const orbitSunLight = new THREE.DirectionalLight(0xfffaee, 2.4);
  orbitSunLight.position.set(50, 70, -25);
  layerGroup.add(orbitSunLight);

  const orbitFillLight = new THREE.HemisphereLight(
    0x0a0e14, // Deep space cosmic ambient
    isMoon ? 0x141820 : 0x2e140d, // Very subtle regolith planetshine
    0.28
  );
  layerGroup.add(orbitFillLight);

  // Stylized rim light strictly for orbiters on layer 2 (so planet night sides stay pitch black)
  const orbitRimLight = new THREE.DirectionalLight(isMoon ? 0x60a5fa : 0xf97316, 0.35);
  orbitRimLight.position.set(-65, -25, -45);
  orbitRimLight.layers.set(2);
  layerGroup.add(orbitRimLight);

  // =========================================================================
  // 2. ORBIT TRACKS & ROTATING ORBITERS
  // =========================================================================
  configs.forEach((cfg, index) => {
    const trackData = createOrbitTrackGroup(cfg);
    layerGroup.add(trackData.trackGroup);
    tracks.push(trackData);

    const orbiterState = {
      cfg,
      angle: cfg.initialAngle,
      currentPos: new THREE.Vector3(),
      targetPos: new THREE.Vector3(),
      modelGroup: new THREE.Group(),
      loadedModel: null,
      isSelected: false,
      currentScale: cfg.ambientScale || 0.05,
      targetScale: cfg.ambientScale || 0.05,
      trailLine: null,
      trailGeo: null,
      trailBuffer: null,
      trailCount: 28,
      trailHead: 0,
    };

    calculateOrbitPosition(cfg, cfg.initialAngle, orbiterState.currentPos);
    orbiterState.modelGroup.position.copy(orbiterState.currentPos);

    calculateOrbitPosition(cfg, cfg.initialAngle + 0.05, _tmpTangentPos);
    orbiterState.modelGroup.lookAt(_tmpTangentPos);

    orbiterState.modelGroup.scale.setScalar(orbiterState.currentScale);
    layerGroup.add(orbiterState.modelGroup);

    // Always-visible pulsing 3D HUD label sprite in world space (unscaled by modelGroup)
    const labelColor = cfg.color ? `#${cfg.color.toString(16).padStart(6, '0')}` : '#00e5ff';
    const labelData = createOrbiterLabelSprite(cfg.label || cfg.name, labelColor);
    labelData.sprite.position.set(orbiterState.currentPos.x, orbiterState.currentPos.y + 2.8, orbiterState.currentPos.z);
    layerGroup.add(labelData.sprite);
    orbiterState.hudSprite = labelData.sprite;
    orbiterState.hudTex = labelData.texture;
    orbiterState.hudMat = labelData.mat;

    // Pre-allocated trail buffer (Quality preset)
    if (trailsEnabled && !isReducedMotion) {
      const trailPositions = new Float32Array(orbiterState.trailCount * 3);
      for (let i = 0; i < trailPositions.length; i++) trailPositions[i] = 0;

      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));

      const trailMat = new THREE.LineBasicMaterial({
        color: cfg.color || 0x00e5ff,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });

      const trailLine = new THREE.Line(trailGeo, trailMat);
      layerGroup.add(trailLine);

      orbiterState.trailLine = trailLine;
      orbiterState.trailGeo = trailGeo;
      orbiterState.trailBuffer = trailPositions;
    }

    orbiters.push(orbiterState);

    // Load orbiter model concurrently so readyPromise can await complete orbital readiness
    const orbiterPromise = loadGLTFModel(cfg.modelSrc, {
      signal,
      cacheBuffer: true,
    })
      .then((gltf) => {
        if (isDisposed || (signal && signal.aborted)) {
          if (gltf) disposeObject3D(gltf.scene);
          return;
        }
        const model = gltf.scene;
        model.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(model);
        const center = bbox.getCenter(new THREE.Vector3());
        model.position.sub(center);

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            child.layers.enable(2); // Enable layer 2 so orbiters receive crisp rim lighting
            if (child.geometry && child.geometry.attributes && child.geometry.attributes.normal) {
              child.geometry.computeVertexNormals();
            }
            if (child.material) {
              child.material.side = THREE.FrontSide;
              child.material.fog = false;
              child.material.envMapIntensity = 0.55;
              if (/solar/i.test(child.material.name || child.name || '')) {
                child.material.polygonOffset = true;
                child.material.polygonOffsetFactor = -1.0;
                child.material.polygonOffsetUnits = -2.0;
              }
              if ('metalness' in child.material) {
                child.material.metalness = Math.min(Math.max(child.material.metalness, 0.25), 0.7);
              }
              if ('roughness' in child.material) {
                child.material.roughness = Math.min(Math.max(child.material.roughness, 0.3), 0.55);
              }
              child.material.needsUpdate = true;
            }
          }
        });

        orbiterState.loadedModel = model;
        orbiterState.modelGroup.add(model);
        if (orbiterState.isSelected && isHeroZoomed && profile?.preset !== 'performance') {
          const outlineInk = destination === 'mars' ? 0x1a0c09 : 0x080c16;
          updateHeroOutline(null, model, { enabled: true, boundingRadius: cfg.heroScale, color: outlineInk });
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.warn(`Orbiter GLB load notice (${cfg.name}):`, err);
      })
      .finally(markAssetLoaded);

    loadPromises.push(orbiterPromise);
  });

  // =========================================================================
  // 3. MARTIAN MOONS (Phobos & Deimos)
  // =========================================================================
  if (destination === 'mars') {
    const phobosMesh = createMartianMoonMesh(2.4, 1.4);
    const deimosMesh = createMartianMoonMesh(1.6, 3.8);

    const phobosState = {
      mesh: phobosMesh,
      radiusA: 96.0,
      radiusB: 90.0,
      angle: 1.1,
      speed: 0.04,
      rotationSpeed: 0.05,
      inclination: [0.15, 0.1, 0.05],
    };

    const deimosState = {
      mesh: deimosMesh,
      radiusA: 132.0,
      radiusB: 125.0,
      angle: 4.2,
      speed: 0.025,
      rotationSpeed: 0.03,
      inclination: [-0.2, -0.12, 0.08],
    };

    layerGroup.add(phobosMesh);
    layerGroup.add(deimosMesh);
    ambientMoons.push(phobosState, deimosState);
  }

  return {
    /**
     * Updates planet axial spin, orbiter movements along tracks, ambient moons,
     * and dynamic camera tracking for the selected orbiter.
     */
    update(dt, camera, controls, isAnimating, animTargets) {
      if (isDisposed) return;
      const step = Math.min(dt, 0.1);

      // Rotate central planet globe (Moon in Moon view, Mars in Mars view)
      if (!isPaused && !isReducedMotion && planetMesh) {
        planetMesh.rotation.y += pConfig.spinSpeed * step;
      }

      // Rotate distant Earth in deep space
      if (!isPaused && !isReducedMotion && distantEarthMesh) {
        distantEarthMesh.rotation.y += DISTANT_EARTH_CONFIG.spinSpeed * step;
      }

      // Update Orbiters
      for (let i = 0; i < orbiters.length; i++) {
        const o = orbiters[i];

        const prevX = o.currentPos.x;
        const prevY = o.currentPos.y;
        const prevZ = o.currentPos.z;

        // Spacecraft always keeps orbiting along its orbit, even during inspection
        if (!isPaused && !isReducedMotion) {
          o.angle += o.cfg.speed * step;
          if (o.angle > Math.PI * 2) o.angle -= Math.PI * 2;
        }

        calculateOrbitPosition(o.cfg, o.angle, o.currentPos);
        o.modelGroup.position.copy(o.currentPos);

        calculateOrbitPosition(o.cfg, o.angle + 0.05, _tmpTangentPos);
        o.modelGroup.lookAt(_tmpTangentPos);

        // Smooth scale transition between ambientScale and heroScale
        const targetScale = (o.isSelected && isHeroZoomed) ? (o.cfg.heroScale || 0.4) : (o.cfg.ambientScale || 0.05);
        if (Math.abs(o.currentScale - targetScale) > 0.0001) {
          o.currentScale = THREE.MathUtils.lerp(o.currentScale, targetScale, Math.min(step * 4.5, 1.0));
        } else {
          o.currentScale = targetScale;
        }
        o.modelGroup.scale.setScalar(o.currentScale);

        if (o.hudSprite) {
          o.hudSprite.position.set(o.currentPos.x, o.currentPos.y + 2.8, o.currentPos.z);
          const pulse = 1.0 + 0.12 * Math.sin(Date.now() * 0.0035 + i);
          o.hudSprite.scale.set(6.5 * pulse, 3.25 * pulse, 1.0);
          // Hide HUD label sprite during close-up hero inspection or when selected to avoid overlapping craft/UI
          o.hudSprite.visible = !isHeroZoomed && !o.isSelected;
        }

        // Dynamic camera tracking: only when in hero close-up inspection mode!
        // In Orbit Overview mode, the camera watches the planet while the craft orbits around it
        if (isHeroZoomed && o.isSelected && camera && controls) {
          const dx = o.currentPos.x - prevX;
          const dy = o.currentPos.y - prevY;
          const dz = o.currentPos.z - prevZ;

          // Only apply delta if there was a previous position
          if (prevX !== 0 || prevY !== 0 || prevZ !== 0) {
            if (isAnimating && animTargets) {
              if (animTargets.targetLookAt) {
                animTargets.targetLookAt.x += dx;
                animTargets.targetLookAt.y += dy;
                animTargets.targetLookAt.z += dz;
              }
              if (animTargets.targetCamPos) {
                animTargets.targetCamPos.x += dx;
                animTargets.targetCamPos.y += dy;
                animTargets.targetCamPos.z += dz;
              }
            } else if (!isAnimating) {
              // Lock target directly onto orbiter position with zero drift
              const relOffset = camera.position.clone().sub(controls.target);
              controls.target.copy(o.currentPos);
              camera.position.copy(o.currentPos).add(relOffset);
            }
          }
        }

        // Update trail ring buffer (Quality preset)
        if (o.trailLine && o.trailGeo) {
          const buf = o.trailBuffer;
          const head = o.trailHead;
          buf[head * 3] = o.currentPos.x;
          buf[head * 3 + 1] = o.currentPos.y;
          buf[head * 3 + 2] = o.currentPos.z;
          o.trailHead = (head + 1) % o.trailCount;
          o.trailGeo.attributes.position.needsUpdate = true;
        }
      }

      // Update ambient moons (Phobos / Deimos)
      for (let i = 0; i < ambientMoons.length; i++) {
        const m = ambientMoons[i];
        if (!isPaused && !isReducedMotion) {
          m.angle += m.speed * step;
          if (m.angle > Math.PI * 2) m.angle -= Math.PI * 2;
          m.mesh.rotation.y += m.rotationSpeed * step;
        }

        const x0 = m.radiusA * Math.cos(m.angle);
        const z0 = m.radiusB * Math.sin(m.angle);
        _tmpPos.set(x0, 0, z0);
        _tmpRot.set(...m.inclination);
        _tmpMat.makeRotationFromEuler(_tmpRot);
        _tmpPos.applyMatrix4(_tmpMat);

        m.mesh.position.set(_tmpPos.x, _tmpPos.y, _tmpPos.z);
      }
    },

    /**
     * Controls visibility of the orbital layer (planet globe, orbit tracks, and orbiters).
     */
    setOrbitalMode(isOrbital) {
      isOrbitalMode = Boolean(isOrbital);
      layerGroup.visible = isOrbitalMode;
    },

    setPaused(paused) {
      isPaused = Boolean(paused);
    },

    select(id) {
      selectedOrbiterId = id;
      isOrbitalMode = true;
      layerGroup.visible = true;
      for (let i = 0; i < orbiters.length; i++) {
        const o = orbiters[i];
        o.isSelected = (o.cfg.id === id);
        o.targetScale = (o.isSelected && isHeroZoomed) ? (o.cfg.heroScale || 0.4) : (o.cfg.ambientScale || 0.05);
        if (o.loadedModel) {
          if (o.isSelected && isHeroZoomed && profile?.preset !== 'performance') {
            const outlineInk = destination === 'mars' ? 0x1a0c09 : 0x080c16;
            updateHeroOutline(null, o.loadedModel, { enabled: true, boundingRadius: o.cfg.heroScale, color: outlineInk });
          } else {
            detachHeroOutline(o.loadedModel);
          }
        }
      }
    },

    release() {
      selectedOrbiterId = null;
      for (let i = 0; i < orbiters.length; i++) {
        const o = orbiters[i];
        o.isSelected = false;
        o.targetScale = o.cfg.ambientScale || 0.05;
        if (o.loadedModel) {
          detachHeroOutline(o.loadedModel);
        }
      }
    },

    getOrbiterObject(id) {
      const match = orbiters.find((o) => o.cfg.id === id);
      return match ? match.modelGroup : null;
    },

    getOrbiterPosition(id) {
      const match = orbiters.find((o) => o.cfg.id === id);
      return match ? match.currentPos.clone() : null;
    },

    /**
     * Computes the ideal cinematic hero inspection camera position & lookAt
     * framing the spacecraft large in the foreground with Mars/Moon in background.
     */
    getOrbiterHeroCamera(id, isMobile = false, camOverride = null) {
      const o = orbiters.find((orb) => orb.cfg.id === id);
      if (!o) return null;
      const curPos = o.currentPos.clone();
      const centerPos = new THREE.Vector3(0, 0, 0);
      const norm = curPos.clone().sub(centerPos).normalize();
      const nextPos = new THREE.Vector3();
      calculateOrbitPosition(o.cfg, o.angle + 0.05, nextPos);
      const tangent = nextPos.clone().sub(curPos).normalize();
      const up = new THREE.Vector3().crossVectors(norm, tangent).normalize();

      const activeCam = camOverride || camera || scene.userData?.camera;
      const aspect = activeCam?.aspect || (window.innerWidth / window.innerHeight);
      const isNarrow = aspect < 1.0;
      const aspectMult = isNarrow ? Math.min(1.45, Math.max(1.12, 0.95 / aspect)) : 1.0;

      const customDistMult = o.cfg.cameraDistanceMult || 1.0;
      const baseDist = (isMoon ? 1.05 : 1.35) * customDistMult;

      const camPos = curPos.clone()
        .add(norm.clone().multiplyScalar(3.2 * baseDist * aspectMult))
        .add(up.clone().multiplyScalar(0.85 * baseDist * aspectMult))
        .sub(tangent.clone().multiplyScalar(2.4 * baseDist * aspectMult));

      return {
        camPos: [camPos.x, camPos.y, camPos.z],
        lookAt: [curPos.x, curPos.y, curPos.z],
      };
    },

    /**
     * Computes Orbit Overview camera framing
     * Shows Moon & orbiters in Moon view (with Earth far in space),
     * or Mars & orbiters in Mars view.
     */
    getOrbitOverviewCamera(id, isMobile = false, camOverride = null) {
      const o = orbiters.find((orb) => orb.cfg.id === id);
      const orbitRadius = o ? o.cfg.orbitRadiusA : (pConfig.radius * 1.85);
      const inclination = o ? o.cfg.inclination : (isMoon ? [0.45, 0.25, 0.15] : [0.4, 0.2, 0.1]);
      return computeOrbitOverview({
        planetRadius: pConfig.radius,
        orbitRadius,
        inclination,
        camera: camOverride || camera || scene.userData?.camera,
        isMobile,
      });
    },

    setZoomMode(heroZoomed) {
      isHeroZoomed = Boolean(heroZoomed);
      for (let i = 0; i < orbiters.length; i++) {
        const o = orbiters[i];
        if (o.isSelected) {
          o.targetScale = isHeroZoomed ? (o.cfg.heroScale || 0.4) : (o.cfg.ambientScale || 0.05);
          if (o.loadedModel) {
            if (isHeroZoomed && profile?.preset !== 'performance') {
              const outlineInk = destination === 'mars' ? 0x1a0c09 : 0x080c16;
              updateHeroOutline(null, o.loadedModel, { enabled: true, boundingRadius: o.cfg.heroScale, color: outlineInk });
            } else {
              detachHeroOutline(o.loadedModel);
            }
          }
        } else {
          o.targetScale = o.cfg.ambientScale || 0.05;
          if (o.loadedModel) {
            detachHeroOutline(o.loadedModel);
          }
        }
      }
    },

    getZoomMode() {
      return isHeroZoomed;
    },

    getOrbiters() {
      return orbiters;
    },

    readyPromise: Promise.allSettled(loadPromises),

    dispose() {
      isDisposed = true;
      tracks.forEach((t) => {
        t.trackGeo.dispose();
        t.trackMat.dispose();
        if (t.tickGeo) t.tickGeo.dispose();
        if (t.tickMat) t.tickMat.dispose();
        disposeObject3D(t.trackGroup);
      });
      orbiters.forEach((o) => {
        if (o.hudTex) o.hudTex.dispose();
        if (o.hudMat) o.hudMat.dispose();
        if (o.trailGeo) o.trailGeo.dispose();
        if (o.trailLine && o.trailLine.material) o.trailLine.material.dispose();
        if (o.loadedModel) {
          detachHeroOutline(o.loadedModel);
          disposeObject3D(o.loadedModel);
        }
        disposeObject3D(o.modelGroup);
      });
      ambientMoons.forEach((m) => {
        if (m.mesh.geometry) m.mesh.geometry.dispose();
        if (m.mesh.material) m.mesh.material.dispose();
        disposeObject3D(m.mesh);
      });
      if (orbitSunLight) orbitSunLight.dispose();
      if (orbitFillLight) orbitFillLight.dispose();
      if (orbitRimLight) orbitRimLight.dispose();
      if (planetMesh) disposeObject3D(planetMesh);
      if (distantEarthMesh) disposeObject3D(distantEarthMesh);
      if (distantEarthFallbackMesh) {
        distantEarthFallbackGeo.dispose();
        distantEarthFallbackMat.dispose();
        disposeObject3D(distantEarthFallbackMesh);
      }
      disposeObject3D(distantEarthSpinGroup);
      disposeObject3D(distantEarthGroup);
      disposeObject3D(fallbackSphere);
      disposeObject3D(planetGroup);
      disposeObject3D(layerGroup);
      if (layerGroup.parent) {
        layerGroup.parent.remove(layerGroup);
      }
    },
  };
}
