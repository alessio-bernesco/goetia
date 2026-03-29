// Seals — demon gallery, seal reading, essence viewing, banishment

import { useState, useCallback } from 'react';

type BanishPhase = 'idle' | 'confirm' | 'executing';
import { invoke } from '@tauri-apps/api/core';
import { useAppState } from '../../state/appState';
import { useSession } from '../../hooks/useSession';
import { Terminal } from '../../ui/Terminal';
import { GlowText } from '../../ui/GlowText';
import { Banishment } from '../../ritual/transitions/Banishment';

interface DemonDetail {
  name: string;
  seal: string;
  manifest: Record<string, unknown>;
  essence: string;
}

export function Seals() {
  const { state: app, dispatch } = useAppState();
  const { startSession } = useSession();
  const [selected, setSelected] = useState<DemonDetail | null>(null);
  const [banishing, setBanishing] = useState<{ name: string; geometry: string; color: string } | null>(null);
  const [banishPhase, setBanishPhase] = useState<BanishPhase>('idle');

  const loadDemon = useCallback(async (name: string) => {
    try {
      const data = await invoke<DemonDetail>('get_demon', { name });
      setSelected(data);
    } catch (e) {
      console.error('Failed to load demon:', e);
    }
  }, []);

  const handleBanishRequest = useCallback((_name: string) => {
    setBanishPhase('confirm');
  }, []);

  const handleBanishConfirm = useCallback(async (name: string) => {
    setBanishPhase('executing');
    try {
      const geometry = (selected?.manifest as Record<string, unknown>)?.geometry as string || 'icosahedron';
      const colorObj = (selected?.manifest as Record<string, unknown>)?.color as Record<string, unknown> | undefined;
      const color = (colorObj?.base as string) || '#cc4444';

      await invoke('banish_demon', { name });
      setBanishing({ name, geometry, color });
    } catch (e) {
      console.error('Banishment failed:', e);
      setBanishPhase('idle');
    }
  }, [selected]);

  const handleBanishCancel = useCallback(() => {
    setBanishPhase('idle');
  }, []);

  const handleEvoke = useCallback(async (name: string) => {
    try {
      await startSession(name);
      dispatch({ type: 'NAVIGATE', place: 'circle' });
    } catch (e) {
      console.error('Evocation failed:', e);
    }
  }, [startSession, dispatch]);

  // Banishment animation
  if (banishing) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Banishment
          geometry={banishing.geometry}
          scale={1}
          color={banishing.color}
          duration={3}
          onComplete={() => {
            dispatch({ type: 'REMOVE_DEMON', name: banishing.name });
            setBanishing(null);
            setSelected(null);
          }}
        />
      </div>
    );
  }

  // Detail view
  if (selected) {
    const sealLines = [
      { role: 'system' as const, content: `── SIGILLO: ${selected.name.toUpperCase()} ──` },
      { role: 'system' as const, content: '' },
      ...selected.seal.split('\n').map(line => ({ role: 'demon' as const, content: line })),
    ];

    const essenceLines = selected.essence
      ? [
          { role: 'system' as const, content: '' },
          { role: 'system' as const, content: '── ESSENZA ──' },
          { role: 'system' as const, content: '' },
          ...selected.essence.split('\n').map(line => ({ role: 'entity' as const, content: line })),
        ]
      : [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          padding: '16px 20px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <GlowText text={selected.name} color="#cc4444" size="11px" animate={false} glow />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => handleEvoke(selected.name)}
              disabled={app.sessionActive}
              style={{
                ...btnStyle,
                borderColor: '#2a3a2a',
                color: '#4a7a4a',
                opacity: app.sessionActive ? 0.3 : 1,
              }}
            >
              CERCHIO
            </button>
            {banishPhase === 'idle' && (
              <button
                onClick={() => handleBanishRequest(selected.name)}
                style={{ ...btnStyle, borderColor: '#4a1a1a', color: '#8a3a3a' }}
              >
                BANDISCI
              </button>
            )}
            {banishPhase === 'confirm' && (
              <>
                <span style={{ fontFamily: '"SF Mono", monospace', fontSize: '9px', color: '#8a3a3a' }}>
                  IRREVERSIBILE —
                </span>
                <button
                  onClick={() => handleBanishConfirm(selected.name)}
                  style={{ ...btnStyle, borderColor: '#8a1a1a', color: '#cc3333' }}
                >
                  CONFERMA
                </button>
                <button
                  onClick={handleBanishCancel}
                  style={btnStyle}
                >
                  ANNULLA
                </button>
              </>
            )}
            {banishPhase === 'executing' && (
              <span style={{ fontFamily: '"SF Mono", monospace', fontSize: '9px', color: '#8a3a3a' }}>
                BANDIMENTO...
              </span>
            )}
            <button onClick={() => { setSelected(null); setBanishPhase('idle'); }} style={btnStyle}>
              INDIETRO
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Terminal lines={[...sealLines, ...essenceLines]} />
        </div>
      </div>
    );
  }

  // Gallery
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', animation: 'breathe 3s ease-in-out infinite' }}>
      <GlowText text="SIGILLI" color="#cc4444" size="11px" animate={false} glow />
      <div style={{
        marginTop: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '12px',
      }}>
        {app.demons.length === 0 && (
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#666', gridColumn: '1 / -1' }}>
            Nessun demone. Vai a GENESI per crearne uno.
          </div>
        )}
        {app.demons.map(d => (
          <button
            key={d.name}
            onClick={() => loadDemon(d.name)}
            style={{
              ...btnStyle,
              padding: '24px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Placeholder for 3D miniature */}
            <div style={{
              width: '40px',
              height: '40px',
              border: '1px solid #2a2a2a',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cc4444',
              fontSize: '16px',
            }}>
              {d.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ letterSpacing: '0.15em' }}>
              {d.name.toUpperCase()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #1a1a1a',
  color: '#777',
  fontFamily: '"SF Mono", monospace',
  fontSize: '10px',
  letterSpacing: '0.1em',
  padding: '4px 12px',
  cursor: 'pointer',
};
