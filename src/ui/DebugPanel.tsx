// DebugPanel — hidden debug/test panel, activated with Ctrl+Shift+D

import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { voiceSynth } from '../audio/VoiceSynth';
import { ambientEvents } from '../audio/Ambient';
import { audioEngine } from '../audio/AudioEngine';
import { backgroundNoise } from '../audio/BackgroundNoise';
import { DemonForm } from '../ritual/DemonForm';
import { GenesisVoid } from '../ritual/GenesisVoid';
import { useEvocation } from '../ritual/transitions/Evocation';
import { useBanishment } from '../ritual/transitions/Banishment';
import type { DemonManifest } from '../ritual/types';
import type { RitualModulation } from '../ritual/RitualConfig';

// Global prompt log — other modules push entries here
export interface PromptLogEntry {
  timestamp: number;
  direction: 'send' | 'recv';
  content: string;
  model?: string;
}

export const promptLog: PromptLogEntry[] = [];
export function logPrompt(entry: PromptLogEntry) {
  promptLog.push(entry);
  if (promptLog.length > 100) promptLog.shift();
}

const DANTE_TEXT = `Nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura, ché la diritta via era smarrita. Ahi quanto a dir qual era è cosa dura esta selva selvaggia e aspra e forte che nel pensier rinova la paura! Tant'è amara che poco è più morte; ma per trattar del ben ch'i' vi trovai, dirò de l'altre cose ch'i' v'ho scorte. Io non so ben ridir com'i' v'intrai, tant'era pien di sonno a quel punto che la verace via abbandonai. Ma poi ch'i' fui al piè d'un colle giunto, là dove terminava quella valle che m'avea di paura il cor compunto, guardai in alto e vidi le sue spalle vestite già de' raggi del pianeta che mena dritto altrui per ogne calle. Allor fu la paura un poco queta, che nel lago del cor m'era durata la notte ch'i' passai con tanta peta. E come quei che con lena affannata, uscito fuor del pelago a la riva, si volge a l'acqua perigliosa e guata, così l'animo mio, ch'ancor fuggiva, si volse a retro a rimirar lo passo che non lasciò già mai persona viva.`;

type DemonRank = 'minor' | 'major' | 'prince';
const RANKS: DemonRank[] = ['minor', 'major', 'prince'];

export function DebugPanel() {
  const [visible, setVisible] = useState(false);
  const [testText, setTestText] = useState(DANTE_TEXT);
  const [debugManifest, setDebugManifest] = useState<DemonManifest | null>(null);
  const [debugRank, setDebugRank] = useState<DemonRank>('minor');
  const [debugWaiting, setDebugWaiting] = useState(false);
  const [debugSpeaking, setDebugSpeaking] = useState(false);
  const [showPromptLog, setShowPromptLog] = useState(false);
  const [sessionModel, setSessionModel] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>('');
  const [manifestKey, setManifestKey] = useState(0);

  // Ritual simulator state
  type RitualState = 'idle' | 'evoking' | 'present' | 'banishing';
  const [ritualState, setRitualState] = useState<RitualState>('idle');
  const [ritualManifest, setRitualManifest] = useState<DemonManifest | null>(null);
  const [ritualRank, setRitualRank] = useState<DemonRank>('minor');
  const [ritualKey, setRitualKey] = useState(0);
  const debugRitualRef = useRef<RitualModulation | undefined>(undefined);

  const handleEvocationComplete = useCallback(() => {
    setRitualState('present');
  }, []);

  const [ritualDemonDissolved, setRitualDemonDissolved] = useState(false);

  const handleDepartComplete = useCallback(() => {
    setRitualDemonDissolved(true);
  }, []);

  const handleBanishmentComplete = useCallback(() => {
    setRitualState('idle');
    setRitualManifest(null);
    setRitualDemonDissolved(false);
  }, []);

  useEvocation(
    ritualState === 'evoking',
    ritualRank,
    ritualManifest,
    handleEvocationComplete,
    debugRitualRef,
  );

  useBanishment(
    ritualState === 'banishing',
    ritualRank,
    ritualManifest,
    handleBanishmentComplete,
    debugRitualRef,
  );

  const startRitualEvocation = useCallback(async () => {
    try {
      const manifest = await invoke<DemonManifest>('debug_generate_manifest', { rank: ritualRank });
      setRitualManifest(manifest);
      setRitualKey(k => k + 1);
      setRitualState('evoking');
    } catch (e) {
      console.error('Debug ritual generate failed:', e);
    }
  }, [ritualRank]);

  const startRitualBanishment = useCallback(() => {
    setRitualState('banishing');
  }, []);

  // Load app version
  useEffect(() => {
    getVersion().then(v => setAppVersion(v)).catch(() => setAppVersion('?'));
  }, []);

  // Poll active model
  useEffect(() => {
    if (!visible) return;
    const poll = async () => {
      try {
        const model = await invoke<string>('get_active_model');
        setSessionModel(model);
      } catch {
        setSessionModel(null);
      }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [visible]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const speakWithParams = useCallback(async (baseFrequency: number) => {
    await audioEngine.init();
    voiceSynth.stop();
    const presets: Record<number, { baseFrequency: number; formants: number[]; breathiness: number; speed: number }> = {
      65:  { baseFrequency: 65,  formants: [400, 800, 2000],  breathiness: 0.5, speed: 0.7 },
      120: { baseFrequency: 120, formants: [600, 1000, 2500], breathiness: 0.3, speed: 1.0 },
      220: { baseFrequency: 220, formants: [800, 1400, 3200], breathiness: 0.1, speed: 1.3 },
    };
    const params = presets[baseFrequency];
    const dur = voiceSynth.getDuration(testText, params.speed);
    console.log(`Voice: ${baseFrequency}Hz, duration: ${dur.toFixed(1)}s, chars: ${testText.length}`);
    voiceSynth.speak(testText, params);
  }, [testText]);

  const startDrone = useCallback(async () => {
    await audioEngine.init();
    backgroundNoise.start();
  }, []);

  const startEvents = useCallback(async () => {
    await audioEngine.init();
    ambientEvents.start();
  }, []);

  const startAll = useCallback(async () => {
    await audioEngine.init();
    backgroundNoise.start();
    ambientEvents.start();
  }, []);

  const stopAll = useCallback(() => {
    backgroundNoise.stop();
    ambientEvents.stop();
  }, []);

  const clearData = useCallback(async () => {
    if (!confirm('Distruggere tutti i dati locali?')) return;
    try {
      await invoke('release_lock');
    } catch { /* ok */ }
  }, []);

  // Generate random manifest for selected rank
  const generateRandom = useCallback(async () => {
    try {
      const manifest = await invoke<DemonManifest>('debug_generate_manifest', { rank: debugRank });
      setDebugManifest(manifest);
      setManifestKey(k => k + 1);
    } catch (e) {
      console.error('Debug generate failed:', e);
    }
  }, [debugRank]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '30px',
      left: '10px',
      width: '320px',
      maxHeight: '85vh',
      overflow: 'auto',
      background: 'rgba(10, 10, 10, 0.95)',
      border: '1px solid #2a2a2a',
      padding: '16px',
      zIndex: 9999,
      fontFamily: '"SF Mono", monospace',
      fontSize: '10px',
      color: '#888',
      scrollbarWidth: 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ color: '#cc4444', letterSpacing: '0.15em' }}>DEBUG</span>
        <button onClick={() => setVisible(false)} style={closeBtnStyle}>✕</button>
      </div>

      <Section title="VOICE SYNTH — TESTO">
        <textarea
          value={testText}
          onChange={e => setTestText(e.target.value)}
          style={{
            width: '100%',
            height: '120px',
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            color: '#777',
            fontFamily: 'inherit',
            fontSize: '9px',
            padding: '8px',
            resize: 'vertical',
            outline: 'none',
            lineHeight: '1.5',
          }}
        />
        <div style={{ fontSize: '8px', color: '#444', marginTop: '2px' }}>
          {testText.split(/\s+/).length} parole, {testText.length} caratteri
        </div>
      </Section>

      <Section title="VOICE SYNTH — TEST">
        <Btn onClick={() => speakWithParams(65)}>Voce profonda (65Hz)</Btn>
        <Btn onClick={() => speakWithParams(120)}>Voce media (120Hz)</Btn>
        <Btn onClick={() => speakWithParams(220)}>Voce acuta (220Hz)</Btn>
        <Btn onClick={() => voiceSynth.stop()}>Stop voce</Btn>
      </Section>

      <Section title="SOUNDSCAPE">
        <Btn onClick={startAll}>Tutto ON (drone + eventi)</Btn>
        <Btn onClick={startDrone}>Solo drone (motore + vento + pad)</Btn>
        <Btn onClick={startEvents}>Solo eventi (satellite + theremin + bleep)</Btn>
        <Btn onClick={stopAll}>Stop tutto</Btn>
      </Section>

      <Section title="DEMON FORM SIMULATOR">
        {/* Rank selector */}
        <div style={{ display: 'flex', gap: '3px', marginBottom: '4px' }}>
          {RANKS.map(r => (
            <button
              key={r}
              onClick={() => setDebugRank(r)}
              style={{
                background: r === debugRank ? '#222' : 'transparent',
                border: `1px solid ${r === debugRank ? '#555' : '#222'}`,
                color: r === debugRank ? '#ccc' : '#666',
                fontFamily: 'inherit',
                fontSize: '9px',
                padding: '3px 8px',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Random generate button */}
        <Btn onClick={generateRandom}>Random {debugRank}</Btn>

        {/* Preview */}
        {debugManifest && (
          <>
            <div style={{
              width: '100%',
              height: '200px',
              border: '1px solid #1a1a1a',
              position: 'relative',
              overflow: 'hidden',
              marginTop: '4px',
            }}>
              <DemonForm
                key={manifestKey}
                manifest={debugManifest}
                waiting={debugWaiting}
                speaking={debugSpeaking}
              />
            </div>

            {/* Manifest info */}
            <div style={{ fontSize: '8px', color: '#555', marginTop: '2px', lineHeight: '1.5' }}>
              {debugManifest.geometry.type === 'composite' ? (
                <>
                  pattern: {(debugManifest.geometry as any).pattern}
                  <br />
                  bodies: {(debugManifest.geometry as any).bodies?.map((b: any) => b.shape).join(' + ')}
                </>
              ) : (
                <>type: {debugManifest.geometry.type}</>
              )}
              <br />
              voice: {Math.round(debugManifest.voice.baseFrequency)}Hz, speed {debugManifest.voice.speed.toFixed(2)}
            </div>
          </>
        )}

        {/* Animation controls */}
        <Btn onClick={() => setDebugWaiting(w => !w)}>
          {debugWaiting ? '■ Stop breathing' : '▶ Test breathing (waiting)'}
        </Btn>
        <Btn onClick={() => setDebugSpeaking(s => !s)}>
          {debugSpeaking ? '■ Stop perturbazione' : '▶ Test perturbazione (speaking)'}
        </Btn>
      </Section>

      <Section title="RITUAL SIMULATOR">
        {/* Rank selector */}
        <div style={{ display: 'flex', gap: '3px', marginBottom: '4px' }}>
          {RANKS.map(r => (
            <button
              key={r}
              onClick={() => setRitualRank(r)}
              disabled={ritualState !== 'idle'}
              style={{
                background: r === ritualRank ? '#222' : 'transparent',
                border: `1px solid ${r === ritualRank ? '#555' : '#222'}`,
                color: r === ritualRank ? '#ccc' : '#666',
                fontFamily: 'inherit',
                fontSize: '9px',
                padding: '3px 8px',
                cursor: ritualState === 'idle' ? 'pointer' : 'default',
                flex: 1,
                opacity: ritualState !== 'idle' ? 0.5 : 1,
              }}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Evocation button */}
        <Btn onClick={startRitualEvocation}>
          {ritualState === 'idle' ? `Evoca random ${ritualRank}` : ritualState === 'evoking' ? 'evocazione...' : ritualState === 'present' ? 'demone presente' : 'congedo...'}
        </Btn>

        {/* Preview area with GenesisVoid + DemonForm */}
        <div key={ritualKey} style={{
          width: '100%',
          height: '250px',
          border: '1px solid #1a1a1a',
          position: 'relative',
          overflow: 'hidden',
          marginTop: '4px',
        }}>
          <GenesisVoid ritualRef={debugRitualRef} />
          {(ritualState === 'present' || (ritualState === 'banishing' && !ritualDemonDissolved)) && ritualManifest && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
              <DemonForm
                manifest={ritualManifest}
                arriving={ritualState === 'present'}
                departing={ritualState === 'banishing'}
                onDepartComplete={handleDepartComplete}
              />
            </div>
          )}
        </div>

        {/* BAN button */}
        {ritualState === 'present' && (
          <Btn onClick={startRitualBanishment} danger>BAN</Btn>
        )}

        {/* State label + manifest info */}
        <div style={{ fontSize: '8px', color: '#555', marginTop: '2px', lineHeight: '1.5' }}>
          stato: <span style={{ color: ritualState === 'present' ? '#7a7' : '#777' }}>{ritualState}</span>
          {ritualManifest && (
            <>
              <br />
              {ritualManifest.geometry.type === 'composite' ? (
                <>pattern: {(ritualManifest.geometry as any).pattern} | bodies: {(ritualManifest.geometry as any).bodies?.map((b: any) => b.shape).join(' + ')}</>
              ) : (
                <>type: {ritualManifest.geometry.type}</>
              )}
              <br />
              glow: <span style={{ color: ritualManifest.glow.color }}>{ritualManifest.glow.color}</span>
              {' | '}voice: {Math.round(ritualManifest.voice.baseFrequency)}Hz
            </>
          )}
        </div>
      </Section>

      <Section title="SESSIONE">
        <div style={{ fontSize: '9px', color: '#666', padding: '4px 0' }}>
          Modello: <span style={{ color: '#aaa' }}>{sessionModel || 'nessuna sessione'}</span>
        </div>
        <Btn onClick={() => setShowPromptLog(s => !s)}>
          {showPromptLog ? '■ Nascondi prompt log' : '▶ Mostra prompt log'}
        </Btn>
        {showPromptLog && (
          <div style={{
            maxHeight: '200px',
            overflow: 'auto',
            background: '#050505',
            border: '1px solid #1a1a1a',
            padding: '6px',
            fontSize: '8px',
            lineHeight: '1.6',
            scrollbarWidth: 'none',
          }}>
            {promptLog.length === 0 && <div style={{ color: '#444' }}>Nessun prompt registrato</div>}
            {promptLog.slice().reverse().map((entry, i) => (
              <div key={i} style={{ marginBottom: '6px', borderBottom: '1px solid #111', paddingBottom: '4px' }}>
                <div style={{ color: entry.direction === 'send' ? '#4a7a4a' : '#7a4a4a' }}>
                  {entry.direction === 'send' ? '→ SEND' : '← RECV'}
                  {entry.model && <span style={{ color: '#555' }}> [{entry.model}]</span>}
                  <span style={{ color: '#333', marginLeft: '8px' }}>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ color: '#555', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {entry.content.substring(0, 300)}{entry.content.length > 300 ? '...' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="SISTEMA">
        <div style={{ fontSize: '9px', color: '#666', padding: '4px 0' }}>
          Release: <span style={{ color: '#aaa' }}>v{appVersion}</span>
        </div>
        <Btn onClick={clearData} danger>Release lock</Btn>
      </Section>

      <div style={{ marginTop: '12px', color: '#444', fontSize: '9px' }}>
        Ctrl+Shift+D per chiudere
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ color: '#666', letterSpacing: '0.1em', marginBottom: '6px', fontSize: '9px' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {children}
      </div>
    </div>
  );
}

function Btn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent',
      border: `1px solid ${danger ? '#4a1a1a' : '#222'}`,
      color: danger ? '#8a3a3a' : '#777',
      fontFamily: 'inherit',
      fontSize: '10px',
      padding: '5px 10px',
      cursor: 'pointer',
      textAlign: 'left',
    }}>
      {children}
    </button>
  );
}

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#555',
  cursor: 'pointer',
  fontSize: '12px',
};
