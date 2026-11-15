import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatMarkupText } from '../utils/textMarkup';

/**
 * TypewriterText:
 * - Smoothly types text in with throttled WebAudio blips.
 * - For Arabic, advances word-by-word to preserve Arabic cursive ligatures & shaping.
 * - For English/Latin, advances character-by-character.
 * - Strips and renders **bold** tags cleanly even during typing.
 */
export default function TypewriterText({
  text = '',
  speed = 22,
  isArabic = false,
  isLogbook = false,
  onComplete,
  className = '',
  boldClass = 'markup-bold'
}) {
  // Pre-parse the text into plain text for character counting
  // and keep track of where ** tags are so we never render raw asterisks.
  const parsedData = useMemo(() => {
    const raw = text || '';
    // Extract tokens
    const tokens = [];
    let plainText = '';
    const regex = /(\*\*[^*]+\*\*)/g;
    let lastIdx = 0;
    let match;

    while ((match = regex.exec(raw)) !== null) {
      if (match.index > lastIdx) {
        const plainSegment = raw.slice(lastIdx, match.index);
        tokens.push({ text: plainSegment, bold: false, start: plainText.length, end: plainText.length + plainSegment.length });
        plainText += plainSegment;
      }
      const boldSegment = match[1].slice(2, -2);
      tokens.push({ text: boldSegment, bold: true, start: plainText.length, end: plainText.length + boldSegment.length });
      plainText += boldSegment;
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < raw.length) {
      const remaining = raw.slice(lastIdx);
      tokens.push({ text: remaining, bold: false, start: plainText.length, end: plainText.length + remaining.length });
      plainText += remaining;
    }

    // Split plain text into words for Arabic word-by-word reveal
    const words = plainText.split(/(\s+)/);
    const wordBoundaries = [];
    let curLen = 0;
    for (const w of words) {
      curLen += w.length;
      wordBoundaries.push(curLen);
    }

    return { raw, plainText, tokens, words, wordBoundaries };
  }, [text]);

  const [charCount, setCharCount] = useState(0);
  const audioThrottleRef = useRef(0);
  const totalLength = parsedData.plainText.length;

  // Reset when text changes
  useEffect(() => {
    setCharCount(0);
    audioThrottleRef.current = 0;
  }, [text]);

  // Typing timer
  useEffect(() => {
    if (charCount >= totalLength) {
      onComplete?.();
      return;
    }

    const intervalTime = isArabic ? Math.max(speed * 2.2, 45) : speed;

    const timer = setTimeout(() => {
      let nextCount;
      if (isArabic) {
        // Find next word boundary
        const nextBoundary = parsedData.wordBoundaries.find((b) => b > charCount);
        nextCount = nextBoundary !== undefined ? nextBoundary : totalLength;
      } else {
        nextCount = Math.min(charCount + 1, totalLength);
      }

      // Check if we should trigger audio blip (every 2-3 characters, not spaces/punctuation)
      const nextChar = parsedData.plainText[nextCount - 1] || '';
      if (!/[\s.,!?;:—\-()]/.test(nextChar)) {
        audioThrottleRef.current += 1;
        if (audioThrottleRef.current % 2 === 0) {
          window.dispatchEvent(
            new CustomEvent('gameAudioCue', {
              detail: {
                cue: 'dialogue_type',
                speaker: isLogbook ? 'logbook' : 'luna'
              }
            })
          );
        }
      }

      setCharCount(nextCount);
    }, intervalTime);

    return () => clearTimeout(timer);
  }, [charCount, totalLength, speed, isArabic, isLogbook, parsedData, onComplete]);

  // Expose instant-complete via window event or ref if needed
  useEffect(() => {
    const handleInstantSkip = () => {
      setCharCount(totalLength);
    };
    window.addEventListener('typewriterSkip', handleInstantSkip);
    return () => window.removeEventListener('typewriterSkip', handleInstantSkip);
  }, [totalLength]);

  // Render the revealed portion of tokens
  const renderedElements = useMemo(() => {
    const elements = [];
    for (let i = 0; i < parsedData.tokens.length; i++) {
      const tok = parsedData.tokens[i];
      if (charCount <= tok.start) break;

      const visibleLen = Math.min(charCount - tok.start, tok.text.length);
      const visiblePart = tok.text.slice(0, visibleLen);

      if (tok.bold) {
        elements.push(
          <strong key={i} className={boldClass}>
            {visiblePart}
          </strong>
        );
      } else {
        elements.push(visiblePart);
      }
    }
    return elements;
  }, [charCount, parsedData.tokens, boldClass]);

  const isDone = charCount >= totalLength;

  return (
    <span className={`typewriter-container ${className} ${isDone ? 'is-complete' : 'is-typing'}`}>
      {renderedElements}
      {!isDone && <span className="typewriter-cursor" aria-hidden="true">▎</span>}
    </span>
  );
}
