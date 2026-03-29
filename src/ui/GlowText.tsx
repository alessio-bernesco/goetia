// GlowText — text with pulsing glow effect for genesis and titles

import { useStreaming } from '../hooks/useStreaming';

interface GlowTextProps {
  text: string;
  color?: string;
  size?: string;
  animate?: boolean;
  glow?: boolean;
}

export function GlowText({
  text,
  color = '#888',
  size = '14px',
  animate = true,
  glow = true,
}: GlowTextProps) {
  const { displayedText } = useStreaming(text, animate);

  const glowColor = color.replace('#', '');
  const r = parseInt(glowColor.substring(0, 2), 16);
  const g = parseInt(glowColor.substring(2, 4), 16);
  const b = parseInt(glowColor.substring(4, 6), 16);

  return (
    <div style={{
      fontFamily: '"SF Mono", "Fira Code", monospace',
      fontSize: size,
      color,
      letterSpacing: '0.15em',
      textAlign: 'center',
      textTransform: 'uppercase',
      whiteSpace: 'pre-wrap',
      textShadow: glow
        ? `0 0 10px rgba(${r},${g},${b},0.5), 0 0 30px rgba(${r},${g},${b},0.2)`
        : 'none',
      animation: glow ? 'glowPulse 3s ease-in-out infinite' : 'none',
    }}>
      {animate ? displayedText : text}
      {animate && displayedText.length < text.length && (
        <span style={{ opacity: 0.4 }}>_</span>
      )}
    </div>
  );
}
