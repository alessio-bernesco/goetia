// Evoke — genesis place for creating new demons
// Void space + conversation with the generative entity + crystallization on accept

import { useEffect, useState } from 'react';
import { useGenesis } from '../../hooks/useGenesis';
import { useAppState } from '../../state/appState';
import { Terminal } from '../../ui/Terminal';
import { GlowText } from '../../ui/GlowText';
import { GenesisVoid } from '../../ritual/GenesisVoid';
import { Crystallization } from '../../ritual/transitions/Crystallization';

type DemonRank = 'minor' | 'major' | 'prince';

const RANKS: { id: DemonRank; label: string; description: string; color: string }[] = [
  { id: 'minor', label: 'DEMONE MINORE', description: 'spirito servile, risposte rapide', color: '#555555' },
  { id: 'major', label: 'DEMONE MAGGIORE', description: 'entità versatile, equilibrio tra potere e velocità', color: '#7a6a3a' },
  { id: 'prince', label: 'PRINCIPE', description: 'intelligenza suprema, profondità massima', color: '#8a3a5a' },
];

export function Evoke() {
  const { dispatch } = useAppState();
  const genesis = useGenesis();
  const [selectedRank, setSelectedRank] = useState<DemonRank | null>(null);
  const [crystallizing, setCrystallizing] = useState<{
    geometry: string;
    scale: number;
    color: string;
  } | null>(null);

  useEffect(() => {
    if (selectedRank && genesis.conversation.length === 0 && !genesis.loading) {
      genesis.startGenesis(selectedRank).catch(console.error);
    }
  }, [selectedRank]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = genesis.conversation.map(turn => ({
    role: turn.role === 'mago' ? 'mago' as const : 'entity' as const,
    content: turn.content,
  }));

  const handleAccept = async () => {
    // Extract manifest from raw response BEFORE accepting (accept resets state)
    let demonGeometry = 'icosahedron';
    let demonScale = 1;
    let demonColor = '#cc4444';

    const raw = genesis.lastResponse;
    if (raw) {
      try {
        const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.manifest) {
          demonGeometry = parsed.manifest.geometry || demonGeometry;
          demonScale = parsed.manifest.scale || demonScale;
          demonColor = parsed.manifest.color?.base || demonColor;
        }
      } catch (e) {
        console.warn('Could not extract manifest for crystallization:', e);
      }
    }

    try {
      await genesis.acceptDemon(selectedRank || undefined);
      // Start crystallization with the demon's actual form
      setCrystallizing({
        geometry: demonGeometry,
        scale: demonScale,
        color: demonColor,
      });
    } catch {
      // Error is shown via genesis.error
    }
  };

  const handleCrystallizationComplete = () => {
    setCrystallizing(null);
    dispatch({ type: 'NAVIGATE', place: 'seals' });
  };

  const handleReject = async () => {
    await genesis.rejectGenesis();
    dispatch({ type: 'NAVIGATE', place: 'seals' });
  };

  // Rank selection
  if (!selectedRank) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}>
        <GenesisVoid />
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
        }}>
          <GlowText text="SCEGLI IL RANGO" color="#6a6aff" size="11px" animate={false} glow />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '280px' }}>
            {RANKS.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRank(r.id)}
                style={{
                  background: 'rgba(15, 15, 20, 0.4)',
                  border: `1px solid ${r.color}44`,
                  padding: '16px 20px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.3s',
                  outline: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = r.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = `${r.color}44`)}
              >
                <div style={{
                  fontFamily: '"SF Mono", monospace',
                  fontSize: '11px',
                  letterSpacing: '0.15em',
                  color: r.color,
                  marginBottom: '6px',
                }}>
                  {r.label}
                </div>
                <div style={{
                  fontFamily: '"SF Mono", monospace',
                  fontSize: '9px',
                  color: '#555',
                  letterSpacing: '0.05em',
                }}>
                  {r.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Crystallization transition
  if (crystallizing) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Crystallization
          geometry={crystallizing.geometry}
          scale={crystallizing.scale}
          color={crystallizing.color}
          duration={4}
          onComplete={handleCrystallizationComplete}
        />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
    }}>
      {/* Genesis void background */}
      <GenesisVoid />

      {/* UI overlay */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}>
        {/* Genesis header — centered */}
        <div style={{
          padding: '20px 20px 8px',
          textAlign: 'center',
          position: 'relative',
        }}>
          <GlowText text="GENESI" color="#6a6aff" size="11px" animate={false} glow />
          {genesis.lastResponse && (
            <div style={{
              position: 'absolute',
              right: '20px',
              top: '18px',
              display: 'flex',
              gap: '8px',
            }}>
              <button onClick={handleAccept} style={{ ...btnStyle, borderColor: '#2a4a2a', color: '#4a8a4a' }}>
                ACCETTA
              </button>
              <button onClick={handleReject} style={{ ...btnStyle, borderColor: '#4a2a2a', color: '#8a4a4a' }}>
                RIFIUTA
              </button>
            </div>
          )}
        </div>

        {genesis.error && (
          <div style={{
            padding: '8px 20px',
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#aa4444',
          }}>
            Errore: {genesis.error}
          </div>
        )}

        {/* Conversation with generative entity */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Terminal
            lines={lines}
            onSubmit={genesis.loading ? undefined : genesis.sendMessage}
            inputDisabled={genesis.loading}
            placeholder="parla all'entit&#224; generatrice..."
          />
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #222',
  color: '#777',
  fontFamily: '"SF Mono", monospace',
  fontSize: '9px',
  letterSpacing: '0.15em',
  padding: '4px 12px',
  cursor: 'pointer',
};
