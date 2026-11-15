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
  Rocket,
  Lock,
  CheckCircle2
} from 'lucide-react';
import ModelPreviewCanvas from './ModelPreviewCanvas';
import { prefetchGLB, preloadImage, resolveAssetUrl } from '../utils/modelCache';
import { getStoryUiCopy, useActiveLanguage } from '../data/craftStories';
import { getTranslations } from '../constants/translations';
import { getStoryProgression, recordInitialChoice, isAreaLocked } from '../utils/storyProgression';
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
    bgImage: '/assets/story/shot1.png',
    text: "Late at night, when the city quiets down, I look at the stars outside my window. Humanity sent so many brave explorers into the deep unknown—rovers, landers, orbiters... Are they still waiting out there in the dark?"
  },
  {
    speaker: 'LUNA',
    role: 'CURIOUS EXPLORER',
    bgImage: '/assets/story/shot2.jpg',
    text: "Wait... this old archive logbook from Grandpa's NASA days. The classic insignia is faded, but the cover is warm to the touch... like telemetry pulses humming softly under the leather."
  },
  {
    speaker: 'LUNA',
    role: 'CURIOUS EXPLORER',
    bgImage: '/assets/story/shot3.jpg',
    text: "It's opening! The pages aren't just paper—they're glowing with orbital trajectory maps and telemetry beacons!"
  },
  {
    speaker: "MISSION LOGBOOK",
    role: "DEEP SPACE ARCHIVE",
    bgImage: '/assets/story/shot3.jpg',
    isLogbook: true,
    text: "ARCHIVE LINK ESTABLISHED: Project 'Abandoned, But Not Forgotten'. Relaying telemetry beacons across the Solar System. To remember is to bring them home."
  }
];

const SCENE_2_LINES = [
  {
    speaker: 'LUNA',
    role: 'CURIOUS EXPLORER',
    bgImage: '/assets/story/shot4.jpg',
    text: "Whoa! Miniature glowing planets, celestial rings, and spiral galaxies are spinning right into my bedroom! It's like the entire cosmos came to tell its story!"
  },
  {
    speaker: "MISSION LOGBOOK",
    role: "COSMIC ARCHIVE",
    bgImage: '/assets/story/shot4.jpg',
    isLogbook: true,
    text: "From the airless craters of the Moon to the windswept dunes of Mars, every silent machine stands as an enduring monument to human curiosity."
  },
  {
    speaker: 'LUNA',
    role: 'CURIOUS EXPLORER',
    bgImage: '/assets/story/shot5.jpg',
    text: "The bedroom walls dissolved completely... I'm floating in weightless orbit high above planet Earth! The logbook is unlocking deep-space exploration trajectories!"
  },
  {
    speaker: "MISSION LOGBOOK",
    role: "NAVIGATION SYSTEM",
    bgImage: '/assets/story/shot5.jpg',
    isLogbook: true,
    text: "Telemetry vectors primed. Choose your destination, explorer: uncover the frozen silence of the Moon, or journey across the void to the Red Planet."
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

  const currentBg = line?.bgImage || bgImage;

  return (
    <section className="story-cinematic-stage" aria-label={`Story Scene: ${chapter}`}>
      <img key={currentBg} src={resolveAssetUrl(currentBg)} alt={bgAlt} className="story-cinematic-bg" />
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
  const [progression, setProgression] = useState(getStoryProgression);

  const activeLang = useActiveLanguage();
  const storyUi = getStoryUiCopy(activeLang);
  const t = getTranslations(activeLang).story;

  useEffect(() => {
    const onProgressionUpdate = (e) => {
      if (e.detail) setProgression(e.detail);
      else setProgression(getStoryProgression());
    };
    window.addEventListener('storyProgressionUpdated', onProgressionUpdate);
    return () => window.removeEventListener('storyProgressionUpdated', onProgressionUpdate);
  }, []);

  // Progressive scene-by-scene warming: pre-warm Choice globes during Scene 1/2,
  // and only warm PlanetaryShowroom JS code when reaching Choice
  useEffect(() => {
    if (currentScene === 'book' || currentScene === 'drift') {
      const id = setTimeout(() => {
        prefetchGLB('/models/moon-opt.glb');
        prefetchGLB('/models/mars-opt.glb');
        preloadImage('/assets/story/shot1.png');
        preloadImage('/assets/story/shot2.jpg');
        preloadImage('/assets/story/shot3.jpg');
        preloadImage('/assets/story/shot4.jpg');
        preloadImage('/assets/story/shot5.jpg');
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
              {(() => {
                const isMoonLocked = isAreaLocked('moon', progression);
                const isMoonDone = Boolean(progression.completedAreas?.moon);
                const isMoonActive = progression.firstChoice === 'moon';

                return (
                  <article className={`planet-choice-card moon-choice-card ${isMoonLocked ? 'is-locked' : ''}`}>
                    <span className={`card-hud-badge ${isMoonDone ? 'is-completed' : isMoonLocked ? 'is-locked' : isMoonActive ? 'is-active' : ''}`}>
                      {isMoonDone ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>{activeLang === 'ar' ? '✓ تم إكمال قطاع القمر' : '✓ SECTOR 01 COMPLETE'}</span>
                        </>
                      ) : isMoonLocked ? (
                        <>
                          <Lock size={12} />
                          <span>{activeLang === 'ar' ? 'مغلق // أكمل المريخ أولاً' : 'LOCKED // COMPLETE MARS FIRST'}</span>
                        </>
                      ) : isMoonActive ? (
                        <span>{activeLang === 'ar' ? '★ القطاع النشط' : '★ ACTIVE SECTOR'}</span>
                      ) : (
                        <span>{t.targetSector1}</span>
                      )}
                    </span>

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
                      className={`btn btn-primary choice-dest-btn ${isMoonLocked ? 'is-disabled' : ''}`}
                      onClick={() => {
                        if (isMoonLocked) return;
                        recordInitialChoice('moon');
                        goToScene('moon');
                      }}
                      disabled={isMoonLocked}
                    >
                      {isMoonLocked ? (
                        <>
                          <Lock size={16} />
                          <span>{activeLang === 'ar' ? 'مغلق' : 'LOCKED'}</span>
                        </>
                      ) : isMoonDone ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>{activeLang === 'ar' ? 'إعادة استكشاف القمر' : 'REVISIT THE MOON'}</span>
                        </>
                      ) : (
                        <>
                          <Orbit size={16} />
                          <span>{t.goToMoon}</span>
                        </>
                      )}
                    </button>
                  </article>
                );
              })()}

              {/* Destination 2: 3D MARS */}
              {(() => {
                const isMarsLocked = isAreaLocked('mars', progression);
                const isMarsDone = Boolean(progression.completedAreas?.mars);
                const isMarsActive = progression.firstChoice === 'mars';

                return (
                  <article className={`planet-choice-card mars-choice-card ${isMarsLocked ? 'is-locked' : ''}`}>
                    <span className={`card-hud-badge ${isMarsDone ? 'is-completed' : isMarsLocked ? 'is-locked' : isMarsActive ? 'is-active' : ''}`}>
                      {isMarsDone ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>{activeLang === 'ar' ? '✓ تم إكمال قطاع المريخ' : '✓ SECTOR 02 COMPLETE'}</span>
                        </>
                      ) : isMarsLocked ? (
                        <>
                          <Lock size={12} />
                          <span>{activeLang === 'ar' ? 'مغلق // أكمل القمر أولاً' : 'LOCKED // COMPLETE MOON FIRST'}</span>
                        </>
                      ) : isMarsActive ? (
                        <span>{activeLang === 'ar' ? '★ القطاع النشط' : '★ ACTIVE SECTOR'}</span>
                      ) : (
                        <span>{t.targetSector2}</span>
                      )}
                    </span>

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
                      className={`btn btn-primary choice-dest-btn ${isMarsLocked ? 'is-disabled' : ''}`}
                      onClick={() => {
                        if (isMarsLocked) return;
                        recordInitialChoice('mars');
                        goToScene('mars');
                      }}
                      disabled={isMarsLocked}
                    >
                      {isMarsLocked ? (
                        <>
                          <Lock size={16} />
                          <span>{activeLang === 'ar' ? 'مغلق' : 'LOCKED'}</span>
                        </>
                      ) : isMarsDone ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>{activeLang === 'ar' ? 'إعادة استكشاف المريخ' : 'REVISIT MARS'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>{t.goToMars}</span>
                        </>
                      )}
                    </button>
                  </article>
                );
              })()}
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
              onAreaComplete={(completedArea, nextArea) => {
                goToScene(nextArea);
              }}
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
