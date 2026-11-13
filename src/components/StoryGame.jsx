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
import { prefetchGLB, preloadImage } from '../utils/modelCache';
import { getStoryUiCopy, useActiveLanguage } from '../data/craftStories';
import '../styles/story.css';

const loadShowroom = () => import('./PlanetaryShowroom');
const PlanetaryShowroom = lazy(loadShowroom);

function ShowroomLoadingOverlay() {
  return (
    <div className="launch-loading-screen" role="status" aria-live="polite">
      <div className="launch-loading-card">
        <Orbit className="launch-loading-icon spin-slow" size={42} aria-hidden="true" />
        <p className="launch-loading-eyebrow">INITIALIZING SURFACE MODULE</p>
        <h1 className="initial-loading-title">LOADING PLANETARY SHOWROOM</h1>
      </div>
    </div>
  );
}

export default function StoryGame({ onBackToMenu }) {
  // Scene states: 'book' -> 'drift' -> 'choice' -> 'moon' | 'mars' | 'deepspace'
  const [currentScene, setCurrentScene] = useState('book');
  const [craftBrowse, setCraftBrowse] = useState(false);
  const activeLang = useActiveLanguage();
  const storyUi = getStoryUiCopy(activeLang);

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
        } else if (['moon', 'mars', 'deepspace'].includes(currentScene)) {
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

  const isExploring = ['moon', 'mars', 'deepspace'].includes(currentScene);

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
            SCENE 1: THE SPACE BOOK ("What's happening?")
            ================================================================ */}
        {currentScene === 'book' && (
          <section className="story-cutscene-card" aria-label="Scene: The Space Book">
            <div className="cutscene-image-frame">
              <img
                src="/assets/story/scene1_book.jpg"
                alt="Young girl in her room opening a magical glowing NASA space exploration book"
                className="cutscene-img"
              />
              <div className="speech-bubble" role="status">
                What's happening?
              </div>
            </div>

            <div className="cutscene-narration">
              <span className="cutscene-chapter">PROLOGUE // THE ARCHIVE UNSEALED</span>
              <p className="story-logbook-note">
                <BookOpen size={14} aria-hidden="true" />
                <span>{storyUi.logbookNotes.book}</span>
              </p>
              <p className="cutscene-text">
                Late at night, an old NASA mission logbook found among forgotten relics begins
                to glow. Holographic constellations and miniature planets spiral out into the
                room, whispering the tales of machines humanity left behind among the stars.
              </p>
            </div>

            <div className="cutscene-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => goToScene('drift')}
              >
                <span>CONTINUE</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </section>
        )}

        {/* ================================================================
            SCENE 2: INSIDE THE BOOK ("Where am I?")
            ================================================================ */}
        {currentScene === 'drift' && (
          <section className="story-cutscene-card" aria-label="Scene: Inside the Book">
            <div className="cutscene-image-frame">
              <img
                src="/assets/story/scene2_drift.jpg"
                alt="The girl weightlessly drifting through celestial nebulae and space"
                className="cutscene-img"
              />
              <div className="speech-bubble" role="status">
                Where am I?
              </div>
            </div>

            <div className="cutscene-narration">
              <span className="cutscene-chapter">CHAPTER I // THE COSMIC ARCHIVE</span>
              <p className="story-logbook-note">
                <BookOpen size={14} aria-hidden="true" />
                <span>{storyUi.logbookNotes.drift}</span>
              </p>
              <p className="cutscene-text">
                The walls dissolve into an infinite expanse of stellar dust and planetary
                orbits. Pulled through the digital memories of distant telemetry, the solar
                system opens up. Ahead lie the coordinates to the forgotten explorers.
              </p>
            </div>

            <div className="cutscene-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => goToScene('choice')}
              >
                <span>MAKE A CHOICE</span>
                <Compass size={16} />
              </button>
            </div>
          </section>
        )}

        {/* ================================================================
            SCENE 3: THE CHOICE ("WHERE DO YOU WANT TO GO?" + 3D Moon & Mars)
            ================================================================ */}
        {currentScene === 'choice' && (
          <section className="story-choice-view" aria-label="Destination Selection">
            <div className="choice-hud-header">
              <h2 className="choice-title">WHERE DO YOU WANT TO GO?</h2>
              <p className="story-logbook-note is-centered">
                <BookOpen size={14} aria-hidden="true" />
                <span>{storyUi.logbookNotes.choice}</span>
              </p>
              <p className="choice-subtitle">
                Select a celestial destination to investigate halted rovers, landers, and deep-space probes
              </p>
            </div>

            <div className="choice-destinations-grid choice-grid-3">
              {/* Destination 1: 3D MOON */}
              <article className="planet-choice-card moon-choice-card">
                <span className="card-hud-badge">TARGET // SECTOR 01</span>

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

                <h3 className="planet-choice-name">THE MOON</h3>
                <p className="planet-telemetry">
                  Distance: 384,400 km • Vacuum surface • Silent landing modules and historic rovers.
                </p>

                <button
                  type="button"
                  className="btn btn-primary choice-dest-btn"
                  onClick={() => goToScene('moon')}
                >
                  <Orbit size={16} />
                  <span>GO TO THE MOON</span>
                </button>
              </article>

              {/* Destination 2: 3D MARS */}
              <article className="planet-choice-card mars-choice-card">
                <span className="card-hud-badge">TARGET // SECTOR 02</span>

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

                <h3 className="planet-choice-name">MARS</h3>
                <p className="planet-telemetry">
                  Distance: 225,000,000 km • Red dust plains • Tire tracks preserved under thin skies.
                </p>

                <button
                  type="button"
                  className="btn btn-primary choice-dest-btn"
                  onClick={() => goToScene('mars')}
                >
                  <Sparkles size={16} />
                  <span>GO TO MARS</span>
                </button>
              </article>

              {/* Destination 3: DEEP SPACE */}
              <article className="planet-choice-card deepspace-choice-card">
                <span className="card-hud-badge">TARGET // SECTOR 03</span>

                <div className="planet-3d-viewport deepspace-viewport">
                  <div className="deepspace-placeholder-orb" aria-hidden="true">
                    <Rocket size={48} />
                  </div>
                </div>

                <h3 className="planet-choice-name">DEEP SPACE</h3>
                <p className="planet-telemetry">
                  Beyond the planets • Interstellar void • Voyagers, Pioneer, and New Horizons sail into the unknown.
                </p>

                <button
                  type="button"
                  className="btn btn-primary choice-dest-btn"
                  onClick={() => goToScene('deepspace')}
                >
                  <Rocket size={16} />
                  <span>GO TO DEEP SPACE</span>
                </button>
              </article>
            </div>

            {/* Character below the grid */}
            <div className="choice-character-row">
              <div className="character-bubble" aria-hidden="true">
                ?
              </div>
              <img
                src="/assets/story/girl_thinking.png"
                alt="Young explorer pondering destination choice"
                className="character-thinking-img"
              />
              <p className="character-prompt">
                "Three frontiers... which forgotten story will we uncover first?"
              </p>
            </div>
          </section>
        )}

        {/* ================================================================
            SCENE 4: PLANETARY SURFACE & SPACECRAFTS SHOWROOM
            ================================================================ */}
        {isExploring && (
          <Suspense fallback={<ShowroomLoadingOverlay />}>
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
