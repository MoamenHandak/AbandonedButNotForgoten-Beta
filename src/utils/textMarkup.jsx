import React from 'react';

/**
 * Parses strings containing markdown **bold** syntax into React elements.
 * e.g. "Look at the **stars** tonight." -> ["Look at the ", <strong key="1">stars</strong>, " tonight."]
 */
export function formatMarkupText(text, boldClass = 'markup-bold') {
  if (!text || typeof text !== 'string') return text;
  if (!text.includes('**')) return text;

  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className={boldClass}>
          {inner}
        </strong>
      );
    }
    return part;
  });
}
