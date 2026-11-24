import * as THREE from 'three';

/**
 * Universal Camera Auto-Fit Engine for Handheld & Desktop
 * Computes the exact camera distance and framing so objects fit comfortably with margin
 * across portrait phones, landscape phones, tablets, and desktop displays.
 *
 * Mathematical core:
 * In portrait, hFov is the limiting angle (narrow width).
 * In landscape, vFov is the limiting angle (narrow height).
 * distance = radius / sin(min(vFov, hFov) / 2) * margin
 */

export function computeFovHalfAngles(camera) {
  const vFovRad = THREE.MathUtils.degToRad(camera.fov || 45);
  const aspect = camera.aspect || (window.innerWidth / window.innerHeight);
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
  const minFovHalf = Math.min(vFovRad / 2, hFovRad / 2);
  return { vFovRad, hFovRad, minFovHalf, aspect };
}

/**
 * Calculate camera distance required to fit a bounding radius
 */
export function calculateFitDistance(objectOrRadius, camera, margin = 1.18) {
  let radius = 2.5;

  if (typeof objectOrRadius === 'number') {
    radius = objectOrRadius;
  } else if (objectOrRadius && objectOrRadius.isObject3D) {
    const box = new THREE.Box3().setFromObject(objectOrRadius);
    if (!box.isEmpty()) {
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      radius = sphere.radius > 0.05 ? sphere.radius : 2.5;
    }
  }

  const { minFovHalf } = computeFovHalfAngles(camera);
  const sinAngle = Math.sin(minFovHalf);
  const distance = sinAngle > 0.001 ? (radius / sinAngle) * margin : radius * 3.5;

  return { distance, radius };
}

/**
 * Computes bounding-box auto-fit camera distance and position for any 3D model.
 * Formula: distance = (maxDim / 2) / sin(limitingFov / 2) * padding
 * where padding ~ 1.35 to 1.45 ensures 60% - 70% fill of the screen.
 */
export function computeBoundingFitCamera(object3D, camera, options = {}) {
  const {
    padding = 1.40, // 60-70% view fill
    elevationAngle = 0.35, // ~20 degrees elevation
    azimuthAngle = 0.65,   // ~37 degrees azimuth
    targetOffset = new THREE.Vector3(0, 0, 0),
  } = options;

  let maxDim = 2.0;
  let center = new THREE.Vector3(0, 0, 0);

  if (object3D && object3D.isObject3D) {
    const box = new THREE.Box3().setFromObject(object3D);
    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      center = box.getCenter(new THREE.Vector3());
      maxDim = Math.max(size.x, size.y, size.z, 0.5);
    }
  }

  const { minFovHalf } = computeFovHalfAngles(camera);
  const sinHalf = Math.sin(minFovHalf);
  const distance = Math.max(0.8, ((maxDim / 2) / Math.max(0.001, sinHalf)) * padding);
  const target = center.clone().add(targetOffset);

  const camPos = new THREE.Vector3(
    target.x + distance * Math.cos(elevationAngle) * Math.sin(azimuthAngle),
    target.y + distance * Math.sin(elevationAngle),
    target.z + distance * Math.cos(elevationAngle) * Math.cos(azimuthAngle)
  );

  const minDistance = Math.max(0.6, (maxDim / 2) * 1.15);
  const maxDistance = Math.max(distance * 3.2, 25.0);

  return {
    position: [camPos.x, camPos.y, camPos.z],
    target: [target.x, target.y, target.z],
    distance,
    minDistance,
    maxDistance,
  };
}

/**
 * Computes ideal Orbit Overview camera framing
 * Fits the whole planet globe + orbit ring + orbiter in the viewport
 * with the planet diameter taking up ~50-55% of the portrait viewport width.
 */
export function getOrbitOverviewCamera({
  planetRadius = 26.0,
  orbitRadius = 46.0,
  inclination = [0.4, 0.2, 0.1],
  camera,
  isMobile = false,
}) {
  const { minFovHalf, aspect } = computeFovHalfAngles(camera);

  // Group bounding radius encompasses the planet globe and the furthest orbital excursion
  const groupRadius = Math.max(orbitRadius * 1.35, planetRadius * 2.2);
  const margin = isMobile ? 1.25 : 1.35;

  // Compute base distance to fit entire orbit ellipse
  const distance = (groupRadius / Math.sin(minFovHalf)) * margin;

  // Place camera 24-28 degrees above the orbital plane for dramatic crescent horizon and clean orbital track clearance
  const elevAngle = THREE.MathUtils.degToRad(isMobile ? 28 : 24);
  const azimuthAngle = THREE.MathUtils.degToRad(38);

  const camX = distance * Math.cos(elevAngle) * Math.sin(azimuthAngle);
  const camY = distance * Math.sin(elevAngle) + (isMobile ? planetRadius * 0.15 : 0);
  const camZ = distance * Math.cos(elevAngle) * Math.cos(azimuthAngle);

  // Subtle lookAt offset to center composition on screen
  const lookAt = [0, isMobile ? planetRadius * 0.05 : 0, 0];

  return {
    camPos: [camX, camY, camZ],
    lookAt,
    distance,
    groupRadius,
  };
}

/**
 * Animates camera smoothly to a target position & lookAt
 */
export function animateCameraTo(camera, controls, targetCamPos, targetLookAt, durationMs = 450, onComplete = null) {
  if (!camera || !controls) return null;

  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();

  const endPos = Array.isArray(targetCamPos)
    ? new THREE.Vector3(...targetCamPos)
    : targetCamPos.clone();

  const endTarget = Array.isArray(targetLookAt)
    ? new THREE.Vector3(...targetLookAt)
    : targetLookAt.clone();

  let startTime = null;
  let animId = null;

  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const step = (now) => {
    if (!startTime) startTime = now;
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / durationMs, 1.0);
    const eased = easeInOutCubic(progress);

    camera.position.lerpVectors(startPos, endPos, eased);
    controls.target.lerpVectors(startTarget, endTarget, eased);
    controls.update();

    if (progress < 1.0) {
      animId = requestAnimationFrame(step);
    } else {
      camera.position.copy(endPos);
      controls.target.copy(endTarget);
      controls.update();
      if (onComplete) onComplete();
    }
  };

  animId = requestAnimationFrame(step);

  return () => {
    if (animId) cancelAnimationFrame(animId);
  };
}
