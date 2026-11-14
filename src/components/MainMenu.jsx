import React, { useEffect, useState } from 'react';
import { Settings, Users, ShieldCheck } from 'lucide-react';
import ModelPreviewCanvas from './ModelPreviewCanvas';
import { prefetchGLB } from '../utils/modelCache';
import { useActiveLanguage } from '../data/craftStories';
import { getTranslations } from '../constants/translations';

export default function MainMenu({
  isEntered,
  paused = false,
  onEnter,
  onStartJourney,
  onOpenSpacecrafts,
  onOpenSettings,
  onOpenCredits,
  onOpenSources
}) {
  const activeLang = useActiveLanguage();
  const t = getTranslations(activeLang).menu;

  // Stagger mounting the two menu tile WebGL canvases until after the splash->menu transition settles
  const [tileStage, setTileStage] = useState(0);

  // Space Ambient Music for Main Menu (Item 7)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'menu_music' } }));
    return () => {
      window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'menu_music_stop' } }));
    };
  }, []);

  useEffect(() => {
    if (!isEntered) {
      setTileStage(0);
      return;
    }
    const t1 = setTimeout(() => setTileStage((s) => Math.max(s, 1)), 720);
    const t2 = setTimeout(() => setTileStage(2), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isEntered]);

  // Warm light menu tile models quietly once splash is painted so tile reveal is instant
  useEffect(() => {
    const timer = setTimeout(() => {
      prefetchGLB('/models/astronaut_helmet-opt.glb');
      prefetchGLB('/models/mer_rover-opt.glb');
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isEntered) return;

    function handleKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      e.preventDefault();
      onEnter(true);
    }

    function handlePointer() {
      onEnter(false);
    }

    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('pointerdown', handlePointer, true);

    return () => {
      window.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('pointerdown', handlePointer, true);
    };
  }, [isEntered, onEnter]);

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
        <p className="nms-splash-kicker">{t.splashKicker}</p>
        <p className="nms-splash-title" role="heading" aria-level={1}>
          {t.splashTitle}
        </p>
        <p className="nms-splash-prompt">
          <span className="nms-prompt-key">{t.pressKey}</span>
          <span className="nms-prompt-touch">{t.tapToContinue}</span>
        </p>
        <p className="nms-splash-foot">{t.splashFoot}</p>
      </section>

      {/* STEP 2: Main Navigation Menu */}
      <header className="nms-header" dir={activeLang === 'ar' ? 'rtl' : 'ltr'}>
        <h1 className="nms-title">{t.splashTitle}</h1>
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
            {isEntered && tileStage >= 1 && (
              <ModelPreviewCanvas
                id="moon-viewer"
                src="/models/astronaut_helmet-opt.glb"
                alt="Astronaut Helmet"
                autoRotate
                rotationPerSecond={6}
                exposure={1.05}
                paused={!isEntered || paused}
              />
            )}
          </span>
          <span className="nms-tile-pin" aria-hidden="true" />
          <span className="nms-tile-label">
            <strong>{t.startJourney}</strong>
            <small>{t.startJourneyDesc}</small>
          </span>
        </button>

        <button
          id="btn-open-crafts"
          type="button"
          className="nms-tile nms-tile-mars"
          onClick={onOpenSpacecrafts}
        >
          <span className="nms-tile-art">
            {isEntered && tileStage >= 2 && (
              <ModelPreviewCanvas
                id="mars-viewer"
                src="/models/mer_rover-opt.glb"
                alt="Mars Exploration Rover"
                autoRotate
                rotationPerSecond={-6}
                exposure={1.1}
                paused={!isEntered || paused}
              />
            )}
          </span>
          <span className="nms-tile-pin" aria-hidden="true" />
          <span className="nms-tile-label">
            <strong>{t.spacecrafts}</strong>
            <small>{t.spacecraftsDesc}</small>
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
            <Settings size={18} aria-hidden="true" />
            <span>
              <strong>{t.settings}</strong>
              <small>{t.settingsDesc}</small>
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
            <Users size={18} aria-hidden="true" />
            <span>
              <strong>{t.credits}</strong>
              <small>{t.creditsDesc}</small>
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
              <ShieldCheck size={18} aria-hidden="true" />
              <span>
                <strong>{t.sources}</strong>
                <small>{t.sourcesDesc}</small>
              </span>
            </button>
          </li>
        )}
      </ul>

      {/* Bottom-right keyboard navigation hint */}
      <p className="nms-hint" aria-hidden="true" dir={activeLang === 'ar' ? 'rtl' : 'ltr'}>
        <span className="nms-hint-key">Enter</span> {t.navHint}
      </p>
    </>
  );
}
