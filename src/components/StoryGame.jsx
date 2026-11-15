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
import TypewriterText from './TypewriterText';
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

function StoryDialogueBox({
  chapter,
  lines = [],
  onComplete,
  completeLabel,
  completeIcon: CompleteIcon,
  activeLang = 'en'
}) {
  const [currentLine, setCurrentLine] = useState(0);

  const isLastLine = currentLine >= lines.length - 1;
  const line = lines[currentLine] || lines[0] || {};

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

  const currentBg = line.bgImage || '/assets/story/shot1.png';
  const expression = line.expression || 'curious';
  const isArabic = activeLang === 'ar';

  return (
    <section className="story-cinematic-stage" aria-label={`Story Scene: ${chapter}`} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* 100vw x 100dvh Full-screen Background with cross-fade & zoom */}
      <img
        key={currentBg}
        src={resolveAssetUrl(currentBg)}
        alt="Atmospheric story scene illustration"
        className="story-cinematic-bg"
      />
      <div className="story-cinematic-vignette" />

      {/* Chapter Tag */}
      <div className="story-chapter-chip">
        <BookOpen size={14} />
        <span>{chapter}</span>
      </div>

      {/* Luna Character Cut-Out (Bottom-Left overlapping stage) */}
      <div className={`story-character-cutout ${line.isLogbook ? 'is-dimmed' : ''}`} aria-hidden="true">
        <img
          key={expression}
          src={resolveAssetUrl(`/assets/story/luna/luna_${expression}.webp`)}
          alt="Luna the young explorer"
          className="story-character-cutout-img"
        />
      </div>

      {/* Dialogue Box (Centered bottom glass panel) */}
      <div className="story-dialogue-wrapper">
        <div
          className={`story-dialogue-box ${line.isLogbook ? 'is-logbook' : ''}`}
          onClick={handleAdvance}
          role="button"
          tabIndex={0}
          aria-label={isArabic ? 'انقر أو اضغط مسافة للمتابعة' : 'Click or press Space to advance dialogue'}
        >
          {/* Docked Speaker Name Tag */}
          <div className={`dialogue-nameplate ${line.isLogbook ? 'is-logbook' : ''}`}>
            <span className="nameplate-name">{line.speaker}</span>
            <span className="nameplate-role">// {line.role}</span>
          </div>

          {/* Word/Grapheme safe Typewriter body */}
          <div className="dialogue-line-text">
            <TypewriterText
              text={line.text}
              isArabic={isArabic}
              isLogbook={Boolean(line.isLogbook)}
            />
          </div>

          {/* Bottom HUD row: Log counter & advance prompt */}
          <div className="dialogue-bottom-row">
            <span className="dialogue-counter">
              LOG {currentLine + 1} / {lines.length}
            </span>

            {isLastLine ? (
              <button
                type="button"
                className="dialogue-complete-btn"
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
                <span>{isArabic ? 'انقر أو اضغط مسافة للمتابعة' : 'CLICK OR PRESS SPACE TO ADVANCE'}</span>
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
  // Scene states: 'prologue' -> 'choice' -> 'moon' | 'mars'
  const [currentScene, setCurrentScene] = useState('prologue');
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

  // Progressive scene-by-scene warming
  useEffect(() => {
    if (currentScene === 'prologue' || currentScene === 'book') {
      const id = setTimeout(() => {
        prefetchGLB('/models/moon-opt.glb');
        prefetchGLB('/models/mars-opt.glb');
        preloadImage('/assets/story/shot1.png');
        preloadImage('/assets/story/shot2.jpg');
        preloadImage('/assets/story/shot3.jpg');
        preloadImage('/assets/story/shot4.jpg');
        preloadImage('/assets/story/shot5.jpg');
        preloadImage('/assets/story/luna/luna_curious.webp');
        preloadImage('/assets/story/luna/luna_reading.webp');
        preloadImage('/assets/story/luna/luna_surprised.webp');
        preloadImage('/assets/story/luna/luna_wonder.webp');
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
          goToScene('prologue');
        } else if (currentScene === 'prologue' || currentScene === 'book' || currentScene === 'drift') {
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
  const isPrologue = ['prologue', 'book', 'drift'].includes(currentScene);

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
          <span>{activeLang === 'ar' ? 'القائمة' : 'MENU'}</span>
        </button>

        {/* Story Progression Tracker */}
        <div className="story-steps-tracker" aria-label="Story Progression">
          <span className={`step-indicator ${isPrologue ? 'active' : ''}`}>
            1. {activeLang === 'ar' ? 'المقدمة' : 'PROLOGUE'}
          </span>
          <span className="step-divider">›</span>
          <span className={`step-indicator ${currentScene === 'choice' ? 'active' : ''}`}>
            2. {activeLang === 'ar' ? 'الوجهة' : 'THE CHOICE'}
          </span>
          <span className="step-divider">›</span>
          <span className={`step-indicator ${isExploring ? 'active' : ''}`}>
            3. {activeLang === 'ar' ? 'الاستكشاف' : 'DESTINATION'}
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
              <span>{activeLang === 'ar' ? 'المركبات' : 'CRAFTS'}</span>
            </button>
          )}

          {isPrologue && (
            <button
              type="button"
              className="story-skip-btn"
              onClick={() => goToScene('choice')}
              title="Skip directly to destination choice"
            >
              <span>{t.skipPrologue || (activeLang === 'ar' ? 'تخطي' : 'SKIP')}</span>
              <FastForward size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Main Story Stage */}
      <main className="story-stage">
        {/* ================================================================
            PROLOGUE: FULL-SCREEN VISUAL NOVEL (5-Shot Sequence)
            ================================================================ */}
        {isPrologue && (
          <StoryDialogueBox
            chapter={t.prologueChapter || t.scene1Chapter}
            lines={t.prologueLines || t.scene1Lines}
            onComplete={() => goToScene('choice')}
            completeLabel={t.openLogbook}
            completeIcon={Compass}
            activeLang={activeLang}
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
