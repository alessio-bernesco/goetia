// Terminal — monospace text display for conversations and logs
// No conventional UI. Dark, minimal, technomagical.

import { useRef, useEffect } from 'react';

interface TerminalLine {
  role: 'mago' | 'demon' | 'entity' | 'system';
  content: string;
}

interface TerminalProps {
  lines: TerminalLine[];
  streamingText?: string;
  onSubmit?: (text: string) => void;
  inputDisabled?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const roleColors: Record<string, string> = {
  mago: '#aaaaaa',
  demon: '#dd5555',
  entity: '#7a7aff',
  system: '#666',
};

const rolePrefix: Record<string, string> = {
  mago: '> ',
  demon: '  ',
  entity: '  ',
  system: '// ',
};

export function Terminal({ lines, streamingText, onSubmit, inputDisabled, placeholder, disabled }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, streamingText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && onSubmit && inputRef.current) {
      e.preventDefault();
      const value = inputRef.current.value.trim();
      if (value) {
        onSubmit(value);
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: '13px',
      lineHeight: '1.6',
      color: '#999',
      animation: 'breathe 3s ease-in-out infinite',
      opacity: disabled ? 0.3 : 1,
      transition: 'opacity 0.5s ease',
    }}>
      <div ref={scrollRef} style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px 20px',
        scrollbarWidth: 'none',
        WebkitUserSelect: 'text',
        userSelect: 'text',
      }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            color: roleColors[line.role] || '#999',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: '4px',
          }}>
            <span style={{ opacity: 0.5 }}>{rolePrefix[line.role] || ''}</span>
            {line.content}
          </div>
        ))}
        {streamingText && (
          <div style={{ color: roleColors.demon, whiteSpace: 'pre-wrap' }}>
            <span style={{ opacity: 0.5 }}>  </span>
            {streamingText}
            <span style={{ opacity: 0.6, animation: 'blink 1s infinite' }}>_</span>
          </div>
        )}
      </div>
      {onSubmit && (
        <div style={{
          borderTop: '1px solid #1a1a1a',
          padding: '12px 20px',
          display: 'flex',
          gap: '8px',
        }}>
          <span style={{ color: '#777', opacity: 0.7, paddingTop: '2px' }}>&gt;</span>
          <textarea
            ref={inputRef}
            disabled={disabled || inputDisabled}
            placeholder={disabled ? 'evocazione in corso...' : (placeholder || '')}
            onKeyDown={handleKeyDown}
            rows={5}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#aaa',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              letterSpacing: '0.02em',
              resize: 'none',
              lineHeight: '1.6',
              scrollbarWidth: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}
