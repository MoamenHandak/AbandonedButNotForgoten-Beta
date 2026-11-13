import React, { useEffect, useState } from 'react';
import { Settings, Users, ShieldCheck } from 'lucide-react';
import ModelPreviewCanvas from './ModelPreviewCanvas';
import { prefetchGLB } from '../utils/modelCache';

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
  // Stagger mounting the two menu tile WebGL canvases until after the splash->menu transition settles
  const [tileStage, setTileStage] = useState(0);

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
        onClick={() => {
          if (!isEntered) onEnter(false);
        }}
      >
        <p className="nms-splash-kicker">A little space adventure</p>
        <p className="nms-splash-title" role="heading" aria-level={1}>
          ABANDONED BUT NOT FORGOTTEN
        </p>
        <p className="nms-splash-prompt">
          <span className="nms-prompt-key">Press any key to continue</span>
          <span className="nms-prompt-touch">Tap to continue</span>
        </p>
        <p className="nms-splash-foot">Every machine has a story</p>
      </section>

      {/* STEP 2: Main Navigation Menu */}
      <header className="nms-header">
        <h1 className="nms-title">ABANDONED BUT NOT FORGOTTEN</h1>
        <span className="nms-diamond" aria-hidden="true" />
      </header>

      {/* Two big tiles: Start Journey & Spacecrafts */}
      <nav className="nms-tiles" aria-label="Main Navigation">
        <button
          id="btn-start-journey"
          type="button"
          className="nms-tile nms-tile-moon"
          onClick={onStartJourney}
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
            <strong>Start Journey</strong>
            <small>Open the logbook and find the forgotten machines</small>
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
            <strong>Spacecrafts</strong>
            <small>Inspect every rover and lander in 3D</small>
          </span>
        </button>
      </nav>

      {/* Bottom-left small list */}
      <ul className="nms-side-list">
        <li>
          <button
            id="btn-open-settings"
            type="button"
            className="nms-side-item"
            onClick={onOpenSettings}
          >
            <Settings size={18} aria-hidden="true" />
            <span>
              <strong>Settings</strong>
              <small>Audio, graphics &amp; language</small>
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
              <strong>Credits</strong>
              <small>The crew behind the game</small>
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
                <strong>Sources</strong>
                <small>Verified mission records &amp; notes</small>
              </span>
            </button>
          </li>
        )}
      </ul>

      {/* Bottom-right keyboard navigation hint */}
      <p className="nms-hint" aria-hidden="true">
        <span className="nms-hint-key">Enter</span> to select and{' '}
        <span className="nms-hint-key">Tab</span> to move
      </p>
    </>
  );
}
