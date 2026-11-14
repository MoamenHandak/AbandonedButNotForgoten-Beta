import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LANGUAGES,
  DEFAULT_SETTINGS,
  GRAPHICS_PRESETS,
  GRAPHICS_PRESET_ORDER,
  normalizeSettings,
  normalizeGraphicsQuality,
} from '../constants/settings';
import { getTranslations } from '../constants/translations';
import { getDeviceQualityProfile } from '../utils/modelCache';

export { LANGUAGES, DEFAULT_SETTINGS };

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings }) {
  const [localSettings, setLocalSettings] = useState(() =>
    normalizeSettings(settings || DEFAULT_SETTINGS)
  );
  const graphicsBtnRefs = useRef({});
  const deviceProfile = useMemo(() => getDeviceQualityProfile(), []);

  useEffect(() => {
    if (settings) {
      setLocalSettings(normalizeSettings(settings));
    }
  }, [settings]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, localSettings]);

  if (!isOpen) return null;

  const currentLangIndex = Math.max(
    0,
    LANGUAGES.findIndex((l) => l.code === localSettings.language)
  );
  const currentLang = LANGUAGES[currentLangIndex] || LANGUAGES[0];
  const t = getTranslations(currentLang.code).settings;
  const selectedQuality = normalizeGraphicsQuality(localSettings.graphicsQuality);
  const selectedPreset = GRAPHICS_PRESETS[selectedQuality];

  const stepLanguage = (delta) => {
    const nextIdx = (currentLangIndex + delta + LANGUAGES.length) % LANGUAGES.length;
    const nextLang = LANGUAGES[nextIdx];
    const updated = { ...localSettings, language: nextLang.code };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    const updated = { ...localSettings, masterVolume: val };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleGraphicsChange = (presetId) => {
    const nextPreset = normalizeGraphicsQuality(presetId);
    const updated = { ...localSettings, graphicsQuality: nextPreset };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleGraphicsKeyDown = (e) => {
    const currentIndex = Math.max(0, GRAPHICS_PRESET_ORDER.indexOf(selectedQuality));
    const isRtl = currentLang.dir === 'rtl';
    let nextIndex = null;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + (isRtl ? -1 : 1) + GRAPHICS_PRESET_ORDER.length) % GRAPHICS_PRESET_ORDER.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex + (isRtl ? 1 : -1) + GRAPHICS_PRESET_ORDER.length) % GRAPHICS_PRESET_ORDER.length;
    } else if (e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % GRAPHICS_PRESET_ORDER.length;
    } else if (e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + GRAPHICS_PRESET_ORDER.length) % GRAPHICS_PRESET_ORDER.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = GRAPHICS_PRESET_ORDER.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextId = GRAPHICS_PRESET_ORDER[nextIndex];
      handleGraphicsChange(nextId);
      graphicsBtnRefs.current[nextId]?.focus();
    }
  };

  const handleClose = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div
      className="ui-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setTitle"
      dir={currentLang.dir}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="ui-panel">
        <h2 id="setTitle">{t.title}</h2>

        <div className="ui-group">
          <label className="ui-label" htmlFor="volumeSlider">
            {t.volume}
          </label>
          <div className="ui-controls">
            <input
              type="range"
              id="volumeSlider"
              min="0"
              max="100"
              value={localSettings.masterVolume}
              style={{ '--fill': `${localSettings.masterVolume}%` }}
              onChange={handleVolumeChange}
            />
            <output className="ui-value" htmlFor="volumeSlider">
              {localSettings.masterVolume}%
            </output>
          </div>
        </div>

        <div className="ui-group" role="group" aria-labelledby="lblLang">
          <span className="ui-label" id="lblLang">
            {t.language}
          </span>
          <div className="ui-lang" dir="ltr">
            <button
              className="ui-arrow"
              type="button"
              onClick={() => stepLanguage(-1)}
              aria-label="Previous language"
            >
              &lsaquo;
            </button>
            <span id="selectedOption" aria-live="polite">
              {currentLang.label}
            </span>
            <button
              className="ui-arrow"
              type="button"
              onClick={() => stepLanguage(1)}
              aria-label="Next language"
            >
              &rsaquo;
            </button>
          </div>
        </div>

        {/* Unified Action Buttons matching template (media_1794609689865_544d7e8b) */}
        <div className="ui-settings-actions">
          <button
            type="button"
            className="ui-btn ui-action-btn"
            onClick={() => {
              const currentIdx = GRAPHICS_PRESET_ORDER.indexOf(selectedQuality);
              const nextPreset = GRAPHICS_PRESET_ORDER[(currentIdx + 1) % GRAPHICS_PRESET_ORDER.length];
              handleGraphicsChange(nextPreset);
            }}
          >
            {t.graphicsBtn || 'Graphics'}: {t.presets?.[selectedQuality]?.label || selectedPreset.label}
          </button>

          <button
            type="button"
            className="ui-btn ui-action-btn"
            onClick={() => {
              const nextMute = !localSettings.muteAudio;
              const updated = { ...localSettings, muteAudio: nextMute };
              setLocalSettings(updated);
              onSaveSettings(updated);
            }}
          >
            {t.audioBtn || 'Audio'}: {localSettings.muteAudio ? 'Muted' : `${localSettings.masterVolume}%`}
          </button>

          <button
            className="ui-btn ui-action-btn"
            id="setBack"
            type="button"
            onClick={handleClose}
          >
            {t.back}
          </button>
        </div>
      </div>
    </div>
  );
}
