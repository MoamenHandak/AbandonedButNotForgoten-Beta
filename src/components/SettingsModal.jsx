import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LANGUAGES,
  DEFAULT_SETTINGS,
  GRAPHICS_PRESETS,
  GRAPHICS_PRESET_ORDER,
  normalizeSettings,
  normalizeGraphicsQuality,
} from '../constants/settings';
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
        <h2 id="setTitle">SETTINGS</h2>

        <div className="ui-group">
          <label className="ui-label" htmlFor="volumeSlider">
            MASTER VOLUME
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

        <div className="ui-group">
          <div className="ui-label-row">
            <span className="ui-label" id="lblGraphics">
              GRAPHICS QUALITY
            </span>
            {deviceProfile.isConstrained && (
              <span className="ui-device-hint" title="Hardware capability suggestion">
                Performance suggested
              </span>
            )}
          </div>
          <div
            className="ui-segmented"
            role="radiogroup"
            aria-labelledby="lblGraphics"
            onKeyDown={handleGraphicsKeyDown}
          >
            {GRAPHICS_PRESET_ORDER.map((presetId) => {
              const preset = GRAPHICS_PRESETS[presetId];
              const isSelected = selectedQuality === preset.id;
              return (
                <button
                  key={preset.id}
                  ref={(el) => {
                    graphicsBtnRefs.current[preset.id] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  className={`ui-seg-btn${isSelected ? ' is-active' : ''}`}
                  data-preset={preset.id}
                  onClick={() => handleGraphicsChange(preset.id)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <p className="ui-preset-desc" aria-live="polite">
            {selectedPreset.description}
          </p>
          <p className="ui-preset-note">
            Resolution, shadows &amp; stars update live; antialiasing applies on next 3D view.
          </p>
        </div>

        <div className="ui-group" role="group" aria-labelledby="lblLang">
          <span className="ui-label" id="lblLang">
            LANGUAGE
          </span>
          <div className="ui-lang">
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

        <button
          className="ui-btn"
          id="setBack"
          type="button"
          onClick={handleClose}
        >
          BACK
        </button>
      </div>
    </div>
  );
}
