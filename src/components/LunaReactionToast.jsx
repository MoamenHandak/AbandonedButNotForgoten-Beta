import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { getTranslations } from '../constants/translations';
import { resolveAssetUrl } from '../utils/modelCache';
import { formatMarkupText } from '../utils/textMarkup';

/**
 * Non-blocking visual novel reaction toast featuring Luna.
 * Appears dynamically when quizzes are answered, sectors finished, or campaign won.
 */
export default function LunaReactionToast({ lang = 'en' }) {
  const [reaction, setReaction] = useState(null); // { type, text, pose }
  const timerRef = useRef(null);

  const t = getTranslations(lang).story;
  const reactionsData = t.lunaReactions || {};
  const isArabic = lang === 'ar';

  useEffect(() => {
    const handleReaction = (e) => {
      const detail = e.detail || {};
      const type = detail.type || 'correct';
      let text = '';
      let pose = 'curious';

      if (type === 'correct') {
        const pool = reactionsData.correct || [
          'Telemetry verified! That machine just blinked back to life in our records!'
        ];
        text = pool[Math.floor(Math.random() * pool.length)];
        pose = 'wonder';
      } else if (type === 'wrong') {
        const pool = reactionsData.wrong || [
          "Signal lost in static... Let's recalibrate and check the mission task log again!"
        ];
        text = pool[Math.floor(Math.random() * pool.length)];
        pose = 'curious';
      } else if (type === 'sector_complete') {
        const dest = detail.destination || 'moon';
        text = reactionsData.sectorComplete?.[dest] || 'Sector telemetry secured!';
        pose = 'surprised';
      } else if (type === 'campaign_complete') {
        text = reactionsData.campaignComplete || 'All explorers documented!';
        pose = 'wonder';
      }

      if (timerRef.current) clearTimeout(timerRef.current);

      setReaction({
        type,
        text,
        pose,
        id: Date.now()
      });

      // Auto-dismiss after 7 seconds
      timerRef.current = setTimeout(() => {
        setReaction(null);
      }, 7000);
    };

    window.addEventListener('lunaQuizReaction', handleReaction);
    return () => {
      window.removeEventListener('lunaQuizReaction', handleReaction);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reactionsData]);

  if (!reaction) return null;

  const isPositive = reaction.type === 'correct' || reaction.type === 'sector_complete' || reaction.type === 'campaign_complete';

  return (
    <aside
      className={`luna-reaction-toast ${reaction.type} ${isArabic ? 'is-rtl' : ''}`}
      role="status"
      aria-live="polite"
      dir={isArabic ? 'rtl' : 'ltr'}
      onClick={() => setReaction(null)}
    >
      <div className="luna-toast-avatar-frame">
        <img
          src={resolveAssetUrl(`/assets/story/luna/luna_${reaction.pose}.webp`)}
          alt="Luna Reaction"
          className="luna-toast-avatar-img"
        />
        <div className={`luna-toast-badge ${isPositive ? 'is-positive' : 'is-warning'}`}>
          {isPositive ? <Sparkles size={11} /> : <AlertCircle size={11} />}
        </div>
      </div>

      <div className="luna-toast-body">
        <div className="luna-toast-header">
          <span className="luna-toast-speaker">
            {isArabic ? 'لونا' : 'LUNA'}
          </span>
          <span className="luna-toast-role">
            // {isPositive
              ? (isArabic ? 'تأكيد القياس' : 'TELEMETRY SYNC')
              : (isArabic ? 'ملاحظة ميدانية' : 'FIELD NOTE')}
          </span>
          <button
            type="button"
            className="luna-toast-close"
            onClick={(e) => {
              e.stopPropagation();
              setReaction(null);
            }}
            aria-label="Dismiss message"
          >
            <X size={13} />
          </button>
        </div>

        <p className="luna-toast-text">
          {formatMarkupText(reaction.text, 'luna-bold-kw')}
        </p>
      </div>
    </aside>
  );
}
