// Evoke — genesis place for creating new demons
// Void space + conversation with the generative entity + crystallization on accept

import { useEffect, useState } from 'react';
import { useGenesis } from '../../hooks/useGenesis';
import { useAppState } from '../../state/appState';
import { Terminal } from '../../ui/Terminal';
import { GlowText } from '../../ui/GlowText';
import { GenesisVoid } from '../../ritual/GenesisVoid';
import { Crystallization } from '../../ritual/transitions/Crystallization';
import { ambientSound } from '../../audio/Ambient';

export function Evoke() {
  const { dispatch } = useAppState();
  const genesis = useGenesis();
  const [crystallizing, setCrystallizing] = useState<{
    geometry: string;
    scale: number;
    color: string;
  } | null>(null);

  useEffect(() => {
    if (genesis.conversation.length === 0 && !genesis.loading) {
      genesis.startGenesis().catch(console.error);
    }
    ambientSound.start('genesis');
    return () => { ambientSound.stop(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = genesis.conversation.map(turn => ({
    role: turn.role === 'mago' ? 'mago' as const : 'entity' as const,
    content: turn.content,
  }));

  const handleAccept = async () => {
    try {
      // Extract manifest from raw response before accepting
      let demonGeometry = 'icosahedron';
      let demonScale = 1;
      let demonColor = '#cc4444';
      if (genesis.lastResponse) {
        try {
          const jsonMatch = genesis.lastResponse.match(/```json\s*([\s\S]*?)```/);
          const jsonStr = jsonMatch ? jsonMatch[1].trim() : genesis.lastResponse.trim();
          const parsed = JSON.parse(jsonStr);
          if (parsed.manifest) {
            demonGeometry = parsed.manifest.geometry || demonGeometry;
            demonScale = parsed.manifest.scale || demonScale;
            demonColor = parsed.manifest.color?.base || demonColor;
          }
        } catch { /* use defaults */ }
      }

      await genesis.acceptDemon();
      setCrystallizing({
        geometry: demonGeometry,
        scale: demonScale,
        color: demonColor,
      });
    } catch {
      // Error is set in genesis state by the hook
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
