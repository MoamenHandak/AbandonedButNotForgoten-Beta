export const SETTINGS_STORAGE_KEY = 'abnf_game_settings';

export const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

export const GRAPHICS_PRESETS = {
  ultra: {
    id: 'ultra',
    label: 'Ultra',
    description: 'Cinematic cel-shading, 4096px landscape shadows across terrain & fleet, crescent Earth terminator, and dynamic atmospheric rim lighting.',
  },
  quality: {
    id: 'quality',
    label: 'Quality',
    description: 'High pixel ratio, 2048px shadows, cel-shading with hero outlines and metallic sparkle.',
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    description: '1.0x pixel ratio, 1024px shadows, cel-shading with hero outlines on inspected craft.',
  },
  performance: {
    id: 'performance',
    label: 'Performance',
    description: 'Fast cel-shading, contact shadows, optimized for smooth frame rates on mobile.',
  },
};

export const GRAPHICS_PRESET_ORDER = ['ultra', 'quality', 'balanced', 'performance'];

export const DEFAULT_SETTINGS = {
  language: 'en',
  masterVolume: 75,
  musicVolume: 70,
  sfxVolume: 80,
  muteAudio: false,
  graphicsQuality: 'quality',
};

/** Validates a graphics quality key, falling back to 'quality'. */
export function normalizeGraphicsQuality(value) {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(GRAPHICS_PRESETS, value)
    ? value
    : DEFAULT_SETTINGS.graphicsQuality;
}

/** Validates and fills missing fields from stored or updated settings objects. */
export function normalizeSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const validLang = LANGUAGES.some((lang) => lang.code === src.language)
    ? src.language
    : DEFAULT_SETTINGS.language;

  const clampVolume = (val, fallback) => {
    const num = Number(val);
    return Number.isFinite(num) ? Math.min(100, Math.max(0, Math.round(num))) : fallback;
  };

  return {
    language: validLang,
    masterVolume: clampVolume(src.masterVolume, DEFAULT_SETTINGS.masterVolume),
    musicVolume: clampVolume(src.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clampVolume(src.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    muteAudio: typeof src.muteAudio === 'boolean' ? src.muteAudio : DEFAULT_SETTINGS.muteAudio,
    graphicsQuality: normalizeGraphicsQuality(src.graphicsQuality),
  };
}

/** Reads and normalizes persisted settings from localStorage safely. */
export function readStoredSettings() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Resolves effective Three.js renderer parameters for a graphics preset
 * combined with detected device hardware capability hints.
 */
export function resolveGraphicsProfile(presetKey, deviceProfile) {
  const preset = normalizeGraphicsQuality(presetKey);
  const base = deviceProfile || {
    isConstrained: false,
    maxDpr: 1.5,
    shadowSize: 2048,
    antialias: true,
  };

  if (preset === 'ultra') {
    return {
      preset,
      isConstrained: Boolean(base.isConstrained),
      maxDpr: Math.min(2.0, base.isConstrained ? 1.75 : 2.0),
      shadowSize: 4096,
      shadowsEnabled: true,
      shadowMapType: 'PCFSoftShadowMap',
      wideTerrainShadows: true,
      terrainSelfShadows: true,
      celEarthShading: true,
      enhancedLighting: true,
      autoUpdateShadows: true,
      toonMaterials: true,
      outlinesEnabled: true,
      sparkleEnabled: true,
      antialias: true,
      starScale: base.isConstrained ? 0.75 : 1.25,
      contactShadowEnabled: true,
      contactShadowScale: 1.0,
      shadowSpan: 38.0,
    };
  }

  if (preset === 'performance') {
    return {
      preset,
      isConstrained: Boolean(base.isConstrained),
      maxDpr: Math.min(1.0, base.maxDpr ?? 1.0),
      shadowSize: 512,
      shadowsEnabled: false,
      shadowMapType: 'BasicShadowMap',
      wideTerrainShadows: false,
      terrainSelfShadows: false,
      celEarthShading: false,
      enhancedLighting: false,
      autoUpdateShadows: false,
      toonMaterials: true,
      outlinesEnabled: false,
      sparkleEnabled: false,
      antialias: false,
      starScale: 0.4,
      contactShadowEnabled: true,
      contactShadowScale: 0.65,
      shadowSpan: 8.0,
    };
  }

  if (preset === 'balanced') {
    return {
      preset,
      isConstrained: Boolean(base.isConstrained),
      maxDpr: Math.min(1.25, base.maxDpr),
      shadowSize: Math.min(1024, base.shadowSize),
      shadowsEnabled: true,
      shadowMapType: 'PCFShadowMap',
      wideTerrainShadows: false,
      terrainSelfShadows: true,
      celEarthShading: true,
      enhancedLighting: false,
      autoUpdateShadows: false,
      toonMaterials: true,
      outlinesEnabled: true,
      sparkleEnabled: false,
      antialias: base.antialias,
      starScale: 0.7,
      contactShadowEnabled: true,
      contactShadowScale: 0.85,
      shadowSpan: 18.0,
    };
  }

  return {
    preset: 'quality',
    isConstrained: Boolean(base.isConstrained),
    maxDpr: Math.min(2.0, base.isConstrained ? 1.5 : 2.0),
    shadowSize: base.shadowSize || 2048,
    shadowsEnabled: true,
    shadowMapType: 'PCFSoftShadowMap',
    wideTerrainShadows: true,
    terrainSelfShadows: true,
    celEarthShading: true,
    enhancedLighting: true,
    autoUpdateShadows: true,
    toonMaterials: true,
    outlinesEnabled: true,
    sparkleEnabled: true,
    antialias: base.antialias,
    starScale: base.isConstrained ? 0.5 : 1.0,
    contactShadowEnabled: true,
    contactShadowScale: 1.0,
    shadowSpan: 28.0,
  };
}

/** Computes the clamped backing pixel ratio for a resolved graphics profile. */
export function getEffectivePixelRatio(profile) {
  if (typeof window === 'undefined') return 1;
  const nativeDpr = window.devicePixelRatio || 1;
  const cap = profile?.maxDpr || 1.5;
  return Math.min(nativeDpr, cap);
}
