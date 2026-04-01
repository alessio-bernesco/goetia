// Circle — the active evocation session place
// Demon 3D form + conversation terminal
// Now with ritual evocation/banishment sequences

import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSession } from '../../hooks/useSession';
import { useAppState } from '../../state/appState';
import { Terminal } from '../../ui/Terminal';
import { GlowText } from '../../ui/GlowText';
import { DemonForm } from '../../ritual/DemonForm';
import { GenesisVoid } from '../../ritual/GenesisVoid';
import { useEvocation } from '../../ritual/transitions/Evocation';
import { useBanishment } from '../../ritual/transitions/Banishment';
import { voiceSynth } from '../../audio/VoiceSynth';
import type { DemonManifest } from '../../ritual/types';
import type { RitualModulation } from '../../ritual/RitualConfig';

type CircleState = 'loading' | 'evoking' | 'session' | 'banishing';

export function Circle() {
  const { dispatch } = useAppState();
  const { session, sendMessage, endSession } = useSession();
  const [manifest, setManifest] = useState<DemonManifest | null>(null);
  const [circleState, setCircleState] = useState<CircleState>('loading');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Shared ref for frame-by-frame ritual props (hooks write, GenesisVoid reads)
  const ritualRef = useRef<RitualModulation | undefined>(undefined);

  // Poll voiceSynth.isSpeaking() to track speaking state
  useEffect(() => {
    const id = setInterval(() => {
      setIsSpeaking(voiceSynth.isSpeaking());
    }, 100);
    return () => clearInterval(id);
  }, []);

  // ─── Evocation sequence ─────────────────────────────────────────
  const handleEvocationComplete = useCallback(() => {
    setCircleState('session');
  }, []);

  useEvocation(
    circleState === 'evoking',
    manifest?.rank || 'minor',
    manifest,
    handleEvocationComplete,
    ritualRef,
  );

  // ─── Banishment sequence ────────────────────────────────────────
  const handleBanishmentComplete = useCallback(async () => {
    try {
      await endSession();
    } catch {
      // Session ended even if API call failed
    }
    setManifest(null);
    setCircleState('loading');
  }, [endSession]);

  useBanishment(
    circleState === 'banishing',
    manifest?.rank || 'minor',
    manifest,
    handleBanishmentComplete,
    ritualRef,
  );

  const handleEndSession = () => {
    if (!manifest || circleState !== 'session') return;
    setCircleState('banishing');
  };

  // Load demon manifest when session starts
  useEffect(() => {
    if (session.demonName && !manifest) {
      invoke<{ name: string; seal: string; manifest: DemonManifest; essence: string }>('get_demon', { name: session.demonName })
        .then(data => {
          setManifest(data.manifest);
          setCircleState('evoking');
        })
        .catch(e => console.error('Failed to load manifest:', e));
    }
    if (!session.demonName) {
      setManifest(null);
      setCircleState('loading');
    }
  }, [session.demonName, manifest]);

  // Voice synthesis on new demon turns
  const lastTurnCount = useRef(0);
  useEffect(() => {
    const turns = session.conversation;
    if (turns.length > lastTurnCount.current) {
      const lastTurn = turns[turns.length - 1];
      if (lastTurn.role === 'demon' && manifest && !lastTurn.content.startsWith('[ERRORE')) {
        console.log('[VoiceSynth] text length:', lastTurn.content.length, 'preview:', lastTurn.content.substring(0, 100));
        voiceSynth.speak(lastTurn.content, manifest.voice);
      }
    }
    lastTurnCount.current = turns.length;
  }, [session.conversation, manifest, session.currentVisualState]);

  // DemonForm stays mounted during early banishment for dissolution effect
  const [demonDissolved, setDemonDissolved] = useState(false);
  const handleDepartComplete = useCallback(() => {
    setDemonDissolved(true);
  }, []);

  // Reset dissolved state when starting new evocation
  useEffect(() => {
    if (circleState === 'evoking') setDemonDissolved(false);
  }, [circleState]);

  const lines = session.conversation.map(turn => ({
    role: turn.role as 'mago' | 'demon',
    content: turn.content,
  }));

  const isIdle = circleState === 'loading';
  const showDemonForm = circleState === 'session' || (circleState === 'banishing' && !demonDissolved);
  const isDeparting = circleState === 'banishing';
  const terminalDisabled = circleState === 'evoking';
  const terminalFading = circleState === 'banishing';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
    }}>
      {/* Cosmic void background — always present */}
      <GenesisVoid ritualRef={ritualRef} />

      {/* 3D demon form — only visible during active session */}
      {showDemonForm && manifest && (
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '80%',
          height: '80%',
          zIndex: 1,
        }}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <DemonForm
              manifest={manifest}
              visualState={session.currentVisualState}
              waiting={session.streaming}
              speaking={isSpeaking}
              arriving={circleState === 'session'}
              departing={isDeparting}
              onDepartComplete={handleDepartComplete}
            />
          </div>
        </div>
      )}

      {/* UI overlay */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        opacity: terminalFading ? 0 : 1,
        transition: 'opacity 2.5s ease-out',
        pointerEvents: terminalFading ? 'none' : 'auto',
      }}>
        {isIdle ? (
          /* ─── Idle: no demon evoked ─────────────────────────────── */
          <>
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
          </>
        ) : (
          /* ─── Active: evoking / session / banishing ─────────────── */
          <>
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
                disabled={session.streaming || circleState !== 'session'}
                style={{
                  ...buttonStyle,
                  fontSize: '9px',
                  padding: '4px 12px',
                  opacity: circleState !== 'session' || session.streaming ? 0.3 : 0.6,
                  position: 'absolute',
                  right: '20px',
                  top: '18px',
                }}
              >
                CONGEDA
              </button>
            </div>

            <div style={{
              flex: 1,
              overflow: 'hidden',
            }}>
              <Terminal
                lines={lines}
                streamingText={session.streaming ? session.streamingText : undefined}
                onSubmit={session.streaming || circleState !== 'session' ? undefined : sendMessage}
                inputDisabled={session.streaming}
                disabled={terminalDisabled}
                placeholder="parla al demone..."
              />
            </div>
          </>
        )}
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
