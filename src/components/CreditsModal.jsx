import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useActiveLanguage } from '../data/craftStories';
import { getTranslations } from '../constants/translations';

export default function CreditsModal({ isOpen, onClose }) {
  const [isPaused, setIsPaused] = useState(false);
  const [isHandheld, setIsHandheld] = useState(false);
  const activeLang = useActiveLanguage();
  const t = getTranslations(activeLang).credits;

  // Space Music for Credits (carries on Moon/Mars music if active, or plays credits theme)
  useEffect(() => {
    if (!isOpen) return;
    window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'credits_music' } }));
    return () => {
      window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'credits_music_stop' } }));
    };
  }, [isOpen]);

  useEffect(() => {
    const checkHandheld = () => {
      const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      const isMobileUA = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(navigator.userAgent);
      setIsHandheld(Boolean(hasTouch && isMobileUA));
    };
    checkHandheld();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        setIsPaused((prev) => !prev);
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="credits-modal"
      className={`modal-backdrop credits-screen is-active ${isPaused ? 'is-paused' : ''} ${isHandheld ? 'is-handheld' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credits-title"
      dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
    >
      <button
        id="btn-close-credits-x"
        type="button"
        className="credits-close"
        onClick={onClose}
        aria-label={t.close || 'Close credits'}
      >
        <X size={16} style={{ width: 16, height: 16 }} />
        <span>{t.close || 'Close'}</span>
      </button>

      <div
        id="credits-stage"
        className="credits-stage"
        onPointerDown={() => setIsPaused(true)}
        onPointerUp={() => setIsPaused(false)}
        onPointerLeave={() => setIsPaused(false)}
        onPointerCancel={() => setIsPaused(false)}
      >
        <div className="credits-roll">
          <p className="cr-kicker">{t.kicker}</p>
          <h2 id="credits-title" className="cr-title">{t.title}</h2>
          <p className="cr-tag">{t.tag}</p>
          <span className="cr-diamond" aria-hidden="true" />

          {/* Team Attribution */}
          <div className="cr-block cr-team team" id="team">
            <span className="cr-role">{t.roles?.team || (activeLang === 'ar' ? 'الفريق' : 'TEAM')}</span>
            <h3 className="cr-name cr-team-name">{t.roles?.teamName || 'Beyond The Dust'}</h3>
          </div>

          <div className="cr-block">
            <span className="cr-role">{t.roles?.projectLead || 'Project Manager & Leader'}</span>
            <h3 className="cr-name">Joudy Elgebally</h3>
          </div>
          <div className="cr-block">
            <span className="cr-role">{t.roles?.coreDev || 'Developers'}</span>
            <h3 className="cr-name">Moamen Handak</h3>
            <h3 className="cr-name">Ammar</h3>
          </div>
          <div className="cr-block">
            <span className="cr-role">{t.roles?.designer || 'Designer & Presenter'}</span>
            <h3 className="cr-name">Sara Ibrahim</h3>
            <h3 className="cr-name">Rosal Emad</h3>
          </div>
          <div className="cr-block">
            <span className="cr-role">{t.roles?.researcher || 'Researcher'}</span>
            <h3 className="cr-name">Ahmed</h3>
          </div>

          {/* 3D Model Providers & Digital Archives */}
          <div className="cr-block cr-providers">
            <span className="cr-role">{t.roles?.modelProviders || '3D Model Providers & Digital Archives'}</span>
            <div className="cr-provider-item">
              <h3 className="cr-provider-name">{t.providers?.nasaTitle || 'NASA 3D Resources'}</h3>
              <p className="cr-provider-desc">
                {t.providers?.nasaDesc || 'NASA Science Visualization Studio, JPL, Ames, Langley, and Goddard Space Flight Center'}
              </p>
            </div>
            <div className="cr-provider-item">
              <h3 className="cr-provider-name">{t.providers?.sketchfabTitle || 'Sketchfab 3D Community'}</h3>
              <p className="cr-provider-desc">
                {t.providers?.sketchfabDesc || 'Historical spacecraft reconstructions and planetary open-source telemetry'}
              </p>
            </div>
          </div>

          {/* Soundtracks & Audio Attribution */}
          <div className="cr-block cr-music">
            <span className="cr-role">{t.roles?.music || 'Music & Soundtracks'}</span>
            <div className="cr-provider-item">
              <h3 className="cr-provider-name">{t.musicCredits?.title || 'Original Soundtracks via YouTube'}</h3>
              <p className="cr-provider-desc">
                {t.musicCredits?.desc || 'Featuring atmospheric space ambient music, prologue visual-novel narrative score, and 3D planetary exploration themes sourced from YouTube creators.'}
              </p>
            </div>
          </div>

          {/* Spacecrafts & Robotic Pioneers */}
          <div className="cr-block cr-memory">
            <span className="cr-role">{t.roles?.memoryTitle || 'In memory of the machines'}</span>
            <div className="cr-crafts-grid">
              {(t.machines || [
                { name: 'Apollo Lunar Roving Vehicle (LRV)', subtitle: 'Hadley-Apennine, Moon • Apollo 15' },
                { name: 'Apollo 15 Lunar Module Falcon', subtitle: 'Descent Stage Launch Platform, Moon' },
                { name: 'Lunar Reconnaissance Orbiter (LRO)', subtitle: 'High-Resolution Lunar Polar Mapping Orbit' },
                { name: 'LADEE Atmosphere Explorer', subtitle: 'Exosphere & Laser Communications Demonstration' },
                { name: 'Mars Exploration Rover Opportunity', subtitle: 'Meridiani Planum & Perseverance Valley, Mars' },
                { name: 'Ingenuity Mars Helicopter', subtitle: 'First Powered Flight on Another World • Jezero Crater' },
                { name: 'Viking 1 Lander', subtitle: 'First Long-Duration Science Station on Mars • Chryse Planitia' },
                { name: 'InSight Mars Lander', subtitle: 'Geophysical Pulse & Martian Seismology • Elysium Planitia' },
                { name: 'Mars Global Surveyor (MGS)', subtitle: 'First Comprehensive Global Mapping of the Red Planet' },
                { name: '2001 Mars Odyssey', subtitle: "Humanity's Longest-Serving Scout in Deep Space" },
                { name: 'Mars Reconnaissance Orbiter (MRO)', subtitle: 'High-Resolution HiRISE Cartography & Surface Relay' },
                { name: 'MAVEN Atmospheric Observatory', subtitle: 'Upper Atmosphere Volatiles & Planetary History' },
              ]).map((craft, idx) => (
                <div key={idx} className="cr-craft-card">
                  <h4 className="cr-craft-title">{craft.name}</h4>
                  <p className="cr-craft-sub">{craft.subtitle}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="cr-block">
            <span className="cr-role">{t.roles?.specialThanks || 'Special Thanks'}</span>
            <p className="cr-thanks">
              {t.specialThanksMsg || 'To NASA, the open-source community, and every machine left among the stars'}
            </p>
          </div>

          <p className="cr-end">Explore &bull; Discover &bull; Remember</p>
        </div>
      </div>

      <div className="credits-foot">
        <p className="credits-prompt" onClick={onClose} style={{ cursor: 'pointer' }}>
          <span className="cp-key">
            Press <span className="cp-k">Esc</span> or <span className="cp-k">Space</span> to pause · Click to go back
          </span>
          <span className="cp-touch">Tap anywhere to go back</span>
        </p>
      </div>

      {/* Kept (hidden) so scripts/tests looking for #btn-close-credits still find it */}
      <button id="btn-close-credits" type="button" className="credits-back" hidden tabIndex={-1} aria-hidden="true" onClick={onClose}>
        Back to menu
      </button>
    </div>
  );
}
