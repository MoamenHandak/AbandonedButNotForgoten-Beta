import React, { useState, useEffect, lazy, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import CosmicBackground from './components/CosmicBackground';
import MainMenu from './components/MainMenu';
import {
  SETTINGS_STORAGE_KEY,
  readStoredSettings,
  normalizeSettings,
} from './constants/settings';
import { installSurfaceAudio } from './audio/surfaceAudio';
import { preloadImage } from './utils/modelCache';
import './styles/menu.css';

const loadStoryGame = () => import('./components/StoryGame');
const loadShowroom = () => import('./components/PlanetaryShowroom');
const loadSettingsModal = () => import('./components/SettingsModal');
const loadCreditsModal = () => import('./components/CreditsModal');
const loadSourcesModal = () => import('./components/SourcesModal');
const loadBriefingDialog = () => import('./components/MissionBriefingDialog');

const StoryGame = lazy(loadStoryGame);
const PlanetaryShowroom = lazy(loadShowroom);
const SettingsModal = lazy(loadSettingsModal);
const CreditsModal = lazy(loadCreditsModal);
const SourcesModal = lazy(loadSourcesModal);
const MissionBriefingDialog = lazy(loadBriefingDialog);

export default function App() {
  const [activeModal, setActiveModal] = useState(null); // 'settings' | 'credits' | 'sources' | 'spacecraft' | null
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState(null);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [inGame, setInGame] = useState(false);
  const [settings, setSettings] = useState(() => readStoredSettings());
  const [loadProgress, setLoadProgress] = useState(0);

  // Title screen state (press any key to reveal menu)
  const [isTitleEntered, setIsTitleEntered] = useState(false);

  useEffect(() => installSurfaceAudio(), []);

  // Load settings on initial mount and sync global audio/graphics defaults immediately
  useEffect(() => {
    const normalized = readStoredSettings();
    setSettings(normalized);
    window.dispatchEvent(
      new CustomEvent('gameSettingsChange', { detail: { ...normalized }, bubbles: true })
    );
  }, []);

  // Save settings handler
  const handleSaveSettings = (newSettings) => {
    const normalized = normalizeSettings(newSettings);
    setSettings(normalized);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    } catch (err) {
      console.warn('Failed to save settings:', err);
    }

    window.dispatchEvent(
      new CustomEvent('gameSettingsChange', {
        detail: { ...normalized },
        bubbles: true
      })
    );
  };

  // Launch Journey sequence — loads ONLY the StoryGame chunk + Scene 1 & 2 story paintings;
  // heavy terrain GLBs are deferred until the user selects Moon or Mars.
  const handleStartJourney = async () => {
    setIsLaunching(true);
    setLaunchError(null);
    setLoadProgress(10);

    window.dispatchEvent(
      new CustomEvent('gameAudioCue', {
        detail: { cue: 'start_journey' }
      })
    );

    try {
      let doneSteps = 0;
      const totalSteps = 3;
      const tickStep = () => {
        doneSteps += 1;
        setLoadProgress(Math.round((doneSteps / totalSteps) * 100));
      };

      const [storyOk] = await Promise.all([
        loadStoryGame().then(() => {
          tickStep();
          return true;
        }),
        preloadImage('/assets/story/scene1_book.jpg').then(() => tickStep()),
        preloadImage('/assets/story/scene2_drift.jpg').then(() => tickStep())
      ]);

      if (storyOk) {
        setInGame(true);
        setIsLaunching(false);
      }
    } catch (err) {
      console.error('Failed to launch story module:', err);
      setLaunchError('Unable to load the Mission Archive module. Check your connection and retry.');
    }
  };

  // Keep CosmicBackground animated behind transparent Credits; pause hidden menu tiles on any modal
  const bgPaused = Boolean((activeModal && activeModal !== 'credits') || isLaunching);
  const menuTilesPaused = Boolean(activeModal || isLaunching);

  // Story Game View
  if (inGame) {
    return (
      <Suspense
        fallback={
          <div className="launch-loading-screen" role="status" aria-live="polite">
            <div className="launch-loading-card">
              <LoaderCircle className="launch-loading-icon spin-slow" size={42} aria-hidden="true" />
              <p className="launch-loading-eyebrow">MISSION ARCHIVE INITIALIZING</p>
              <h1 className="initial-loading-title">LOADING LOGBOOK</h1>
            </div>
          </div>
        }
      >
        <StoryGame onBackToMenu={() => setInGame(false)} />
      </Suspense>
    );
  }

  return (
    <div className={`app-root ${isLaunching ? 'is-launching' : ''}`}>
      <main
        id="nms-menu"
        className={`menu-container nms-menu ${
          isTitleEntered ? 'is-entered' : 'is-title'
        } ${activeModal === 'credits' ? 'credits-open' : ''}`}
      >
        {/* Forward-Flight Starfield + Floating 3D Crafts Background */}
        <CosmicBackground isEntered={isTitleEntered} paused={bgPaused} />

        {/* Main Menu HUD & Navigation */}
        <MainMenu
          isEntered={isTitleEntered}
          paused={menuTilesPaused}
          onEnter={(byKeyboard) => {
            setIsTitleEntered(true);
            if (byKeyboard) {
              setTimeout(() => {
                const first = document.getElementById('btn-start-journey');
                if (first) first.focus({ preventScroll: true });
              }, 900);
            }
          }}
          onStartJourney={() => setIsBriefingOpen(true)}
          onOpenSettings={() => setActiveModal('settings')}
          onOpenCredits={() => setActiveModal('credits')}
          onOpenSources={() => setActiveModal('sources')}
          onOpenSpacecrafts={() => setActiveModal('spacecraft')}
        />

        {/* Cinematic Warp Curtain */}
        <div className="cinematic-curtain" aria-hidden="true" />
      </main>

      {/* Mission Control Typewriter Briefing Dialog (Lazy-loaded on demand) */}
      {isBriefingOpen && (
        <Suspense fallback={null}>
          <MissionBriefingDialog
            isOpen={isBriefingOpen}
            onComplete={() => {
              setIsBriefingOpen(false);
              handleStartJourney();
            }}
          />
        </Suspense>
      )}

      {isLaunching && (
        <div
          className="launch-loading-screen"
          role="status"
          aria-live="polite"
          aria-label={`Loading journey: ${loadProgress}%`}
        >
          <div className="launch-loading-card">
            <LoaderCircle className="launch-loading-icon spin-slow" size={42} aria-hidden="true" />
            <p className="launch-loading-eyebrow">MISSION ARCHIVE INITIALIZING</p>
            <h1 className="initial-loading-title">
              {launchError ? 'CONNECTION INTERRUPTED' : 'PREPARING YOUR JOURNEY'}
            </h1>
            {!launchError ? (
              <>
                <div className="launch-progress-track">
                  <span style={{ width: `${loadProgress}%` }} />
                </div>
                <p className="initial-loading-details" style={{ justifyContent: 'center' }}>
                  <span>{loadProgress}% · Opening Mission Logbook</span>
                </p>
              </>
            ) : (
              <>
                <p className="initial-loading-details" style={{ justifyContent: 'center', marginBottom: 16 }}>
                  <span>{launchError}</span>
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button type="button" className="btn btn-primary" onClick={handleStartJourney}>
                    Retry
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsLaunching(false);
                      setLaunchError(null);
                    }}
                  >
                    Back to Menu
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal (Lazy-loaded on demand) */}
      {activeModal === 'settings' && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        </Suspense>
      )}

      {/* Credits Modal (Lazy-loaded on demand) */}
      {activeModal === 'credits' && (
        <Suspense fallback={null}>
          <CreditsModal isOpen={true} onClose={() => setActiveModal(null)} />
        </Suspense>
      )}

      {/* Sources Modal (Lazy-loaded on demand) */}
      {activeModal === 'sources' && (
        <Suspense fallback={null}>
          <SourcesModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            lang={settings?.language || 'en'}
          />
        </Suspense>
      )}

      {/* Planetary Showroom (Lazy-loaded only when opened) */}
      {activeModal === 'spacecraft' && (
        <Suspense
          fallback={
            <div className="launch-loading-screen" role="status" aria-live="polite">
              <div className="launch-loading-card">
                <LoaderCircle className="launch-loading-icon spin-slow" size={42} aria-hidden="true" />
                <p className="launch-loading-eyebrow">SHOWROOM MODULE INITIALIZING</p>
                <h1 className="initial-loading-title">PREPARING 3D HANGAR</h1>
              </div>
            </div>
          }
        >
          <PlanetaryShowroom
            isOpen={true}
            onClose={() => setActiveModal(null)}
            initialDestination="all"
          />
        </Suspense>
      )}
    </div>
  );
}
