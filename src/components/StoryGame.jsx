import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  ArrowLeft,
  FastForward,
  Compass,
  Sparkles,
  Orbit,
  ChevronRight,
  Layers,
  BookOpen,
  Rocket
} from 'lucide-react';
import ModelPreviewCanvas from './ModelPreviewCanvas';
import { prefetchGLB, preloadImage, resolveAssetUrl } from '../utils/modelCache';
import { getStoryUiCopy, useActiveLanguage } from '../data/craftStories';
import { getTranslations } from '../constants/translations';
import '../styles/story.css';

const loadShowroom = () => import('./PlanetaryShowroom');
const PlanetaryShowroom = lazy(loadShowroom);

function ShowroomLoadingOverlay({ activeLang = 'en' }) {
  const t = getTranslations(activeLang).story;
  return (
    <div className="launch-loading-screen" role="status" aria-live="polite">
      <div className="launch-loading-card">
        <Orbit className="launch-loading-icon spin-slow" size={42} aria-hidden="true" />
        <p className="launch-loading-eyebrow">{t.initializing}</p>
        <h1 className="initial-loading-title">{t.loadingShowroom}</h1>
      </div>
    </div>
  );
}

const SCENE_1_LINES = [
  {
    speaker: 'LUNA',
    role: 'CURIOUS EXPLORER',
    text: "What's happening?! The pages... an old NASA mission logbook found among Grandpa's relics is starting to glow!"
  },
  {
    speaker: "MISSION LOGBOOK",
    role: "APOLLO ARCHIVE",
    isLogbook: true,
    text: "They didn't vanish. They stayed right where their last command ended—silent sentinels on distant worlds."
  },
  {
    speaker: 'LUNA',
    role: 'CURIOUS EXPLORER',
    text: "Holographic constellations and miniature planets are spiraling into the room, whispering the tales of machines humanity left behind among the stars!"
  }
];

const SCENE_2_LINES = [
  {
    speaker: 'LUNA',
    role: 'CURIOUS EXPLORER',
    text: "Where am I?! The bedroom walls dissolved into an infinite expanse of stellar dust and planetary orbits!"
  },
  {
    speaker: "MISSION LOGBOOK",
    role: "COSMIC ARCHIVE",
    isLogbook: true,
    text: "Space is not empty. It carries the echoes of humanity's greatest endeavors—waiting for someone to remember them."
  },
  {
    speaker: 'LUNA',
    role: 'CURIOUS EXPLORER',
    text: "The telemetry coordinates to the forgotten explorers are locking in... time to choose which world to investigate first!"
  }
];

function StoryDialogueBox({
  chapter,
  bgImage,
  bgAlt,
  lines,
  onComplete,
  completeLabel,
  completeIcon: CompleteIcon
}) {
  const [currentLine, setCurrentLine] = useState(0);

  const isLastLine = currentLine >= lines.length - 1;
  const line = lines[currentLine] || lines[0];

  const handleAdvance = () => {
    if (!isLastLine) {
      window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'camera_servo' } }));
      setCurrentLine((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (['Space', 'Enter', 'ArrowRight'].includes(e.code) && !e.repeat) {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentLine, isLastLine]);

  return (
    <section className="story-cinematic-stage" aria-label={`Story Scene: ${chapter}`}>
      <img src={resolveAssetUrl(bgImage)} alt={bgAlt} className="story-cinematic-bg" />
      <div className="story-cinematic-vignette" />

      <div className="story-chapter-chip">
        <BookOpen size={14} />
        <span>{chapter}</span>
      </div>

      <div className="story-dialogue-wrapper">
        <div className="dialogue-portrait-col">
          <div className="dialogue-portrait-frame">
            <img
              src={resolveAssetUrl('/assets/story/girl_thinking.png')}
              alt="Young girl explorer speaking"
              className="dialogue-character-img"
            />
            <div className="dialogue-portrait-glow" />
          </div>
        </div>

        <div
          className="story-dialogue-box"
          onClick={handleAdvance}
          role="button"
          tabIndex={0}
          aria-label="Click or press Space to advance dialogue"
        >
          <div className={`dialogue-nameplate ${line.isLogbook ? 'is-logbook' : ''}`}>
            <span className="nameplate-name">{line.speaker}</span>
            <span className="nameplate-role">// {line.role}</span>
          </div>

          <p className="dialogue-line-text">{line.text}</p>

          <div className="dialogue-bottom-row">
            <span className="dialogue-counter">
              LOG {currentLine + 1} / {lines.length}
            </span>

            {isLastLine ? (
              <button
                type="button"
                className="btn btn-primary dialogue-complete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete();
                }}
              >
                <span>{completeLabel}</span>
                {CompleteIcon && <CompleteIcon size={14} />}
              </button>
            ) : (
              <span className="dialogue-advance-prompt">
                <span>CLICK OR PRESS SPACE TO ADVANCE</span>
                <span>▼</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function StoryGame({ onBackToMenu }) {
  // Scene states: 'book' -> 'drift' -> 'choice' -> 'moon' | 'mars'
  const [currentScene, setCurrentScene] = useState('book');
  const [craftBrowse, setCraftBrowse] = useState(false);
  const activeLang = useActiveLanguage();
  const storyUi = getStoryUiCopy(activeLang);
  const t = getTranslations(activeLang).story;

  // Progressive scene-by-scene warming: pre-warm Choice globes during Scene 1/2,
  // and only warm PlanetaryShowroom JS code when reaching Choice
  useEffect(() => {
    if (currentScene === 'book' || currentScene === 'drift') {
      const id = setTimeout(() => {
        prefetchGLB('/models/moon-opt.glb');
        prefetchGLB('/models/mars-opt.glb');
        preloadImage('/assets/story/girl_thinking.png');
      }, 200);
      return () => clearTimeout(id);
    }
    if (currentScene === 'choice') {
      loadShowroom().catch(() => null);
    }
  }, [currentScene]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        if (document.querySelector('.showroom-viewport')) {
          return;
        }
        if (craftBrowse) {
          setCraftBrowse(false);
        } else if (['moon', 'mars'].includes(currentScene)) {
          goToScene('choice');
        } else if (currentScene === 'choice') {
          goToScene('drift');
        } else if (currentScene === 'drift') {
          goToScene('book');
        } else if (currentScene === 'book') {
          onBackToMenu();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScene, craftBrowse, onBackToMenu]);

  const goToScene = (sceneName) => {
    window.dispatchEvent(
      new CustomEvent('gameAudioCue', {
        detail: { cue: `story_step_${sceneName}` }
      })
    );
    setCurrentScene(sceneName);
  };

  const isExploring = ['moon', 'mars'].includes(currentScene);

  return (
    <div className={`story-container ${isExploring ? 'is-exploring' : ''}`}>
      {/* Top HUD Navigation Bar */}
      <header className="story-top-bar">
        <button
          type="button"
          className="story-back-btn"
          onClick={onBackToMenu}
          aria-label="Return to Main Menu"
        >
          <ArrowLeft size={16} />
          <span>MENU</span>
        </button>

        {/* Story Progression Tracker */}
        <div className="story-steps-tracker" aria-label="Story Progression">
          <span className={`step-indicator ${currentScene === 'book' ? 'active' : ''}`}>
            1. THE BOOK
          </span>
          <span className="step-divider">›</span>
          <span className={`step-indicator ${currentScene === 'drift' ? 'active' : ''}`}>
            2. INSIDE
          </span>
          <span className="step-divider">›</span>
          <span className={`step-indicator ${currentScene === 'choice' ? 'active' : ''}`}>
            3. THE CHOICE
          </span>
          <span className="step-divider">›</span>
          <span className={`step-indicator ${isExploring ? 'active' : ''}`}>
            4. DESTINATION
          </span>
        </div>

        {/* Top Right Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isExploring && (
            <button
              type="button"
              className="story-skip-btn"
              onClick={() => setCraftBrowse(true)}
              onMouseEnter={() => { loadShowroom().catch(() => null); }}
              title="Inspect 3D Spacecrafts & Rovers"
            >
              <Layers size={14} />
              <span>CRAFTS</span>
            </button>
          )}

          {currentScene !== 'choice' && !isExploring && (
            <button
              type="button"
              className="story-skip-btn"
              onClick={() => goToScene('choice')}
              title="Skip directly to destination choice"
            >
              <span>CHOICE</span>
              <FastForward size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Main Story Stage */}
      <main className="story-stage">
        {/* ================================================================
            SCENE 1: THE SPACE BOOK (Hades / RPG Dialogue Box)
            ================================================================ */}
        {currentScene === 'book' && (
          <StoryDialogueBox
            chapter={t.scene1Chapter}
            bgImage="/assets/story/scene1_book.jpg"
            bgAlt="Young girl in her room opening a magical glowing NASA space exploration book"
            lines={t.scene1Lines}
            onComplete={() => goToScene('drift')}
            completeLabel={t.continue}
            completeIcon={ChevronRight}
          />
        )}

        {/* ================================================================
            SCENE 2: INSIDE THE BOOK (Hades / RPG Dialogue Box)
            ================================================================ */}
        {currentScene === 'drift' && (
          <StoryDialogueBox
            chapter={t.scene2Chapter}
            bgImage="/assets/story/scene2_drift.jpg"
            bgAlt="The girl weightlessly drifting through celestial nebulae and space"
            lines={t.scene2Lines}
            onComplete={() => goToScene('choice')}
            completeLabel={t.openLogbook}
            completeIcon={Compass}
          />
        )}

        {/* ================================================================
            SCENE 3: THE CHOICE ("WHERE DO YOU WANT TO GO?" + 3D Moon & Mars)
            ================================================================ */}
        {currentScene === 'choice' && (
          <section className="story-choice-view" aria-label="Destination Selection" dir={activeLang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="choice-hud-header">
              <h2 className="choice-title">{t.choiceTitle}</h2>
              <p className="story-logbook-note is-centered">
                <BookOpen size={14} aria-hidden="true" />
                <span>{storyUi.logbookNotes.choice}</span>
              </p>
              <p className="choice-subtitle">
                {t.exploringDesc}
              </p>
            </div>

            <div className="choice-destinations-grid choice-grid-2">
              {/* Destination 1: 3D MOON */}
              <article className="planet-choice-card moon-choice-card">
                <span className="card-hud-badge">{t.targetSector1}</span>

                <div className="planet-3d-viewport">
                  <ModelPreviewCanvas
                    src="/models/moon-opt.glb"
                    alt="Interactive 3D model of Earth's Moon"
                    autoRotate
                    rotationPerSecond={8}
                    cameraControls
                    exposure={1.1}
                    paused={craftBrowse}
                  />
                </div>

                <h3 className="planet-choice-name">{t.theMoon}</h3>
                <p className="planet-telemetry">
                  {t.moonDesc}
                </p>

                <button
                  type="button"
                  className="btn btn-primary choice-dest-btn"
                  onClick={() => goToScene('moon')}
                >
                  <Orbit size={16} />
                  <span>{t.goToMoon}</span>
                </button>
              </article>

              {/* Destination 2: 3D MARS */}
              <article className="planet-choice-card mars-choice-card">
                <span className="card-hud-badge">{t.targetSector2}</span>

                <div className="planet-3d-viewport">
                  <ModelPreviewCanvas
                    src="/models/mars-opt.glb"
                    alt="Interactive 3D model of Planet Mars"
                    autoRotate
                    rotationPerSecond={-8}
                    cameraControls
                    exposure={1.15}
                    paused={craftBrowse}
                  />
                </div>

                <h3 className="planet-choice-name">{t.mars}</h3>
                <p className="planet-telemetry">
                  {t.marsDesc}
                </p>

                <button
                  type="button"
                  className="btn btn-primary choice-dest-btn"
                  onClick={() => goToScene('mars')}
                >
                  <Sparkles size={16} />
                  <span>{t.goToMars}</span>
                </button>
              </article>
            </div>

            {/* Character below the grid */}
            <div className="choice-character-row">
              <img
                src={resolveAssetUrl('/assets/story/girl_thinking.png')}
                alt="Young explorer pondering destination choice"
                className="character-thinking-img"
              />
              <p className="character-prompt">
                "{t.girlPrompt}"
              </p>
            </div>
          </section>
        )}

        {/* ================================================================
            SCENE 4: PLANETARY SURFACE & SPACECRAFTS SHOWROOM
            ================================================================ */}
        {isExploring && (
          <Suspense fallback={<ShowroomLoadingOverlay activeLang={activeLang} />}>
            <PlanetaryShowroom
              isOpen={true}
              initialDestination={currentScene}
              onClose={onBackToMenu}
              onBackToChoice={() => goToScene('choice')}
            />
          </Suspense>
        )}

        {craftBrowse && (
          <Suspense fallback={<ShowroomLoadingOverlay />}>
            <PlanetaryShowroom
              isOpen={true}
              initialDestination="all"
              onClose={() => setCraftBrowse(false)}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}
