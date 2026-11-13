import React, { useEffect } from 'react';
import { X, ShieldCheck, ExternalLink } from 'lucide-react';
import { getAllCraftSources, getStoryUiCopy } from '../data/craftStories';
import { playUnlock } from '../audio/surfaceAudio';

/**
 * Lazy-loaded verification sources modal following the CreditsModal/SettingsModal pattern.
 * Linked both from the showroom dossier VERIFY section and from MainMenu -> Sources.
 */
export default function SourcesModal({ isOpen, onClose, lang = 'en' }) {
  const ui = getStoryUiCopy(lang);
  const sources = getAllCraftSources(lang);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        playUnlock();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="sources-modal"
      className="modal-backdrop story-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sources-modal-title"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playUnlock();
          onClose();
        }
      }}
    >
      <div className="story-hud-modal story-sources-modal">
        <div className="story-hud-modal-header">
          <div className="story-hud-modal-title-group">
            <span className="story-hud-modal-kicker">
              <ShieldCheck size={14} aria-hidden="true" /> {ui.sourcesLabel}
            </span>
            <h2 id="sources-modal-title" className="story-hud-modal-title">
              {ui.sourcesModalTitle}
            </h2>
            <p className="story-hud-modal-subtitle">{ui.sourcesModalSubtitle}</p>
          </div>
          <button
            id="btn-close-sources"
            type="button"
            className="story-hud-close-btn"
            aria-label={ui.closeLabel}
            onClick={() => {
              playUnlock();
              onClose();
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="story-archive-scroll">
          <ul className="story-sources-full-list">
            {sources.map((src) => (
              <li key={src.id} className="story-source-record">
                <div className="story-source-record-main">
                  <span className="story-source-record-title">{src.label}</span>
                  <span className="story-source-record-url">{src.url}</span>
                </div>
                <div className="story-source-record-meta">
                  <span className="story-verified-chip">
                    {ui.accessedLabel}: {src.accessed}
                  </span>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="story-source-open-btn"
                  >
                    <span>{ui.openExternal}</span>
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="story-hud-modal-footer">
          <button
            type="button"
            className="story-modal-action-btn"
            onClick={() => {
              playUnlock();
              onClose();
            }}
          >
            {ui.closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
