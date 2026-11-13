export const SETTINGS_STORAGE_KEY = 'abnf_game_settings';

export const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
];

export const GRAPHICS_PRESETS = {
  quality: {
    id: 'quality',
    label: 'Quality',
    description: 'Full pixel ratio cap (up to 1.5x), 2048px soft shadows, antialiasing, and full starfield.',
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    description: '1.0x pixel ratio cap, 1024px soft shadows, antialiasing, and moderate starfield density.',
  },
  performance: {
    id: 'performance',
    label: 'Performance',
    description: '0.75x render scale, shadows disabled, lighter starfield, and antialiasing off on next 3D open.',
  },
};

export const GRAPHICS_PRESET_ORDER = ['quality', 'balanced', 'performance'];

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

  if (preset === 'performance') {
    return {
      preset,
      isConstrained: Boolean(base.isConstrained),
      maxDpr: 0.75,
      shadowSize: 512,
      shadowsEnabled: false,
      antialias: false,
      starScale: 0.4,
      contactShadowEnabled: true,
      contactShadowScale: 0.55,
    };
  }

  if (preset === 'balanced') {
    return {
      preset,
      isConstrained: Boolean(base.isConstrained),
      maxDpr: Math.min(1.0, base.maxDpr),
      shadowSize: Math.min(1024, base.shadowSize),
      shadowsEnabled: true,
      antialias: base.antialias,
      starScale: 0.7,
      contactShadowEnabled: true,
      contactShadowScale: 0.85,
    };
  }

  return {
    preset: 'quality',
    isConstrained: Boolean(base.isConstrained),
    maxDpr: base.maxDpr,
    shadowSize: base.shadowSize,
    shadowsEnabled: true,
    antialias: base.antialias,
    starScale: base.isConstrained ? 0.5 : 1.0,
    contactShadowEnabled: true,
    contactShadowScale: 1.0,
  };
}

/** Computes the clamped backing pixel ratio for a resolved graphics profile. */
export function getEffectivePixelRatio(profile) {
  if (typeof window === 'undefined') return 1;
  const nativeDpr = window.devicePixelRatio || 1;
  const cap = profile?.maxDpr || 1.5;
  return Math.min(nativeDpr, cap);
}
