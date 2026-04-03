// SetupFlow — first launch: authenticate, insert API key
// Also used for grimoire-only deploy when entering a new temple

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { GlowText } from './GlowText';

type SetupPhase = 'auth' | 'grimoire' | 'apikey' | 'complete';

interface SetupFlowProps {
  hasApiKey: boolean;
  grimoireOnly?: boolean;
  onComplete: () => void;
}

export function SetupFlow({ hasApiKey, grimoireOnly = false, onComplete }: SetupFlowProps) {
  const initialPhase: SetupPhase = grimoireOnly ? 'grimoire' : 'auth';
  const [phase, setPhase] = useState<SetupPhase>(initialPhase);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Grimoire import state
  const [grimoireText, setGrimoireText] = useState('');

  // API key state
  const [apiKey, setApiKey] = useState('');

  const handleAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('authenticate');
      if (!hasApiKey) {
        setPhase('apikey');
      } else {
        setPhase('complete');
        onComplete();
      }
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Autenticazione fallita');
    } finally {
      setLoading(false);
    }
  }, [hasApiKey, onComplete]);

  const handleGrimoireImport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Parse the grimoire: expect 5 sections separated by ---
      const parts = grimoireText.split(/^---$/m).map(s => s.trim()).filter(s => s.length > 0);
      if (parts.length !== 5) {
        setError('Il grimoire deve contenere 5 sezioni separate da ---');
        setLoading(false);
        return;
      }

      await invoke('deploy_grimoire', {
        sections: {
          identity: parts[0],
          laws: parts[1],
          genesis: parts[2],
          session: parts[3],
          chronicles: parts[4],
        },
      });

      setPhase('complete');
      onComplete();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Import grimoire fallito');
    } finally {
      setLoading(false);
    }
  }, [grimoireText, onComplete]);

  const handleApiKey = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const valid = await invoke<boolean>('validate_api_key', { key: apiKey });
      if (!valid) {
        setError('API key non valida. Verifica e riprova.');
        setLoading(false);
        return;
      }
      await invoke('store_api_key', { key: apiKey });
      setPhase('complete');
      onComplete();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Validazione API key fallita');
    } finally {
      setLoading(false);
    }
  }, [apiKey, onComplete]);

  return (
    <div style={{
      animation: 'breathe 3s ease-in-out infinite',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '32px',
      padding: '40px',
    }}>
      {phase === 'auth' && (
        <>
          <GlowText text="G O E T I A" color="#777" size="18px" animate glow />
          <button onClick={handleAuth} disabled={loading} style={actionBtnStyle}>
            {loading ? 'AUTENTICAZIONE...' : 'ACCEDI CON TOUCH ID'}
          </button>
        </>
      )}

      {phase === 'grimoire' && (
        <>
          <GlowText text="DEPLOY GRIMOIRE" color="#8a8aff" size="14px" animate={false} glow />
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#666', textAlign: 'center', maxWidth: '500px' }}>
            Incolla il contenuto del grimoire. Le 5 sezioni devono essere separate da una riga contenente solo ---.
          </div>
          <textarea
            value={grimoireText}
            onChange={e => setGrimoireText(e.target.value)}
            placeholder="§1 identity.md&#10;---&#10;§2 laws.md&#10;---&#10;§3 genesis.md&#10;---&#10;§4 session.md&#10;---&#10;§5 chronicles.md"
            style={{
              width: '100%',
              maxWidth: '600px',
              height: '300px',
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              color: '#999',
              fontFamily: '"SF Mono", monospace',
              fontSize: '12px',
              padding: '16px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <button onClick={handleGrimoireImport} disabled={loading || !grimoireText.trim()} style={actionBtnStyle}>
            {loading ? 'CIFRATURA...' : 'DEPLOY'}
          </button>
        </>
      )}

      {phase === 'apikey' && (
        <>
          <GlowText text="API KEY ANTHROPIC" color="#8a8aff" size="14px" animate={false} glow />
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#666', textAlign: 'center' }}>
            Inserisci la tua API key Anthropic. Verrà salvata nel Keychain macOS.
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{
              width: '100%',
              maxWidth: '500px',
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              color: '#999',
              fontFamily: '"SF Mono", monospace',
              fontSize: '13px',
              padding: '12px 16px',
              outline: 'none',
              letterSpacing: '0.05em',
            }}
          />
          <button onClick={handleApiKey} disabled={loading || !apiKey.trim()} style={actionBtnStyle}>
            {loading ? 'VERIFICA IN CORSO...' : 'VERIFICA E SALVA'}
          </button>
        </>
      )}

      {error && (
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#8a3a3a' }}>
          {error}
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #333',
  color: '#888',
  fontFamily: '"SF Mono", monospace',
  fontSize: '11px',
  letterSpacing: '0.15em',
  padding: '12px 24px',
  cursor: 'pointer',
  transition: 'border-color 0.3s, color 0.3s',
};
