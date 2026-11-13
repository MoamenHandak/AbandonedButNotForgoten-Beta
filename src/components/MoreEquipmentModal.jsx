import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Archive, ExternalLink, Radio } from 'lucide-react';
import { getArchiveEquipment, getStoryUiCopy } from '../data/craftStories';
import StatusBadge from './StatusBadge';
import { playServo, playUnlock } from '../audio/surfaceAudio';

const FILTER_KEYS = ['all', 'moon', 'mars', 'deep-space'];

/**
 * Lazy-loaded Task 5 Archive Tray displaying Moon/Mars surface equipment
 * without full 3D models plus the Silent vs. Still Active Deep Space contrast card.
 */
export default function MoreEquipmentModal({
  isOpen,
  onClose,
  lang = 'en',
  onOpenSources,
}) {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState('deep-space-timeline');
  const ui = getStoryUiCopy(lang);
  const entries = getArchiveEquipment(lang);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        playUnlock();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered =
    filter === 'all' ? entries : entries.filter((item) => item.location === filter);

  const toggleExpand = (id) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next) playServo('fly');
      else playUnlock();
      return next;
    });
  };

  return (
    <div
      id="more-equipment-modal"
      className="modal-backdrop story-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="more-equipment-title"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playUnlock();
          onClose();
        }
      }}
    >
      <div className="story-hud-modal story-archive-modal">
        <div className="story-hud-modal-header">
          <div className="story-hud-modal-title-group">
            <span className="story-hud-modal-kicker">
              <Archive size={14} aria-hidden="true" /> {ui.filters[filter] || ui.filters.all}
            </span>
            <h2 id="more-equipment-title" className="story-hud-modal-title">
              {ui.moreEquipmentTitle}
            </h2>
            <p className="story-hud-modal-subtitle">{ui.moreEquipmentSubtitle}</p>
          </div>
          <button
            id="btn-close-more-equipment"
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

        <div className="story-archive-filters" role="tablist" aria-label="Archive Regions">
          {FILTER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={`story-filter-tab ${filter === key ? 'is-active' : ''}`}
              onClick={() => {
                playServo('swipe');
                setFilter(key);
              }}
            >
              {ui.filters[key]}
            </button>
          ))}
        </div>

        <div className="story-archive-scroll">
          <div className="story-archive-grid">
            {filtered.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <article
                  key={item.id}
                  className={`story-archive-card ${
                    item.isContrastTimeline ? 'is-contrast-card' : ''
                  }`}
                >
                  <div className="story-archive-card-top">
                    <span className="story-sector-tag">
                      {ui.locationLabels[item.location] || item.location}
                    </span>
                    <StatusBadge
                      status={item.status}
                      lastVerified={item.lastVerified}
                      lang={lang}
                    />
                  </div>

                  <h3 className="story-archive-card-title">{item.name}</h3>
                  <p className="story-archive-card-operator">{item.operator}</p>
                  <p className="story-archive-card-summary">{item.statusNote}</p>

                  {/* Deep Space Silent vs. Still Active Contrast Timeline */}
                  {item.isContrastTimeline && item.timelineNodes && (
                    <div className="story-contrast-timeline">
                      <span className="story-section-label">
                        <Radio size={12} aria-hidden="true" /> {ui.deepSpaceContrastTitle}
                      </span>
                      <div className="story-timeline-nodes">
                        {item.timelineNodes.map((node) => (
                          <div key={node.id} className="story-timeline-node">
                            <div className="story-timeline-node-head">
                              <strong>{node.name}</strong>
                              <StatusBadge
                                status={node.status}
                                lastVerified={node.checked}
                                lang={lang}
                              />
                            </div>
                            <p>{node.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className={`story-learn-more-btn ${isExpanded ? 'is-open' : ''}`}
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpand(item.id)}
                  >
                    <span>{isExpanded ? ui.showLess : ui.learnMore}</span>
                    <ChevronDown size={14} className="story-chevron-icon" aria-hidden="true" />
                  </button>

                  {isExpanded && (
                    <div className="story-sections-stack">
                      <div className="story-section-item">
                        <span className="story-section-label">{ui.sectionLabels.question}</span>
                        <p className="story-section-copy">{item.story.question}</p>
                      </div>
                      <div className="story-section-item">
                        <span className="story-section-label">{ui.sectionLabels.device}</span>
                        <p className="story-section-copy">{item.story.device}</p>
                      </div>
                      <div className="story-section-item">
                        <span className="story-section-label">{ui.sectionLabels.experiment}</span>
                        <p className="story-section-copy">{item.story.experiment}</p>
                      </div>
                      <div className="story-section-item">
                        <span className="story-section-label">{ui.sectionLabels.discovery}</span>
                        <p className="story-section-copy">{item.story.discovery}</p>
                      </div>
                      <div className="story-section-item">
                        <span className="story-section-label">{ui.sectionLabels.ending}</span>
                        <p className="story-section-copy">{item.story.ending}</p>
                      </div>
                      <div className="story-section-item story-verify-box">
                        <span className="story-section-label">{ui.sectionLabels.verify}</span>
                        <div className="story-verify-meta">
                          <div>
                            <strong>{ui.launchLabel}:</strong> {item.launch}
                          </div>
                          <div>
                            <strong>{ui.landingLabel}:</strong> {item.landing}
                          </div>
                        </div>
                        {item.sources.length > 0 && (
                          <ul className="story-source-mini-list">
                            {item.sources.map((src) => (
                              <li key={src.id}>
                                <a href={src.url} target="_blank" rel="noopener noreferrer">
                                  <span>{src.label}</span>
                                  <ExternalLink size={11} aria-hidden="true" />
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        <div className="story-hud-modal-footer">
          {onOpenSources && (
            <button
              type="button"
              className="story-inline-link-btn"
              onClick={() => {
                playServo('fly');
                onOpenSources();
              }}
            >
              {ui.viewAllSources}
            </button>
          )}
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
