// NavigationBar — 4 macro buttons, non-canonical, no conventional tabs

import type { Place } from '../state/appState';

interface NavigationBarProps {
  currentPlace: Place;
  onNavigate: (place: Place) => void;
  sessionActive: boolean;
}

const places: { id: Place; label: string; glyph: string }[] = [
  { id: 'circle', label: 'CERCHIO', glyph: '\u25CB' },   // ○
  { id: 'evoke', label: 'GENESI', glyph: '\u2609' },      // ☉
  { id: 'chronicles', label: 'CRONACHE', glyph: '\u2261' }, // ≡
  { id: 'seals', label: 'SIGILLI', glyph: '\u2318' },     // ⌘
];

export function NavigationBar({ currentPlace, onNavigate, sessionActive }: NavigationBarProps) {
  return (
    <nav style={{
      animation: 'breathe 3s ease-in-out infinite',
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '52px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '2px',
      zIndex: 100,
      background: 'linear-gradient(transparent, rgba(0,0,0,0.9) 30%)',
      paddingBottom: '8px',
    }}>
      {places.map(({ id, label, glyph }) => {
        const active = currentPlace === id;
        const hasIndicator = id === 'circle' && sessionActive;

        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              opacity: active ? 1 : 0.45,
              transition: 'opacity 0.3s ease',
              position: 'relative',
            }}
          >
            <span style={{
              fontSize: '18px',
              color: active ? '#bbb' : '#666',
              transition: 'color 0.3s ease',
            }}>
              {glyph}
            </span>
            <span style={{
              fontFamily: '"SF Mono", monospace',
              fontSize: '9px',
              letterSpacing: '0.2em',
              color: active ? '#888' : '#555',
              transition: 'color 0.3s ease',
            }}>
              {label}
            </span>
            {hasIndicator && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '18px',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: '#cc4444',
                boxShadow: '0 0 6px rgba(204,68,68,0.6)',
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
