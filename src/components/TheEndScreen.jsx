import React, { useEffect, useRef } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useActiveLanguage } from '../data/craftStories';
import { getTranslations } from '../constants/translations';
import '../styles/story.css';

/**
 * Cinematic "The End" screen shown upon concluding the story / campaign.
 * Automatically jumps to the credits roll after a cinematic pause,
 * or immediately when clicked / on keypress.
 */
export default function TheEndScreen({ onJumpToCredits }) {
  const activeLang = useActiveLanguage();
  const isArabic = activeLang === 'ar';
  const hasJumpedRef = useRef(false);

  const handleJump = () => {
    if (hasJumpedRef.current) return;
    hasJumpedRef.current = true;
    if (onJumpToCredits) onJumpToCredits();
  };

  useEffect(() => {
    // Play warm emotional credits music
    window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'credits_music' } }));

    // Automatically jump to credits after 3.8 seconds
    const timer = setTimeout(() => {
      handleJump();
    }, 3800);

    const handleKeyDown = (e) => {
      if (['Space', 'Enter', 'Escape'].includes(e.code) || e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        handleJump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      className="the-end-screen"
      dir={isArabic ? 'rtl' : 'ltr'}
      role="region"
      aria-label="The End Screen"
      onClick={handleJump}
    >
      <div className="the-end-vignette" />

      <div className="the-end-content">
        <div className="the-end-badge">
          <Sparkles size={14} />
          <span>{isArabic ? '★ اكتملت المهمة // نهاية القصة ★' : '★ MISSION COMPLETE // JOURNEY CONCLUDED ★'}</span>
        </div>

        <h1 className="the-end-title">
          {isArabic ? 'النـهـايـة' : 'THE END'}
        </h1>

        <div className="the-end-diamond" aria-hidden="true">
          <span className="the-end-line" />
          <span className="the-end-gem">◇</span>
          <span className="the-end-line" />
        </div>

        <h2 className="the-end-subtitle">
          {isArabic ? 'متروكة ولكن لا تُنسى' : 'ABANDONED BUT NOT FORGOTTEN'}
        </h2>

        <p className="the-end-quote">
          {isArabic
            ? '«لكل آلة حلّقت وراء الغبار، ولكل رائد تجرأ على النظر إلى النجوم.»'
            : '"To every machine that reached beyond the dust, and every pioneer who dared to look up."'}
        </p>

        <div className="the-end-team-signature">
          <span className="the-end-team-label">{isArabic ? 'إنتاج' : 'BY'}</span>
          <span className="the-end-team-name">BEYOND THE DUST</span>
        </div>

        <button
          type="button"
          className="the-end-jump-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleJump();
          }}
        >
          <span>{isArabic ? 'الانتقال إلى شارة النهاية ←' : 'PROCEED TO CREDITS →'}</span>
          <ArrowRight size={16} style={{ transform: isArabic ? 'rotate(180deg)' : 'none' }} />
        </button>

        <p className="the-end-auto-hint">
          {isArabic
            ? 'الانتقال إلى شارة النهاية تلقائياً... (انقر في أي مكان للمتابعة فوراً)'
            : 'Jumping to credits automatically... (Click anywhere to continue)'}
        </p>
      </div>
    </div>
  );
}
