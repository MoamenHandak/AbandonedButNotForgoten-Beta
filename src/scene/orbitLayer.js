/**
 * Orbit Layer — Three.js Scene Module (NASA Space Apps 2026)
 *
 * Adds technical HUD-style orbit tracks, rotating orbiters, trails (Quality preset),
 * and ambient Martian moons (Phobos & Deimos) to the planetary showrooms.
 *
 * Visual Language:
 * - Orbit tracks: Thin LineLoop ellipses (128 segments, cyan #00e5ff, additive, fog=false)
 *   with amber #ffcc73 tick marks every 30 degrees.
 * - Orbiters: Real optimized models (artistic orbital scale in flight, true scale 1.0 in showcase)
 *   with castShadow=false and material.fog=false.
 * - Trails: Pre-allocated ring buffer (Quality preset only, zero per-frame garbage).
 */

import * as THREE from 'three';
import { loadGLTFModel, disposeObject3D, prefersReducedMotion } from '../utils/modelCache';

// Orbit configurations for each destination
const ORBIT_CONFIGS = {
  moon: [
    {
      id: 'lro-orbiter',
      name: 'LRO',
      modelSrc: '/models/lro-opt.glb',
      orbitRadiusA: 560,
      orbitRadiusB: 480,
      altitude: 180,
      center: [0, 0, 0],
      inclination: [0.38, 0.22, 0.12], // Euler angles in radians
      speed: 0.065, // rad/s
      initialAngle: 0.85,
      orbitalScale: 14.0,
      showcaseScale: 1.0,
      showcaseAnchor: [0, 4.8, 0],
    },
    {
      id: 'ladee-orbiter',
      name: 'LADEE',
      modelSrc: '/models/ladee-opt.glb',
      orbitRadiusA: 720,
      orbitRadiusB: 620,
      altitude: 230,
      center: [20, 0, -30],
      inclination: [-0.32, -0.42, 0.18],
      speed: 0.048,
      initialAngle: 2.7,
      orbitalScale: 18.0,
      showcaseScale: 1.0,
      showcaseAnchor: [0, 4.8, 0],
    },
  ],
  mars: [
    {
      id: 'mgs-orbiter',
      name: 'MGS',
      modelSrc: '/models/mgs-opt.glb',
      orbitRadiusA: 340,
      orbitRadiusB: 290,
      altitude: 160,
      center: [0, 0, -10],
      inclination: [0.42, 0.28, 0],
      speed: 0.055,
      initialAngle: 0.4,
      orbitalScale: 15.0,
      showcaseScale: 1.0,
      showcaseAnchor: [0, 5.2, -4.0],
    },
    {
      id: 'odyssey-orbiter',
      name: 'Odyssey',
      modelSrc: '/models/odyssey-opt.glb',
      orbitRadiusA: 400,
      orbitRadiusB: 350,
      altitude: 195,
      center: [-15, 0, 10],
      inclination: [-0.36, -0.22, 0.15],
      speed: 0.045,
      initialAngle: 1.9,
      orbitalScale: 14.0,
      showcaseScale: 1.0,
      showcaseAnchor: [0, 5.2, -4.0],
    },
    {
      id: 'mro-orbiter',
      name: 'MRO',
      modelSrc: '/models/mro-opt.glb',
      orbitRadiusA: 470,
      orbitRadiusB: 410,
      altitude: 230,
      center: [10, 0, -20],
      inclination: [0.25, -0.48, -0.18],
      speed: 0.038,
      initialAngle: 3.6,
      orbitalScale: 16.0,
      showcaseScale: 1.0,
      showcaseAnchor: [0, 5.2, -4.0],
    },
    {
      id: 'maven-orbiter',
      name: 'MAVEN',
      modelSrc: '/models/maven-opt.glb',
      orbitRadiusA: 540,
      orbitRadiusB: 460,
      altitude: 270,
      center: [0, 0, 0],
      inclination: [-0.48, 0.35, 0.25],
      speed: 0.032,
      initialAngle: 5.1,
      orbitalScale: 13.0,
      showcaseScale: 1.0,
      showcaseAnchor: [0, 5.2, -4.0],
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
    // Deterministic pseudo-noise displacement
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
 * Builds a HUD ellipse track and tick marks.
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
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });

  const lineLoop = new THREE.Line(trackGeo, trackMat);
  trackGroup.add(lineLoop);

  // Amber tick marks every 30 degrees (12 ticks)
  const tickCount = 12;
  const tickPositions = new Float32Array(tickCount * 2 * 3);
  for (let i = 0; i < tickCount; i++) {
    const theta = (i / tickCount) * Math.PI * 2;
    const x0 = cfg.orbitRadiusA * Math.cos(theta);
    const z0 = cfg.orbitRadiusB * Math.sin(theta);
    const x1 = (cfg.orbitRadiusA + 16) * Math.cos(theta);
    const z1 = (cfg.orbitRadiusB + 16) * Math.sin(theta);

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
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });

  const tickLines = new THREE.LineSegments(tickGeo, tickMat);
  trackGroup.add(tickLines);

  // Apply inclination and translation
  trackGroup.rotation.set(...cfg.inclination);
  trackGroup.position.set(cfg.center[0], cfg.altitude, cfg.center[2]);

  return { trackGroup, lineLoop, trackGeo, trackMat, tickLines, tickGeo, tickMat };
}

/**
 * 3D HUD Hotspot Badge & Leader Line for orbiters
 * Reuses existing visual tokens: glowing anchor dot, elbow leader line,
 * Orbitron uppercase badge, cyan #00e5ff / amber #ffcc73 on #030614.
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
    0.7, 0.45, 0,
    0.7, 0.45, 0,
    1.4, 0.45, 0,
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
  sprite.position.set(2.4, 0.45, 0);
  sprite.scale.set(2.6, 0.65, 1.0);
  badgeGroup.add(sprite);

  return { badgeGroup, dotGeo, dotMat, lineGeo, lineMat, sprite, spriteMat, tex };
}

/**
 * Initializes and manages the Orbit Layer for a destination.
 */
export function createOrbitLayer({ scene, destination, profile, signal }) {
  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  const configs = ORBIT_CONFIGS[destination] || [];
  const orbiters = [];
  const tracks = [];
  const ambientMoons = [];

  const trailsEnabled = Boolean(profile && profile.shadowsEnabled); // Quality preset uses shadowsEnabled=true
  const isReducedMotion = prefersReducedMotion();

  let isPaused = false;
  let selectedOrbiterId = null;
  let isDisposed = false;

  // Staggered model loading
  configs.forEach((cfg, index) => {
    const trackData = createOrbitTrackGroup(cfg);
    layerGroup.add(trackData.trackGroup);
    tracks.push(trackData);

    // Orbiter state container
    const orbiterState = {
      cfg,
      angle: cfg.initialAngle,
      currentPos: new THREE.Vector3(),
      targetPos: new THREE.Vector3(),
      modelGroup: new THREE.Group(),
      loadedModel: null,
      isSelected: false,
      transitionProgress: 1.0,
      transitionDuration: 1.2, // seconds
      startPos: new THREE.Vector3(),
      startScale: cfg.orbitalScale,
      trailLine: null,
      trailGeo: null,
      trailBuffer: null,
      trailCount: 28,
      trailHead: 0,
    };

    orbiterState.modelGroup.position.set(0, cfg.altitude, 0);
    orbiterState.modelGroup.scale.setScalar(cfg.orbitalScale);
    layerGroup.add(orbiterState.modelGroup);

    // 3D HUD telemetry badge with glowing anchor dot & elbow leader line
    const hudBadge = createOrbiterHudBadge(cfg.name);
    orbiterState.hudBadge = hudBadge;
    orbiterState.modelGroup.add(hudBadge.badgeGroup);

    // Pre-allocated ring buffer trail for Quality preset
    if (trailsEnabled && !isReducedMotion) {
      const trailPositions = new Float32Array(orbiterState.trailCount * 3);
      for (let i = 0; i < trailPositions.length; i++) trailPositions[i] = 0;

      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));

      const trailMat = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
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

    // Load model asynchronously with progressive staggering
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
                child.material.envMapIntensity = 0.5;
                if ('metalness' in child.material) {
                  child.material.metalness = Math.min(Math.max(child.material.metalness, 0.25), 0.65);
                }
                if ('roughness' in child.material) {
                  child.material.roughness = Math.min(Math.max(child.material.roughness, 0.3), 0.6);
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
    }, 150 + index * 180);
  });

  // Ambient Martian moons extra (Phobos & Deimos)
  if (destination === 'mars') {
    const phobosMesh = createMartianMoonMesh(7.2, 1.4);
    const deimosMesh = createMartianMoonMesh(4.1, 3.8);

    const phobosState = {
      mesh: phobosMesh,
      radiusA: 620,
      radiusB: 540,
      altitude: 210,
      angle: 1.1,
      speed: 0.018,
      rotationSpeed: 0.04,
      inclination: [0.18, 0.12, 0.05],
    };

    const deimosState = {
      mesh: deimosMesh,
      radiusA: 820,
      radiusB: 740,
      altitude: 290,
      angle: 4.2,
      speed: 0.011,
      rotationSpeed: 0.025,
      inclination: [-0.22, -0.15, 0.08],
    };

    layerGroup.add(phobosMesh);
    layerGroup.add(deimosMesh);
    ambientMoons.push(phobosState, deimosState);
  }

  // Temporary helper vectors to avoid allocations per frame
  const _tmpPos = new THREE.Vector3();
  const _tmpRot = new THREE.Euler();
  const _tmpMat = new THREE.Matrix4();

  function calculateOrbitPosition(cfg, angle, out) {
    const x0 = cfg.orbitRadiusA * Math.cos(angle);
    const z0 = cfg.orbitRadiusB * Math.sin(angle);
    _tmpPos.set(x0, 0, z0);

    _tmpRot.set(...cfg.inclination);
    _tmpMat.makeRotationFromEuler(_tmpRot);
    _tmpPos.applyMatrix4(_tmpMat);

    out.set(
      _tmpPos.x + cfg.center[0],
      _tmpPos.y + cfg.altitude,
      _tmpPos.z + cfg.center[2]
    );
  }

  return {
    /**
     * Updates positions and trails every frame using Three.js dt.
     */
    update(dt) {
      if (isDisposed) return;
      const step = Math.min(dt, 0.1);

      // Update Orbiters
      for (let i = 0; i < orbiters.length; i++) {
        const o = orbiters[i];

        if (!isPaused && !isReducedMotion) {
          o.angle += o.cfg.speed * step;
          if (o.angle > Math.PI * 2) o.angle -= Math.PI * 2;
        }

        // Target position along orbital trajectory
        calculateOrbitPosition(o.cfg, o.angle, o.targetPos);

        if (o.isSelected) {
          // Transition to calibrated showcase anchor
          if (o.transitionProgress < 1.0) {
            o.transitionProgress = Math.min(o.transitionProgress + step / o.transitionDuration, 1.0);
            const ease =
              o.transitionProgress < 0.5
                ? 4 * o.transitionProgress * o.transitionProgress * o.transitionProgress
                : 1 - Math.pow(-2 * o.transitionProgress + 2, 3) / 2;

            o.modelGroup.position.lerpVectors(o.startPos, o.targetPos, ease);
            const curScale = THREE.MathUtils.lerp(o.startScale, o.cfg.showcaseScale, ease);
            o.modelGroup.scale.setScalar(curScale);
          } else {
            o.modelGroup.position.copy(o.targetPos);
            o.modelGroup.scale.setScalar(o.cfg.showcaseScale);
          }
          // Slow showcase inspection turntable
          o.modelGroup.rotation.y += 0.35 * step;
        } else {
          // Easing back to orbit
          if (o.transitionProgress < 1.0) {
            o.transitionProgress = Math.min(o.transitionProgress + step / o.transitionDuration, 1.0);
            const ease =
              o.transitionProgress < 0.5
                ? 4 * o.transitionProgress * o.transitionProgress * o.transitionProgress
                : 1 - Math.pow(-2 * o.transitionProgress + 2, 3) / 2;

            o.modelGroup.position.lerpVectors(o.startPos, o.targetPos, ease);
            const curScale = THREE.MathUtils.lerp(o.startScale, o.cfg.orbitalScale, ease);
            o.modelGroup.scale.setScalar(curScale);
          } else {
            o.modelGroup.position.copy(o.targetPos);
            o.modelGroup.scale.setScalar(o.cfg.orbitalScale);
          }
          // Face tangent velocity vector
          const nextAngle = o.angle + 0.05;
          calculateOrbitPosition(o.cfg, nextAngle, _tmpPos);
          o.modelGroup.lookAt(_tmpPos);
        }

        // Update trail buffer (Quality preset)
        if (o.trailLine && o.trailGeo && !o.isSelected) {
          const buf = o.trailBuffer;
          const pos = o.modelGroup.position;
          const head = o.trailHead;

          buf[head * 3] = pos.x;
          buf[head * 3 + 1] = pos.y;
          buf[head * 3 + 2] = pos.z;

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

        m.mesh.position.set(_tmpPos.x, _tmpPos.y + m.altitude, _tmpPos.z);
      }
    },

    setPaused(paused) {
      isPaused = Boolean(paused);
    },

    select(id) {
      selectedOrbiterId = id;
      for (let i = 0; i < orbiters.length; i++) {
        const o = orbiters[i];
        if (o.cfg.id === id) {
          o.isSelected = true;
          o.startPos.copy(o.modelGroup.position);
          o.startScale = o.modelGroup.scale.x;
          o.targetPos.set(...o.cfg.showcaseAnchor);
          o.transitionProgress = 0.0;
        } else if (o.isSelected) {
          o.isSelected = false;
          o.startPos.copy(o.modelGroup.position);
          o.startScale = o.modelGroup.scale.x;
          calculateOrbitPosition(o.cfg, o.angle, o.targetPos);
          o.transitionProgress = 0.0;
        }
      }
    },

    release() {
      selectedOrbiterId = null;
      for (let i = 0; i < orbiters.length; i++) {
        const o = orbiters[i];
        if (o.isSelected) {
          o.isSelected = false;
          o.startPos.copy(o.modelGroup.position);
          o.startScale = o.modelGroup.scale.x;
          calculateOrbitPosition(o.cfg, o.angle, o.targetPos);
          o.transitionProgress = 0.0;
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
      disposeObject3D(layerGroup);
      if (layerGroup.parent) {
        layerGroup.parent.remove(layerGroup);
      }
    },
  };
}
