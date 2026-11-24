import React, { useState, useEffect, lazy, Suspense } from 'react';
import CosmicBackground from './components/CosmicBackground';
import MainMenu from './components/MainMenu';
import LoadingScreen from './components/LoadingScreen';
import {
  SETTINGS_STORAGE_KEY,
  readStoredSettings,
  normalizeSettings,
} from './constants/settings';
import { installSurfaceAudio } from './audio/surfaceAudio';
import { preloadMainMenuAssets, preloadAllCoreAssets } from './utils/modelCache';
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

  // Main Menu full boot loading screen state (loads fonts, code, audio, images, Draco & all 3D models)
  const [isMenuReady, setIsMenuReady] = useState(false);
  const [isMenuLoaderMounted, setIsMenuLoaderMounted] = useState(true);
  const [menuLoadProgress, setMenuLoadProgress] = useState(4);
  const [menuLoadPhase, setMenuLoadPhase] = useState(() =>
    readStoredSettings().language === 'ar'
      ? 'جاري تهيئة أنظمة المهمة...'
      : 'INITIALIZING MISSION SYSTEMS...'
  );

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

  // Full Main Menu boot sequence — loads fonts, JS modules, Draco decoder, audio, paintings & all 3D menu models
  useEffect(() => {
    let cancelled = false;
    let fadeTimer = null;
    const bootLang = readStoredSettings().language || 'en';

    preloadMainMenuAssets({
      lang: bootLang,
      extraTasks: [
        loadStoryGame,
        loadShowroom,
        loadSettingsModal,
        loadCreditsModal,
        loadSourcesModal,
        loadTheEndScreen,
      ],
      onProgress: (pct) => {
        if (!cancelled) {
          setMenuLoadProgress((prev) => Math.max(prev, pct));
        }
      },
      onPhase: (phaseLabel) => {
        if (!cancelled) {
          setMenuLoadPhase(phaseLabel);
        }
      },
    }).finally(() => {
      if (cancelled) return;
      setMenuLoadProgress(100);
      setIsMenuReady(true);
      fadeTimer = setTimeout(() => {
        if (!cancelled) setIsMenuLoaderMounted(false);
      }, 450);
    });

    return () => {
      cancelled = true;
      if (fadeTimer) clearTimeout(fadeTimer);
    };
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

  // Launch Journey sequence — loads fonts, code bundles, visual-novel paintings, character poses, audio soundtracks, Draco decoder, and 3D assets
  const handleStartJourney = async () => {
    const lang = settings?.language || 'en';
    const isAr = lang === 'ar';
    setIsLaunching(true);
    setLaunchError(null);
    setLoadProgress(5);
    setLoadingPhase(isAr ? 'جاري تهيئة سجل المهمة...' : 'INITIALIZING MISSION LOGBOOK...');

    window.dispatchEvent(
      new CustomEvent('gameAudioCue', {
        detail: { cue: 'start_journey' }
      })
    );

    try {
      // Step 1: Preload all code bundles in parallel
      setLoadingPhase(isAr ? 'تحميل أرشيف القصة والواجهة...' : 'LOADING NARRATIVE & SHOWROOM MODULES...');
      await Promise.allSettled([
        loadStoryGame(),
        loadShowroom(),
        loadTheEndScreen(),
        loadSourcesModal(),
        loadSettingsModal(),
      ]);
      setLoadProgress(22);

      // Step 2: Comprehensive preload of fonts, Draco decoder, audio soundtracks, paintings, Luna poses, and 3D models
      await preloadAllCoreAssets(
        (pct) => {
          const mapped = 22 + Math.round(pct * 0.74);
          setLoadProgress(mapped);
        },
        {
          lang,
          onPhase: (phaseText) => setLoadingPhase(phaseText),
        }
      );

      setLoadProgress(100);
      setLoadingPhase(isAr ? 'فتح سجل الجد لونا...' : 'OPENING MISSION LOGBOOK...');
      setTimeout(() => {
        setInGame(true);
        setIsLaunching(false);
      }, 300);
    } catch (err) {
      console.error('Failed to launch story module:', err);
      setLaunchError(
        isAr
          ? 'تعذر تحميل بيانات المهمة. يرجى التحقق من اتصالك والمحاولة مرة أخرى.'
          : 'Unable to load mission assets. Check your connection and retry.'
      );
    }
  };

  const isAr = settings?.language === 'ar';

  // Keep CosmicBackground animated behind transparent Credits; pause during boot loading, modals, or journey launch
  const bgPaused = Boolean(!isMenuReady || (activeModal && activeModal !== 'credits') || isLaunching);
  const menuTilesPaused = Boolean(!isMenuReady || activeModal || isLaunching);

  // Story Game View
  if (inGame) {
    return (
      <Suspense
        fallback={
          <LoadingScreen
            className="launch-loading-screen"
            title={isAr ? 'تحميل سجل المهمة' : 'LOADING LOGBOOK'}
            kicker={isAr ? 'جاري تهيئة أرشيف المهمة' : 'MISSION ARCHIVE INITIALIZING'}
            subtitle={isAr ? 'مزامنة الرسومات والصوتيات والنماذج...' : 'Synchronizing artwork, audio & 3D assets...'}
            progress={85}
            accent="#ff9a6b"
            dir={isAr ? 'rtl' : 'ltr'}
          />
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
        style={{
          visibility:
            isMenuReady && !isMenuLoaderMounted && (!activeModal || activeModal === 'credits')
              ? 'visible'
              : 'hidden',
        }}
      >
        {/* Forward-Flight Starfield + Floating 3D Crafts Background (mounts once core assets are ready) */}
        {isMenuReady && <CosmicBackground isEntered={isTitleEntered} paused={bgPaused} />}

        {/* Main Menu HUD & Navigation */}
        {isMenuReady && (
          <MainMenu
            isEntered={isTitleEntered}
            isReady={isMenuReady && !isMenuLoaderMounted}
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
        )}

        {/* Cinematic Warp Curtain */}
        <div className="cinematic-curtain" aria-hidden="true" />
      </main>

      {/* Main Menu Boot Loading Screen (No Man's Sky look) */}
      {isMenuLoaderMounted && (
        <LoadingScreen
          id="initial-loading-screen"
          className="initial-loading-screen"
          title={isAr ? 'أنظمة المهمة' : 'ABANDONED BUT NOT FORGOTTEN'}
          kicker={isAr ? 'تهيئة المحطة المدارية' : 'A little space adventure'}
          subtitle={menuLoadPhase}
          progress={menuLoadProgress}
          accent="#ff9a6b"
          isFading={isMenuReady}
          dir={isAr ? 'rtl' : 'ltr'}
        />
      )}

      {isLaunching && !launchError && (
        <LoadingScreen
          id="launch-loading-screen"
          className="launch-loading-screen"
          title={isAr ? 'تجهيز رحلتك الفضائية' : 'PREPARING YOUR JOURNEY'}
          kicker={isAr ? 'جاري تهيئة أرشيف المهمة' : 'MISSION ARCHIVE INITIALIZING'}
          subtitle={loadingPhase}
          progress={loadProgress}
          accent="#ff9a6b"
          dir={isAr ? 'rtl' : 'ltr'}
        />
      )}

      {isLaunching && launchError && (
        <div
          id="launch-loading-screen"
          className="launch-loading-screen"
          role="alert"
          aria-live="assertive"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="launch-loading-card">
            <h1 className="initial-loading-title">
              {isAr ? 'انقطع الاتصال' : 'CONNECTION INTERRUPTED'}
            </h1>
            <p className="initial-loading-details" style={{ justifyContent: 'center', marginBottom: 16 }}>
              <span>{launchError}</span>
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={handleStartJourney}>
                {isAr ? 'إعادة المحاولة' : 'Retry'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsLaunching(false);
                  setLaunchError(null);
                }}
              >
                {isAr ? 'العودة للقائمة' : 'Back to Menu'}
              </button>
            </div>
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
            <LoadingScreen
              className="launch-loading-screen"
              title={isAr ? 'تجهيز حظيرة المركبات ثلاثية الأبعاد' : 'PREPARING 3D HANGAR'}
              kicker={isAr ? 'جاري تهيئة وحدة العرض' : 'SHOWROOM MODULE INITIALIZING'}
              subtitle={isAr ? 'تحميل الواجهة والصوتيات والنماذج...' : 'Loading interface, audio & 3D telemetry...'}
              progress={70}
              accent="#ff9a6b"
              dir={isAr ? 'rtl' : 'ltr'}
            />
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
