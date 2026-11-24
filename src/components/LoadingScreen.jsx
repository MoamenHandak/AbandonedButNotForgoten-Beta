import React, { useEffect, useState, useMemo } from 'react';
import Starfield from './Starfield';

/**
 * Reusable No Man's Sky styled LoadingScreen component.
 *
 * Props:
 * - title: Screen title (e.g. "ABANDONED BUT NOT FORGOTTEN", "THE MOON", "MARS")
 * - subtitle: Current loading stage / status text
 * - kicker: Small header line above the title (default "A little space adventure")
 * - foot: Bottom text (default "Every machine has a story")
 * - progress: Number 0 to 100
 * - accent: Accent color (default #ff9a6b, Moon #9fd0ff, Mars #ff7a4a)
 * - onDone: Optional callback fired when progress reaches 100% after brief warp
 * - isFading: Boolean to trigger 500ms fade-out
 * - id: DOM ID (default 'initial-loading-screen')
 * - className: Additional CSS classes
 * - embeddedStarfield: Whether to render the Starfield internally (default true)
 * - dir: 'ltr' | 'rtl'
 */
export default function LoadingScreen({
  id = 'initial-loading-screen',
  className = '',
  title = 'ABANDONED BUT NOT FORGOTTEN',
  kicker = 'A little space adventure',
  subtitle = 'INITIALIZING MISSION SYSTEMS...',
  foot = 'Every machine has a story',
  progress = 0,
  accent = '#ff9a6b',
  onDone,
  isFading = false,
  embeddedStarfield = true,
  dir = 'ltr',
}) {
  const [warp, setWarp] = useState(false);
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  // Calculate forward speed: ease from 1.6 at 0% up to ~5.0 at 99%, or warp speed at 100%
  const currentSpeed = useMemo(() => {
    if (warp || clampedProgress >= 100) return 24;
    return 1.6 + (clampedProgress / 100) * 3.4;
  }, [clampedProgress, warp]);

  useEffect(() => {
    if (clampedProgress >= 100 && !warp) {
      setWarp(true);
      if (onDone) {
        const timer = setTimeout(() => {
          onDone();
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [clampedProgress, warp, onDone]);

  // Horizon glow style dynamically influenced by destination accent
  const horizonStyle = useMemo(() => {
    if (!accent) return undefined;
    return {
      background: `linear-gradient(0deg, ${accent}80 0%, ${accent}33 45%, transparent 100%)`,
    };
  }, [accent]);

  const titleGlowStyle = useMemo(() => {
    if (!accent) return undefined;
    return {
      textShadow: `0 0 35px ${accent}80, 0 0 80px ${accent}40`,
    };
  }, [accent]);

  const barGlowStyle = useMemo(() => {
    const shadowColor = accent ? `${accent}99` : 'rgba(255, 255, 255, 0.7)';
    return {
      width: `${clampedProgress}%`,
      boxShadow: `0 0 12px ${shadowColor}`,
    };
  }, [clampedProgress, accent]);

  const spinnerStyle = useMemo(() => {
    return {
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderTopColor: accent || '#ffffff',
      boxShadow: `0 0 8px ${accent ? accent + '80' : 'rgba(255, 255, 255, 0.5)'}`,
    };
  }, [accent]);

  return (
    <div
      id={id}
      className={`nms-loading-screen ${isFading ? 'is-fading' : ''} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`${title}: ${clampedProgress}%`}
      dir={dir}
    >
      {/* Warm dark nebula background + stars + horizon glow */}
      <div className="cosmos-background" aria-hidden="true">
        <div className="nebula-layer" />
        {embeddedStarfield && <Starfield speed={currentSpeed} warp={warp} />}
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
        <div className="nms-horizon-glow" style={horizonStyle} />
      </div>

      {/* Center Title, Kicker & Subtitle Status line — matches .nms-splash coordinates exactly */}
      <section className="nms-splash nms-loading-splash" aria-hidden="true">
        {kicker && <p className="nms-splash-kicker">{kicker}</p>}
        <h1 className="nms-splash-title" style={titleGlowStyle}>
          {title}
        </h1>
        {subtitle && (
          <p className="nms-splash-prompt nms-loading-status-prompt">
            <span className="nms-prompt-key">{subtitle}</span>
          </p>
        )}
        {foot && <p className="nms-splash-foot">{foot}</p>}
      </section>

      {/* Bottom Right Corner: Spinner + Percentage */}
      <div className="nms-loading-hud-corner" aria-hidden="true">
        <div className="nms-loading-spinner" style={spinnerStyle} />
        <span className="nms-loading-percentage">{clampedProgress}%</span>
      </div>

      {/* Bottom Edge: Full-width progress bar */}
      <div className="nms-loading-progress-bar" aria-hidden="true">
        <div className="nms-loading-progress-fill" style={barGlowStyle} />
      </div>
    </div>
  );
}
