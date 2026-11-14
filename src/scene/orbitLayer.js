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

// Planetary configurations for orbital scenes
const PLANET_CONFIGS = {
  moon: {
    radius: 12.0,
    modelSrc: '/models/moon-opt.glb',
    spinSpeed: 0.012,
    fallbackColor: 0x989da3,
    roughness: 0.92,
  },
  mars: {
    radius: 13.5,
    modelSrc: '/models/mars-opt.glb',
    spinSpeed: 0.016,
    fallbackColor: 0xb25232,
    roughness: 0.88,
  },
};

// Orbit configurations for each orbiter around the central planet globe
const ORBIT_CONFIGS = {
  moon: [
    {
      id: 'lro-orbiter',
      name: 'LRO',
      modelSrc: '/models/lro-opt.glb',
      orbitRadiusA: 16.5,
      orbitRadiusB: 15.5,
      center: [0, 0, 0],
      inclination: [1.45, 0.2, 0.1], // Near-polar mapping orbit ~85 deg
      speed: 0.18, // rad/s
      initialAngle: 0.85,
      craftScale: 0.15, // Native span 16.27m -> scaled to ~2.44 units
      stationedPos: [12.93, -9.06, 2.2],
      color: 0x00e5ff,
    },
    {
      id: 'ladee-orbiter',
      name: 'LADEE',
      modelSrc: '/models/ladee-opt.glb',
      orbitRadiusA: 19.5,
      orbitRadiusB: 18.0,
      center: [0, 0, 0],
      inclination: [0.35, 0.45, 0.2],
      speed: 0.14,
      initialAngle: 2.7,
      craftScale: 0.055, // Native span 44.57m -> scaled to ~2.45 units
      stationedPos: [-12.21, -8.24, 12.37],
      color: 0x8de1ff,
    },
  ],
  mars: [
    {
      id: 'mgs-orbiter',
      name: 'MGS',
      modelSrc: '/models/mgs-opt.glb',
      orbitRadiusA: 17.5,
      orbitRadiusB: 16.5,
      center: [0, 0, 0],
      inclination: [0.55, 0.25, 0.1],
      speed: 0.16,
      initialAngle: 0.4,
      craftScale: 0.024, // Native span 102.45m -> scaled to ~2.46 units
      stationedPos: [17.13, 0.19, 2.77],
      color: 0x00e5ff,
    },
    {
      id: 'odyssey-orbiter',
      name: 'Odyssey',
      modelSrc: '/models/odyssey-opt.glb',
      orbitRadiusA: 20.0,
      orbitRadiusB: 18.8,
      center: [0, 0, 0],
      inclination: [-0.42, 0.35, 0.2],
      speed: 0.13,
      initialAngle: 1.9,
      craftScale: 0.065, // Native span 36.81m -> scaled to ~2.40 units
      stationedPos: [0.15, 6.53, 17.77],
      color: 0x64d2ff,
    },
    {
      id: 'mro-orbiter',
      name: 'MRO',
      modelSrc: '/models/mro-opt.glb',
      orbitRadiusA: 23.0,
      orbitRadiusB: 21.5,
      center: [0, 0, 0],
      inclination: [1.5, -0.25, 0.15], // Hi-res polar reconnaissance
      speed: 0.11,
      initialAngle: 3.6,
      craftScale: 0.26, // Native span 9.11m -> scaled to ~2.37 units
      stationedPos: [-17.41, 14.01, -4.08],
      color: 0x00e5ff,
    },
    {
      id: 'maven-orbiter',
      name: 'MAVEN',
      modelSrc: '/models/maven-opt.glb',
      orbitRadiusA: 28.0,
      orbitRadiusB: 19.5,
      center: [2.5, 0, -2.5],
      inclination: [-0.65, 0.45, 0.35], // Dipping elliptical atmosphere science orbit
      speed: 0.08,
      initialAngle: 5.1,
      craftScale: 0.18, // Native span 13.46m -> scaled to ~2.42 units
      stationedPos: [3.6, -9.57, -21.08],
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
  return mesh;
}

/**
 * Builds a HUD ellipse track and tick marks encircling the planet globe.
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
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });

  const lineLoop = new THREE.Line(trackGeo, trackMat);
  trackGroup.add(lineLoop);

  // Amber tick marks every 30 degrees (12 ticks along the orbit loop)
  const tickCount = 12;
  const tickPositions = new Float32Array(tickCount * 2 * 3);
  for (let i = 0; i < tickCount; i++) {
    const theta = (i / tickCount) * Math.PI * 2;
    const x0 = cfg.orbitRadiusA * Math.cos(theta);
    const z0 = cfg.orbitRadiusB * Math.sin(theta);
    const x1 = (cfg.orbitRadiusA + 0.65) * Math.cos(theta);
    const z1 = (cfg.orbitRadiusB + 0.65) * Math.sin(theta);

    const idx = i * 6;
    tickPositions[idx] = x0;
    tickPositions[idx + 1] = 0;
    tickPositions[idx + 2] = z0;
    tickPositions[idx + 3] = x1;
    tickPositions[idx + 4] = 0;
    tickPositions[idx + 5] = z1;
  }

  const tickGeo = new THREE.BufferGeometry();
  tickGeo.setAttribute('position', new THREE.BufferAttribute(tickPositions, 3));
  const tickMat = new THREE.LineBasicMaterial({
    color: 0xffcc73,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });

  const tickLines = new THREE.LineSegments(tickGeo, tickMat);
  trackGroup.add(tickLines);

  // Apply inclination and orbital center
  trackGroup.rotation.set(...cfg.inclination);
  const cx = cfg.center ? cfg.center[0] : 0;
  const cy = cfg.center ? cfg.center[1] : 0;
  const cz = cfg.center ? cfg.center[2] : 0;
  trackGroup.position.set(cx, cy, cz);

  return { trackGroup, lineLoop, trackGeo, trackMat, tickLines, tickGeo, tickMat };
}

/**
 * 3D HUD Hotspot Badge & Leader Line for orbiters.
 * Reuses existing visual tokens: glowing anchor dot, elbow leader line,
 * and Orbitron technical badge.
 */
function createOrbiterHudBadge(name) {
  const badgeGroup = new THREE.Group();

  // 1. Glowing anchor dot at center
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
  const dotMat = new THREE.PointsMaterial({
    color: 0x00e5ff,
    size: 4,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
    fog: false,
  });
  const dot = new THREE.Points(dotGeo, dotMat);
  badgeGroup.add(dot);

  // 2. Elbow leader line
  const lineGeo = new THREE.BufferGeometry();
  const linePos = new Float32Array([
    0, 0, 0,
    0.6, 0.4, 0,
    0.6, 0.4, 0,
    1.2, 0.4, 0,
  ]);
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.75,
    depthTest: false,
    fog: false,
  });
  const elbow = new THREE.LineSegments(lineGeo, lineMat);
  badgeGroup.add(elbow);

  // 3. Telemetry badge billboard sprite
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#030614';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 252, 60);

  // Amber radar pip
  ctx.fillStyle = '#ffcc73';
  ctx.beginPath();
  ctx.arc(22, 32, 6, 0, Math.PI * 2);
  ctx.fill();

  // Technical Orbitron label
  ctx.font = 'bold 22px "Orbitron", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name.toUpperCase(), 38, 40);

  const tex = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    fog: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(2.0, 0.4, 0);
  sprite.scale.set(2.2, 0.55, 1.0);
  badgeGroup.add(sprite);

  return { badgeGroup, dotGeo, dotMat, lineGeo, lineMat, sprite, spriteMat, tex };
}

/**
 * Initializes and manages the Orbit Layer for a destination.
 */
export function createOrbitLayer({ scene, destination, profile, signal }) {
  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  const pConfig = PLANET_CONFIGS[destination] || PLANET_CONFIGS.moon;
  const configs = ORBIT_CONFIGS[destination] || [];
  const orbiters = [];
  const tracks = [];
  const ambientMoons = [];

  const trailsEnabled = Boolean(profile && profile.shadowsEnabled);
  const isReducedMotion = prefersReducedMotion();

  let isPaused = false;
  let isOrbitalMode = false;
  let selectedOrbiterId = null;
  let isDisposed = false;

  // By default, hide until entering orbital view
  layerGroup.visible = false;

  // =========================================================================
  // 1. CENTRAL PLANET GLOBE (The Moon or Mars)
  // =========================================================================
  const planetGroup = new THREE.Group();
  layerGroup.add(planetGroup);

  // Instant procedural fallback sphere so there is zero pop-in delay
  const sphereGeo = new THREE.SphereGeometry(pConfig.radius, 48, 48);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: pConfig.fallbackColor,
    roughness: pConfig.roughness,
    metalness: 0.05,
    fog: false,
  });
  const fallbackSphere = new THREE.Mesh(sphereGeo, sphereMat);
  fallbackSphere.castShadow = false;
  fallbackSphere.receiveShadow = false;
  planetGroup.add(fallbackSphere);

  let planetMesh = null;
  loadGLTFModel(pConfig.modelSrc, { signal, cacheBuffer: true })
    .then((gltf) => {
      if (isDisposed || (signal && signal.aborted)) {
        if (gltf) disposeObject3D(gltf.scene);
        return;
      }
      const model = gltf.scene;
      // Unit sphere GLB scaled to planet radius
      model.scale.setScalar(pConfig.radius);
      model.position.set(0, 0, 0);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          if (child.material) {
            child.material.roughness = pConfig.roughness;
            child.material.metalness = 0.04;
            child.material.envMapIntensity = 0.28;
            child.material.fog = false;
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
    });

  // =========================================================================
  // 1.5 CINEMATIC ORBITAL LIGHTING (NASA Eyes on the Solar System style)
  // Strong sunlight creates dramatic crescent terminator on the planet globe
  // and sharp specular reflections on spacecraft gold foil and solar arrays.
  // =========================================================================
  const orbitSunLight = new THREE.DirectionalLight(0xfffaee, 2.8);
  orbitSunLight.position.set(45, 30, 35);
  layerGroup.add(orbitSunLight);

  const orbitRimLight = new THREE.DirectionalLight(0x4080c0, 0.65);
  orbitRimLight.position.set(-40, -20, -35);
  layerGroup.add(orbitRimLight);

  // Soft orbital fill light to ensure the shadowed hemisphere has subtle visibility
  const orbitAmbient = new THREE.AmbientLight(0xffffff, 0.35);
  layerGroup.add(orbitAmbient);

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
      trailLine: null,
      trailGeo: null,
      trailBuffer: null,
      trailCount: 28,
      trailHead: 0,
    };

    orbiterState.modelGroup.scale.setScalar(cfg.craftScale);
    layerGroup.add(orbiterState.modelGroup);

    // 3D HUD telemetry badge
    const hudBadge = createOrbiterHudBadge(cfg.name);
    orbiterState.hudBadge = hudBadge;
    orbiterState.modelGroup.add(hudBadge.badgeGroup);

    // Pre-allocated trail buffer (Quality preset)
    if (trailsEnabled && !isReducedMotion) {
      const trailPositions = new Float32Array(orbiterState.trailCount * 3);
      for (let i = 0; i < trailPositions.length; i++) trailPositions[i] = 0;

      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));

      const trailMat = new THREE.LineBasicMaterial({
        color: cfg.color || 0x00e5ff,
        transparent: true,
        opacity: 0.35,
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

    // Staggered model loading
    setTimeout(() => {
      if (isDisposed || (signal && signal.aborted)) return;

      loadGLTFModel(cfg.modelSrc, {
        signal,
        cacheBuffer: true,
      })
        .then((gltf) => {
          if (isDisposed || (signal && signal.aborted)) {
            if (gltf) disposeObject3D(gltf.scene);
            return;
          }
          const model = gltf.scene;
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = false;
              child.receiveShadow = false;
              if (child.material) {
                child.material.fog = false;
                child.material.envMapIntensity = 0.55;
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
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          console.warn(`Orbiter GLB load notice (${cfg.name}):`, err);
        });
    }, 120 + index * 160);
  });

  // =========================================================================
  // 3. MARTIAN MOONS (Phobos & Deimos)
  // =========================================================================
  if (destination === 'mars') {
    const phobosMesh = createMartianMoonMesh(1.3, 1.4);
    const deimosMesh = createMartianMoonMesh(0.85, 3.8);

    const phobosState = {
      mesh: phobosMesh,
      radiusA: 36.0,
      radiusB: 33.0,
      angle: 1.1,
      speed: 0.04,
      rotationSpeed: 0.05,
      inclination: [0.15, 0.1, 0.05],
    };

    const deimosState = {
      mesh: deimosMesh,
      radiusA: 48.0,
      radiusB: 45.0,
      angle: 4.2,
      speed: 0.025,
      rotationSpeed: 0.03,
      inclination: [-0.2, -0.12, 0.08],
    };

    layerGroup.add(phobosMesh);
    layerGroup.add(deimosMesh);
    ambientMoons.push(phobosState, deimosState);
  }

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

  return {
    /**
     * Updates planet axial spin, orbiter movements along tracks, and ambient moons.
     */
    update(dt) {
      if (isDisposed) return;
      const step = Math.min(dt, 0.1);

      // Rotate central planet globe
      if (!isPaused && !isReducedMotion && planetGroup) {
        planetGroup.rotation.y += pConfig.spinSpeed * step;
      }

      // Update Orbiters
      for (let i = 0; i < orbiters.length; i++) {
        const o = orbiters[i];

        if (o.isSelected) {
          // Stationed at the scenic vantage point with the planet globe framed behind it.
          // Hotspots are calibrated to this stationed pose; OrbitControls lets user orbit 360°.
          if (o.cfg.stationedPos) {
            o.modelGroup.position.set(...o.cfg.stationedPos);
          }
        } else {
          // Actively orbiting around the planet globe
          if (!isPaused && !isReducedMotion) {
            o.angle += o.cfg.speed * step;
            if (o.angle > Math.PI * 2) o.angle -= Math.PI * 2;
          }

          calculateOrbitPosition(o.cfg, o.angle, o.currentPos);
          o.modelGroup.position.copy(o.currentPos);

          // Face tangent velocity vector
          calculateOrbitPosition(o.cfg, o.angle + 0.05, _tmpTangentPos);
          o.modelGroup.lookAt(_tmpTangentPos);

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
        if (o.cfg.id === id) {
          o.isSelected = true;
          if (o.cfg.stationedPos) {
            o.modelGroup.position.set(...o.cfg.stationedPos);
          }
          // Face forward along orbital tangent flight path
          calculateOrbitPosition(o.cfg, (o.cfg.initialAngle || 0) + 0.05, _tmpTangentPos);
          o.modelGroup.lookAt(_tmpTangentPos);
          if (o.hudBadge) {
            o.hudBadge.badgeGroup.visible = false;
          }
        } else {
          o.isSelected = false;
          if (o.hudBadge) {
            o.hudBadge.badgeGroup.visible = true;
          }
        }
      }
    },

    release() {
      selectedOrbiterId = null;
      for (let i = 0; i < orbiters.length; i++) {
        orbiters[i].isSelected = false;
        if (orbiters[i].hudBadge) {
          orbiters[i].hudBadge.badgeGroup.visible = true;
        }
      }
    },

    getOrbiterObject(id) {
      const match = orbiters.find((o) => o.cfg.id === id);
      return match ? match.modelGroup : null;
    },

    dispose() {
      isDisposed = true;
      tracks.forEach((t) => {
        t.trackGeo.dispose();
        t.trackMat.dispose();
        t.tickGeo.dispose();
        t.tickMat.dispose();
        disposeObject3D(t.trackGroup);
      });
      orbiters.forEach((o) => {
        if (o.trailGeo) o.trailGeo.dispose();
        if (o.trailLine && o.trailLine.material) o.trailLine.material.dispose();
        if (o.hudBadge) {
          o.hudBadge.tex.dispose();
          o.hudBadge.spriteMat.dispose();
          o.hudBadge.lineGeo.dispose();
          o.hudBadge.lineMat.dispose();
          o.hudBadge.dotGeo.dispose();
          o.hudBadge.dotMat.dispose();
          disposeObject3D(o.hudBadge.badgeGroup);
        }
        if (o.loadedModel) disposeObject3D(o.loadedModel);
        disposeObject3D(o.modelGroup);
      });
      ambientMoons.forEach((m) => {
        if (m.mesh.geometry) m.mesh.geometry.dispose();
        if (m.mesh.material) m.mesh.material.dispose();
        disposeObject3D(m.mesh);
      });
      if (orbitSunLight) orbitSunLight.dispose();
      if (orbitRimLight) orbitRimLight.dispose();
      if (planetMesh) disposeObject3D(planetMesh);
      disposeObject3D(fallbackSphere);
      disposeObject3D(planetGroup);
      disposeObject3D(layerGroup);
      if (layerGroup.parent) {
        layerGroup.parent.remove(layerGroup);
      }
    },
  };
}
