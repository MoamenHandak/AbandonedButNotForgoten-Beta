import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function CreditsModal({ isOpen, onClose }) {
  const [isPaused, setIsPaused] = useState(false);
  const [isHandheld, setIsHandheld] = useState(false);

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
    >
      {isHandheld && (
        <button
          type="button"
          className="credits-close"
          onClick={onClose}
          aria-label="Close Credits"
        >
          <X size={16} />
          <span>CLOSE</span>
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
          <p className="cr-kicker">A production by</p>
          <h2 id="credits-title" className="cr-title">ABANDONED BUT NOT FORGOTTEN</h2>
          <p className="cr-tag">Every machine has a story</p>
          <span className="cr-diamond" aria-hidden="true" />

          <div className="cr-block">
            <span className="cr-role">Core Developer</span>
            <h3 className="cr-name">Moamen</h3>
          </div>
          <div className="cr-block">
            <span className="cr-role">Project Manager &amp; Leader</span>
            <h3 className="cr-name">Joudy Elgebally</h3>
          </div>
          <div className="cr-block">
            <span className="cr-role">Designer &amp; Presenter</span>
            <h3 className="cr-name">Sara Ibrahim</h3>
          </div>
          <div className="cr-block">
            <span className="cr-role">Researcher</span>
            <h3 className="cr-name">Hanaa Salim</h3>
          </div>
          <div className="cr-block">
            <span className="cr-role">Contributors</span>
            <h3 className="cr-name">Ammar</h3>
            <h3 className="cr-name">Rosal Emad</h3>
          </div>

          <div className="cr-block cr-memory">
            <span className="cr-role">In memory of the machines</span>
            <p className="cr-line">Lunar Roving Vehicle</p>
            <p className="cr-line">Mars Exploration Rover</p>
            <p className="cr-line">Ingenuity Mars Helicopter</p>
            <p className="cr-line">Viking 1 Lander</p>
          </div>

          <div className="cr-block">
            <span className="cr-role">Special thanks</span>
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
