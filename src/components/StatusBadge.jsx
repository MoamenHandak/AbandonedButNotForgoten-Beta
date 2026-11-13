import React from 'react';
import { PauseCircle, Sparkles, Radio, HelpCircle } from 'lucide-react';
import { getStoryUiCopy } from '../data/craftStories';

const STATUS_ICONS = {
  halted: PauseCircle,
  'passive-useful': Sparkles,
  active: Radio,
  unverified: HelpCircle,
};

/**
 * Reusable HUD status badge + verified date chip unified under the
 * monochrome NMSGeoSans / NMSFuturaProBook UI style.
 */
export default function StatusBadge({
  status = 'unverified',
  lastVerified = '',
  lang = 'en',
  showVerified = true,
  className = '',
}) {
  const ui = getStoryUiCopy(lang);
  const normalized = STATUS_ICONS[status] ? status : 'unverified';
  const Icon = STATUS_ICONS[normalized];
  const label = ui.statusLabels[normalized] || ui.statusLabels.unverified;

  return (
    <div className={`story-status-row ${className}`.trim()}>
      <span
        className={`story-status-badge status-${normalized}`}
        data-status={normalized}
      >
        <Icon size={12} strokeWidth={2.1} aria-hidden="true" />
        <span>{label}</span>
      </span>
      {showVerified && lastVerified && (
        <span className="story-verified-chip">
          {ui.verifiedChipPrefix}: {lastVerified}
        </span>
      )}
    </div>
  );
}
