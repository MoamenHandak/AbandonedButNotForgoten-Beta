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
import { preloadImage, preloadAllCoreAssets } from './utils/modelCache';
import { resetStoryProgression } from './utils/storyProgression';
import './styles/menu.css';

const loadStoryGame = () => import('./components/StoryGame');
const loadShowroom = () => import('./components/PlanetaryShowroom');
const loadSettingsModal = () => import('./components/SettingsModal');
const loadCreditsModal = () => import('./components/CreditsModal');
const loadSourcesModal = () => import('./components/SourcesModal');
const loadTheEndScreen = () => import('./components/TheEndScreen');

const StoryGame = lazy(loadStoryGame);
const PlanetaryShowroom = lazy(loadShowroom);
const SettingsModal = lazy(loadSettingsModal);
const CreditsModal = lazy(loadCreditsModal);
const SourcesModal = lazy(loadSourcesModal);
const TheEndScreen = lazy(loadTheEndScreen);

export default function App() {
  const [activeModal, setActiveModal] = useState(null); // 'settings' | 'credits' | 'sources' | 'spacecraft' | null
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState(null);
  const [inGame, setInGame] = useState(false);
  const [settings, setSettings] = useState(() => readStoredSettings());
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('Opening Mission Logbook');

  // Title screen state (press any key to reveal menu)
  const [isTitleEntered, setIsTitleEntered] = useState(false);

  // Allow resetting story progression via ?reset=1 or ?reset=true query parameter
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.toLowerCase().includes('reset')) {
      resetStoryProgression();
      const url = new URL(window.location.href);
      url.searchParams.delete('reset');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    }
  }, []);

  useEffect(() => installSurfaceAudio(), []);

  // Idle warm-up of core audio and scene backgrounds in background cache
  useEffect(() => {
    const timerId = setTimeout(() => {
      preloadAllCoreAssets(() => {}).catch(() => {});
    }, 1500);
    return () => clearTimeout(timerId);
  }, []);

  // Load settings on initial mount and sync global audio/graphics defaults immediately
  useEffect(() => {
    const normalized = readStoredSettings();
    setSettings(normalized);
    const lang = normalized.language || 'en';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    window.dispatchEvent(
      new CustomEvent('gameSettingsChange', { detail: { ...normalized }, bubbles: true })
    );
  }, []);

  // Update HTML lang and dir whenever language changes
  useEffect(() => {
    const lang = settings?.language || 'en';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [settings?.language]);

  // Support direct entry to story from Arcade lock screen
  useEffect(() => {
    const onRequestStory = () => {
      setActiveModal(null);
      handleStartJourney();
    };
    window.addEventListener('requestStoryStart', onRequestStory);
    return () => window.removeEventListener('requestStoryStart', onRequestStory);
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

  // Launch Journey sequence — loads code bundles, visual-novel paintings, character poses, audio soundtracks, and 3D assets
  const handleStartJourney = async () => {
    setIsLaunching(true);
    setLaunchError(null);
    setLoadProgress(5);
    setLoadingPhase(settings?.language === 'ar' ? 'جاري تهيئة سجل المهمة...' : 'INITIALIZING MISSION LOGBOOK...');

    window.dispatchEvent(
      new CustomEvent('gameAudioCue', {
        detail: { cue: 'start_journey' }
      })
    );

    try {
      // Step 1: Preload code bundles in parallel
      setLoadingPhase(settings?.language === 'ar' ? 'تحميل أرشيف القصة والواجهة...' : 'LOADING NARRATIVE ARCHIVES...');
      await Promise.allSettled([loadStoryGame(), loadShowroom()]);
      setLoadProgress(20);

      // Step 2: Comprehensive preload of images, Luna poses, audio soundtracks, and initial 3D models
      await preloadAllCoreAssets((pct) => {
        const mapped = 20 + Math.round(pct * 0.75);
        setLoadProgress(mapped);
        if (pct < 35) {
          setLoadingPhase(settings?.language === 'ar' ? 'مزامنة المقاطع الصوتية الفضائية...' : 'SYNCHRONIZING AUDIO SOUNDTRACKS...');
        } else if (pct < 70) {
          setLoadingPhase(settings?.language === 'ar' ? 'تخزين رسومات السجل والشخصيات...' : 'CACHING LOGBOOK PAINTINGS & CHARACTERS...');
        } else {
          setLoadingPhase(settings?.language === 'ar' ? 'تحميل مجسمات الفضاء ثلاثية الأبعاد...' : 'PREPARING 3D SPACECRAFT ASSETS...');
        }
      });

      setLoadProgress(100);
      setLoadingPhase(settings?.language === 'ar' ? 'فتح سجل الجد لونا...' : 'OPENING LOGBOOK...');
      setTimeout(() => {
        setInGame(true);
        setIsLaunching(false);
      }, 350);
    } catch (err) {
      console.error('Failed to launch story module:', err);
      setLaunchError(
        settings?.language === 'ar'
          ? 'تعذر تحميل بيانات المهمة. يرجى التحقق من اتصالك والمحاولة مرة أخرى.'
          : 'Unable to load mission assets. Check your connection and retry.'
      );
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
        <StoryGame
          onBackToMenu={() => setInGame(false)}
          onOpenCredits={() => {
            setInGame(false);
            setActiveModal('credits');
          }}
        />
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
          onStartJourney={handleStartJourney}
          onOpenSettings={() => setActiveModal('settings')}
          onOpenCredits={() => setActiveModal('credits')}
          onOpenSources={() => setActiveModal('sources')}
          onOpenSpacecrafts={() => setActiveModal('spacecraft')}
        />

        {/* Cinematic Warp Curtain */}
        <div className="cinematic-curtain" aria-hidden="true" />
      </main>

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
                  <span>{loadProgress}% · {loadingPhase}</span>
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
            onStoryComplete={() => setActiveModal('the_end')}
          />
        </Suspense>
      )}

      {/* The End Screen (Standalone from arcade / direct trigger) */}
      {activeModal === 'the_end' && (
        <Suspense fallback={null}>
          <TheEndScreen
            onJumpToCredits={() => {
              setActiveModal('credits');
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
