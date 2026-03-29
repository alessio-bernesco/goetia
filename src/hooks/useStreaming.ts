// Hook for streaming text display — character-by-character rendering

import { useState, useEffect, useRef, useCallback } from 'react';

const CHARS_PER_FRAME = 3;
const FRAME_INTERVAL = 16; // ~60fps

export function useStreaming(text: string, active: boolean) {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!active || !text) {
      setDisplayedText(text || '');
      indexRef.current = text?.length || 0;
      return;
    }

    indexRef.current = 0;
    setDisplayedText('');

    const animate = (timestamp: number) => {
      if (timestamp - lastTimeRef.current >= FRAME_INTERVAL) {
        lastTimeRef.current = timestamp;
        indexRef.current = Math.min(indexRef.current + CHARS_PER_FRAME, text.length);
        setDisplayedText(text.slice(0, indexRef.current));
      }

      if (indexRef.current < text.length) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [text, active]);

  const skip = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    setDisplayedText(text);
    indexRef.current = text.length;
  }, [text]);

  const isComplete = indexRef.current >= (text?.length || 0);

  return { displayedText, isComplete, skip };
}
