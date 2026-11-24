import * as THREE from 'three';

/**
 * Cel-Shading (Toon) Engine for "Abandoned But Not Forgotten"
 *
 * Implements lightweight, performant cel-shading using Three.js MeshToonMaterial
 * and a single shared 1D ramp DataTexture across all scene models and UI canvases.
 */

export const TOON_CONFIG = {
  // 4 stepped tones: deep shadow -> mid shadow -> diffuse lit -> highlight
  // Slightly raised shadow floor (55) to prevent pitch-black clipping while preserving sharp comic banding
  tones: [55, 125, 198, 255],
  // 3-tone fallback if needed
  tones3: [65, 160, 255],
  outlineColor: 0x05070c,
  outlineThickness: 0.0030,
  shadowBias: -0.0002,
  normalBias: 0.045,
};

let sharedGradientMap4 = null;
let sharedGradientMap3 = null;
const materialCache = new Map(); // key -> MeshToonMaterial

/**
 * Creates or retrieves the singleton DataTexture ramp.
 * NearestFilter guarantees crisp, stepped comic/anime cel bands with zero mipmap overhead.
 */
export function getSharedGradientMap(toneCount = 4) {
  if (toneCount === 3) {
    if (!sharedGradientMap3) {
      const tones = TOON_CONFIG.tones3;
      const data = new Uint8Array(tones.length * 4);
      for (let i = 0; i < tones.length; i++) {
        const v = tones[i];
        data[i * 4 + 0] = v;
        data[i * 4 + 1] = v;
        data[i * 4 + 2] = v;
        data[i * 4 + 3] = 255;
      }
      const tex = new THREE.DataTexture(data, tones.length, 1, THREE.RGBAFormat);
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      sharedGradientMap3 = tex;
    }
    return sharedGradientMap3;
  }

  if (!sharedGradientMap4) {
    const tones = TOON_CONFIG.tones;
    const data = new Uint8Array(tones.length * 4);
    for (let i = 0; i < tones.length; i++) {
      const v = tones[i];
      data[i * 4 + 0] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, tones.length, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    sharedGradientMap4 = tex;
  }
  return sharedGradientMap4;
}

/**
 * Checks if a material has already been converted to MeshToonMaterial.
 */
export function isToonMaterial(mat) {
  return Boolean(mat && mat.isMeshToonMaterial);
}

/**
 * Converts a MeshStandardMaterial / MeshPhysicalMaterial to MeshToonMaterial,
 * preserving original albedo map, normal map, bump map, emissive, transparency,
 * alpha, and material name for external lookup (e.g. 'Wheels', 'Antenne', 'Seats').
 */
export function convertMaterialToToon(sourceMat, options = {}) {
  if (!sourceMat) return null;

  // If already a toon material, simply ensure the gradientMap is assigned
  if (sourceMat.isMeshToonMaterial) {
    if (!sourceMat.gradientMap) {
      sourceMat.gradientMap = getSharedGradientMap(options.toneCount);
      sourceMat.needsUpdate = true;
    }
    return sourceMat;
  }

  // Do not convert unlit materials (e.g. sprites, HUD line loops, basic glow rings)
  if (!sourceMat.isMeshStandardMaterial && !sourceMat.isMeshPhysicalMaterial && !sourceMat.isMeshLambertMaterial && !sourceMat.isMeshPhongMaterial) {
    return sourceMat;
  }

  // Check cache by UUID or signature
  const cacheKey = sourceMat.uuid;
  if (materialCache.has(cacheKey)) {
    return materialCache.get(cacheKey);
  }

  const gradientMap = options.gradientMap || getSharedGradientMap(options.toneCount || 4);

  const toonMat = new THREE.MeshToonMaterial({
    name: sourceMat.name || '',
    color: sourceMat.color ? sourceMat.color.clone() : new THREE.Color(0xffffff),
    gradientMap,
    map: sourceMat.map || null,
    normalMap: sourceMat.normalMap || null,
    normalScale: sourceMat.normalScale ? sourceMat.normalScale.clone() : new THREE.Vector2(1, 1),
    bumpMap: sourceMat.bumpMap || null,
    bumpScale: sourceMat.bumpScale ?? 1.0,
    emissive: sourceMat.emissive ? sourceMat.emissive.clone() : new THREE.Color(0x000000),
    emissiveMap: sourceMat.emissiveMap || null,
    emissiveIntensity: sourceMat.emissiveIntensity ?? 1.0,
    alphaMap: sourceMat.alphaMap || null,
    transparent: Boolean(sourceMat.transparent),
    opacity: sourceMat.opacity ?? 1.0,
    alphaTest: sourceMat.alphaTest ?? 0,
    depthTest: sourceMat.depthTest ?? true,
    depthWrite: sourceMat.depthWrite ?? true,
    side: sourceMat.side ?? THREE.FrontSide,
    wireframe: Boolean(sourceMat.wireframe),
    fog: sourceMat.fog !== false,
  });

  // Preserve custom PBR metadata in userData for shaders or high-tier sparkle
  toonMat.userData = {
    ...sourceMat.userData,
    sourceUuid: sourceMat.uuid,
    originalMetalness: sourceMat.metalness ?? 0,
    originalRoughness: sourceMat.roughness ?? 1,
    isToonConverted: true,
  };

  // High-tier optional metallic rim / sparkle term for metal parts (gold foil, solar dishes, chassis)
  if (options.enableSparkle && (sourceMat.metalness > 0.45 || (sourceMat.name && /(foil|gold|metal|dish|strut|boom)/i.test(sourceMat.name)))) {
    toonMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        // Subtle stylized metallic rim sparkle (calibrated to prevent highlight blowout)
        #ifdef USE_NORMAL
          vec3 viewDir_ = normalize(vViewPosition);
          float fresnel_ = pow(clamp(1.0 - abs(dot(normalize(vNormal), viewDir_)), 0.0, 1.0), 3.5);
          gl_FragColor.rgb += vec3(fresnel_ * 0.15);
        #endif
        `
      );
    };
  }

  materialCache.set(cacheKey, toonMat);

  // Safely dispose the replaced Three.js material program (NOT the textures, which are reused)
  try {
    sourceMat.dispose();
  } catch {
    // Ignore disposal error
  }

  return toonMat;
}

/**
 * Traverses an Object3D subtree once, converting all standard PBR mesh materials
 * to MeshToonMaterial while preserving shadows, names, and vertex attributes.
 */
export function toonifyModel(root, options = {}) {
  if (!root) return root;

  root.traverse((obj) => {
    if (!obj.isMesh) return;

    // Recompute vertex normals from counter-clockwise triangle winding order
    // to fix inverted normals on solar panel faces (e.g. LADEE orbiter)
    if (obj.geometry && obj.geometry.attributes && obj.geometry.attributes.normal) {
      if (options.recomputeNormals || (obj.material && /solar/i.test(obj.material.name || ''))) {
        obj.geometry.computeVertexNormals();
      }
    }

    if (!obj.material) return;

    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((mat) => convertMaterialToToon(mat, options));
    } else {
      obj.material = convertMaterialToToon(obj.material, options);
    }

    // Ensure solar panels use FrontSide and anti-z-fighting polygon offset
    if (obj.material && /solar/i.test(obj.material.name || '')) {
      obj.material.side = THREE.FrontSide;
      obj.material.polygonOffset = true;
      obj.material.polygonOffsetFactor = -1.0;
      obj.material.polygonOffsetUnits = -2.0;
      obj.material.needsUpdate = true;
    }
  });

  return root;
}

/**
 * Clears cached converted materials (e.g. during scene transitions or unmount).
 */
export function clearToonMaterialCache() {
  materialCache.clear();
}

/**
 * Fits a directional light's shadow camera around the scene and active vehicle.
 * In Ultra and Quality presets, uses an expanded wide-terrain landscape frustum (28m-38m)
 * ensuring full shadow coverage across the terrain, crater rims, rocks, and fleet
 * simultaneously, preventing shadows from popping or disappearing when moving the camera.
 */
export function fitShadowCameraToVehicle(sunLight, vehicle, options = {}) {
  if (!sunLight || !sunLight.shadow || !vehicle) return;
  const isOrbiter = Boolean(vehicle.isOrbiter);
  if (isOrbiter) {
    sunLight.castShadow = false;
    return;
  }

  const pos = vehicle.focusLookAt || vehicle.position || [0, 0, 0];
  const cx = pos[0];
  const cy = pos[1];
  const cz = pos[2];

  const profilePreset = options.preset || options.profile?.preset || 'quality';
  const customSpan = options.shadowSpan || options.profile?.shadowSpan;

  const vehicleBaseSpan =
    vehicle.id === 'apollo-lunar-module' ? 6.5 :
    vehicle.id === 'insight-lander' ? 4.5 :
    vehicle.id === 'viking-lander' ? 4.2 :
    vehicle.id === 'mer-opportunity' ? 3.2 :
    vehicle.id === 'lunar-rover' ? 3.2 :
    vehicle.id === 'ingenuity-helicopter' ? 2.0 : 3.5;

  let halfSpan;
  if (typeof customSpan === 'number' && customSpan > 0) {
    halfSpan = customSpan;
  } else if (profilePreset === 'ultra') {
    // Ultra mode: 38m wide landscape frustum covers the entire visible terrain, crater ridges,
    // rocks, and neighboring parked fleet simultaneously with a 4096px shadow map.
    halfSpan = 38.0;
  } else if (profilePreset === 'quality') {
    // Quality mode: 28m wide landscape frustum with a 2048px shadow map.
    halfSpan = 28.0;
  } else if (profilePreset === 'balanced') {
    // Balanced mode: 18m frustum with 1024px shadow map.
    halfSpan = 18.0;
  } else {
    // Performance mode: tight vehicle frustum
    halfSpan = Math.max(8.0, vehicleBaseSpan * 1.5);
  }

  const cam = sunLight.shadow.camera;
  cam.left = -halfSpan;
  cam.right = halfSpan;
  cam.top = halfSpan;
  cam.bottom = -halfSpan;

  if (sunLight.target) {
    sunLight.target.position.set(cx, cy, cz);
    sunLight.target.updateMatrixWorld(true);
  }

  // Consistent 45-degree sun azimuth and ~36-degree elevation across all surfaces
  const sunRelX = 26;
  const sunRelY = 20;
  const sunRelZ = 20;

  sunLight.position.set(cx + sunRelX, cy + sunRelY, cz + sunRelZ);
  cam.near = 1.0;
  cam.far = 140.0;
  cam.updateProjectionMatrix();

  sunLight.shadow.bias = TOON_CONFIG.shadowBias;
  sunLight.shadow.normalBias = TOON_CONFIG.normalBias;
}

let sharedOutlineMaterial = null;

/**
 * Creates or retrieves the singleton inverted-hull ShaderMaterial.
 * Front faces are culled out via BackSide; vertex extrusion along normals
 * scaled by view-space depth creates uniform, crisp comic ink linework.
 */
export function getSharedOutlineMaterial(color = TOON_CONFIG.outlineColor) {
  if (!sharedOutlineMaterial) {
    sharedOutlineMaterial = new THREE.ShaderMaterial({
      name: 'ToonHeroOutlineMaterial',
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uThickness: { value: TOON_CONFIG.outlineThickness },
      },
      vertexShader: `
        uniform float uThickness;
        void main() {
          vec3 n = normal;
          #ifdef USE_NORMAL
            n = normalize(normal);
          #endif
          vec3 mvNorm = normalize(normalMatrix * n);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          float distFactor = clamp(-mvPos.z * 0.22, 0.35, 3.2);
          mvPos.xyz += mvNorm * (uThickness * distFactor);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        void main() {
          gl_FragColor = vec4(uColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthTest: true,
      depthWrite: true,
      toneMapped: false,
    });
  } else {
    sharedOutlineMaterial.uniforms.uColor.value.set(color);
  }
  return sharedOutlineMaterial;
}

/**
 * Attaches or reveals inverted-hull outline shells on the hero spacecraft ONLY.
 * Reuses existing mesh geometries with zero memory overhead.
 */
export function attachHeroOutline(model, boundingRadius = 1.0, color = TOON_CONFIG.outlineColor) {
  if (!model) return;
  const mat = getSharedOutlineMaterial(color);

  const scale = Number(boundingRadius) || 1.0;
  const targetThickness = Math.max(0.0018, Math.min(0.0045, TOON_CONFIG.outlineThickness / Math.sqrt(scale)));
  mat.uniforms.uThickness.value = targetThickness;

  model.traverse((child) => {
    if (child.isMesh && child.geometry && child.name !== '__hero_outline__') {
      if (!child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals();
      }
      let outlineMesh = child.children?.find((c) => c.name === '__hero_outline__');
      if (!outlineMesh) {
        outlineMesh = new THREE.Mesh(child.geometry, mat);
        outlineMesh.name = '__hero_outline__';
        outlineMesh.castShadow = false;
        outlineMesh.receiveShadow = false;
        outlineMesh.renderOrder = (child.renderOrder || 0) + 1;
        child.add(outlineMesh);
      }
      outlineMesh.visible = true;
    }
  });
}

/**
 * Hides inverted-hull outlines on a spacecraft.
 */
export function detachHeroOutline(model) {
  if (!model) return;
  model.traverse((child) => {
    if (child.isMesh && child.name === '__hero_outline__') {
      child.visible = false;
    }
  });
}

/**
 * Manages the single active hero outline, ensuring only the currently
 * inspected craft displays outlines and previous crafts are cleanly un-outlined.
 */
export function updateHeroOutline(previousModel, currentModel, options = {}) {
  if (previousModel && previousModel !== currentModel) {
    detachHeroOutline(previousModel);
  }
  if (options.enabled !== false && currentModel) {
    attachHeroOutline(currentModel, options.boundingRadius, options.color);
  } else if (currentModel) {
    detachHeroOutline(currentModel);
  }
}
