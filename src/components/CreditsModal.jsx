import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useActiveLanguage } from '../data/craftStories';
import { getTranslations } from '../constants/translations';

export default function CreditsModal({ isOpen, onClose }) {
  const [isPaused, setIsPaused] = useState(false);
  const [isHandheld, setIsHandheld] = useState(false);
  const activeLang = useActiveLanguage();
  const t = getTranslations(activeLang).credits;

  // Space Music for Credits (Item 7)
  useEffect(() => {
    if (!isOpen) return;
    window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'credits_music' } }));
    return () => {
      window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'credits_music_stop' } }));
      // Return back to menu music when closing credits
      window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'menu_music' } }));
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
      {isHandheld && (
        <button
          type="button"
          className="credits-close"
          onClick={onClose}
          aria-label={t.close}
        >
          <X size={16} />
          <span>{t.close}</span>
        </button>
      )}

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

          <div className="cr-block">
            <span className="cr-role">{t.roles?.coreDev || 'Core Developer'}</span>
            <h3 className="cr-name">Moamen</h3>
          </div>
          <div className="cr-block">
            <span className="cr-role">{t.roles?.projectLead || 'Project Manager & Leader'}</span>
            <h3 className="cr-name">Joudy Elgebally</h3>
          </div>
          <div className="cr-block">
            <span className="cr-role">{t.roles?.designer || 'Designer & Presenter'}</span>
            <h3 className="cr-name">Sara Ibrahim</h3>
          </div>
          <div className="cr-block">
            <span className="cr-role">{t.roles?.researcher || 'Researcher'}</span>
            <h3 className="cr-name">Hanaa Salim</h3>
          </div>
          <div className="cr-block">
            <span className="cr-role">{t.roles?.contributors || 'Contributors'}</span>
            <h3 className="cr-name">Ammar</h3>
            <h3 className="cr-name">Rosal Emad</h3>
          </div>

          <div className="cr-block cr-memory">
            <span className="cr-role">{t.roles?.memoryTitle || 'In memory of the machines'}</span>
            <p className="cr-line">Lunar Roving Vehicle</p>
            <p className="cr-line">Mars Exploration Rover</p>
            <p className="cr-line">Ingenuity Mars Helicopter</p>
            <p className="cr-line">Viking 1 Lander</p>
          </div>

          <div className="cr-block">
            <span className="cr-role">{t.roles?.specialThanks || 'Special Thanks'}</span>
            <p className="cr-thanks">To every machine left among the stars</p>
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
    </div>
  );
}
