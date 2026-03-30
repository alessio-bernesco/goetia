// Circle — the active evocation session place
// Demon 3D form + conversation terminal

import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSession } from '../../hooks/useSession';
import { useAppState } from '../../state/appState';
import { Terminal } from '../../ui/Terminal';
import { GlowText } from '../../ui/GlowText';
import { DemonForm } from '../../ritual/DemonForm';
import { GenesisVoid } from '../../ritual/GenesisVoid';
import { Banishment } from '../../ritual/transitions/Banishment';
import { voiceSynth } from '../../audio/VoiceSynth';

interface VoiceParams {
  baseFrequency: number;
  formants: number[];
  breathiness: number;
  speed: number;
}

interface DemonManifest {
  geometry: string;
  scale: number;
  color: { base: string; variance: number };
  opacity: number;
  glow: { intensity: number; color: string };
  rotation_speed: number;
  pulse_frequency: number;
  noise_amplitude: number;
  voice: VoiceParams | null;
}

export function Circle() {
  const { dispatch } = useAppState();
  const { session, sendMessage, endSession } = useSession();
  const [manifest, setManifest] = useState<DemonManifest | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Poll voiceSynth.isSpeaking() to track speaking state
  useEffect(() => {
    const id = setInterval(() => {
      setIsSpeaking(voiceSynth.isSpeaking());
    }, 100);
    return () => clearInterval(id);
  }, []);

  const handleEndSession = () => {
    if (!manifest) {
      endSession();
      return;
    }
    // Start animation FIRST, end session when animation completes
    setDismissing(true);
  };

  const handleDismissComplete = async () => {
    try {
      await endSession();
    } catch {
      // Session ended even if API call failed
    }
    setDismissing(false);
    setManifest(null);
  };

  // Load demon manifest when session starts
  useEffect(() => {
    if (session.demonName && !manifest) {
      invoke<{ name: string; seal: string; manifest: DemonManifest; essence: string }>('get_demon', { name: session.demonName })
        .then(data => setManifest(data.manifest))
        .catch(e => console.error('Failed to load manifest:', e));
    }
    if (!session.demonName) {
      setManifest(null);
    }
  }, [session.demonName, manifest]);

  // Voice synthesis on new demon turns
  const lastTurnCount = useRef(0);
  useEffect(() => {
    const turns = session.conversation;
    if (turns.length > lastTurnCount.current) {
      const lastTurn = turns[turns.length - 1];
      if (lastTurn.role === 'demon' && manifest?.voice && !lastTurn.content.startsWith('[ERRORE')) {
        console.log('[VoiceSynth] text length:', lastTurn.content.length, 'preview:', lastTurn.content.substring(0, 100));
        voiceSynth.speak(lastTurn.content, manifest.voice);
      }
    }
    lastTurnCount.current = turns.length;
  }, [session.conversation, manifest, session.currentVisualState]);

  if (!session.demonName && !dismissing) {
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
        }}>
          <div style={{ padding: '20px 20px 8px', textAlign: 'center' }}>
            <GlowText text="CERCHIO" color="#cc4444" size="11px" animate={false} glow />
          </div>
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
          }}>
            <GlowText text="NESSUN DEMONE EVOCATO" color="#666" size="12px" animate={false} glow={false} />
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => dispatch({ type: 'NAVIGATE', place: 'seals' })}
              style={buttonStyle}
            >
              SIGILLI
            </button>
            <button
              onClick={() => dispatch({ type: 'NAVIGATE', place: 'evoke' })}
              style={buttonStyle}
            >
              GENESI
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  const lines = session.conversation.map(turn => ({
    role: turn.role as 'mago' | 'demon',
    content: turn.content,
  }));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
    }}>
      {/* Cosmic void background */}
      <GenesisVoid />

      {/* 3D demon form or dismissal animation — centered, 80% of viewport */}
      {manifest && (
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '80%',
          height: '80%',
          zIndex: 1,
        }}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {dismissing ? (
              <Banishment
                geometry={manifest.geometry}
                scale={manifest.scale}
                color={manifest.color.base}
                duration={3}
                onComplete={handleDismissComplete}
              />
            ) : (
              <DemonForm
                manifest={manifest}
                visualState={session.currentVisualState}
                waiting={session.streaming}
                speaking={isSpeaking}
              />
            )}
          </div>
        </div>
      )}

      {/* UI overlay — text on top of demon */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        opacity: dismissing ? 0 : 1,
        transition: 'opacity 2.5s ease-out',
        pointerEvents: dismissing ? 'none' : 'auto',
      }}>
        {/* Demon name header — centered */}
        <div style={{
          padding: '20px 20px 8px',
          textAlign: 'center',
          position: 'relative',
        }}>
          <GlowText
            text={session.demonName || ''}
            color="#cc4444"
            size="11px"
            animate={false}
            glow
          />
          <button
            onClick={handleEndSession}
            disabled={session.streaming || dismissing}
            style={{
              ...buttonStyle,
              fontSize: '9px',
              padding: '4px 12px',
              opacity: session.streaming ? 0.3 : 0.6,
              position: 'absolute',
              right: '20px',
              top: '18px',
            }}
          >
            CONGEDA
          </button>
        </div>

        {/* Conversation — overlaid on demon, full height */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
        }}>
          <Terminal
            lines={lines}
            streamingText={session.streaming ? session.streamingText : undefined}
            onSubmit={session.streaming ? undefined : sendMessage}
            inputDisabled={session.streaming}
            placeholder="parla al demone..."
          />
        </div>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #222',
  color: '#777',
  fontFamily: '"SF Mono", monospace',
  fontSize: '10px',
  letterSpacing: '0.15em',
  padding: '8px 16px',
  cursor: 'pointer',
  transition: 'border-color 0.3s, color 0.3s',
};
