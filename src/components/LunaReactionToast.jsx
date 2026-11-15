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
    <div
      className={`showroom-luna-dialogue-container ${reaction.type}`}
      dir={isArabic ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="false"
      aria-label="Luna Reaction"
      onClick={() => setReaction(null)}
    >
      {/* Luna Character Cut-Out standing at bottom */}
      <div className="showroom-luna-cutout" aria-hidden="true">
        <picture>
          <source srcSet={resolveAssetUrl(`/assets/story/luna/luna_${reaction.pose}.webp`)} type="image/webp" />
          <img
            src={resolveAssetUrl(`/assets/story/luna/luna_${reaction.pose}.webp`)}
            alt="Luna the explorer"
            className="story-character-cutout-img"
          />
        </picture>
      </div>

      {/* Story-Style Visual Novel Dialogue Box at bottom */}
      <div className="showroom-luna-dialogue-wrapper">
        <div className="story-dialogue-box">
          <div className="dialogue-character-name" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="character-name-text">{isArabic ? 'لونا' : 'LUNA'}</span>
              <span className="character-role-text">
                {' // '}
                {isPositive
                  ? (isArabic ? 'تأكيد القياس' : 'TELEMETRY SYNC')
                  : (isArabic ? 'ملاحظة ميدانية' : 'FIELD NOTE')}
              </span>
            </div>
            <button
              type="button"
              className="details-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setReaction(null);
              }}
              aria-label="Close"
              title="Close"
              style={{ padding: '4px', cursor: 'pointer', background: 'transparent', border: 'none', color: '#ffffff', opacity: 0.8 }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="dialogue-line-text">
            {formatMarkupText(reaction.text, 'markup-bold')}
          </div>

          <div className="dialogue-bottom-row" style={{ marginTop: '8px' }}>
            <span className="dialogue-advance-prompt">
              <span>{isArabic ? 'انقر في أي مكان للمتابعة' : 'CLICK ANYWHERE TO DISMISS'}</span>
              <span>▼</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
