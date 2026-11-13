import React, { useState, useEffect, useRef } from 'react';

const BRIEFING_LINES = [
  'Welcome, driver. Four machines were left behind on the Moon and on Mars.',
  'Across the cratered silence, each machine holds telemetry of courage, loneliness, and discovery.',
  'Every machine has a story. Let’s begin.'
];

export default function MissionBriefingDialog({
  isOpen,
  onComplete,
  lines = BRIEFING_LINES,
  speaker = 'MISSION CONTROL',
  ariaLabel = 'Mission Briefing',
  overlayClassName = 'ui-overlay briefing-overlay',
  skipText = 'Click or press Enter · Esc to skip',
  secondaryAction = null
}) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const timerRef = useRef(null);

  const activeLines = Array.isArray(lines) && lines.length > 0 ? lines : BRIEFING_LINES;
  const linesKey = activeLines.join('\n');
  const fullText = activeLines[currentLineIndex] || '';

  useEffect(() => {
    if (!isOpen) return;

    setCurrentLineIndex(0);
    startTyping(activeLines[0] || '');

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, linesKey]);

  const startTyping = (text) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayedText('');
    setIsTypingDone(false);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayedText(text);
      setIsTypingDone(true);
      return;
    }

    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timerRef.current);
        setIsTypingDone(true);
      }
    }, 28);
  };

  const advance = () => {
    if (!isTypingDone) {
      if (timerRef.current) clearInterval(timerRef.current);
      setDisplayedText(fullText);
      setIsTypingDone(true);
      return;
    }

    if (currentLineIndex + 1 < activeLines.length) {
      const nextIdx = currentLineIndex + 1;
      setCurrentLineIndex(nextIdx);
      startTyping(activeLines[nextIdx]);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      onComplete();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        if (timerRef.current) clearInterval(timerRef.current);
        onComplete();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        advance();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isTypingDone, currentLineIndex, fullText, activeLines, onComplete]);

  if (!isOpen) return null;

  return (
    <div
      id="briefing"
      className={overlayClassName}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={advance}
    >
      <p className="ui-skip" id="dlgSkip">
        {skipText}
      </p>

      <div
        className={`ui-dialogue ${isTypingDone ? 'done' : ''}`}
        id="dlg"
        tabIndex={0}
        role="button"
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          advance();
        }}
      >
        <h2 id="dlgName">{speaker}</h2>
        <p id="dlgText" aria-live="polite">
          <span id="dlgVis">{displayedText}</span>
          <span id="dlgGhost" aria-hidden="true" style={{ visibility: 'hidden' }}>
            {fullText}
          </span>
        </p>
        {secondaryAction && (
          <div className="ui-dialogue-actions">
            <button
              id="btn-briefing-secondary"
              type="button"
              className="ui-dialogue-secondary-btn"
              onClick={(e) => {
                e.stopPropagation();
                secondaryAction.onClick?.();
              }}
            >
              {secondaryAction.label}
            </button>
          </div>
        )}
        <span className="ui-cont" aria-hidden="true" />
      </div>
    </div>
  );
}
