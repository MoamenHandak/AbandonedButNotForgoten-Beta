import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useActiveLanguage } from '../data/craftStories';
import Starfield from './Starfield';
import '../styles/story.css';

/**
 * Cinematic "The End" screen shown upon concluding the story / campaign.
 * Styled in the exact No Man's Sky starting screen aesthetic:
 * - Warm dark cosmos background with crimson horizon glow
 * - Reusable forward-flight Starfield canvas and drifting space dust particles
 * - Elegant geometric typography (--font-ui / --font-display) with soft warm aura
 * - "Press any key to proceed" / "Click anywhere to proceed" functionality
 * - Auto-advance progress indicator with pause-on-hold capability
 */
export default function TheEndScreen({ onJumpToCredits }) {
  const activeLang = useActiveLanguage();
  const isArabic = activeLang === 'ar';
  const hasJumpedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  const handleJump = useCallback(() => {
    if (hasJumpedRef.current) return;
    hasJumpedRef.current = true;
    if (onJumpToCredits) onJumpToCredits();
  }, [onJumpToCredits]);

  useEffect(() => {
    // Play warm emotional credits music
    window.dispatchEvent(new CustomEvent('gameAudioCue', { detail: { cue: 'credits_music' } }));

    // Auto-advance progress bar over 6.5 seconds
    const duration = 6500;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      if (isPausedRef.current) return;
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          handleJump();
          return 100;
        }
        return next;
      });
    }, interval);

    // Any key press immediately proceeds to credits
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      e.preventDefault();
      handleJump();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleJump]);

  return (
    <div
      className="the-end-screen nms-end-screen"
      dir={isArabic ? 'rtl' : 'ltr'}
      role="region"
      aria-label="The End Screen"
      onClick={handleJump}
      onPointerDown={() => setIsPaused(true)}
      onPointerUp={() => setIsPaused(false)}
    >
      {/* Warm dark nebula background + stars + space dust + horizon glow */}
      <div className="cosmos-background" aria-hidden="true">
        <div className="nebula-layer" />
        <Starfield speed={1.6} warp={progress > 95} paused={isPaused} />
        <div className="stars-deep-layer" />
        <div className="stars-mid-layer" />
        <div className="stars-foreground-layer" />
        <div className="space-particles">
          <span className="particle p-1" />
          <span className="particle p-2" />
          <span className="particle p-3" />
          <span className="particle p-4" />
          <span className="particle p-5" />
          <span className="particle p-6" />
          <span className="particle p-7" />
          <span className="particle p-8" />
        </div>
        <div className="nms-horizon-glow" />
      </div>

      <div className="the-end-vignette" />

      {/* Main Content Container */}
      <div className="the-end-content">
        {/* Main Title */}
        <h1 className="the-end-title">
          {isArabic ? 'النـهـايـة' : 'THE END'}
        </h1>

        {/* Diamond Divider */}
        <div className="the-end-diamond" aria-hidden="true">
          <span className="the-end-line" />
          <span className="the-end-gem">◇</span>
          <span className="the-end-line" />
        </div>

        {/* Subtitle */}
        <h2 className="the-end-subtitle">
          {isArabic ? 'متروكة ولكن لا تُنسى' : 'ABANDONED BUT NOT FORGOTTEN'}
        </h2>

        {/* Cinematic Quote */}
        <p className="the-end-quote">
          {isArabic
            ? '«لكل آلة حلّقت وراء الغبار، ولكل رائد تجرأ على النظر إلى النجوم.»'
            : '"To every machine that reached beyond the dust, and every pioneer who dared to look up."'}
        </p>

        {/* Starting-Screen Style Prompt */}
        <div className="the-end-auto-hint">
          <span className="the-end-prompt-pulse">
            {isArabic
              ? 'اضغط أي مفتاح أو انقر في أي مكان للمتابعة'
              : 'PRESS ANY KEY OR CLICK ANYWHERE TO CONTINUE'}
          </span>
        </div>
      </div>

      {/* Thin bottom progress bar matching the NMS loading / start style */}
      <div className="the-end-progress-bar" aria-hidden="true">
        <div
          className="the-end-progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Bottom corner auto-jump text */}
      <div className="the-end-foot-info" aria-hidden="true">
        <span>{isPaused ? (isArabic ? 'موقّف مؤقتاً للقراءة' : 'PAUSED') : `${Math.round(progress)}%`}</span>
      </div>
    </div>
  );
}
