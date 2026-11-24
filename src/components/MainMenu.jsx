import React, { useEffect } from 'react';
import { Settings, Users, ShieldCheck } from 'lucide-react';
import { resolveAssetUrl } from '../utils/modelCache';
import { useActiveLanguage } from '../data/craftStories';
import { getTranslations } from '../constants/translations';

export default function MainMenu({
  isEntered,
  isReady = true,
  onEnter,
  onStartJourney,
  onOpenSpacecrafts,
  onOpenSettings,
  onOpenCredits,
  onOpenSources,
}) {
  const activeLang = useActiveLanguage();
  const t = getTranslations(activeLang).menu;

  // Space Ambient Music for Main Menu
  useEffect(() => {
    if (!isReady) return;
    window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'menu_music' } }));
    return () => {
      window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'menu_music_stop' } }));
    };
  }, [isReady]);

  // Title screen -> menu keydown and pointerdown listeners (only after loader has finished)
  useEffect(() => {
    if (isEntered || !isReady) return;

    function handleKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'menu_music' } }));
      onEnter(true);
    }

    function handlePointer() {
      window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'menu_music' } }));
      onEnter(false);
    }

    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('pointerdown', handlePointer, true);

    return () => {
      window.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('pointerdown', handlePointer, true);
    };
  }, [isEntered, isReady, onEnter]);

  return (
    <>
      {/* STEP 1: Title screen (press any key to continue) */}
      <section
        id="nms-splash"
        className="nms-splash"
        aria-label="Title screen"
        dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
        onClick={() => {
          if (!isEntered) onEnter(false);
        }}
      >
        <p className="nms-splash-kicker">{t.splashKicker || 'A little space adventure'}</p>
        <p className="nms-splash-title" role="heading" aria-level={1}>
          {t.splashTitle || 'ABANDONED BUT NOT FORGOTTEN'}
        </p>
        <p className="nms-splash-prompt">
          <span className="nms-prompt-key">{t.pressKey || 'Press any key to continue'}</span>
          <span className="nms-prompt-touch">{t.tapToContinue || 'Tap to continue'}</span>
        </p>
        <p className="nms-splash-foot">{t.splashFoot || 'Every machine has a story'}</p>
      </section>

      {/* STEP 2: Main Navigation Menu (revealed after title screen) */}
      <header className="nms-header" dir={activeLang === 'ar' ? 'rtl' : 'ltr'}>
        <h1 className="nms-title">{t.splashTitle || 'ABANDONED BUT NOT FORGOTTEN'}</h1>
        <span className="nms-diamond" aria-hidden="true" />
      </header>

      {/* Two big tiles: Start Journey & Spacecrafts */}
      <nav className="nms-tiles" aria-label="Main Navigation" dir={activeLang === 'ar' ? 'rtl' : 'ltr'}>
        <button
          id="btn-start-journey"
          type="button"
          className="nms-tile nms-tile-moon"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'menu_music_stop' } }));
            onStartJourney();
          }}
        >
          <span className="nms-tile-art">
            <model-viewer
              id="moon-viewer"
              src={resolveAssetUrl('/models/astronaut_helmet-opt.glb')}
              environment-image={resolveAssetUrl('/assets/space_sun.hdr')}
              alt="Astronaut Helmet 3D model"
              auto-rotate=""
              rotation-per-second="10deg"
              camera-orbit="0deg 82deg 105%"
              camera-target="auto auto auto"
              field-of-view="32deg"
              disable-zoom=""
              disable-pan=""
              interaction-prompt="none"
              shadow-intensity="1.2"
              shadow-softness="0.5"
              exposure="1.05"
              loading="eager"
            />
          </span>
          <span className="nms-tile-pin" aria-hidden="true" />
          <span className="nms-tile-label">
            <strong>{t.startJourney || 'Start Journey'}</strong>
            <small>{t.startJourneyDesc || 'Open the logbook and find the forgotten machines'}</small>
          </span>
        </button>

        <button
          id="btn-open-crafts"
          type="button"
          className="nms-tile nms-tile-mars"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'menu_music_stop' } }));
            onOpenSpacecrafts();
          }}
        >
          <span className="nms-tile-art">
            <model-viewer
              id="mars-viewer"
              src={resolveAssetUrl('/models/lunar_rover-opt.glb')}
              environment-image={resolveAssetUrl('/assets/space_sun.hdr')}
              alt="Apollo Lunar Roving Vehicle 3D model"
              auto-rotate=""
              rotation-per-second="18deg"
              camera-orbit="40deg 75deg 105%"
              camera-target="0m 0.6m 0m"
              field-of-view="35deg"
              disable-zoom=""
              disable-pan=""
              interaction-prompt="none"
              shadow-intensity="1.5"
              shadow-softness="0.4"
              exposure="1.0"
              loading="eager"
            />
          </span>
          <span className="nms-tile-pin" aria-hidden="true" />
          <span className="nms-tile-label">
            <strong>{t.spacecrafts || 'Spacecrafts'}</strong>
            <small>{t.spacecraftsDesc || 'Inspect every rover and lander in 3D'}</small>
          </span>
        </button>
      </nav>

      {/* Bottom-left small list */}
      <ul className="nms-side-list" dir={activeLang === 'ar' ? 'rtl' : 'ltr'}>
        <li>
          <button
            id="btn-open-settings"
            type="button"
            className="nms-side-item"
            onClick={onOpenSettings}
          >
            <Settings size={18} style={{ width: 18, height: 18 }} aria-hidden="true" />
            <span>
              <strong>{t.settings || 'Settings'}</strong>
              <small>{t.settingsDesc || 'Audio and language'}</small>
            </span>
          </button>
        </li>
        <li>
          <button
            id="btn-open-credits"
            type="button"
            className="nms-side-item"
            onClick={onOpenCredits}
          >
            <Users size={18} style={{ width: 18, height: 18 }} aria-hidden="true" />
            <span>
              <strong>{t.credits || 'Credits'}</strong>
              <small>{t.creditsDesc || 'The crew behind the game'}</small>
            </span>
          </button>
        </li>
        {onOpenSources && (
          <li>
            <button
              id="btn-open-sources"
              type="button"
              className="nms-side-item"
              onClick={onOpenSources}
            >
              <ShieldCheck size={18} style={{ width: 18, height: 18 }} aria-hidden="true" />
              <span>
                <strong>{t.sources || 'Sources'}</strong>
                <small>{t.sourcesDesc || 'NASA telemetry and archives'}</small>
              </span>
            </button>
          </li>
        )}
      </ul>

      {/* Bottom-right keyboard navigation hint */}
      <p className="nms-hint" aria-hidden="true" dir={activeLang === 'ar' ? 'rtl' : 'ltr'}>
        <span className="nms-hint-key">Enter</span> {t.navHint || 'to select and'} <span className="nms-hint-key">Tab</span> {t.navTabHint || 'to move'}
      </p>
    </>
  );
}
